// what-it-is:   the frontmatter-valid check (U3)
// what-it-does: asserts each component's SKILL.md or agent frontmatter parses and carries a valid name and description
// note:         it validates the REQUIRED keys and says nothing about any other key, BY DECISION (ADR 0050). The
//               frontmatter vocabulary is OPEN: an unknown key is permitted at every tier and is neither
//               validated nor interpreted. Strictness was measured and rejected - 44.9% of 2342 skills across
//               thirteen sources carry a top-level key the Standard does not name, 58.2% carry an unknown
//               metadata.* key, and sec 3.7 calls the metadata map ARBITRARY, so rejecting unknown keys inside
//               it would contradict the upstream spec. What IS checked is PLACEMENT: U16 (metadata-placement)
//               reports a sec 3.7 key declared at the top level, where nothing reads it
// why:          enforces the Standard requirement U3 deterministically, one module per reqId, so the gate stays model-free
// used-by:      registered in scripts/lib/registry.mjs; run by scripts/check.mjs and tier-report.mjs
import { finding, SEVERITY } from "../lib/findings.mjs";
import { relPath } from "../lib/fs-utils.mjs";

export const meta = { id: "frontmatter-valid", tier: "universal", reqId: "U3", since: "0.x", provenance: "vendor-cited" };

const NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function check(ctx) {
  const out = [];
  for (const s of ctx.skills) {
    const file = relPath(ctx.root, s.skillMdPath);
    if (s.parseError) {
      out.push(finding(meta.id, SEVERITY.ERROR, `frontmatter does not parse: ${s.parseError}`, { file, reqId: "U3" }));
      continue;
    }
    const fm = s.frontmatter || {};
    if (typeof fm.name !== "string") out.push(finding(meta.id, SEVERITY.ERROR, "frontmatter is missing required string \"name\" (Standard sec 3.1).", { file, reqId: "U3" }));
    // Only format-check the name when it is the canonical identifier (equals the directory). A name that
    // diverges from its directory is a display label or namespaced command (e.g. "gsd:add-backlog"); U4
    // (name-matches-dir) owns that divergence, so U3 must not also flag the label's characters (Finding 4 /
    // ADR 0031). A non-kebab name that DOES equal its directory is still a real defect and stays an error.
    else if (fm.name === s.name && (fm.name.length > 64 || !NAME_RE.test(fm.name))) out.push(finding(meta.id, SEVERITY.ERROR, `"name" must be 1-64 chars, lowercase a-z/0-9/-, no leading/trailing/consecutive hyphen (got "${fm.name}").`, { file, reqId: "U3" }));
    if (typeof fm.description !== "string") out.push(finding(meta.id, SEVERITY.ERROR, "frontmatter is missing required string \"description\" (Standard sec 3.1).", { file, reqId: "U3" }));
    else if (fm.description.length < 1 || fm.description.length > 1024) out.push(finding(meta.id, SEVERITY.ERROR, `"description" must be 1-1024 chars (got ${fm.description.length}).`, { file, reqId: "U3" }));
  }
  return out;
}
