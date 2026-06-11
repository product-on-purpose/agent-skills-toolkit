// what-it-is:   the description-score check (U5)
// what-it-does: scores each skill description and warns below the quality bar (a concrete action plus a use-when trigger)
// why:          enforces the Standard requirement U5 deterministically, one module per reqId, so the gate stays model-free
// used-by:      registered in scripts/lib/registry.mjs; run by scripts/check.mjs and tier-report.mjs
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
    const score = scoreDescription(desc);
    if (score < THRESHOLD) {
      const file = relPath(ctx.root, s.skillMdPath);
      out.push(finding(meta.id, SEVERITY.WARN, `description scores ${score.toFixed(2)} (< ${THRESHOLD}); state what it does AND when to use it, with concrete trigger keywords (Standard sec 8.1).`, { file, reqId: "U5" }));
    }
  }
  return out;
}
