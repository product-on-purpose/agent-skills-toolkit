// what-it-is:   the instruction-budget check (U7)
// what-it-does: asserts each skill body stays within the instruction budget so later steps are not silently dropped
// why:          enforces the Standard requirement U7 deterministically, one module per reqId, so the gate stays model-free
// scope-note:  skills only, BY DECISION (ADR 0048). A command is not a skill and is not held to the skill
//               budget: measured across the reference family, commands run a median 172 words against a
//               median 799 for skills, and not one of the fourteen exceeds the median skill - so the rule
//               would have no subjects. Widening this is a change of subject, not a bug fix
// used-by:      registered in scripts/lib/registry.mjs; run by scripts/check.mjs and tier-report.mjs
import { finding, SEVERITY } from "../lib/findings.mjs";
import { relPath } from "../lib/fs-utils.mjs";

export const meta = { id: "instruction-budget", tier: "universal", reqId: "U7", since: "0.x", provenance: "vendor-cited" };
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
