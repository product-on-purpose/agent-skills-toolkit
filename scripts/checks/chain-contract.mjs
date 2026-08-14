// what-it-is:   the chain-contract check (S4)
// what-it-does: asserts every inter-component invocation is permitted by agents/_chain-permitted.yaml (no orphan or phantom
//               edges); a finding that exists ONLY because a STRING-shaped chain declaration was parsed (an orphan, or "chaining
//               used but no contract") is SEVERITY.WARN in this release, not ERROR - the identical finding from an ARRAY-shaped
//               declaration, or from an existing contract/_workflows/, stays SEVERITY.ERROR, unchanged
// why:          enforces the Standard requirement S4 deterministically, one module per reqId, so the gate stays model-free;
//               the warn/error split holds ADR 0027's warn-first policy for a shape newly PARSED by this reader (ADR 0040), so
//               no plugin passing S4 today can newly gate-fail from upgrading the toolkit alone (ADR 0041); the two
//               string-derived findings also carry migration cap metadata so a consumer's own askit.config.json cannot
//               promote the warn back to error either (round-2 adversarial review, ADR 0041 addendum)
// used-by:      registered in scripts/lib/registry.mjs; run by scripts/check.mjs and tier-report.mjs
import { finding, SEVERITY } from "../lib/findings.mjs";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";

export const meta = { id: "chain-contract", tier: "convergent", reqId: "S4", since: "0.x", provenance: "house" };

// ADR 0041's graduation note USED TO BE BUILT HERE and is now derived by resolveFindings instead.
// The note is run-specific - it is true only when the migration ceiling actually bound - and this
// module knows neither the plugin's pin nor whether --strict is on, so a conditional note could not be
// produced here at all. Under --strict the ceiling is disabled and this finding IS already an error, so
// a note promising it "becomes an error once you pin 0.13" would be false in that very run.

// ADR 0041 addendum (round-2 adversarial review, high severity): the WARN this module emits for a
// string-derived finding is not itself enough - scripts/lib/resolve-config.mjs applies a consumer's
// askit.config.json rules override with HIGHER precedence than the severity emitted here, so
// `rules.S4 = "error"` could promote this exact WARN back into a gate-failing error, from config
// alone, with zero change to the plugin. This metadata rides along on the finding so resolveFindings
// can enforce a ceiling no override can cross: capped at "warn" until Standard 0.13. Attached ONLY to the two
// string-derived branches below; the array-shaped and legacy-array paths carry no migration field at
// all (finding()'s default), so they are completely untouched by the cap.
const STRING_SHAPE_MIGRATION = Object.freeze({
  capAt: SEVERITY.WARN,
  until: "0.13",
  // STATIC and activation-neutral: it states what the migration is ABOUT, never what this run did.
  // The old text claimed the finding "stays capped at warn until Standard 0.13", which is false in
  // any --strict run, and the raw migration object is visible through --json at any pin in any mode.
  reason: "ADR 0041: a string-shaped chain declaration is newly parsed at Standard 0.12.",
});

function isDir(p) { return existsSync(p) && statSync(p).isDirectory(); }
function isFile(p) { return existsSync(p) && statSync(p).isFile(); }

