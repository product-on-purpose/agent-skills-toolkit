// what-it-is:   U17 - a .claude-plugin/marketplace.json that no scope can read (ADR 0052)
// what-it-does: reports a catalogue manifest that is present but unparseable, carries no plugins array, or MIXES
//               skill-source and plugin-source entries so that only half of it is ever examined
// why:          the disjointness rule between marketplace scope and U13 is a clean partition of the WELL-FORMED
//               cases and says nothing about the rest. A broken manifest is declined by marketplace scope (it
//               cannot read it) and swallowed by U13 (which falls through on a parse error by design), so it
//               produces no finding from anybody; a mixed one is claimed ENTIRELY by U13, and its plugin entries
//               are never collection-graded. In both cases the author wrote something and nothing looks at it
// used-by:      scripts/lib/registry.mjs (the CHECKS array); covered by tests/unit/catalogue-manifest-shape.test.mjs
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { finding, SEVERITY } from "../lib/findings.mjs";
import { underSkills, MANIFEST_REL } from "../lib/marketplace/manifest.mjs";

/**
 * `since: "0.14"` AND finding-level `migration` at the same time, which makes this the FIRST check in the
 * spine to carry both constraints. That combination is what expresses "warn-only at 0.14, gates at 0.15":
 * `since` alone would gate the moment a consumer adopts 0.14, and `until` alone would leave a plugin
 * pinned below 0.14 exposed to a check that did not exist at its pin. ADR 0044 point 2 anticipated both
 * binding at once and specified that the reported `due` is the MAXIMUM across them; this is its first live
 * case, verified across pins 0.13 / 0.14 / 0.15.
 *
 * Warn-first rather than gating because a census of every real manifest found this check is PREVENTIVE, not
 * corrective: across the seven pinned corpora, all six family members and agent-plugins there are 7
 * manifests - 6 of-plugins, 1 of-skills, ZERO mixed, ZERO malformed. Both branches were found by adversarial
 * review of the routing logic, not by observing a target. The routing hole is real and silent, which is why
 * the check ships; it does not warrant spending gate-failing severity in the minor that introduces it.
 *
 * `objective` provenance: whether a file parses is the most objective property in the codebase, and the
 * mixed condition is a string comparison over declared sources.
 */
export const meta = {
  id: "catalogue-manifest-shape",
  tier: "universal",
  reqId: "U17",
  since: "0.14",
  provenance: "objective",
};

/**
 * ACTIVATION-NEUTRAL by construction: it states what the migration is ABOUT and never claims a cap is
 * currently in force. Under `--strict` the pin is undefined, nothing binds, and the finding is a LIVE
 * ERROR while this static metadata is still visible in `--json` - so a reason asserting "capped at warn
 * until you pin" would be false on screen. The run-specific `migrationNotice` is what may describe an
 * active cap. Round 17 of the v1.13.0 review caught exactly this wording on `U1`'s `selfValidation`
 * subrule, and E35 records it.
 */
const CATALOGUE_SHAPE_MIGRATION = Object.freeze({
  capAt: "warn",
  until: "0.15",
  reason: "U17 (catalogue manifest shape) is introduced at Standard 0.14 and gates at 0.15",
});

const report = (message) =>
  finding(meta.id, SEVERITY.ERROR, message, {
    file: MANIFEST_REL,
    reqId: meta.reqId,
    migration: CATALOGUE_SHAPE_MIGRATION,
  });

/**
 * U17 (Standard sec 12): a `.claude-plugin/marketplace.json` that is present MUST be readable by exactly one
 * scope. Three branches, all emitting `error`.
 *
 * It reads and parses the file itself rather than taking it from `ctx`, because the loader does not carry
 * `marketplace.json` - and adding a CATALOGUE artifact to the plugin context for one consumer would be the
 * wrong shape. Vacuous when the file is absent.
 *
 * Neither `detectMarketplaceScope` nor `resolveRegistrationSource` changes. The disjointness rule stays
 * exactly as written; this reports the cases the partition does not cover rather than extending it to cover
 * them, which is the difference between this design and the rejected "legal and gradeable by both".
 */
export function check(ctx) {
  const manifestPath = path.join(ctx.root, ".claude-plugin", "marketplace.json");
  if (!existsSync(manifestPath)) return [];

  let data;
  try {
    data = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch (err) {
    // The parser's own message, truncated. "Does not parse" without a position is unactionable on a
    // large file, and this is the one branch where the tool knows exactly where the author should look.
    const detail = String(err?.message ?? err).slice(0, 160);
    return [
      report(
        `${MANIFEST_REL} is present but does not parse as JSON (${detail}). Marketplace scope declines a catalogue it cannot read and U13 falls through on a parse error by design, so its entries are catalogued by NOTHING.`
      ),
    ];
  }

  if (!Array.isArray(data?.plugins)) {
    return [
      report(
        `${MANIFEST_REL} is present but has no "plugins" array; a catalogue with no entry list is read by no scope, so nothing it declares is examined.`
      ),
    ];
  }

  // An entry with NO usable `source` is a shape error, not something to quietly drop (wave-1 finding).
  // The first version filtered these out before partitioning, so `[{source:"./skills/a"},{name:"b"}]`
  // left one skill entry and zero others, was not "mixed", and reported nothing - while `U13` claimed
  // the manifest (a source resolves under skills/) and ignored that entry too, and marketplace scope
  // declined the whole file. The entry was examined by NO scope, which is precisely the routing hole
  // this check exists to close, passing cleanly.
  const unroutable = data.plugins.filter((e) => typeof e?.source !== "string" && typeof e?.source !== "object");
  if (unroutable.length > 0) {
    const names = unroutable.map((e, i) => (typeof e?.name === "string" ? e.name : `plugins[${i}]`));
    return [
      report(
        `${MANIFEST_REL} has ${unroutable.length} entry/entries with no usable "source" (${names.join(", ")}); no scope can route an entry it cannot classify, so nothing examines it. Give every entry a source, or remove it.`
      ),
    ];
  }

  const declared = data.plugins;
  const skillEntries = declared.filter((e) => underSkills(e.source));
  const otherEntries = declared.filter((e) => !underSkills(e.source));
  if (skillEntries.length > 0 && otherEntries.length > 0) {
    return [
      report(
        `${MANIFEST_REL} MIXES entry kinds: ${skillEntries.length} resolve under skills/ and ${otherEntries.length} point elsewhere. ` +
          `A catalogue of skills is read by U13 and a catalogue of plugins by marketplace scope, and a mixed one is claimed ENTIRELY by the first - ` +
          `so the plugin entries are catalogued by nothing and are never collection-graded. Split it into one manifest per kind.`
      ),
    ];
  }

  return [];
}
