// what-it-is:   the aggregate conformance gate entry point
// what-it-does: loads the plugin, runs every registered check, prints the tier and findings, and exits
//               with a real status code; --json emits a gate-only machine-readable object, --sarif
//               emits a SARIF 2.1.0 document (scripts/lib/sarif-render.mjs), --gha emits GitHub Actions
//               ::error/::warning workflow-command annotations. All three are pure serializations of
//               the same runGate() result the human path already prints - no new verdict, no new
//               severity, and mutually exclusive with each other and with the human text output.
// why:          the deterministic, model-free gate is what lets a plugin prove itself in CI rather than
//               rely on an opinion; the machine-readable modes are what let that same verdict flow into
//               a script, a SARIF-consuming dashboard (e.g. GitHub code scanning), or a PR diff without
//               re-parsing human text or re-judging anything the gate already decided
// used-by:      invoked by contributors and by .github/workflows/ci.yml; the self-hosting (G2) target
import { loadPlugin } from "./lib/load-plugin.mjs";
import { runAllChecks, provenanceByReq } from "./lib/registry.mjs";
import { SINCE_BY_REQ } from "./lib/standard-gate.mjs";
import { loadConfig, publicConfig, withGraderOptions } from "./lib/config.mjs";
import { PROFILES } from "./lib/profiles.mjs";
import { resolveFindings, gatingFindings } from "./lib/resolve-config.mjs";
import { computeTierReport, humanLine } from "./tier-report.mjs";
import { TIER_ORDER, tierForReq, ceilingIndex } from "./lib/tier.mjs";
import { compareStandard } from "./lib/standard-version.mjs";
import { normalizeArgPath } from "./lib/fs-utils.mjs";
import { renderSarif } from "./lib/sarif-render.mjs";
// The one check-specific import this module makes. U5 is the only check that can DECLINE to judge its
// subject (ADR 0049), and a decline that prints identically to a pass is the defect the decline was
// introduced to avoid. If a second check ever declines, generalise this into the registry.
import { notScoredCount } from "./checks/description-score.mjs";

/** Filter error severity by declared-tier ceiling. Exported for unit testing. */
export function gateExitFromFindings(findings, declaredTier) {
  const ceiling = ceilingIndex(declaredTier);
  const gatedErrors = findings.filter(
    (f) => f.severity === "error" && TIER_ORDER.indexOf(tierForReq(f.reqId)) <= ceiling
  );
  return {
    errorCount: gatedErrors.length,
    exitCode: gatedErrors.length > 0 ? 1 : 0,
  };
}

export function runGate(root, ctx = loadPlugin(root), { strict = false, mode, profile } = {}) {
  const raw = runAllChecks(ctx);
  // F1 (ADR 0027), now ADR 0044: the pin is honoured by a CEILING applied last inside resolveFindings,
  // not by a pre-pass. As a pre-pass it ran before configuration resolved, so a consumer's
  // `rules.X = "error"` beat it (E26). Under --strict the pin is passed as undefined, which makes every
  // version constraint go inert together - there is no second strict flag to keep in sync.
  const pinned = strict ? undefined : ctx?.library?.data?.standard;
  // F3: load askit.config.json and resolve severities (profile + per-rule override + suppressions +
  // published-verdict clamp). With no config this is a no-op: effectiveSeverity === severity, nothing
  // suppressed, configFindings empty, so the gate exit equals the pre-F3 behavior (test G-BC).
  const { config, findings: configFindings } = loadConfig(root);
  // CLI --mode / --profile override the file AND are stamped grader-owned (ADR 0044). The marketplace
  // scope reaches this same path through gradeMember(), so a catalogue's caller options are grader-owned
  // for every member without that scope needing a merge of its own.
  const effectiveConfig = withGraderOptions(config, { mode, profile });
  const resolved = resolveFindings([...configFindings, ...raw], effectiveConfig, provenanceByReq(), { pinned, sinceByReq: SINCE_BY_REQ });
  // Project effectiveSeverity onto .severity so gateExitFromFindings (the tier ceiling) is UNCHANGED.
  const forGate = gatingFindings(resolved).map((f) => ({ ...f, severity: f.effectiveSeverity }));
  const { errorCount, exitCode } = gateExitFromFindings(forGate, ctx?.library?.data?.tier);
  const warnCount = resolved.filter((f) => f.effectiveSeverity === "warn" && !f.suppressed).length;
  // `config` is published origin-free: provenance is a resolution input, not a new external contract.
  return { findings: resolved, errorCount, warnCount, exitCode, config: publicConfig(effectiveConfig) };
}

/**
 * The --json shape: exactly what runGate() returns (findings already carrying provenance and
 * effectiveSeverity - see resolve-config.mjs), plus the tier report the CLI already computes for its
 * human "Tier: ..." line. Deliberately GATE-ONLY, not evaluate.mjs's report object: byRule and
 * dispositions are evaluate-specific analysis the gate does not compute, and adding them here would be
 * new computation this module has no business doing (the governing constraint of this effort).
 * Pure serialization; exported for unit testing.
 */
