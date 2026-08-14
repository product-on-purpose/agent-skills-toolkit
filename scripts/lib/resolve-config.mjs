// what-it-is:   the config resolver (F3), and since ADR 0044 the single place a finding's disposition is
//               decided
// what-it-does: annotates each finding with its effective severity, its provenance, a suppressed flag,
//               the published-verdict trust step's notice, and the Standard ceiling - leaving the array
//               intact so the report shows what was overruled/waived/held back rather than hiding it
// why:          one resolution path keeps check.mjs, evaluate.mjs, and tier-report.mjs consistent and keeps
//               the gate deterministic (a pure data transform over the finding array, no model, no I/O)
// used-by:      scripts/check.mjs, scripts/evaluate.mjs, scripts/tier-report.mjs
import { ORIGIN } from "./config.mjs";
import { PROFILES } from "./profiles.mjs";
import { matchSuppression } from "./suppressions.mjs";
import { activeConstraints, latestDue, lowerSeverity, SEVERITY_RANK } from "./standard-ceiling.mjs";
import { BASELINE } from "./standard-version.mjs";

/**
 * Flatten subject-authored text to a single safe line before it is quoted into a published notice.
 *
 * Collapses every control character and whitespace run (newlines included) to one space and caps the
 * length. In `published-verdict` mode the subject is explicitly untrusted, so its `askit.config.json`
 * strings must not be able to shape the structure of a report written about it.
 */
// Constructed rather than written literally: a source file that CONTAINS the invisible characters it
// strips is unreadable in review and unsearchable in a diff.
const ZWNJ = String.fromCharCode(0x200c);  // zero-width non-joiner
const ZWJ = String.fromCharCode(0x200d);   // zero-width joiner
// Constructed once at module load: building a Segmenter per finding is a real cost on a large report.
const SEGMENTER = new Intl.Segmenter("en", { granularity: "grapheme" });

function sanitizeSubjectText(s, max = 200) {
  // Bound the RAW input before any full-string pass, so an extreme reason cannot amplify allocation
  // before it is capped. The bound is a generous multiple of the cap rather than a tight one, because a
  // tight bound can sever a long grapheme cluster (an emoji ZWJ sequence runs to a dozen UTF-16 units)
  // BEFORE the cluster-aware cap below ever sees it, reintroducing the corruption that cap is for.
  const raw = String(s ?? "").slice(0, max * 32);
  const flat = raw
    // Cc (control) becomes a separator - it stood between words, and it is what protects the TERMINAL
    // surfaces, where a notice is printed with no escaping at all and an ESC sequence could forge gate
    // output about the subject's own plugin.
    .replace(/\p{Cc}/gu, " ")
    // Cf (format) is stripped BY CATEGORY, minus two carve-outs. Category rather than an enumerated
    // range because ranges leaked U+061C; the carve-outs because the category is too broad to apply
    // whole. ZWNJ and ZWJ are not decoration: in Persian they change spelling and meaning, in Indic
    // scripts they control conjunct forms, and in emoji they bind a sequence - stripping them turns a
    // subject's own words into a misquotation, in a report published about that subject. They are also
    // the two Cf characters that cannot reorder or hide text, which is what the rest of the strip is
    // defending against. Cs (LONE SURROGATES) is unconditional: malformed is never meaningful.
    .replace(/\p{Cf}/gu, (c) => (c === ZWNJ || c === ZWJ ? c : ""))
    .replace(/\p{Cs}/gu, "")
    .replace(/\s+/g, " ")   // \s covers U+2028 and U+2029
    .trim();
  // Truncate on a GRAPHEME CLUSTER boundary. A code-point boundary was the previous fix and it is still
  // wrong for anything a reader would call one character: it severs a combining mark from its base, one
  // regional indicator from its pair (turning a flag into a stray letter), and any emoji ZWJ sequence
  // mid-join. Intl.Segmenter is the Unicode segmentation the platform already ships, so this is not a
  // hand-rolled table that goes stale.
  const clusters = [...SEGMENTER.segment(flat)].map((seg) => seg.segment);
  if (clusters.length <= max) return flat;
  // The ellipsis is counted INSIDE the cap, so the returned string never exceeds max clusters. Guarded
  // for a small max, where max - 3 would otherwise go negative and slice from the end.
  const keep = Math.max(0, max - 3);
  return `${clusters.slice(0, keep).join("")}...`;
}