// Reads a declared `chain` value in either shape a frontmatter author may have written:
// - an array (unchanged, filtered to strings, exactly as before this function existed);
// - a string: split on commas and/or whitespace (any run of either), trim each piece, drop
//   empties. This tolerates "a, b", "a,b", "a b", and mixes of the two - the split regex
//   consumes commas and whitespace identically, so a trailing comma or extra spacing never
//   produces a stray empty entry.
// Any other shape (missing, null, number, object) declares no chain: [].
function parseChainDeclaration(declared) {
  if (Array.isArray(declared)) return declared.filter((x) => typeof x === "string");
  if (typeof declared === "string") {
    return declared.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

export function check(ctx) {
  const out = [];
  const contractPath = path.join(ctx.root, "agents", "_chain-permitted.yaml");
  const workflowsDir = path.join(ctx.root, "_workflows");
  const hasContract = isFile(contractPath);
  const hasWorkflows = isDir(workflowsDir);

  const components = [...(ctx.skills || []), ...(ctx.subagents || [])];
  // A component "declares an invocation" via `chain:` (Standard sec 3.6, 3.8), read from
  // `metadata.chain` (the sanctioned extension namespace) and falling back to a legacy top-level
  // `chain:` key so a third-party plugin still using the old location is still read and no
  // existing verdict moves. metadata.chain wins when both are present (no merge).
  //
  // `metadata.chain` may be a comma-and/or-whitespace-delimited STRING (the recommended shape:
  // the agentskills.io spec defines `metadata` as a map of string keys to string values, and the
  // reference implementation `skills-ref` coerces every metadata value through Python's str() -
  // a YAML list silently becomes a string containing a Python list repr, e.g.
  // "['a', 'b']", which no consumer downstream can use) or an ARRAY (still read, unchanged, so
  // existing plugins on that shape do not regress). The legacy top-level `chain:` key accepts
  // either shape too.
  //
  // `shape` records which of the two the author actually wrote, independent of WHICH key it came
  // from (metadata.chain and the legacy top-level key both accept both shapes). Severity below is
  // decided by shape, not location (ADR 0041): main never parsed a string declaration at all, so a
  // finding reachable only through a string is newly parsed by this reader and is WARN for now; a
  // finding reachable through an array declaration was already parsed and gated on before this
  // change, so it stays ERROR.
  const declaredChains = components
    .map((c) => {
      const declared = c.frontmatter?.metadata?.chain ?? c.frontmatter?.chain;
      return {
        name: c.name,
        chain: parseChainDeclaration(declared),
        shape: Array.isArray(declared) ? "array" : typeof declared === "string" ? "string" : "none",
      };
    })
    .filter((c) => c.chain.length > 0);

  // Conditional: chaining is "in use" iff a contract OR workflows OR a frontmatter chain declaration exists.
  const chainingInUse = hasContract || hasWorkflows || declaredChains.length > 0;
  if (!chainingInUse) return [];

  if (!hasContract) {
    // ADR 0041: this branch is only reached when there is no contract file, so the remaining
    // pre-existing signals are _workflows/ and an ARRAY-shaped declaration. If chaining is "in use"
    // for one of those reasons, this is unchanged behavior: ERROR. If the ONLY reason is one or more
    // newly-parsed STRING declarations, this is the scheduled tightening: WARN, with a note.
    const hasArrayDeclaration = declaredChains.some((c) => c.shape === "array");
    const preexistingSignal = hasWorkflows || hasArrayDeclaration;
    // ADR 0044: the check emits its TARGET severity and lets the ceiling hold it back per-pin. What
    // still distinguishes the string-derived path is the MIGRATION METADATA, not a lower severity -
    // which is the whole reason ADR 0041's graduation was inert: lifting a warn-ceiling off a warn
    // finding yields a warn, so S4 could never have graduated no matter how the ceiling changed.
    const severity = SEVERITY.ERROR;
    const migration = preexistingSignal ? undefined : STRING_SHAPE_MIGRATION;
    out.push(finding(meta.id, severity, `chaining is used (a component declares a frontmatter \`chain:\` or _workflows/ is present) but agents/_chain-permitted.yaml is missing (chain contract is REQUIRED when chaining is used; Standard sec 3.6).`, { file: "agents/_chain-permitted.yaml", reqId: meta.reqId, migration }));
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
  // ADR 0041: an ARRAY-shaped orphan is ERROR, unchanged. A STRING-shaped orphan - newly parsed by
  // this reader (ADR 0040) - is WARN for one Standard minor (ADR 0027 burndown), with a note.
  for (const { name, chain, shape } of declaredChains) {
    const permitted = new Set(Array.isArray(contract[name]) ? contract[name].filter((x) => typeof x === "string") : []);
    const severity = SEVERITY.ERROR;
    const migration = shape === "array" ? undefined : STRING_SHAPE_MIGRATION;
    for (const target of chain) {
      if (!permitted.has(target)) {
        out.push(finding(meta.id, severity, `"${name}" declares (frontmatter chain) that it may invoke "${target}" but agents/_chain-permitted.yaml does not permit "${name}" -> "${target}" (orphan; Standard sec 3.6).`, { file: "agents/_chain-permitted.yaml", reqId: meta.reqId, migration }));
      }
    }
  }
  return out;
}
