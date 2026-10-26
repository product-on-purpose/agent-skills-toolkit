// what-it-is:   ADV1 - portability (ADR 0063 sec 2; backlog E86, "a SKILL.md portable here can
//               hard-fail on claude.ai")
// what-it-does: flags a top-level SKILL.md frontmatter key outside the Skills API's six-field
//               whitelist. A key nested under `metadata` is always allowed, because the whitelist
//               governs the TOP LEVEL only.
// why:          STANDARD.md sec 3.1 and sec 6 claim the Universal tier is "portable across Claude
//               Code and Codex unchanged". claude.ai and the Skills API hard-reject any top-level
//               SKILL.md key outside their six-field spec, with no warning - a skill that passes this
//               toolkit's gate can still fail the moment it is uploaded there. This is an ADVISORY
//               finding (never a gate failure) because Claude Code itself accepts every one of those
//               fields: it is a note about one runtime, not a defect (ADR 0063 sec 2, "ADV1 is a note
//               about one runtime, not a defect").
// used-by:      scripts/lib/advisory-registry.mjs (ADVISORY_MODULES); covered by
//               tests/unit/advisory-adv1-portability.test.mjs
import { finding, SEVERITY } from "../lib/findings.mjs";
import { relPath } from "../lib/fs-utils.mjs";

/**
 * The Skills API's six-field frontmatter whitelist, read verbatim off
 * https://code.claude.com/docs/en/skills (fetched 2026-10-25 with the same accept header
 * scripts/vendor-watch.mjs uses). The page's own error-message example, reproduced EXACTLY as the
 * page renders it (the code block carries no trailing period after "name"):
 *
 *   Unexpected key(s) in SKILL.md frontmatter: argument-hint. Allowed properties are: allowed-tools,
 *   compatibility, description, license, metadata, name
 *
 * This is the same sentence the quote claim `skills-api-frontmatter-whitelist` pins in
 * foundation/claims/vendor-claims.json, and tests/unit/advisory-adv1-portability.test.mjs derives
 * this constant FROM that claim's text, so the two cannot drift apart.
 *
 * Sorted alphabetically, matching both the vendor's own listing order and ADR 0063 sec 2's table.
 */
export const SKILLS_API_WHITELIST = Object.freeze([
  "allowed-tools", "compatibility", "description", "license", "metadata", "name",
]);

const WHITELIST_SET = new Set(SKILLS_API_WHITELIST);

/**
 * ADV1's advisoryId and provenance. `provenance` is also looked up from
 * scripts/lib/advisory-registry.mjs's own ADVISORY_BY_ID at run time - it is repeated here only so a
 * reader of this file alone sees the right answer, never as a second source of truth runAdvisoryModules
 * trusts.
 */
export const meta = { advisoryId: "ADV1", provenance: "vendor-cited" };

/**
 * NOT IN SCOPE (ADR 0063 sec 2, "ADV1's two sources are separate pages"): `platform.claude.com`'s
 * Agent Skills page also states that a Skills API `name` field "Cannot contain reserved words:
 * \"anthropic\", \"claude\"\"". That text is a bullet fragment, not a complete sentence, so it would
 * need a `probe` claim rather than a `quote`, which starts its own 30-day freshness clock. The
 * maintainer has not ruled on minting that third vendor probe - see
 * docs/internal/roadmap.md section 7 ("Blocked and awaiting a ruling"), "One item awaits a maintainer
 * ruling as of 2026-10-25: whether ADV1 (portability) mints a third vendor probe." This module screens
 * ONLY the whitelist half. It adds no reserved-word matcher, no platform.claude.com source, and no
 * probe claim; doing any of those is deferred to that ruling.
 */
export function check(ctx) {
  const out = [];
  for (const s of ctx.skills ?? []) {
    // An unparseable frontmatter is U3's finding (frontmatter-valid), not this one's: reporting a key
    // list from a document that failed to parse would be inventing evidence. Mirrors
    // scripts/checks/metadata-placement.mjs's guard.
    if (s.parseError) continue;
    const fm = s.frontmatter;
    if (!fm || typeof fm !== "object" || Array.isArray(fm)) continue;
    const offending = Object.keys(fm).filter((k) => !WHITELIST_SET.has(k)).sort();
    if (offending.length === 0) continue;
    const file = relPath(ctx.root, s.skillMdPath);
    out.push(finding(
      "adv1-portability", SEVERITY.WARN,
      `SKILL.md frontmatter declares ${offending.map((k) => `\`${k}\``).join(", ")} at the top level. ` +
      `claude.ai and the Skills API reject this: "Unexpected key(s) in SKILL.md frontmatter: ${offending[0]}. ` +
      `Allowed properties are: ${SKILLS_API_WHITELIST.join(", ")}" (https://code.claude.com/docs/en/skills). ` +
      `Claude Code itself accepts ${offending.length === 1 ? "this field" : "these fields"} - this is a note about one runtime, not a defect.`,
      { file }
    ));
  }
  return out;
}
