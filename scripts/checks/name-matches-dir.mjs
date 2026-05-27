import { finding, SEVERITY } from "../lib/findings.mjs";
import { relPath } from "../lib/fs-utils.mjs";

export const meta = { id: "name-matches-dir", tier: "universal", reqId: "U4" };

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
