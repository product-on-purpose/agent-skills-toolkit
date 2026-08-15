// what-it-is:   the description-score check (U5)
// what-it-does: scores each skill description and warns below the quality bar (a concrete action plus a use-when
//               trigger), and DECLINES to score one it cannot read, per ADR 0049
// why:          enforces the Standard requirement U5 deterministically, one module per reqId, so the gate stays
//               model-free; declining is what keeps a low score a claim about the DESCRIPTION rather than a claim
//               about the scorer's vocabulary
// used-by:      registered in scripts/lib/registry.mjs; run by scripts/check.mjs and tier-report.mjs. check.mjs
//               additionally imports notScoredCount directly - the one check-specific import it makes - because
//               this is the only check that can decline, and a decline must not look like a pass
import { finding, SEVERITY } from "../lib/findings.mjs";
import { relPath } from "../lib/fs-utils.mjs";

export const meta = { id: "description-score", tier: "universal", reqId: "U5", since: "0.x", provenance: "house" };
export const THRESHOLD = 0.7;

const ANTI = /\b(helps with|handles|deals with|manages stuff|various things)\b/i;
// ADR 0033: "whenever" variants, "use this skill when(ever)", and "if the user <verb>" are real use-when
// triggers found in well-triggering corpus descriptions (anthropics/skills pdf).
const WHEN = /\b(use (?:this (?:skill )?)?when(?:ever)?|when(?:ever)? the user|when you need|for when|if the user (?:asks|mentions|wants|needs))\b/i;
// ADR 0033: each stem accepts its inflections (creates/creating/created), and the lexicon adds verbs
// evidenced by the eval-run corpora (draft, review, diagnose, merge, split, rotate, fill, encrypt/decrypt,
// run, plan, "help users <verb>", "break down"). A bare-stem-only list put strong third-party descriptions
// at exactly 0.65 across four independent corpora.
const ACTION = /\b(creat(?:e|es|ing|ed)|generat(?:e|es|ing|ed)|convert(?:s|ing|ed)?|validat(?:e|es|ing|ed)|build(?:s|ing)?|render(?:s|ing|ed)?|extract(?:s|ing|ed)?|summari[sz](?:e|es|ing|ed)|format(?:s|ting|ted)?|analy[sz](?:e|es|ing|ed)|produc(?:e|es|ing|ed)|writ(?:e|es|ing)|evaluat(?:e|es|ing|ed)|assess(?:es|ing|ed)?|audit(?:s|ing|ed)?|check(?:s|ing|ed)?|report(?:s|ing|ed)?|draft(?:s|ing|ed)?|review(?:s|ing|ed)?|diagnos(?:e|es|ing|ed)|merg(?:e|es|ing|ed)|split(?:s|ting)?|rotat(?:e|es|ing|ed)|fill(?:s|ing|ed)?|encrypt(?:s|ing|ed)?|decrypt(?:s|ing|ed)?|run(?:s|ning)?|plan(?:s|ning|ned)?|help(?:s|ing)? (?:users?|you|teams?|the user|PMs?) \w+|break(?:s)? down)\b/i;
const FIRST_PERSON = /\b(I |you should|you can|we )\b/;
// ADR 0033: penalize unfinished-placeholder tokens hard; a legitimate domain acronym (GDPR, CCPA) is a
// trigger keyword and is no longer penalized (the old blanket \b[A-Z]{4,}\b rule dinged exactly the
// keywords the remediation message asks authors to add).
const PLACEHOLDER = /\b(TODO|TBD|FIXME|XXX+|PLACEHOLDER|CHANGEME)\b/;

