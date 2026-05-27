import { finding, SEVERITY } from "../lib/findings.mjs";
import path from "node:path";

export const meta = { id: "frontmatter-valid", tier: "universal", reqId: "U3" };

const NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function check(ctx) {
  const out = [];
  for (const s of ctx.skills) {
    const file = relish(s.skillMdPath, ctx.root);
    if (s.parseError) {
      out.push(finding(meta.id, SEVERITY.ERROR, `frontmatter does not parse: ${s.parseError}`, { file, reqId: "U3" }));
      continue;
    }
    const fm = s.frontmatter || {};
    if (typeof fm.name !== "string") out.push(finding(meta.id, SEVERITY.ERROR, "frontmatter is missing required string \"name\" (Standard sec 3.1).", { file, reqId: "U3" }));
    else if (fm.name.length > 64 || !NAME_RE.test(fm.name)) out.push(finding(meta.id, SEVERITY.ERROR, `"name" must be 1-64 chars, lowercase a-z/0-9/-, no leading/trailing/consecutive hyphen (got "${fm.name}").`, { file, reqId: "U3" }));
    if (typeof fm.description !== "string") out.push(finding(meta.id, SEVERITY.ERROR, "frontmatter is missing required string \"description\" (Standard sec 3.1).", { file, reqId: "U3" }));
    else if (fm.description.length < 1 || fm.description.length > 1024) out.push(finding(meta.id, SEVERITY.ERROR, `"description" must be 1-1024 chars (got ${fm.description.length}).`, { file, reqId: "U3" }));
  }
  return out;
}

function relish(abs, root) {
  return root ? path.relative(root, abs).split(path.sep).join("/") : abs;
}
