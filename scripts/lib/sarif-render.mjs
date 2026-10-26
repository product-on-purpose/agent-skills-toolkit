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
//     discriminator is `finding.key` when a check supplies one (no check does yet; this is the escape
//     hatch for the day one check's own message text cannot tell two of its findings apart), otherwise
//     the finding's message with volatile tokens normalised (runs of digits folded to "#", whitespace
//     collapsed). KNOWN LIMIT: a check that rewords its own message changes every affected finding's
//     fingerprint once, at the moment the wording changes - a consumer sees that one finding's alert
//     thread close and a new one open, the same as if the check had changed id. This is a one-time
//     cost per wording change, not an ongoing instability, and is the deliberate trade against hashing
//     nothing stable at all.
//
// GOVERNING CONSTRAINT: every field here is a pure serialization of data runGate() and the check
// registry already computed (provenance, effectiveSeverity, suppressed, line). Nothing here decides a
// severity or a verdict; if a field needed new computation to fill, it does not appear here.
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

/** Fold runs of digits to a single "#" and collapse whitespace, so a message that differs from another
 *  only by a count or an index ("3 broken links" vs "4 broken links") still normalises to the same
 *  discriminator - the two findings are the SAME kind of problem recurring, not two identities. See the
 *  module docblock's partialFingerprints section for what this feeds and its documented limit. */
function normalizeMessage(message) {
  return String(message ?? "")
    .replace(/\d+/g, "#")
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
 * Render a SARIF 2.1.0 log from what scripts/check.mjs already computed. Pure and synchronous; mutates
 * neither `ctx` nor `r`.
 * @param {object} ctx the loadPlugin() context (for ctx.library.data.standard / .tier - the SUBJECT's
 *   own declared Standard and tier, not the toolkit's)
 * @param {{findings:Array<object>}} r runGate()'s return value (only `.findings` is read)
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
        results: buildResults(r.findings, ctx?.library?.data?.tier ?? null),
        properties: {
          standard: ctx?.library?.data?.standard ?? null,
          declaredTier: ctx?.library?.data?.tier ?? null,
        },
      },
    ],
  };
}
