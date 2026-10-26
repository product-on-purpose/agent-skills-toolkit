// what-it-is:   the SARIF 2.1.0 renderer
// what-it-does: serializes what scripts/check.mjs's runGate() already computed (findings, provenance,
//               effectiveSeverity, suppression state) into a SARIF 2.1.0 log: one reportingDescriptor
//               per registered check (carrying its provenance) and one result per non-off finding
// why:          SARIF is what lets a portable, deterministic gate result flow into GitHub code
//               scanning, most static-analysis dashboards, and any other SARIF consumer, without
//               re-running or re-judging anything the gate already decided (E9's actual point: a
//               consumer must be able to filter to portable, objective findings via the rule's own
//               provenance property, not by re-deriving it)
// used-by:      scripts/check.mjs (--sarif)
//
// Shape verified against the SARIF 2.1.0 JSON schema (docs.oasis-open.org/sarif/sarif/v2.1.0 and the
// oasis-tcs/sarif-spec repository's sarif-schema-2.1.0.json), not guessed:
//   - result.level is "none" | "note" | "warning" | "error"; this module emits "error", "warning" or
//     "note" (effectiveSeverity "off" is filtered out before rendering - see below). "note" is
//     reserved for a finding ABOVE the plugin's declared tier: real, still reported, but unable to
//     affect this plugin's grade, so a consumer's Security tab must not show it in the same colour as
//     a gating failure. It carries `properties["askit/aboveDeclaredTier"]` naming the rung the
//     requirement belongs to, so a consumer can tell "not your grade" from "passed".
//   - result.suppressions is an array of { kind: "inSource" | "external", status?, justification? }.
//     askit's suppressions come from askit.config.json, a mechanism EXTERNAL to the source file (not
//     an inline "// suppress" comment), so kind is always "external"; a configured baseline waiver is
//     a deliberate, already-reviewed decision, so status is "accepted" (the honest read, and the
//     schema's own default when status is omitted).
//   - physicalLocation.region requires at least one of startLine / charOffset / byteOffset; this
//     module never invents one. A finding's `line` (scripts/lib/findings.mjs) is optional and null on
//     every check except U12 mermaid-valid (see that check's docblock for why it was chosen); a result
//     for any other finding gets a file-level physicalLocation with NO region key at all, which is
//     valid SARIF, rather than a fabricated `startLine: 1`.
//   - result.partialFingerprints (F-014) is how a SARIF consumer (GitHub code scanning chief among
//     them) tracks ONE finding's identity across runs, instead of re-matching on array position or on
//     message text that a wording pass can reshuffle. Every result carries `"askitFinding/v1"`: a
//     sha256 hex digest of the tuple [reqId-or-check, the finding's repo-relative forward-slash file
//     path (the same string this module already puts in physicalLocation.artifactLocation.uri), the
//     line when the finding carries one, and a discriminator] - see fingerprintFinding() below. The
//     discriminator is `finding.key` when a check supplies one via finding()'s opts (plumbed through in
//     the F-014 fix round; no check sets it yet - it is the escape hatch for the day one check's own
//     message text cannot tell two of its findings apart even after normalisation), otherwise the
//     finding's message with volatile tokens normalised: whitespace collapsed, and every STANDALONE
//     numeric token (a run of digits, optionally with one embedded decimal point, touching no word
//     character, ".", "/" or "-" on either side) folded to "#". A count or a score recurring with a
//     different number ("3 broken links" vs "47 broken links", "0.65" vs "0.70") is the SAME kind of
//     problem recurring, so it folds; a digit that is part of an identifier, a path, or an id (step-1,
//     v2.md, U5, scripts/a1.mjs) never stands alone this way and is left untouched, because folding it
//     would merge two DIFFERENT findings (about step-1 and about step-2) into one identity. KNOWN
//     LIMITS: (1) a check that rewords its own message changes every affected finding's fingerprint
//     once, at the moment the wording changes - a consumer sees that one finding's alert thread close
//     and a new one open, the same as if the check had changed id. This is a one-time cost per wording
//     change, not an ongoing instability, and is the deliberate trade against hashing nothing stable at
//     all. (2) the normalisation is textual, not semantic: a check whose message embeds a standalone
//     number that IS part of the finding's own identity (not a count or a score) would be over-folded
//     the same way a reworded message is - the fix for that check is `finding.key`, not a cleverer
//     regex here.
//
// GOVERNING CONSTRAINT: every field here is a pure serialization of data runGate() and the check
// registry already computed (provenance, effectiveSeverity, suppressed, line). Nothing here decides a
// severity or a verdict; if a field needed new computation to fill, it does not appear here. The one
// deliberate, narrow exception is partialFingerprints: fingerprintFinding() computes a HASH, never a
// new severity or verdict decision - it is a pure function of fields runGate() already produced
// (reqId-or-check, file, line, message-or-key), re-expressed as a stable identity string. No input to
// the hash is decided in this module.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CHECKS } from "./registry.mjs";
import { isAboveDeclaredTier, tierForReq } from "./tier.mjs";
import { LIMITATIONS_URL } from "./tier-scope.mjs";
import { metaFor } from "./report-meta.mjs";