export function buildJsonReport(root, ctx, r) {
  // `descriptionsNotScored` is PRESENTATION, computed here rather than in runGate() and therefore
  // provably outside the verdict path - the same layering as sectionFindings() below. U5 declines to
  // score a description whose language its lexicons cannot read (ADR 0049), which withdraws a finding
  // rather than adding one, so a consumer counting U5 findings to track description quality would see
  // the number fall with no quality change. Emitting the decline count is what makes that legible.
  return {
    ...r,
    descriptionsNotScored: notScoredCount(ctx),
    tierReport: computeTierReport(root, ctx, r.findings),
  };
}

/**
 * Split the printable findings into the ones that can affect the grade (at or below the declared-tier
 * ceiling, the same filter gateExitFromFindings applies) and the above-tier ones that structurally
 * cannot. Suppressed and `off` findings belong to neither. PRESENTATION ONLY: no severity, no count,
 * and no exit code is derived from this split. (PSR-7, ADR 0036 - three independent assessors misread
 * a run in one day because above-tier `[error]` lines printed ahead of a "0 error(s)" summary.)
 * Exported for unit testing.
 */
export function sectionFindings(findings, declaredTier) {
  const ceiling = ceilingIndex(declaredTier);
  const grading = [];
  const aboveTier = [];
  for (const f of findings) {
    if ((f.effectiveSeverity ?? f.severity) === "off" || f.suppressed) continue;
    (TIER_ORDER.indexOf(tierForReq(f.reqId)) <= ceiling ? grading : aboveTier).push(f);
  }
  return { grading, aboveTier };
}

/**
 * The one-line Standard-debt indicator, or "" when the pin is holding nothing back. A plugin pinned to
 * an older Standard prints "no blockers detected" with exit 0 while carrying post-pin findings that all
 * become gate-failing the moment it re-pins; this states that latent debt next to the verdict instead of
 * leaving it to be inferred from the warning stream. Dates are computed SEPARATELY for the gating and
 * above-tier partitions and lead with the EARLIEST due version, compared numerically so 0.10 outranks
 * 0.9. Both parts of that are corrections: one date over the whole set let above-tier debt name the day
 * the gate breaks, and leading with the highest told a plugin holding debt due at 0.13 and 0.14 that it
 * was safe until 0.14. (PSR-6, ADR 0036.)
 * Exported for unit testing.
 */
export function standardDebtLine(findings, declaredTier) {
  // Reads `ceiling`, not the legacy `since`. Debt is now findings held below their severity by a binding
  // INTRODUCTION or TIGHTENING ceiling, and a tightening has no `since` at all - selecting on the legacy
  // field would print an undefined version for every `until`-only hold, which is most of them.
  const held = findings.filter((f) => f.ceiling && !f.suppressed);
  if (held.length === 0) return "";
  // Dates are computed PER PARTITION, below, never once over everything. Reducing across all held
  // findings first and then splitting let an above-tier finding set the date printed in the GATING
  // sentence: a plugin pinned to 0.12 whose gating debt comes due at 0.13, carrying one above-tier
  // finding due at 0.14, was told its gate breaks at 0.14. It breaks at 0.13. Under-warning by a
  // version is worse than not stating a date, because the reader plans the upgrade around it.
  const earliest = (set) => set.reduce((lo, f) => (compareStandard(f.ceiling.due, lo) < 0 ? f.ceiling.due : lo), set[0].ceiling.due);
  const latest = (set) => set.reduce((hi, f) => (compareStandard(f.ceiling.due, hi) > 0 ? f.ceiling.due : hi), set[0].ceiling.due);
  // EARLIEST leads the sentence, where the old line led with the highest. "All of them become errors at
  // 0.14 or later" is technically true of the maximum and still reads as safe-until-0.14 to someone
  // holding a finding due at 0.13. The first date is the one that costs them something.
  const span = (set) => {
    const first = earliest(set);
    const last = latest(set);
    return first === last ? `at Standard ${first}` : `from Standard ${first} onwards (the last at ${last})`;
  };

  // The tier ceiling applies here too, and saying otherwise was a live falsehood. `G4` is Advanced, so
  // a plugin declaring Convergent that carries the E35 index migration was told its held finding
  // "becomes a gate-failing error" - it cannot, at any Standard, because gateExitFromFindings filters
  // by the same declared-tier ceiling. That also contradicted this very terminal's own above-tier
  // label, three lines further down. Split rather than dropped: above-tier debt is still real debt and
  // still comes due, it just never gates THIS plugin at THIS declared tier.
  const ceiling = ceilingIndex(declaredTier);
  const gating = held.filter((f) => TIER_ORDER.indexOf(tierForReq(f.reqId)) <= ceiling);
  // The above-tier findings themselves, not just how many: they carry their own due dates, and the
  // clause about them has to be computed from those rather than borrowing the gating set's.
  const aboveSet = held.filter((f) => TIER_ORDER.indexOf(tierForReq(f.reqId)) > ceiling);
  const pinned = held[0].ceiling.pinned;

  if (gating.length === 0) {
    return `Standard debt: ${held.length} finding(s) held back by your pinned Standard ${pinned}; ` +
      `all of them are above your declared tier, so they become errors ${span(held)} without affecting this plugin's grade.`;
  }
  const aboveBit = aboveSet.length > 0
    ? ` A further ${aboveSet.length} held finding(s) are above your declared tier and become errors ${span(aboveSet)} without affecting your grade.`
    : "";
  return `Standard debt: ${gating.length} finding(s) held back by your pinned Standard ${pinned}; ` +
    `they become gate-failing errors ${span(gating)}.${aboveBit}`;
}

