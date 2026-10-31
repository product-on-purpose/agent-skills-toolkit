// what-it-is:   ADV4 - substance signals (ADR 0063 sec 2; backlog E61, "the tier certifies file shape")
// what-it-does: flags a skill body under a word-count floor, a description duplicated across sibling
//               skills in the same plugin, and a body matching a generic placeholder-text catalogue.
//               Also exports measure(ctx), the RAW per-skill signal the health number's substance
//               category reads (ADR 0063 sec 3: "health reads measurements, not severities") - it is
//               computed straight from ctx, never from this module's own check() findings, so a
//               profile or suppression that silences a finding can never change the measurement.
//               check() calls measure() exactly once and builds its findings from that single result
//               (W6 post-merge-review finding 8): the body-length/placeholder scan and the O(n^2)
//               pairwise description-similarity scan each ran TWICE per module invocation before this
//               change - once inside check()'s own loop, once inside measure()'s own loop, computing
//               the same signal independently both times. There is now exactly one pass.
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
import { BODY_WORD_FLOOR, DESCRIPTION_DUPLICATE_THRESHOLD } from "../lib/health-constants.mjs";

// Re-exported verbatim (W6 finding 10: these are pre-registered DATA, moved to the leaf module
// scripts/lib/health-constants.mjs so this file and scripts/lib/advisory-registry.mjs can both import
// them with no cycle - advisory-registry.mjs already imports THIS file for ADVISORY_MODULES). Every
// existing import of BODY_WORD_FLOOR/DESCRIPTION_DUPLICATE_THRESHOLD from this module keeps working.
export { BODY_WORD_FLOOR, DESCRIPTION_DUPLICATE_THRESHOLD };

export const meta = { advisoryId: "ADV4", provenance: "house" };

/**
 * A GENERIC placeholder-text catalogue - never a literal string lifted from any one fixture (ADR 0063
 * sec 4: "No placeholder matcher may contain the fixture's literal strings, such as `Do nothing.`").
 * Deliberately does NOT contain "do nothing": the potemkin-gold fixture's own body must be caught (if
 * at all) only by the word-count floor and the description-duplicate signal below, never by this
 * catalogue recognising its exact words - the falsifiable test for this is
 * tests/unit/advisory-adv4-substance.test.mjs's "the catalogue does not special-case potemkin-gold".
 *
 * Matched POSITIONALLY (W6 finding 4), never as a substring anywhere in a body: a phrase fires only
 * when it is the WHOLE content of one paragraph, after stripping markdown markers and trailing
 * punctuation - see matchesPlaceholderParagraph() below. A plain substring/word-boundary match flags
 * ordinary prose that discusses the words rather than being a placeholder, e.g. an instructional body
 * that says "If a feature is not implemented yet, say so" - "not implemented" sits at a word boundary
 * there, so only POSITION (a whole paragraph, not a clause inside a longer sentence) tells the two
 * apart. This is the same kind of fix ADV3 already shipped for its own false-positive case: ADV3 never
 * flags documentation that merely DISCUSSES an attack pattern, because its scope rule excludes doc
 * prose from being scanned at all (scripts/advisory/adv3-security.mjs's header, "the committed negative
 * fixture that exercises exactly that exclusion"). ADV4 cannot exclude a skill body by location the way
 * ADV3 excludes root docs/ by directory - the placeholder signal's whole job is to read bodies - so its
 * analogous rule is positional within the body: a real placeholder stub IS the paragraph, where prose
 * that discusses the same words is never the WHOLE paragraph.
 */
export const PLACEHOLDER_PHRASES = Object.freeze([
  "lorem ipsum", "placeholder text", "placeholder content", "coming soon", "not yet implemented",
  "not implemented", "under construction", "work in progress", "tbd", "to be determined",
  "replace this text", "replace this with", "example content goes here", "fixme", "xxxxx",
]);

const PLACEHOLDER_PHRASE_SET = new Set(PLACEHOLDER_PHRASES);

/**
 * Word count, Unicode-aware (W6 finding 1). `Intl.Segmenter`'s "word" granularity breaks CJK text into
 * one segment per character cluster (there are no spaces to split on), and `isWordLike` excludes pure
 * punctuation/whitespace segments - so a substantive Chinese or Japanese body counts as many words, not
 * one. The previous implementation split on `/\s+/`, which reads an entire space-free CJK paragraph as
 * a SINGLE "word" regardless of its length, putting any real CJK skill body at or under
 * BODY_WORD_FLOOR - the exact false positive `tests/unit/advisory-adv4-substance.test.mjs`'s
 * non-English fixture test now pins. Falls back to the whitespace split only in an environment with no
 * `Intl.Segmenter` (none this toolkit's supported Node baseline ships, but a module-load-time throw
 * over a word count would be a disproportionate failure mode for an advisory signal).
 */
const WORD_SEGMENTER =
  typeof Intl !== "undefined" && typeof Intl.Segmenter === "function"
    ? new Intl.Segmenter(undefined, { granularity: "word" })
    : null;

function wordCount(body) {
  const text = (body ?? "").trim();
  if (!text) return 0;
  if (WORD_SEGMENTER) {
    let n = 0;
    for (const seg of WORD_SEGMENTER.segment(text)) if (seg.isWordLike) n++;
    return n;
  }
  return text.split(/\s+/).filter(Boolean).length;
}