const TOOL_NAME = "agent-skills-toolkit";
const TOOL_INFO_URI = "https://github.com/product-on-purpose/agent-skills-toolkit";
const SARIF_SCHEMA_URI = "https://docs.oasis-open.org/sarif/sarif/v2.1.0/errata01/os/schemas/sarif-schema-2.1.0.json";

// The toolkit's OWN version (never the graded subject's - ctx.library is the SUBJECT being graded,
// which may not even be this repo), read from this repo's own package.json. Resolved relative to this
// module's own file, not ctx.root, and wrapped defensively: a version string is metadata that makes
// the artifact self-describing, not a gate decision, so a read failure degrades to "0.0.0" rather than
// throwing and losing an otherwise-valid SARIF document.
function toolVersion() {
  try {
    const pkgPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    return typeof pkg.version === "string" && pkg.version ? pkg.version : "0.0.0";
  } catch {
    return "0.0.0";
  }
}

/** repo-relative paths are already forward-slash (scripts/lib/fs-utils.mjs relPath); pass through. */
function toUri(file) {
  return String(file ?? "").split(path.sep).join("/");
}

/** Fold only a STANDALONE numeric token - a run of digits, optionally with one embedded decimal point,
 *  touching no word character, ".", "/" or "-" on either side - to a single "#", and collapse
 *  whitespace. A count or a score ("3 broken links" vs "4 broken links", "0.65" vs "0.70") still
 *  normalises to the same discriminator - the two findings are the SAME kind of problem recurring, not
 *  two identities. A digit that is part of an identifier, a path, or an id (step-1, v2.md, U5,
 *  scripts/a1.mjs) is NOT standalone by this definition and is left untouched, because folding it would
 *  merge two DIFFERENT findings (about step-1 and about step-2) into one identity. See the module
 *  docblock's partialFingerprints section for what this feeds and its documented limits. */
function normalizeMessage(message) {
  return String(message ?? "")
    .replace(/(?<![\w./-])\d+(?:\.\d+)?(?![\w./-])/g, "#")
    .replace(/\s+/g, " ")
    .trim();
}

/** F-014: a stable identity for one finding, independent of its position in the findings array. See
 *  the module docblock for the algorithm and its known limit. `finding.key`, when a check sets it, is
 *  the discriminator; otherwise it is the finding's own message, normalised. The null-separated tuple
 *  (rather than naive string concatenation) keeps field boundaries from shifting into each other - a
 *  file named "12" and a line of 3 must not hash the same as a file named "1" and a line of 23. */
function fingerprintFinding(f) {
  const rule = f.reqId ?? f.check ?? "";
  const file = toUri(f.file);
  const line = f.line != null ? String(f.line) : "";
  const discriminator = f.key != null ? String(f.key) : normalizeMessage(f.message);
  const tuple = [rule, file, line, discriminator].join("\u0000");
  return createHash("sha256").update(tuple, "utf8").digest("hex");
}

/** One reportingDescriptor per registered check, id = reqId (every registered check has one - see
 *  scripts/lib/registry.mjs), carrying the check's own provenance as a rule property so a consumer can
 *  filter to portable objective/vendor-cited results without re-deriving anything (E9). */
function buildRules() {
  return CHECKS.map((m) => {
    const reqId = m.meta.reqId;
    const why = metaFor(reqId).why;
    return {
      id: reqId,
      name: m.meta.id,
      shortDescription: { text: why },
      fullDescription: { text: why },
      // RS-E3. SARIF is read in a consumer's Security tab, which is the surface furthest from this
      // repository's own documentation and therefore the one where an unqualified tier claim travels
      // furthest unaccompanied. helpUri is SARIF's own field for exactly this.
      helpUri: LIMITATIONS_URL,
      properties: { provenance: m.meta.provenance, tier: m.meta.tier },
    };
  });
}

/** One SARIF result per finding whose effectiveSeverity is "error" or "warning" - an "off" finding
 *  (turned off by profile or per-rule override) has nothing to report and is skipped entirely. A
 *  SUPPRESSED finding is NOT skipped: it is rendered with a `suppressions` entry (see module docblock),
 *  so the artifact stays honest about what was silenced instead of quietly omitting it. */
