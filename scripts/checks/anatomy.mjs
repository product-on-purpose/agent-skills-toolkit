// what-it-is:   the anatomy check (U2)
// what-it-does: asserts the repo-root AGENTS.md exists (U2, a house anatomy convention) and warns when no skills are present yet (also U2)
// why:          enforces the Standard requirement U2 deterministically, one module per reqId, so the gate stays model-free
// used-by:      registered in scripts/lib/registry.mjs; run by scripts/check.mjs and tier-report.mjs
import { finding, SEVERITY } from "../lib/findings.mjs";

export const meta = { id: "anatomy", tier: "universal", reqId: "U2", since: "0.x", provenance: "house" };

export function check(ctx) {
  const out = [];
  if (!ctx.agentsMdPath) {
    out.push(finding(meta.id, SEVERITY.ERROR, "AGENTS.md is required at the repository root at every tier (Standard sec 3.10, 2.1).", { file: "AGENTS.md", reqId: "U2" }));
  }
  if (ctx.skills.length === 0) {
    // U2, the anatomy requirement this module owns. It carried U8 (manifest-drift, a different check's
    // requirement) from the first Bronze bootstrap, so the one anatomy warning was filed, resolved, and
    // configured under the wrong reqId.
    out.push(finding(meta.id, SEVERITY.WARN, "No skills found under skills/. A Bronze plugin may be empty, but conformance is only meaningful once skills exist.", { file: "skills/", reqId: "U2" }));
  }
  return out;
}