/**
 * Strip markdown decoration a placeholder paragraph is commonly wrapped in - a heading marker, a list
 * marker, surrounding bold/italic/code, and trailing sentence punctuation - then collapse internal
 * whitespace (a paragraph may itself span a soft-wrapped line break) and lower-case. Deliberately only
 * strips wrapping at the ENDS of the paragraph, never mid-paragraph markup, because the rule this
 * supports is "the whole paragraph IS the phrase", not "the phrase appears somewhere in the paragraph".
 */
function normalizeParagraph(paragraph) {
  return paragraph
    .replace(/\r?\n/g, " ")
    .trim()
    .replace(/^#{1,6}\s+/, "")
    .replace(/^[-*+]\s+/, "")
    .replace(/^\d+[.)]\s+/, "")
    .replace(/^\*\*(.*)\*\*$/, "$1")
    .replace(/^__?(.*)__?$/, "$1")
    .replace(/^`+(.*)`+$/, "$1")
    .trim()
    .replace(/[.!?]+$/, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** True iff some WHOLE paragraph of `body` - never a clause inside a longer one - normalizes to exactly
 * one of PLACEHOLDER_PHRASES (see that constant's docblock for why position, not substring). */
function hasPlaceholderPhrase(body) {
  const text = body ?? "";
  for (const paragraph of text.split(/\r?\n\s*\r?\n/)) {
    const normalized = normalizeParagraph(paragraph);
    if (normalized && PLACEHOLDER_PHRASE_SET.has(normalized)) return true;
  }
  return false;
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

/** The identity a finding/measurement groups a skill BY (W6 finding 13): the skill's own file path,
 * never its declared `name`. Two different skills in two different roots that happen to share a `name`
 * (a marketplace-scope grade of several members, or a test building two ad-hoc skill objects by hand)
 * are two distinct components and must be counted as two, not folded into one Set entry that silently
 * drops the second. */
function keyOf(ctx, skill) {
  return relPath(ctx.root, skill.skillMdPath);
}

/**
 * The RAW per-skill substance measurement the health number's substance category reads (ADR 0063 sec 3),
 * and the single source `check()` below builds its findings from (W6 finding 8: one pass, not two).
 * Computed straight from ctx - never from resolved findings' output - so a profile, a suppression, or
 * the Standard ceiling can never move this number. `null` when there is nothing to measure (no
 * parseable skill), which the health category reports as `not-applicable`.
 * @returns {{componentCount:number, underFloorCount:number, placeholderCount:number,
 *   duplicateDescriptionCount:number, flaggedCount:number,
 *   details:{underFloor:Array<{skill:object,words:number}>, placeholder:Array<{skill:object}>,
 *   duplicatePairs:Array<{a:object,b:object,score:number}>}} | null}
 */
export function measure(ctx) {
  const skills = liveSkills(ctx);
  if (skills.length === 0) return null;

  const underFloor = new Map(); // key -> { skill, words }
  const placeholder = new Map(); // key -> { skill }
  for (const s of skills) {
    const key = keyOf(ctx, s);
    const words = wordCount(s.body);
    if (words <= BODY_WORD_FLOOR) underFloor.set(key, { skill: s, words });
    if (hasPlaceholderPhrase(s.body)) placeholder.set(key, { skill: s });
  }

  const duplicate = new Map(); // key -> { skill }
  const duplicatePairs = [];
  for (const [a, b] of pairs(skills)) {
    const score = jaccard(triggerTokens(a.frontmatter?.description), triggerTokens(b.frontmatter?.description));
    if (score >= DESCRIPTION_DUPLICATE_THRESHOLD) {
      duplicate.set(keyOf(ctx, a), { skill: a });
      duplicate.set(keyOf(ctx, b), { skill: b });
      duplicatePairs.push({ a, b, score });
    }
  }

  const flagged = new Set([...underFloor.keys(), ...placeholder.keys(), ...duplicate.keys()]);
  return {
    componentCount: skills.length,
    underFloorCount: underFloor.size,
    placeholderCount: placeholder.size,
    duplicateDescriptionCount: duplicate.size,
    flaggedCount: flagged.size,
    details: {
      underFloor: [...underFloor.values()],
      placeholder: [...placeholder.values()],
      duplicatePairs,
    },
  };
}

export function check(ctx) {
  const m = measure(ctx);
  if (!m) return [];
  const out = [];

  for (const { skill: s, words } of m.details.underFloor) {
    out.push(finding(
      "adv4-substance-body-length", SEVERITY.WARN,
      `SKILL.md body for "${s.name}" is ${words} word(s), at or under the ${BODY_WORD_FLOOR}-word substance floor. ` +
      `A body this short is unlikely to tell an agent how to do the thing the skill claims to do.`,
      { file: relPath(ctx.root, s.skillMdPath) }
    ));
  }

  for (const { skill: s } of m.details.placeholder) {
    out.push(finding(
      "adv4-substance-placeholder-body", SEVERITY.WARN,
      `SKILL.md body for "${s.name}" matches a generic placeholder-text pattern (house catalogue, ` +
      `never fixture-specific). This is a note about the body's wording, not a defect anyone else can file.`,
      { file: relPath(ctx.root, s.skillMdPath) }
    ));
  }

  for (const { a, b, score } of m.details.duplicatePairs) {
    out.push(finding(
      "adv4-substance-description-duplicate", SEVERITY.WARN,
      `SKILL.md descriptions for "${a.name}" and "${b.name}" are ${Math.round(score * 100)}% similar ` +
      `(Jaccard over description tokens; threshold ${DESCRIPTION_DUPLICATE_THRESHOLD}). An agent routing on ` +
      `description alone cannot tell these two skills apart.`,
      { file: relPath(ctx.root, a.skillMdPath) }
    ));
  }

  return out;
}
