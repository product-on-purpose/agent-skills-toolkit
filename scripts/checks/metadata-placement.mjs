// what-it-is:   U16 - a Standard sec 3.7 key declared at the TOP LEVEL of component frontmatter (ADR 0050)
// what-it-does: reports each sec 3.7 key found outside the `metadata` map, distinguishing a declaration that is
//               silently lost from one that is shadowed by a correct nested copy
// why:          the frontmatter VOCABULARY is open by decision - 44.9% of 2342 measured skills carry a key the
//               Standard does not name, and `metadata` is an explicitly arbitrary map upstream - so an unknown
//               key is not a defect. A KNOWN key in the wrong PLACE is: nothing reads it there, and the author
//               believes they declared something. Same silent-no-op class as U14
// used-by:      scripts/lib/registry.mjs (the CHECKS array); covered by tests/unit/metadata-placement.test.mjs
import { finding, SEVERITY } from "../lib/findings.mjs";
import { relPath } from "../lib/fs-utils.mjs";

/**
 * `since: "0.14"`, no `migration` metadata: a NEW check, so `since` alone is the window under ADR 0044's
 * reordering. `house` provenance, not `vendor-cited` - sec 3.7's placement is this Standard's convention,
 * and the version that WOULD earn a vendor citation (rejecting keys the runtime is known to ignore) is not
 * available, because agentskills.io publishes no closed skill-frontmatter field list. If it ever does,
 * ADR 0050's Option C becomes live and this decision should be revisited.
 */
export const meta = {
  id: "metadata-placement",
  tier: "universal",
  reqId: "U16",
  since: "0.14",
  provenance: "house",
};

/**
 * Standard sec 3.7, verbatim. `chain` is included because ADR 0041 placed it in the same namespace and
 * `chain-contract.mjs` still carries a legacy top-level fallback - that fallback keeps READING a misplaced
 * `chain`, and this check is what finally TELLS the author it is misplaced. The two are complementary, not
 * redundant: removing the fallback would be a red-ward behaviour change and belongs to its own decision.
 */
const SEC_37_KEYS = Object.freeze([
  "version",
  "updated",
  "tier",
  "audience",
  "category",
  "agent-targets",
  "status",
  "deprecated-by",
  "remove-in",
  "chain",
]);

/**
 * U16 (Standard sec 3.7): a key this Standard places under `metadata` MUST NOT be declared at the top level
 * of a component's frontmatter.
 *
 * TWO MESSAGES, because two situations. Where the key is ONLY at the top level the declaration is silently
 * LOST and the message names the destination. Where it appears in BOTH places the nested copy is read and
 * the top-level one is dead weight that can drift from it. One message would be wrong for one of them.
 *
 * `Object.hasOwn`, never `?? null` or a truthiness test: an explicit top-level `version: null` is still a
 * declaration in the wrong place, and `?? null` cannot distinguish an absent key from a null one. That is
 * the presence-not-nullishness rule the v1.13.0 round-8 fix established.
 *
 * Reads `ctx.skills` only, BY DECISION and not by omission (ADR 0050 point 6). Extending component
 * frontmatter checks to `agents/` is E22's open question and this ADR does not pre-empt it. Without this
 * note, a `for (const s of ctx.skills)` loop reads as the same defect E42 found in the agent checks and
 * gets "fixed".
 */
export function check(ctx) {
  const out = [];
  for (const s of ctx.skills ?? []) {
    if (s.parseError) continue; // an unparseable frontmatter is U3's finding, not this one's
    const fm = s.frontmatter;
    if (!fm || typeof fm !== "object" || Array.isArray(fm)) continue;
    const nested = fm.metadata && typeof fm.metadata === "object" && !Array.isArray(fm.metadata) ? fm.metadata : null;
    const file = relPath(ctx.root, s.skillMdPath);
    for (const key of SEC_37_KEYS) {
      if (!Object.hasOwn(fm, key)) continue;
      const shadowed = nested !== null && Object.hasOwn(nested, key);
      out.push(
        finding(
          meta.id,
          SEVERITY.ERROR,
          shadowed
            ? `frontmatter declares "${key}" at the top level AND under "metadata"; only the nested one is read, so the top-level copy is dead weight that can silently drift from it (Standard sec 3.7).`
            : `frontmatter declares "${key}" at the top level; Standard sec 3.7 places it under "metadata", so nothing reads it and the declaration is silently lost. Move it to metadata.${key}.`,
          { file, reqId: meta.reqId }
        )
      );
    }
  }
  return out;
}
