// what-it-is:   the chain-contract check (S4)
// what-it-does: asserts every inter-component invocation is permitted by agents/_chain-permitted.yaml (no orphan or phantom edges)
// why:          enforces the Standard requirement S4 deterministically, one module per reqId, so the gate stays model-free
// used-by:      registered in scripts/lib/registry.mjs; run by scripts/check.mjs and tier-report.mjs
import { finding, SEVERITY } from "../lib/findings.mjs";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";

export const meta = { id: "chain-contract", tier: "convergent", reqId: "S4" };

function isDir(p) { return existsSync(p) && statSync(p).isDirectory(); }
function isFile(p) { return existsSync(p) && statSync(p).isFile(); }

export function check(ctx) {
  const out = [];
  const contractPath = path.join(ctx.root, "agents", "_chain-permitted.yaml");
  const workflowsDir = path.join(ctx.root, "_workflows");
  const hasContract = isFile(contractPath);
  const hasWorkflows = isDir(workflowsDir);

  const components = [...(ctx.skills || []), ...(ctx.subagents || [])];
  // A component "declares an invocation" via a frontmatter `chain:` list (Standard sec 3.6, 3.8).
  const declaredChains = components
    .map((c) => ({
      name: c.name,
      chain: Array.isArray(c.frontmatter?.chain) ? c.frontmatter.chain.filter((x) => typeof x === "string") : [],
    }))
    .filter((c) => c.chain.length > 0);

  // Conditional: chaining is "in use" iff a contract OR workflows OR a frontmatter chain declaration exists.
  const chainingInUse = hasContract || hasWorkflows || declaredChains.length > 0;
  if (!chainingInUse) return [];

  if (!hasContract) {
    out.push(finding(meta.id, SEVERITY.ERROR, "chaining is used (a component declares a frontmatter `chain:` or _workflows/ is present) but agents/_chain-permitted.yaml is missing (chain contract is REQUIRED when chaining is used; Standard sec 3.6).", { file: "agents/_chain-permitted.yaml", reqId: meta.reqId }));
    return out;
  }

  let contract;
  try {
    contract = parseYaml(readFileSync(contractPath, "utf8"));
  } catch (e) {
    out.push(finding(meta.id, SEVERITY.ERROR, `agents/_chain-permitted.yaml is not valid YAML: ${e.message}`, { file: "agents/_chain-permitted.yaml", reqId: meta.reqId }));
    return out;
  }
  if (!contract || typeof contract !== "object" || Array.isArray(contract)) {
    out.push(finding(meta.id, SEVERITY.ERROR, "agents/_chain-permitted.yaml must be a key/value map of component-name -> allowed invocations (Standard sec 3.6).", { file: "agents/_chain-permitted.yaml", reqId: meta.reqId }));
    return out;
  }

  const known = new Set(components.map((c) => c.name));
  // Phantom detection: contract names that match no on-disk component.
  for (const [caller, callees] of Object.entries(contract)) {
    if (!known.has(caller)) {
      out.push(finding(meta.id, SEVERITY.ERROR, `chain-permitted contract names caller "${caller}" but no on-disk component is known by that name (phantom; Standard sec 3.6).`, { file: "agents/_chain-permitted.yaml", reqId: meta.reqId }));
    }
    // The value MUST be a YAML sequence (the list of components the caller may invoke, sec 3.6).
    // A scalar shorthand (caller: callee) would otherwise be silently dropped here AND in the G3
    // regression check, leaving a real permitted edge ungated; reject it as a contract-shape error.
    if (callees !== null && callees !== undefined && !Array.isArray(callees)) {
      out.push(finding(meta.id, SEVERITY.ERROR, `chain-permitted contract entry "${caller}" must map to a list of allowed invocations (a YAML sequence); got ${typeof callees} (Standard sec 3.6). Use "${caller}:\\n  - <callee>".`, { file: "agents/_chain-permitted.yaml", reqId: meta.reqId }));
    }
    if (Array.isArray(callees)) {
      for (const callee of callees) {
        if (typeof callee === "string" && !known.has(callee)) {
          out.push(finding(meta.id, SEVERITY.ERROR, `chain-permitted contract entry "${caller}" -> "${callee}" points at a missing component (phantom; Standard sec 3.6).`, { file: "agents/_chain-permitted.yaml", reqId: meta.reqId }));
        }
      }
    }
  }
  // Orphan detection: a declared (frontmatter chain) invocation not permitted by the contract.
  for (const { name, chain } of declaredChains) {
    const permitted = new Set(Array.isArray(contract[name]) ? contract[name].filter((x) => typeof x === "string") : []);
    for (const target of chain) {
      if (!permitted.has(target)) {
        out.push(finding(meta.id, SEVERITY.ERROR, `"${name}" declares (frontmatter chain) that it may invoke "${target}" but agents/_chain-permitted.yaml does not permit "${name}" -> "${target}" (orphan; Standard sec 3.6).`, { file: "agents/_chain-permitted.yaml", reqId: meta.reqId }));
      }
    }
  }
  return out;
}
