import { finding, SEVERITY } from "../lib/findings.mjs";

export const meta = { id: "instruction-budget", tier: "universal", reqId: "U7" };
export const MAX_LINES = 500;

export function check(ctx) {
  const out = [];
  for (const s of ctx.skills) {
    const lines = (s.body || "").split(/\r?\n/).length;
    if (lines > MAX_LINES) {
      out.push(finding(meta.id, SEVERITY.WARN, `SKILL.md body is ${lines} lines (> ${MAX_LINES}); move deep content into references/ (Standard sec 1, 3.1).`, { file: s.skillMdPath, reqId: "U7" }));
    }
  }
  return out;
}
