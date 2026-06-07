// what-it-is:   the library-json check (U1)
// what-it-does: asserts library.json exists at the root with the required fields (name, version, description, standard, tier)
// why:          enforces the Standard requirement U1 deterministically, one module per reqId, so the gate stays model-free
// used-by:      registered in scripts/lib/registry.mjs; run by scripts/check.mjs and tier-report.mjs
import { finding, SEVERITY } from "../lib/findings.mjs";

export const meta = { id: "library-json", tier: "universal", reqId: "U1", since: "0.x", provenance: "house" };

const SEMVER = /^\d+\.\d+\.\d+(?:[-+].+)?$/;
const TIERS = ["universal", "convergent", "advanced"];
const REQUIRED = ["name", "version", "description", "standard", "tier"];

export function check(ctx) {
  const out = [];
  const rel = "library.json";
  if (ctx.library.parseError) {
    return [finding(meta.id, SEVERITY.ERROR, `library.json is not valid JSON: ${ctx.library.parseError}`, { file: rel, reqId: meta.reqId })];
  }
  const data = ctx.library.data;
  if (!data) {
    return [finding(meta.id, SEVERITY.ERROR, "library.json is missing; a plugin MUST carry one (Standard sec 5). Add name, version, description, standard, tier.", { file: rel, reqId: meta.reqId })];
  }
  for (const key of REQUIRED) {
    if (!(key in data)) out.push(finding(meta.id, SEVERITY.ERROR, `library.json is missing required field "${key}" (Standard sec 5.1).`, { file: rel, reqId: meta.reqId }));
  }
  if ("version" in data) {
    if (typeof data.version !== "string" || !SEMVER.test(data.version)) {
      out.push(finding(meta.id, SEVERITY.ERROR, `library.json "version" must be a semver string (got ${JSON.stringify(data.version)}).`, { file: rel, reqId: meta.reqId }));
    }
  }
  if ("tier" in data && !TIERS.includes(data.tier)) {
    out.push(finding(meta.id, SEVERITY.ERROR, `library.json "tier" must be one of ${TIERS.join(", ")} (got "${data.tier}").`, { file: rel, reqId: meta.reqId }));
  }
  return out;
}
