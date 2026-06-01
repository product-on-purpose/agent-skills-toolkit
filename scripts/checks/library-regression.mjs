import { finding, SEVERITY } from "../lib/findings.mjs";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";

export const meta = { id: "library-regression", tier: "advanced", reqId: "G3" };

function isDir(p) { return existsSync(p) && statSync(p).isDirectory(); }
function isFile(p) { return existsSync(p) && statSync(p).isFile(); }

/**
 * Read the plugin's eval sets from evals/*.eval.json. Each file declares what it
 * covers and (optionally) its cases. Returns the parsed sets plus any malformed files.
 * Format (see templates/eval-set.json):
 *   { "covers": { "chain": ["caller","callee"] } | { "hook": "<event>" } | { "skill": "<name>" },
 *     "description": "...", "cases": [ ... ] }
 */
function loadEvalSets(root) {
  const dir = path.join(root, "evals");
  if (!isDir(dir)) return { present: false, sets: [], malformed: [] };
  const sets = [];
  const malformed = [];
  for (const name of readdirSync(dir)) {
    if (!name.endsWith(".eval.json")) continue;
    const rel = path.posix.join("evals", name);
    const full = path.join(dir, name);
    if (!isFile(full)) continue;
    let data;
    try {
      data = JSON.parse(readFileSync(full, "utf8"));
    } catch (e) {
      malformed.push({ file: rel, message: e.message });
      continue;
    }
    sets.push({ file: rel, data });
  }
  return { present: true, sets, malformed };
}

/** Parse the chain contract into [caller, callee] edges (empty when absent/invalid). */
function contractEdges(root) {
  const contractPath = path.join(root, "agents", "_chain-permitted.yaml");
  if (!isFile(contractPath)) return [];
  let contract;
  try {
    contract = parseYaml(readFileSync(contractPath, "utf8"));
  } catch {
    return []; // S4 owns malformed-contract reporting.
  }
  if (!contract || typeof contract !== "object" || Array.isArray(contract)) return [];
  const edges = [];
  for (const [caller, callees] of Object.entries(contract)) {
    if (Array.isArray(callees)) {
      for (const callee of callees) if (typeof callee === "string") edges.push([caller, callee]);
    }
  }
  return edges;
}

/** Event names that have at least one hook registered in hooks/hooks.json (empty when absent/invalid). */
function hookEvents(root) {
  const hooksPath = path.join(root, "hooks", "hooks.json");
  if (!isFile(hooksPath)) return [];
  let data;
  try {
    data = JSON.parse(readFileSync(hooksPath, "utf8"));
  } catch {
    return []; // a malformed hooks.json is a hook-builder concern, not this check.
  }
  const hooks = data && typeof data.hooks === "object" && data.hooks !== null ? data.hooks : null;
  if (!hooks) return [];
  return Object.keys(hooks).filter((ev) => Array.isArray(hooks[ev]) && hooks[ev].length > 0);
}

const edgeKey = (caller, callee) => `${caller} -> ${callee}`;

/**
 * G3 (Gold baseline): each chain edge and each hook MUST carry at least one eval/regression
 * case under evals/, and an eval that covers a chain edge the contract no longer permits is a
 * stale case (the regression signal: a component or edge changed and a consumer's eval dangles).
 * Conditional: only applies when there is something to regress - a chain contract or hooks.
 * Advanced tier, so it gates only a plugin that declares tier >= advanced; lower-tier plugins
 * see it as a Gold burndown item, not a CI failure.
 */
export function check(ctx) {
  const root = ctx.root;
  const edges = contractEdges(root);
  const events = hookEvents(root);
  if (edges.length === 0 && events.length === 0) return []; // nothing chained or hooked -> nothing to regress.

  const out = [];
  const { sets, malformed } = loadEvalSets(root);

  for (const m of malformed) {
    out.push(finding(meta.id, SEVERITY.ERROR, `eval set ${m.file} is not valid JSON: ${m.message}`, { file: m.file, reqId: meta.reqId }));
  }

  const permittedEdgeKeys = new Set(edges.map(([a, b]) => edgeKey(a, b)));
  const coveredChains = new Set();
  const coveredHooks = new Set();

  for (const s of sets) {
    const covers = s.data && typeof s.data === "object" ? s.data.covers : undefined;
    if (!covers || typeof covers !== "object") {
      out.push(finding(meta.id, SEVERITY.ERROR, `eval set ${s.file} is missing a "covers" object; declare what it exercises (e.g. { "chain": ["caller", "callee"] }, { "hook": "<event>" }, or { "skill": "<name>" }).`, { file: s.file, reqId: meta.reqId }));
      continue;
    }
    if (Array.isArray(covers.chain)) {
      if (covers.chain.length !== 2 || !covers.chain.every((x) => typeof x === "string")) {
        out.push(finding(meta.id, SEVERITY.ERROR, `eval set ${s.file} "covers.chain" must be a [caller, callee] pair of strings.`, { file: s.file, reqId: meta.reqId }));
      } else {
        const key = edgeKey(covers.chain[0], covers.chain[1]);
        if (!permittedEdgeKeys.has(key)) {
          out.push(finding(meta.id, SEVERITY.ERROR, `eval set ${s.file} covers chain "${key}" but agents/_chain-permitted.yaml no longer permits that edge (stale eval; a component or edge changed - the G3 regression signal). Update or remove the eval, or restore the chain.`, { file: s.file, reqId: meta.reqId }));
        } else {
          coveredChains.add(key);
        }
      }
    } else if (typeof covers.hook === "string") {
      coveredHooks.add(covers.hook);
    }
    // covers.skill (triggering eval set) is a Universal SHOULD (8.3), not gated here; the
    // behavioral runner consumes it. G3 baseline gates chain + hook coverage only.
  }

  for (const [caller, callee] of edges) {
    const key = edgeKey(caller, callee);
    if (!coveredChains.has(key)) {
      out.push(finding(meta.id, SEVERITY.ERROR, `chain "${key}" has no eval/regression case under evals/ (every chained invocation MUST carry at least one eval case at Gold - G3). Add evals/<name>.eval.json with "covers": { "chain": ["${caller}", "${callee}"] }.`, { file: "evals/", reqId: meta.reqId }));
    }
  }

  for (const ev of events) {
    if (!coveredHooks.has(ev)) {
      out.push(finding(meta.id, SEVERITY.ERROR, `hook event "${ev}" has no eval/regression case under evals/ (every hook MUST carry at least one eval case at Gold - G3). Add evals/<name>.eval.json with "covers": { "hook": "${ev}" }.`, { file: "evals/", reqId: meta.reqId }));
    }
  }

  return out;
}
