import { finding, SEVERITY } from "../lib/findings.mjs";
import path from "node:path";

export const meta = { id: "description-score", tier: "universal", reqId: "U5" };
export const THRESHOLD = 0.7;

const ANTI = /\b(helps with|handles|deals with|manages stuff|various things)\b/i;
const WHEN = /\b(use when|use this when|when the user|when you need|for when)\b/i;
const ACTION = /\b(creates?|generates?|converts?|validates?|builds?|renders?|extracts?|summari[sz]es?|formats?|analy[sz]es?|produces?|writes?)\b/i;
const FIRST_PERSON = /\b(I |you should|you can|we )\b/;

/** Heuristic 0-1 score per Standard sec 8.1. */
export function scoreDescription(desc) {
  if (typeof desc !== "string" || desc.trim().length === 0) return 0;
  let score = 0;
  if (ACTION.test(desc)) score += 0.35;
  if (WHEN.test(desc)) score += 0.35;
  if (/[a-z]{4,}/i.test(desc) && desc.split(/\s+/).length >= 8) score += 0.2;
  if (!FIRST_PERSON.test(desc)) score += 0.1;
  if (ANTI.test(desc)) score -= 0.4;
  if (/[<>]/.test(desc) || /\b[A-Z]{4,}\b/.test(desc)) score -= 0.1;
  return Math.max(0, Math.min(1, score));
}

export function check(ctx) {
  const out = [];
  for (const s of ctx.skills) {
    const desc = s.frontmatter?.description;
    if (typeof desc !== "string") continue;
    const score = scoreDescription(desc);
    if (score < THRESHOLD) {
      const file = path.relative(ctx.root, s.skillMdPath).split(path.sep).join("/");
      out.push(finding(meta.id, SEVERITY.WARN, `description scores ${score.toFixed(2)} (< ${THRESHOLD}); state what it does AND when to use it, with concrete trigger keywords (Standard sec 8.1).`, { file, reqId: "U5" }));
    }
  }
  return out;
}