function buildResults(findings, declaredTier) {
  const out = [];
  for (const f of findings) {
    if (f.effectiveSeverity !== "error" && f.effectiveSeverity !== "warn") continue; // "off": nothing to report
    // Above the declared tier: level "note", whatever the finding's own severity is. Shared predicate
    // with the text output and the annotations (lib/tier.mjs), because the three surfaces disagreeing
    // about one run is the defect this fixes rather than a style preference.
    const above = isAboveDeclaredTier(f.reqId, declaredTier);
    const level = above ? "note" : f.effectiveSeverity === "error" ? "error" : "warning";
    const result = {
      ruleId: f.reqId ?? f.check,
      level,
      message: { text: f.message },
      // F-014: a stable cross-run identity, independent of array position and of most rewordings - see
      // the module docblock and fingerprintFinding() for the algorithm and its documented limit.
      partialFingerprints: { "askitFinding/v1": fingerprintFinding(f) },
    };
    if (f.file) {
      const physicalLocation = { artifactLocation: { uri: toUri(f.file) } };
      // Region only when the finding genuinely carries a line (findings.mjs `line`, currently populated
      // only by U12 mermaid-valid); a file-level location with no region is valid SARIF on its own.
      if (f.line != null) physicalLocation.region = { startLine: f.line };
      result.locations = [{ physicalLocation }];
    }
    if (f.suppressed) {
      result.suppressions = [{ kind: "external", status: "accepted", justification: f.suppressionReason ?? "suppressed by askit.config.json" }];
    }
    // A published-verdict TRUST ACTION is the mirror image of the suppression above, and belongs here for
    // the same stated reason: this artifact stays honest about what was silenced rather than quietly
    // omitting it. A suppression the subject WROTE appears as an accepted suppression; a suppression the
    // trust step OVERRULED left no trace at all, so the Security tab showed the finding with no hint that
    // the subject had tried to waive it - in the one mode built to publish a verdict ABOUT that subject.
    // A property rather than the message text: the message is the check's own words, and a consumer
    // diffing SARIF across runs should not see them change because a config did.
    if (f.trustNotice) {
      result.properties = { ...(result.properties ?? {}), "askit/trustNotice": f.trustNotice };
    }
    // The level alone says "not a gating failure"; it does not say WHY. Without this a consumer cannot
    // distinguish a note that is above the declared tier from any other note, and the Security tab has
    // no equivalent of the text output's labelled "above your declared tier" section - which is the
    // half of F-032 that the severity change on its own does not fix. Namespaced like the trust notice
    // above, and carrying the rung rather than a bare boolean so the reader learns what to declare.
    if (above) {
      result.properties = { ...(result.properties ?? {}), "askit/aboveDeclaredTier": tierForReq(f.reqId) };
    }
    out.push(result);
  }
  return out;
}

/**
 * One SARIF result per ADVISORY finding (ADR 0063 sec 1's rendering table): level is ALWAYS `note` -
 * never `isAboveDeclaredTier`-derived, because an advisory finding carries `reqId: null` and has no
 * tier to be above or below - and every result carries an `askit/advisory` property naming the ADV id,
 * NEVER combined with `askit/aboveDeclaredTier` on the same result (the two properties are how a
 * consumer tells "above your declared tier" apart from "advisory", and ADR 0063 states a finding never
 * carries both). `advisoryFindings` is `null` when the layer is off ("--no-advisory"); this returns []
 * for both that case and an empty array, mirroring formatAdvisorySection in scripts/check.mjs.
 */
function buildAdvisoryResults(advisoryFindings) {
  const out = [];
  for (const f of advisoryFindings ?? []) {
    const result = {
      ruleId: f.advisoryId,
      level: "note",
      message: { text: f.message },
      partialFingerprints: { "askitFinding/v1": fingerprintFinding(f) },
      properties: { "askit/advisory": f.advisoryId },
    };
    if (f.file) {
      const physicalLocation = { artifactLocation: { uri: toUri(f.file) } };
      if (f.line != null) physicalLocation.region = { startLine: f.line };
      result.locations = [{ physicalLocation }];
    }
    out.push(result);
  }
  return out;
}

/**
 * Render a SARIF 2.1.0 log from what scripts/check.mjs already computed. Pure and synchronous; mutates
 * neither `ctx` nor `r`.
 * @param {object} ctx the loadPlugin() context (for ctx.library.data.standard / .tier - the SUBJECT's
 *   own declared Standard and tier, not the toolkit's)
 * @param {{findings:Array<object>, advisoryFindings?:Array<object>|null}} r runGate()'s return value
 *   (`.findings` and `.advisoryFindings` are read; the latter may be `null` when the layer is off)
 * @returns {object} a SARIF 2.1.0 log object, JSON-serializable as-is
 */
export function renderSarif(ctx, r) {
  return {
    $schema: SARIF_SCHEMA_URI,
    version: "2.1.0",
    runs: [
      {
        tool: {
          driver: {
            name: TOOL_NAME,
            informationUri: TOOL_INFO_URI,
            version: toolVersion(),
            rules: buildRules(),
          },
        },
        // ADR 0063 sec 1: advisory results are APPENDED, never merged into or re-derived from the
        // conformance `findings` set - buildResults(r.findings, ...) above is computed exactly as it
        // was before this layer existed, so a stub advisory finding can never move a conformance result.
        results: [...buildResults(r.findings, ctx?.library?.data?.tier ?? null), ...buildAdvisoryResults(r.advisoryFindings)],
        properties: {
          standard: ctx?.library?.data?.standard ?? null,
          declaredTier: ctx?.library?.data?.tier ?? null,
        },
      },
    ],
  };
}
