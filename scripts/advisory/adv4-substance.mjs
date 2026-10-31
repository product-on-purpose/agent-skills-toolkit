// what-it-is:   ADV4 - substance signals (ADR 0063 sec 2; backlog E61, "the tier certifies file shape")
// what-it-does: flags a skill body under a word-count floor, a description duplicated across sibling
//               skills in the same plugin, and a body matching a generic placeholder-text catalogue.
//               Also exports measure(ctx), the RAW per-skill signal the health number's substance
//               category reads (ADR 0063 sec 3: "health reads measurements, not severities") - it is
//               computed straight from ctx, never from this module's own check() findings, so a
//               profile or suppression that silences a finding can never change the measurement.
// why:          E61 showed `tests/fixtures/audit-corpus/potemkin-gold/` - 33 placeholder files that
//               satisfy every structural Advanced-tier requirement - earns Advanced, 0 errors, 0
//               warnings. Nothing in the spine reads a skill BODY for substance. This is HOUSE
//               provenance (ADR 0063 sec 2): no vendor sets a body-length floor or a similarity
//               threshold, the same reason ADR 0029 reclassified U5's description scorer as house.
// used-by:      scripts/lib/advisory-registry.mjs (ADVISORY_MODULES); scripts/lib/health-score.mjs
//               (measure(), for the substance health category); covered by
//               tests/unit/advisory-adv4-substance.test.mjs and tests/unit/health-score.test.mjs
import { finding, SEVERITY } from "../lib/findings.mjs";
import { relPath } from "../lib/fs-utils.mjs";
import { triggerTokens, jaccard } from "../lib/marketplace/analyze.mjs";

export const meta = { advisoryId: "ADV4", provenance: "house" };

/**
 * Pre-registered 2026-10-30 (ADR 0063 sec 4: "cut points are pre-registered, and fixed before either
 * [falsifiable] test runs"). A skill body at or under this many words is flagged. Chosen to be well
 * clear of a real stub skill's shortest honest body (the family's shortest live skill body, measured
 * 2026-10-30, runs to several sentences) while still catching a one-line placeholder such as
 * potemkin-gold's "Do nothing." (2 words).
 */
export const BODY_WORD_FLOOR = 20;

/**
 * Pre-registered 2026-10-30. Two sibling skill descriptions at or above this Jaccard similarity (over
 * the SAME tokeniser ADR 0039's triggerSurfaceOverlap() uses, imported rather than reimplemented) are
 * flagged as duplicated. Deliberately NOT triggerSurfaceOverlap's own 0.5 default (ADR 0063 sec 2:
 * "It does not inherit triggerSurface's default threshold... Its threshold is a cut point fixed under
 * section 4") - sibling descriptions inside one plugin legitimately share more vocabulary (the same
 * product, the same prefix) than two unrelated plugins' skills ever would, so the bar is higher.
 */
export const DESCRIPTION_DUPLICATE_THRESHOLD = 0.7;

/**
 * A GENERIC placeholder-text catalogue - never a literal string lifted from any one fixture (ADR 0063
 * sec 4: "No placeholder matcher may contain the fixture's literal strings, such as `Do nothing.`").
 * Deliberately does NOT contain "do nothing": the potemkin-gold fixture's own body must be caught (if
 * at all) only by the word-count floor and the description-duplicate signal below, never by this
 * catalogue recognising its exact words - the falsifiable test for this is
 * tests/unit/advisory-adv4-substance.test.mjs's "the catalogue does not special-case potemkin-gold".
 */
export const PLACEHOLDER_PHRASES = Object.freeze([
  "lorem ipsum", "placeholder text", "placeholder content", "coming soon", "not yet implemented",
  "not implemented", "under construction", "work in progress", "tbd", "to be determined",
  "replace this text", "replace this with", "example content goes here", "fixme", "xxxxx",
]);

function wordCount(body) {
  return (body ?? "").trim().split(/\s+/).filter(Boolean).length;
}

