import { finding, SEVERITY } from "../lib/findings.mjs";

export const meta = { id: "anatomy", tier: "universal", reqId: "U2" };

export function check(ctx) {
  const out = [];
  if (!ctx.agentsMdPath) {
    out.push(finding(meta.id, SEVERITY.ERROR, "AGENTS.md is required at the repository root at every tier (Standard sec 3.10, 2.1).", { file: "AGENTS.md", reqId: "U2" }));
  }
  if (ctx.skills.length === 0) {
    out.push(finding(meta.id, SEVERITY.WARN, "No skills found under skills/. A Bronze plugin may be empty, but conformance is only meaningful once skills exist.", { file: "skills/", reqId: "U8" }));
  }
  return out;
}