/**
 * Resolve raw findings against the loaded config, in four ordered steps (ADR 0044).
 *
 *   1-2. Profile, then per-rule override, then suppression matching. Precedence is unchanged:
 *        per-rule override > profile > the severity the check emitted.
 *   3.   The TRUST STEP, in published-verdict mode only and never for `house` provenance. It resolves
 *        to the trusted resolution - the same precedence with every SUBJECT-owned setting absent - and
 *        RAISES ONLY, so a subject being stricter about itself survives. Suppression is decided
 *        independently of severity, because a gate needs `error` AND `!suppressed` and a step that
 *        raised only severity would still publish green behind a subject-owned waiver.
 *   4.   The STANDARD CEILING, always last and never raising, computed from (pinned, since,
 *        migration.until) and applied by SEVERITY_RANK.
 *
 * THE GUARANTEE THIS FUNCTION USED TO MAKE IS DELIBERATELY REVERSED, and this comment is one of the five
 * public surfaces that stated it. It read: "the clamp only ever raises off->warn, never to error, so
 * turning the mode on can never flip a passing gate to failing." In published-verdict mode it now can,
 * for a subject-owned reduction of an objective or vendor-cited finding. That is the point of the fix,
 * not a side effect: a guarantee that protects the subject is the wrong guarantee in the one mode built
 * to publish a verdict ABOUT the subject (E38). Grader-owned settings are still honoured in full, and
 * local mode is untouched - a subject's own config remains authoritative about its own repository.
 *
 * The ceiling is a CEILING, never a floor: a severity already at or below a constraint's cap is left
 * exactly as resolved, so "off" and suppression still win. And because the ceiling runs after the trust
 * step, the trust step can never lift a finding above its ceiling - which is why closing E38 cannot
 * break this release's red-ward invariant.
 *
 * Pure and synchronous; never mutates the input.
 * @param {Array<object>} findings raw findings from the checks, at their TARGET severity
 * @param {object} config origin-bearing config from loadConfig, optionally merged via withGraderOptions
 * @param {Map<string,string>} provenanceByReq reqId -> provenance
 * @param {{pinned?: unknown, sinceByReq?: Record<string,string>}} standard the plugin's pin (undefined
 *        under --strict, which makes every constraint inert) and the reqId -> introduction-version map
 * @returns {Array<object>} resolved findings, each + { provenance, effectiveSeverity, downgradedFrom,
 *          suppressed, suppressionReason, clampNotice, configReduced, trustNotice, trust,
 *          migrationNotice, ceiling }
 */
