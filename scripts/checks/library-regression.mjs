// what-it-is:   the library-regression check (G3)
// what-it-does: asserts each chain edge and hook event carries at least one eval/regression case under evals/ (the deterministic regression signal)
// why:          enforces the Standard requirement G3 deterministically, one module per reqId, so the gate stays model-free
// used-by:      registered in scripts/lib/registry.mjs; run by scripts/check.mjs and tier-report.mjs
import { finding, SEVERITY } from "../lib/findings.mjs";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";

export const meta = { id: "library-regression", tier: "advanced", reqId: "G3", since: "0.x", provenance: "house" };

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
  if (!isDir(dir)) return { sets: [], malformed: [] };
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
  return { sets, malformed };
}

/**
 * Parse the chain contract into [caller, callee] edges (empty when absent/invalid).
 * A non-array callee value is a contract-shape error owned by the chain-contract check (S4),
 * which fails the gate at Convergent, so a scalar shorthand cannot reach Gold unrecognized.
 */
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

// Structured edge key so a component name containing the rendered " -> " cannot collide.
const edgeKey = (caller, callee) => JSON.stringify([caller, callee]);
const renderEdge = (caller, callee) => `${caller} -> ${callee}`;

/**
 * G3 (Gold baseline): each chain edge (in agents/_chain-permitted.yaml) and each hook event
 * (in hooks/hooks.json) MUST carry at least one eval/regression case under evals/. An eval
 * covering an edge the contract no longer permits, or a hook that is not registered, is a stale
 * case - the regression signal that a component changed and a consumer's eval dangles. Malformed
 * eval JSON is ALWAYS reported, independent of whether a contract or hooks exist, so eval hygiene
 * is never silently suppressed by an absent or emptied contract.
 *
 * Advanced tier: a plugin that declares universal or convergent sees these findings as a Gold
 * burndown item rather than a gate failure (the milestone-validity ceiling); a plugin that
 * declares advanced gates on them. (A missing or invalid declared tier is failed by U1 first.)
 */
export function check(ctx) {
  const root = ctx.root;
  const edges = contractEdges(root);
  const events = hookEvents(root);
  const { sets, malformed } = loadEvalSets(root);

  const out = [];

  // Eval hygiene: a malformed eval file is always a defect, even with no contract or hooks.
  for (const m of malformed) {
    out.push(finding(meta.id, SEVERITY.ERROR, `eval set ${m.file} is not valid JSON: ${m.message}`, { file: m.file, reqId: meta.reqId }));
  }

  const permittedEdgeKeys = new Set(edges.map(([a, b]) => edgeKey(a, b)));
  const coveredChains = new Set();
  const coveredHooks = new Set();

  for (const s of sets) {
    const covers = s.data && typeof s.data === "object" && !Array.isArray(s.data) ? s.data.covers : undefined;
    if (!covers || typeof covers !== "object" || Array.isArray(covers)) {
      out.push(finding(meta.id, SEVERITY.ERROR, `eval set ${s.file} is missing a "covers" object; declare what it exercises (e.g. { "chain": ["caller", "callee"] }, { "hook": "<event>" }, or { "skill": "<name>" }).`, { file: s.file, reqId: meta.reqId }));
      continue;
    }
    let claimed = false;
    // chain and hook are checked independently so a multi-claim eval is honored and a
    // wrong-typed claim is diagnosed rather than silently ignored.
    if ("chain" in covers) {
      claimed = true;
      if (!Array.isArray(covers.chain) || covers.chain.length !== 2 || !covers.chain.every((x) => typeof x === "string")) {
        out.push(finding(meta.id, SEVERITY.ERROR, `eval set ${s.file} "covers.chain" must be a [caller, callee] pair of strings.`, { file: s.file, reqId: meta.reqId }));
      } else {
        const key = edgeKey(covers.chain[0], covers.chain[1]);
        if (!permittedEdgeKeys.has(key)) {
          out.push(finding(meta.id, SEVERITY.ERROR, `eval set ${s.file} covers chain "${renderEdge(covers.chain[0], covers.chain[1])}" but agents/_chain-permitted.yaml does not permit that edge (stale eval; a component or edge changed, or the contract is missing - the G3 regression signal). Update or remove the eval, or restore the chain.`, { file: s.file, reqId: meta.reqId }));
        } else {
          coveredChains.add(key);
        }
      }
    }
    if ("hook" in covers) {
      claimed = true;
      if (typeof covers.hook !== "string") {
        out.push(finding(meta.id, SEVERITY.ERROR, `eval set ${s.file} "covers.hook" must be a string event name.`, { file: s.file, reqId: meta.reqId }));
      } else if (!events.includes(covers.hook)) {
        out.push(finding(meta.id, SEVERITY.ERROR, `eval set ${s.file} covers hook "${covers.hook}" but no hook for that event is registered in hooks/hooks.json (stale eval; the G3 regression signal).`, { file: s.file, reqId: meta.reqId }));
      } else {
        coveredHooks.add(covers.hook);
      }
    }
    if ("skill" in covers) {
      // A triggering eval set (a Universal SHOULD per sec 8.3); not gated by the G3 baseline.
      claimed = true;
    }
    if (!claimed) {
      out.push(finding(meta.id, SEVERITY.ERROR, `eval set ${s.file} "covers" declares none of "chain", "hook", or "skill"; declare what it exercises.`, { file: s.file, reqId: meta.reqId }));
    }
  }

  for (const [caller, callee] of edges) {
    if (!coveredChains.has(edgeKey(caller, callee))) {
      out.push(finding(meta.id, SEVERITY.ERROR, `chain "${renderEdge(caller, callee)}" has no eval/regression case under evals/ (every chained invocation MUST carry at least one eval case at Gold - G3). Add evals/<name>.eval.json with "covers": { "chain": ["${caller}", "${callee}"] }.`, { file: "evals/", reqId: meta.reqId }));
    }
  }

  for (const ev of events) {
    if (!coveredHooks.has(ev)) {
      out.push(finding(meta.id, SEVERITY.ERROR, `hook event "${ev}" has no eval/regression case under evals/ (every hook MUST carry at least one eval case at Gold - G3). Add evals/<name>.eval.json with "covers": { "hook": "${ev}" }.`, { file: "evals/", reqId: meta.reqId }));
    }
  }

  return out;
}