function hasPlaceholderPhrase(body) {
  const lower = (body ?? "").toLowerCase();
  return PLACEHOLDER_PHRASES.some((p) => lower.includes(p));
}

function liveSkills(ctx) {
  // Mirrors adv1-portability.mjs's guard: a skill whose SKILL.md failed to parse is U3's finding, not
  // this one's - reporting substance signals from a document that never parsed would invent evidence.
  return (ctx.skills ?? []).filter((s) => !s.parseError);
}

/** Every unordered pair of distinct skills, for the description-duplicate signal. */
function pairs(list) {
  const out = [];
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) out.push([list[i], list[j]]);
  }
  return out;
}

export function check(ctx) {
  const out = [];
  const skills = liveSkills(ctx);

  for (const s of skills) {
    const words = wordCount(s.body);
    if (words <= BODY_WORD_FLOOR) {
      out.push(finding(
        "adv4-substance-body-length", SEVERITY.WARN,
        `SKILL.md body for "${s.name}" is ${words} word(s), at or under the ${BODY_WORD_FLOOR}-word substance floor. ` +
        `A body this short is unlikely to tell an agent how to do the thing the skill claims to do.`,
        { file: relPath(ctx.root, s.skillMdPath) }
      ));
    }
    if (hasPlaceholderPhrase(s.body)) {
      out.push(finding(
        "adv4-substance-placeholder-body", SEVERITY.WARN,
        `SKILL.md body for "${s.name}" matches a generic placeholder-text pattern (house catalogue, ` +
        `never fixture-specific). This is a note about the body's wording, not a defect anyone else can file.`,
        { file: relPath(ctx.root, s.skillMdPath) }
      ));
    }
  }

  for (const [a, b] of pairs(skills)) {
    const score = jaccard(triggerTokens(a.frontmatter?.description), triggerTokens(b.frontmatter?.description));
    if (score >= DESCRIPTION_DUPLICATE_THRESHOLD) {
      out.push(finding(
        "adv4-substance-description-duplicate", SEVERITY.WARN,
        `SKILL.md descriptions for "${a.name}" and "${b.name}" are ${Math.round(score * 100)}% similar ` +
        `(Jaccard over description tokens; threshold ${DESCRIPTION_DUPLICATE_THRESHOLD}). An agent routing on ` +
        `description alone cannot tell these two skills apart.`,
        { file: relPath(ctx.root, a.skillMdPath) }
      ));
    }
  }
  return out;
}

/**
 * The RAW per-skill substance measurement the health number's substance category reads (ADR 0063 sec 3).
 * Computed straight from ctx - never from check()'s findings and never from resolveFindings' output -
 * so a profile, a suppression, or the Standard ceiling can never move this number. `null` when there is
 * nothing to measure (no parseable skill), which the health category reports as `not-applicable`.
 * @returns {{componentCount:number, underFloorCount:number, placeholderCount:number, duplicateDescriptionCount:number, flaggedCount:number} | null}
 */
export function measure(ctx) {
  const skills = liveSkills(ctx);
  if (skills.length === 0) return null;

  const underFloor = new Set();
  const placeholder = new Set();
  for (const s of skills) {
    if (wordCount(s.body) <= BODY_WORD_FLOOR) underFloor.add(s.name);
    if (hasPlaceholderPhrase(s.body)) placeholder.add(s.name);
  }
  const duplicate = new Set();
  for (const [a, b] of pairs(skills)) {
    const score = jaccard(triggerTokens(a.frontmatter?.description), triggerTokens(b.frontmatter?.description));
    if (score >= DESCRIPTION_DUPLICATE_THRESHOLD) { duplicate.add(a.name); duplicate.add(b.name); }
  }
  const flagged = new Set([...underFloor, ...placeholder, ...duplicate]);
  return {
    componentCount: skills.length,
    underFloorCount: underFloor.size,
    placeholderCount: placeholder.size,
    duplicateDescriptionCount: duplicate.size,
    flaggedCount: flagged.size,
  };
}
