import { finding, SEVERITY } from "../lib/findings.mjs";
import { relPath } from "../lib/fs-utils.mjs";

export const meta = { id: "instruction-budget", tier: "universal", reqId: "U7" };
export const MAX_LINES = 500; // approximate budget; a trailing newline is not counted

export function check(ctx) {
  const out = [];
  for (const s of ctx.skills) {
    const lines = (s.body || "").replace(/\r?\n$/, "").split(/\r?\n/).length;
    if (lines > MAX_LINES) {
      const file = relPath(ctx.root, s.skillMdPath);
      out.push(finding(meta.id, SEVERITY.WARN, `SKILL.md body is ${lines} lines (> ${MAX_LINES}); move deep content into references/ (Standard sec 1, 3.1).`, { file, reqId: "U7" }));
    }
  }
  return out;
}
