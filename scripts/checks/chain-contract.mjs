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

  // Conditional: only fires when chaining is in use.
  if (!hasContract && !hasWorkflows) return [];

  if (!hasContract && hasWorkflows) {
    out.push(finding(meta.id, SEVERITY.ERROR, "workflows are present but agents/_chain-permitted.yaml is missing (chain contract is REQUIRED when chaining is used; Standard sec 3.6).", { file: "agents/_chain-permitted.yaml", reqId: meta.reqId }));
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

  const known = new Set((ctx.skills || []).map((s) => s.name));
  for (const [caller, callees] of Object.entries(contract)) {
    if (!known.has(caller)) {
      out.push(finding(meta.id, SEVERITY.ERROR, `chain-permitted contract names caller "${caller}" but no on-disk component is known by that name (phantom; Standard sec 3.6).`, { file: "agents/_chain-permitted.yaml", reqId: meta.reqId }));
    }
    if (Array.isArray(callees)) {
      for (const callee of callees) {
        if (typeof callee === "string" && !known.has(callee)) {
          out.push(finding(meta.id, SEVERITY.ERROR, `chain-permitted contract entry "${caller}" -> "${callee}" points at a missing component (phantom; Standard sec 3.6).`, { file: "agents/_chain-permitted.yaml", reqId: meta.reqId }));
        }
      }
    }
  }
  // Orphan detection (workflow steps invoking skills not covered by the contract) is deferred to 3B.
  return out;
}