/**
 * The per-finding ceiling annotation, branched on CAUSE.
 *
 * The old text was `since`-shaped ("introduced in Standard X, after pinned Y") and is simply wrong for a
 * tightening: it would report a `U13` cap as due at 0.12 when it is due at 0.13. Both causes can be
 * active at once, so all three shapes are spelled out rather than inferred from whichever constraint
 * happened to come first.
 */
function ceilingAnnotation(c) {
  const since = c.constraints.find((x) => x.cause === "since");
  const until = c.constraints.find((x) => x.cause === "until");
  if (since && until) return `held at ${c.to}: introduced in Standard ${since.due} and capped until Standard ${until.due}, after pinned ${c.pinned}`;
  if (until) return `held at ${c.to}: capped until Standard ${until.due}, after pinned ${c.pinned}`;
  return `downgraded: introduced in Standard ${since.due}, after pinned ${c.pinned}`;
}

function findingLine(f) {
  const sev = f.effectiveSeverity ?? f.severity;
  // Provenance (E9/E23): resolveFindings already stamps every resolved finding with `provenance`
  // ("objective" | "vendor-cited" | "house"); it was computed but invisible in this text before. Shown
  // next to severity so a reader scanning the gate's own output can tell a portable, defensible failure
  // from an askit-house convention without leaving it. The "objective" fallback mirrors
  // resolve-config.mjs's own default for a finding whose reqId provenance is not on record.
  const prov = f.provenance ?? "objective";
  return `  [${sev}/${prov}] ${f.check}${f.reqId ? " (" + f.reqId + ")" : ""}: ${f.message}` +
    `${f.ceiling ? ` [${ceilingAnnotation(f.ceiling)}]` : ""}` +
    // The deprecated clamp annotation is suppressed when a trust notice already explains the same
    // action; it stays in the DATA for external --json readers.
    `${f.clampNotice && !f.trustNotice ? ` [clamped to warn: published-verdict, ${f.provenance}]` : ""}` +
    // A trust action must be VISIBLE, or a published verdict fails with no explanation that the
    // subject's own configuration was overruled - which is the promise ADR 0044 makes.
    `${f.trustNotice ? ` [${f.trustNotice}]` : ""}` +
    `${f.migrationNotice ? ` [${f.migrationNotice}]` : ""}` +
    `${f.file ? "  -> " + f.file : ""}`;
}

export function format(findings, declaredTier) {
  const { grading, aboveTier } = sectionFindings(findings, declaredTier);
  const parts = [];
  if (grading.length) parts.push(grading.map(findingLine).join("\n"));
  if (aboveTier.length) {
    parts.push(
      "\n  Above your declared tier (informational; these cannot affect the grade or the exit code):\n" +
      aboveTier.map(findingLine).join("\n")
    );
  }
  return parts.join("\n");
}

// GitHub Actions workflow-command escaping (docs.github.com/actions: "Workflow commands for GitHub
// Actions"), matching @actions/toolkit's own escapeData/escapeProperty: percent MUST be escaped first,
// so it does not double-escape the percent signs the other substitutions introduce.
const ghaEscapeData = (s) => String(s ?? "").replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
const ghaEscapeProperty = (s) => ghaEscapeData(s).replace(/:/g, "%3A").replace(/,/g, "%2C");

/**
 * GitHub Actions annotations: one `::error file=...,line=...::message` / `::warning ...` workflow
 * command per printable finding, so a finding lands inline on a PR diff. `line=` appears only when the
 * finding carries one (findings.mjs `line`, optional - see its docblock); no other property is
 * invented. Reuses sectionFindings' own grading+aboveTier split (the same set `format()` already
 * prints, in the same order) rather than re-deriving which findings are printable - a pure
 * re-serialization of already-computed data, exactly like `format()` itself.
 *
 * Implemented as a plain function here rather than a separate CLI/emitter: it needs nothing that
 * check.mjs does not already compute (resolved findings, declaredTier), and a second binary would only
 * duplicate the loadPlugin/runGate wiring this file already owns.
 * Exported for unit testing.
 */
