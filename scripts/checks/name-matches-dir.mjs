// what-it-is:   the name-matches-dir check (U4)
// what-it-does: asserts each skill's frontmatter name equals its directory name so it is unambiguous once emitted
// why:          enforces the Standard requirement U4 deterministically, one module per reqId, so the gate stays model-free
// used-by:      registered in scripts/lib/registry.mjs; run by scripts/check.mjs and tier-report.mjs
import { finding, SEVERITY } from "../lib/findings.mjs";
import { relPath } from "../lib/fs-utils.mjs";

export const meta = { id: "name-matches-dir", tier: "universal", reqId: "U4", since: "0.x" };

export function check(ctx) {
  const out = [];
  for (const s of ctx.skills) {
    if (s.parseError || !s.frontmatter || typeof s.frontmatter.name !== "string") continue;
    if (s.frontmatter.name !== s.name) {
      const file = relPath(ctx.root, s.skillMdPath);
      out.push(finding(meta.id, SEVERITY.ERROR, `frontmatter name "${s.frontmatter.name}" must equal the directory name "${s.name}" (Standard sec 3.1).`, { file, reqId: "U4" }));
    }
  }
  return out;
}