/**
 * ADR 0049. Both lexicons above are English, and `WHEN` is worth 0.35 of a 1.00 score against a 0.70
 * threshold, so a description the pattern cannot match caps at 0.65 and CANNOT PASS AT ANY QUALITY.
 * Measured on a 349-skill French corpus: `WHEN` fired on 0 of 346 parseable descriptions while 341 of
 * them carried an explicit French trigger clause. That is not a badly tuned check; it is an unreachable
 * threshold, and the finding it emits ("state what it does AND when to use it") is false of every one
 * of those descriptions.
 *
 * The question this answers is deliberately NARROWER than "what language is this": it is "can my
 * lexicons read this". Function words are the highest-frequency tokens of a language and are the
 * standard cheap language signal, so measuring the density of the ONE language the scorer already
 * assumes needs no detector, no dependency, and no second lexicon modelled anywhere.
 *
 * The floor is 0.10, chosen from a sensitivity sweep over 2068 descriptions in seven pinned corpora,
 * not picked. Median density is 0.000 on the French corpus and 0.233 on the largest English one. At
 * 0.10 the design withdraws 343 of 346 French findings and costs 3 descriptions in 1376 English; at
 * 0.15 the English cost is 62, and the descriptions lost between the two are legitimate keyword-dense
 * technical English ("Optimize paid advertising campaigns across Google Ads, Meta, TikTok, LinkedIn"
 * sits at 0.102) which U5 should still be scoring.
 *
 * Exported - both of them - because that calibration table is only reproducible if a test can call them.
 */
const EN_FUNCTION = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "with", "when",
  "this", "that", "it", "is", "are", "be", "as", "by", "from", "at", "into",
  "you", "your", "use", "using", "used", "them", "their", "its", "not", "no",
]);
export const READABLE_FLOOR = 0.1;

/** Fraction of a description's word tokens that are English function words. 0 for an empty token set. */
export function englishDensity(desc) {
  if (typeof desc !== "string") return 0;
  const toks = desc.toLowerCase().match(/[a-z']+/g) || [];
  if (toks.length === 0) return 0;
  return toks.filter((t) => EN_FUNCTION.has(t)).length / toks.length;
}

/**
 * How many of a plugin's skill descriptions U5 DECLINED to score. Presentation only: it is not a
 * finding, it carries no severity, and nothing derives a verdict from it. It exists because silence
 * and a pass must not look the same - a plugin whose descriptions are all unreadable would otherwise
 * be indistinguishable from one whose descriptions are all good.
 */
export function notScoredCount(ctx) {
  let n = 0;
  for (const s of ctx?.skills ?? []) {
    const desc = s.frontmatter?.description;
    if (typeof desc !== "string" || desc.length === 0) continue;
    if (englishDensity(desc) < READABLE_FLOOR) n += 1;
  }
  return n;
}

/** Heuristic 0-1 score per Standard sec 8.1. */
export function scoreDescription(desc) {
  if (typeof desc !== "string" || desc.trim().length === 0) return 0;
  let score = 0;
  if (ACTION.test(desc)) score += 0.35;
  if (WHEN.test(desc)) score += 0.35;
  if (/[a-z]{4,}/i.test(desc) && desc.split(/\s+/).length >= 8) score += 0.2;
  if (!FIRST_PERSON.test(desc)) score += 0.1;
  if (ANTI.test(desc)) score -= 0.4;
  if (PLACEHOLDER.test(desc)) score -= 0.4;
  if (/[<>]/.test(desc)) score -= 0.1;
  return Math.max(0, Math.min(1, score));
}

export function check(ctx) {
  const out = [];
  for (const s of ctx.skills) {
    const desc = s.frontmatter?.description;
    if (typeof desc !== "string" || desc.length === 0) continue;
    // NOT SCORED (ADR 0049). A score below the floor is indistinguishable from "not read", and only
    // one of those is a claim this check has evidence for. Emitting nothing is the honest result;
    // notScoredCount() above is what stops it being mistaken for a pass.
    if (englishDensity(desc) < READABLE_FLOOR) continue;
    const score = scoreDescription(desc);
    if (score < THRESHOLD) {
      const file = relPath(ctx.root, s.skillMdPath);
      out.push(finding(meta.id, SEVERITY.WARN, `description scores ${score.toFixed(2)} (< ${THRESHOLD}); state what it does AND when to use it, with concrete trigger keywords (Standard sec 8.1).`, { file, reqId: "U5" }));
    }
  }
  return out;
}