export function formatGithubAnnotations(findings, declaredTier) {
  const { grading, aboveTier } = sectionFindings(findings, declaredTier);
  return [...grading, ...aboveTier]
    .map((f) => {
      const sev = f.effectiveSeverity ?? f.severity;
      const cmd = sev === "error" ? "error" : "warning";
      const params = [];
      if (f.file) params.push(`file=${ghaEscapeProperty(f.file)}`);
      if (f.line != null) params.push(`line=${ghaEscapeProperty(String(f.line))}`);
      const paramStr = params.length ? " " + params.join(",") : "";
      const label = f.reqId ? `${f.check} (${f.reqId}): ` : `${f.check}: `;
      // The trust notice is APPENDED to the annotation a reviewer reads on the diff. Without it, a
      // finding the subject had tried to waive looks identical to one nobody touched, which is the
      // opposite of what published-verdict mode exists to show. Already sanitized where the notice is
      // built; ghaEscapeData then handles the workflow-command encoding.
      const notice = f.trustNotice ? ` [${f.trustNotice}]` : "";
      return `::${cmd}${paramStr}::${ghaEscapeData(label + f.message + notice)}`;
    })
    .join("\n");
}

/**
 * Parse the CLI: the first non-flag token is the root (normalized through normalizeArgPath, so a
 * Windows backslash path is not silently misread - the historical defect); --strict and --mode <val>
 * (or --mode=<val>) are flags. Exported for unit testing (tests/unit/argv-path-normalization.test.mjs).
 */
export function parseArgs(argv) {
  let root, mode, profile, strict = false, json = false, sarif = false, gha = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--strict") strict = true;
    else if (a === "--json") json = true;
    else if (a === "--sarif") sarif = true;
    else if (a === "--gha") gha = true;
    else if (a === "--mode") mode = argv[++i];
    else if (a.startsWith("--mode=")) mode = a.slice("--mode=".length);
    else if (a === "--profile") profile = argv[++i];
    else if (a.startsWith("--profile=")) profile = a.slice("--profile=".length);
    else if (!a.startsWith("--") && root === undefined) root = normalizeArgPath(a);
  }
  return { root: root ?? process.cwd(), mode, profile, strict, json, sarif, gha };
}

if (process.argv[1]?.endsWith("check.mjs")) {
  const { root, mode, profile, strict, json, sarif, gha } = parseArgs(process.argv.slice(2));
  if (mode !== undefined && mode !== "local" && mode !== "published-verdict") {
    console.error(`invalid --mode '${mode}'; expected 'local' or 'published-verdict'`);
    process.exit(2);
  }
  if (profile !== undefined && !Object.prototype.hasOwnProperty.call(PROFILES, profile)) {
    console.error(`invalid --profile '${profile}'; expected one of ${Object.keys(PROFILES).join(", ")}`);
    process.exit(2);
  }
  // At most one machine-readable output mode: each emits ONLY its own format on stdout (no human
  // banner), so a consumer piping check.mjs never has to guess which document it is parsing.
  if ([json, sarif, gha].filter(Boolean).length > 1) {
    console.error("only one of --json, --sarif, --gha may be given");
    process.exit(2);
  }
  const ctx = loadPlugin(root);
  const r = runGate(root, ctx, { strict, mode, profile });

  if (json) {
    console.log(JSON.stringify(buildJsonReport(root, ctx, r), null, 2));
    process.exit(r.exitCode);
  }
  if (sarif) {
    console.log(JSON.stringify(renderSarif(ctx, r), null, 2));
    process.exit(r.exitCode);
  }
  if (gha) {
    const out = formatGithubAnnotations(r.findings, ctx?.library?.data?.tier);
    if (out) console.log(out);
    process.exit(r.exitCode);
  }

  if (r.findings.length) {
    const out = format(r.findings, ctx?.library?.data?.tier);
    if (out) console.log(out);
  }
  console.log(`\n${humanLine(computeTierReport(root, ctx, r.findings))}`);
  console.log(`\n${r.errorCount} error(s), ${r.warnCount} warning(s).`);
  // A decline is not a pass, and it must not read like one (ADR 0049).
  const notScored = notScoredCount(ctx);
  if (notScored > 0) {
    console.log(
      `${notScored} description(s) NOT SCORED: U5 reads English and declines rather than failing what it cannot read (Standard sec 8.1).`
    );
  }
  const debt = standardDebtLine(r.findings, ctx?.library?.data?.tier);
  if (debt) console.log(debt);
  process.exit(r.exitCode);
}
