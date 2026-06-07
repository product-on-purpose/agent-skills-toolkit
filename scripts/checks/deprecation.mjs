// what-it-is:   the deprecation check (G6)
// what-it-does: asserts every component status is valid and a deprecated component declares its replacement (deprecated-by) and removal version (remove-in)
// why:          enforces the Standard requirement G6 deterministically, one module per reqId, so the gate stays model-free
// used-by:      registered in scripts/lib/registry.mjs; run by scripts/check.mjs and tier-report.mjs
import { finding, SEVERITY } from "../lib/findings.mjs";

export const meta = { id: "deprecation", tier: "advanced", reqId: "G6", since: "0.x" };

const VALID_STATUS = new Set(["active", "deprecated", "experimental"]);

/**
 * G6 (Gold baseline, deprecation handling): tooling recognizes a component's lifecycle status,
 * and a component marked `deprecated` MUST declare its replacement (`deprecated-by`) and the
 * version it will be removed in (`remove-in`), per Standard sec 3.7 / 7.5. Read from the
 * library.json component entries (the uniform place every component type carries `status`).
 * Conditional in effect: a plugin with only `active` components produces no findings. Advanced
 * tier, so it is a Gold burndown item for a plugin that has not declared `advanced`.
 */
export function check(ctx) {
  const lib = ctx.library?.data;
  if (!lib || typeof lib.components !== "object" || lib.components === null) return [];
  const out = [];
  for (const [type, entries] of Object.entries(lib.components)) {
    if (!Array.isArray(entries)) continue;
    for (const c of entries) {
      if (!c || typeof c !== "object") continue;
      const name = typeof c.name === "string" ? c.name : "(unnamed)";
      const status = c.status;
      if (status !== undefined && !VALID_STATUS.has(status)) {
        out.push(finding(meta.id, SEVERITY.ERROR, `library.json components.${type} entry "${name}" has invalid status "${status}" (must be active, deprecated, or experimental; Standard sec 3.7).`, { file: "library.json", reqId: meta.reqId }));
        continue;
      }
      if (status === "deprecated") {
        if (typeof c["deprecated-by"] !== "string" || c["deprecated-by"].trim().length === 0) {
          out.push(finding(meta.id, SEVERITY.ERROR, `deprecated component "${name}" must declare "deprecated-by" naming its replacement (Standard sec 3.7, 7.5; G6).`, { file: "library.json", reqId: meta.reqId }));
        }
        if (typeof c["remove-in"] !== "string" || c["remove-in"].trim().length === 0) {
          out.push(finding(meta.id, SEVERITY.ERROR, `deprecated component "${name}" must declare "remove-in" (the target plugin version for its removal; Standard sec 3.7, 7.5; G6).`, { file: "library.json", reqId: meta.reqId }));
        }
      }
    }
  }
  return out;
}