export function resolveFindings(findings, config, provenanceByReq, { pinned, sinceByReq = {} } = {}) {
  // The config is ORIGIN-BEARING (ADR 0044): every setting is `{ value, origin }` so the published-verdict
  // trust step can tell a rubric the grader chose from one the subject wrote about itself.
  const profileRules = (PROFILES[config.profile.value] ?? PROFILES["askit-library"]).rules;
  const published = config.mode.value === "published-verdict";
  return findings.map((f) => {
    const declared = f.severity;
    // Provenance and `since` are LOOKED UP, never read off the finding: a finding carries
    // { check, severity, message, file, reqId, migration, line } and neither `provenance` nor `meta`.
    const provenance = provenanceByReq.get(f.reqId) ?? "objective";
    const since = sinceByReq[f.reqId] ?? BASELINE;

    // STEPS 1-2: profile, then per-rule override, then suppression matching.
    const overridden = config.rules[f.reqId]?.value;   // already normalized to a bare severity by loadConfig
    const profiled = profileRules[f.reqId];
    const subjectResolved = overridden ?? profiled ?? declared;
    let effectiveSeverity = subjectResolved;
    let sup = matchSuppression(f, config.suppressions);
    const subjectSuppression = sup;

    // STEP 3: THE TRUST STEP (E38). Runs only in published-verdict mode and only for objective and
    // vendor-cited findings; house provenance is never touched.
    //
    // It resolves to the TRUSTED RESOLUTION - the same precedence as steps 1-2 but with every
    // subject-owned setting absent - and it RAISES ONLY. "Restore the declared severity" was wrong: with
    // a grader-owned `--profile plain-plugin` (which resolves U4 to warn) beneath a subject-owned
    // `rules.U4 = "off"`, an atomic reset to the declared severity yields `error`, discarding the
    // grader's own deliberate warn. Rolling back to the trusted resolution yields `warn`, which is what
    // the grader asked for.
    //
    // The rank guard is what keeps the fix from inverting into the defect it exists to prevent: a
    // subject writing `rules.U7 = "error"` is being STRICTER about itself, and an unconditional
    // recomputation would drop it back to `warn` - taking a deliberately failing published verdict and
    // turning it green, by way of the mechanism built to stop verdicts being turned green.
    //
    // Severity and suppression are decided INDEPENDENTLY. gatingFindings requires `error` AND
    // `!suppressed`, so a step that only raised severity would leave a subject-owned suppression intact:
    // the finding would read `error`, satisfy the floor literally, and still publish green.
    const oldClampWouldHaveFired = published && provenance !== "house" && (subjectResolved === "off" || !!sup);
    let trust = null;
    if (published && provenance !== "house") {
      const graderProfileRules = config.profile.origin === ORIGIN.GRADER
        ? (PROFILES[config.profile.value] ?? PROFILES["askit-library"]).rules
        : {};
      const graderRule = config.rules[f.reqId]?.origin === ORIGIN.GRADER ? config.rules[f.reqId].value : undefined;
      // A grader rule beats a grader profile, the same precedence as steps 1-2.
      const trusted = graderRule ?? graderProfileRules[f.reqId] ?? declared;

      // RAISE-ONLY, by rank. An equal or stricter subject result survives untouched.
      const raised = SEVERITY_RANK[subjectResolved] < SEVERITY_RANK[trusted];
      if (raised) effectiveSeverity = trusted;
      const suppressionCleared = !!sup && sup.origin === ORIGIN.SUBJECT;
      if (suppressionCleared) sup = null; // surfaced, not suppressed

      if (raised || suppressionCleared) {
        const overruled = config.rules[f.reqId]?.origin === ORIGIN.SUBJECT
          ? `the subject's own rules.${f.reqId}`
          : config.profile.origin === ORIGIN.SUBJECT
            ? `the subject's own profile '${config.profile.value}'`
            : "a subject-owned setting";
        const parts = [];
        if (raised) parts.push(`severity restored to "${trusted}" from "${subjectResolved}", overruling ${overruled}`);
        // The waiver reason is the ONLY subject-controlled text this notice carries, and the notice is
        // published in a report ABOUT that subject - so it is neutralized where it is built, not only
        // where it is rendered. A reason containing newlines can otherwise escape a Markdown blockquote
        // and forge report sections, and every downstream consumer of `trustNotice` (including external
        // --json readers embedding it in their own output) inherits the exposure. Escaping at each
        // render site alone would protect only the sites we happen to own.
        if (suppressionCleared) parts.push(`the subject's own suppression was cleared${subjectSuppression?.reason ? ` (waiver reason: ${sanitizeSubjectText(subjectSuppression.reason)})` : ""}`);
        trust = {
          raised,
          suppressionCleared,
          notice: `published-verdict (provenance ${provenance}): ${parts.join("; and ")}. A published verdict cannot be weakened by the subject it is about.`,
        };
      }
    }
    // The severity after steps 1-3 and BEFORE any ceiling. Both the ceiling's `from` and the binding test
    // measure against this, not against `declared`: reporting the ceiling as lowering from what the module
    // emitted would overstate what the pin is holding back when config had already moved it.
    const postTrust = effectiveSeverity;
    // A CONFIG-caused reduction that survived the trust step. This is the only way to tell a
    // config-lowered finding from a ceiling-lowered one, and the two belong in different dispositions.
    const configReduced = SEVERITY_RANK[postTrust] < SEVERITY_RANK[declared];

    // STEP 4: the Standard ceiling, always last, never raises.
    const constraints = activeConstraints(pinned, since, f.migration);
    for (const c of constraints) effectiveSeverity = lowerSeverity(effectiveSeverity, c.ceiling);

    // Did the ceiling ACTUALLY lower anything? A version condition that changes no outcome is not debt:
    // where config has already lowered a finding, the constraint is still version-active but binds
    // nothing, and reporting it would tell every debt consumer the pin is holding back a finding the
    // unchanged config keeps a warning either way.
    const binding = SEVERITY_RANK[effectiveSeverity] < SEVERITY_RANK[postTrust];
    // Per-constraint, deliberately NOT derived from the aggregate `binding`: at pin 0.11 both a `since`
    // ceiling (warn) and an `until` ceiling (capAt) can be active and EQUAL, and an aggregate test cannot
    // say which one did the work. Equal ceilings mean both bind, and the notice is emitted.
    const untilConstraint = constraints.find((c) => c.cause === "until");
    const bindingUntil = untilConstraint && SEVERITY_RANK[f.migration.capAt] < SEVERITY_RANK[postTrust] ? untilConstraint : null;
    const sinceConstraint = constraints.find((c) => c.cause === "since");

    // `clampNotice` is DEPRECATED for one minor, not deleted: it is consumed by check.mjs and
    // evaluate.mjs terminal rendering, by `dispositions`, by both renderers' view models, by unit tests,
    // by a published JSON example in the docs, and directly through both JSON CLIs. Deleting it would
    // either break that automation or silently remove the trust explanation from shareable reports.
    //
    // It is populated ONLY where the old clamp would have fired AND the result really is `warn` - which
    // is exactly the set of findings whose old semantics it can still state truthfully. It is
    // deliberately NOT mirrored onto every trust action: a declared-error objective finding carrying a
    // subject-owned suppression now ends UNSUPPRESSED at error, and stamping the literal words "clamped
    // to warn" on a gate-failing error would make `dispositions` count it as both a real issue and a
    // clamped one, while profileConformance - which excludes every clampNotice finding - silently
    // dropped it. A compatibility field that lies is worse than one that is absent, because the
    // automation reading it has no way to tell.
    // Keyed on postTrust, NOT on the post-ceiling severity. The old clamp produced `warn` ITSELF; a
    // `warn` that the later Standard ceiling produced is a different cause, and attributing it to the
    // clamp makes the finding contradict itself. Concretely: a subject-owned `rules.U14 = "off"` in
    // published-verdict mode at pin 0.12 is restored to `error` by the trust step and then held to
    // `warn` by the introduction ceiling - the finding would have said both that published-verdict
    // restored an error AND that published-verdict clamped it to warn.
    const clampNotice = oldClampWouldHaveFired && postTrust === "warn"
      ? `clamped to warn in published-verdict mode (provenance ${provenance}): a published verdict cannot disable an objective or vendor-cited check`
      : null;

    // THE GRADUATION NOTE, which the checks used to append at emit time and no longer can.
    //
    // It is RUN-SPECIFIC: true only where the tightening ceiling actually bound. A check knows neither
    // the plugin's pin nor whether --strict is on, so it cannot decide this - and at pin 0.12 under
    // --strict the ceiling is disabled and the finding IS already an error, so a note promising it
    // "becomes an error once you pin 0.13" would be false in that very run. The static half of the
    // story lives in `migration.reason`, which says what the migration is about and claims nothing
    // about any particular run, so it stays safe in --json at any pin in any mode.
    const graduationNote = bindingUntil
      ? ` Held at "${effectiveSeverity}" by your pinned Standard ${pinned}; it becomes "${postTrust}" once you pin Standard ${f.migration.until}.`
      : "";

    return {
      ...f,
      message: f.message + graduationNote,
      provenance,
      effectiveSeverity,
      downgradedFrom: effectiveSeverity !== declared ? declared : null,
      suppressed: !!sup,
      suppressionReason: sup ? sup.reason ?? null : null,
      clampNotice,
      configReduced,
      // ADDITIVE, and set on EVERY trust action - unlike clampNotice, which can only speak for the
      // narrow subset it can still describe truthfully.
      trustNotice: trust ? trust.notice : null,
      // The structured half, so `dispositions.trustActions` can count raises and cleared suppressions
      // separately. One finding can increment both, which is why trustActions is an ORTHOGONAL metric
      // rather than a bucket of the disposition partition.
      trust: trust ? { raised: trust.raised, suppressionCleared: trust.suppressionCleared } : null,
      // The cap's public explanation survives the move. The old branch both applied the cap and wrote
      // this notice; replacing it without re-specifying the notice would silently delete an explanation
      // that check.mjs, evaluate.mjs, --json and both renderers consume.
      migrationNotice: bindingUntil
        ? `capped at ${f.migration.capAt} until Standard ${f.migration.until} (${f.migration.reason}); severity before the cap was ${postTrust}`
        : null,
      // ALWAYS PRESENT, null when nothing BINDS - never omitted, never an empty object or array, so
      // `if (f.ceiling)` is the whole check a consumer needs.
      ceiling: binding
        ? {
            pinned,
            from: postTrust,
            to: effectiveSeverity,
            due: latestDue(constraints),
            constraints: constraints.map((c) => ({ cause: c.cause, due: c.due })),
          }
        : null,
      // LEGACY --json COMPATIBILITY, deprecated for one minor. Each field is specified independently,
      // because treating them as an atomic triple is self-contradictory for an `until`-only ceiling.
      // `downgraded` has always meant "an applied downgrade", so it follows `binding` rather than mere
      // version-activity; `since` is emitted only when an INTRODUCTION participates, because a tightening
      // does not change when a check was introduced and deriving it from max(due) would tell a reader the
      // check appeared in a version it did not.
      // Spread rather than assigned, so a non-binding finding carries no key at all - exactly the shape
      // the pre-pass produced. Assigning `undefined` would leave the key present for `in` and deepEqual.
      ...(binding
        ? { downgraded: true, pinned, ...(sinceConstraint ? { since: sinceConstraint.due } : {}) }
        : {}),
    };
  });
}

/** A finding GATES iff its effective severity is "error" AND it is not suppressed. */
export function gatingFindings(resolved) {
  return resolved.filter((f) => f.effectiveSeverity === "error" && !f.suppressed);
}
