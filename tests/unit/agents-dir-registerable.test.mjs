// what-it-is:   coverage for U15 (agents-dir-registerable), ADR 0046
// what-it-does: asserts each remediation branch, the .txt exclusion, the clean case, and the pin behaviour
// why:          the DECISION in ADR 0046 is that the two remediation branches differ - and that a widening
//               of S2/S3/S4/S8 was rejected because its message tells the author to create the phantom. A
//               test that only counted findings would pass against the rejected design
// used-by:      npm test
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { check, meta } from "../../scripts/checks/agents-dir-registerable.mjs";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { isRuntimeAgentFile } from "../../scripts/lib/fs-utils.mjs";
import { resolveFindings, gatingFindings } from "../../scripts/lib/resolve-config.mjs";
import { configFrom } from "../../scripts/lib/config.mjs";
import { provenanceByReq } from "../../scripts/lib/registry.mjs";
import { SINCE_BY_REQ } from "../../scripts/lib/standard-gate.mjs";

const AGENT = (name) =>
  `---\nname: ${name}\ndescription: a subagent used only as a fixture for U15\n---\n\n# ${name}\n`;

/** A real plugin directory whose agents/ holds exactly `files`, loaded through the real loader. */
function withAgents(files) {
  const dir = mkdtempSync(path.join(tmpdir(), "askit-u15-"));
  mkdirSync(path.join(dir, "agents"), { recursive: true });
  for (const [name, body] of Object.entries(files)) writeFileSync(path.join(dir, "agents", name), body);
  return dir;
}

test("meta declares U15 universal, vendor-cited, since 0.14, with no migration metadata", () => {
  assert.equal(meta.reqId, "U15");
  assert.equal(meta.tier, "universal");
  // vendor-cited, because the rule rests on Claude Code's discovery behaviour, not on our convention.
  // Under ADR 0044's trust step a subject cannot weaken it about itself in published-verdict mode.
  assert.equal(meta.provenance, "vendor-cited");
  assert.equal(meta.since, "0.14");
  assert.equal(meta.migration, undefined, "a NEW check needs no migration metadata (ADR 0044 point 3)");
});

test("a fully registered agents/ reports nothing", () => {
  const dir = withAgents({ "worker.md": AGENT("worker"), "critic.md": AGENT("critic") });
  try {
    assert.deepEqual(check(loadPlugin(dir)), []);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("a folder README is reported, and the remediation says MOVE IT, never register it", () => {
  // The load-bearing assertion of ADR 0046. Widening S2/S3/S4/S8 was prototyped and its message against
  // this exact file is "declare it in components.subagents", which produces a phantom subagent with no
  // name and no description - the defect the 2026-08-06 G8 exemption exists to prevent. If this check
  // ever starts saying "declare", the rejected design has been reintroduced.
  const dir = withAgents({ "worker.md": AGENT("worker"), "README.md": "---\ntitle: Agents\n---\n\n# Agents\n" });
  try {
    const f = check(loadPlugin(dir));
    assert.equal(f.length, 1);
    assert.match(f[0].file, /agents[\/]README\.md$/);
    assert.match(f[0].message, /Move the folder documentation out of agents\//);
    assert.doesNotMatch(f[0].message, /declare it in library\.json/i, "never tell an author to register a folder guide");
    assert.doesNotMatch(f[0].message, /must start with the plugin prefix/i, "never tell an author to prefix a folder guide");
    assert.match(f[0].message, /registers every file it finds/, "state the runtime fact, or the author cannot choose");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("an underscore-prefixed file is reported, and the remediation offers BOTH honest resolutions", () => {
  const dir = withAgents({ "worker.md": AGENT("worker"), "_shadow.md": AGENT("shadow") });
  try {
    const f = check(loadPlugin(dir));
    assert.equal(f.length, 1);
    assert.match(f[0].file, /agents[\/]_shadow\.md$/);
    assert.match(f[0].message, /Either register it/);
    assert.match(f[0].message, /or move it out of agents\//);
    assert.match(f[0].message, /the underscore prefix protects nothing/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("a non-.md file under agents/ is NOT reported, because the runtime skips it", () => {
  // The probe recorded in folder-readme.mjs found that README.txt was the ONLY thing skipped. Reporting
  // it would be stricter than the runtime, which is the opposite failure to the one U15 exists for.
  const dir = withAgents({ "worker.md": AGENT("worker"), "notes.txt": "not markdown", "_pairing.yaml": "a: b" });
  try {
    assert.deepEqual(check(loadPlugin(dir)), []);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("a plugin with no agents/ directory is silent", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "askit-u15-none-"));
  try {
    assert.deepEqual(check(loadPlugin(dir)), []);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("U15 is held at warn below 0.14 and gates at 0.14 (ADR 0044's ceiling, no hand-written window)", () => {
  const dir = withAgents({ "worker.md": AGENT("worker"), "_shadow.md": AGENT("shadow") });
  try {
    const raw = check(loadPlugin(dir));
    const PROV = provenanceByReq();
    const resolve = (pinned) => resolveFindings(raw, configFrom({}), PROV, { pinned, sinceByReq: SINCE_BY_REQ })[0];

    const held = resolve("0.13");
    assert.equal(held.severity, "error", "the check emits its TARGET severity, always");
    assert.equal(held.effectiveSeverity, "warn", "a check that did not exist at your pin cannot gate you");
    assert.equal(gatingFindings([held]).length, 0);
    assert.equal(held.ceiling.constraints[0].cause, "since", "an INTRODUCTION, not a tightening");

    const due = resolve("0.14");
    assert.equal(due.effectiveSeverity, "error");
    assert.equal(due.ceiling, null);
    assert.equal(gatingFindings([due]).length, 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});


// --- wave 1, H2: plugin agents/ is scanned RECURSIVELY, and the flat listers never saw that --------

/** A plugin whose agents/ holds `files` keyed by RELATIVE path, so nesting is expressible. */
function withNestedAgents(files) {
  const dir = mkdtempSync(path.join(tmpdir(), "askit-u15-nested-"));
  for (const [rel, body] of Object.entries(files)) {
    const abs = path.join(dir, "agents", ...rel.split("/"));
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, body);
  }
  return dir;
}

test("W1-H2: a NESTED unregistered agent is reported (plugin agents/ is scanned recursively)", () => {
  // Found by adversarial review wave 1 and confirmed against the vendor, verbatim: "Plugin agents/
  // directories are also scanned recursively", and "a file at agents/review/security.md in plugin
  // my-plugin registers as my-plugin:review:security".
  //
  // Both listers used a flat readdirSync, so ctx.agentDocs was NOT what the runtime loads - which makes
  // U15's whole list-equality invariant false, and lets agents/nested/_shadow.md bypass U15 AND U14.
  // The original probe only ever tested a FLAT directory; the invariant was generalised past its evidence.
  const dir = withNestedAgents({
    "fx-worker.md": AGENT("fx-worker"),
    "review/_shadow.md": AGENT("shadow"),
  });
  try {
    const f = check(loadPlugin(dir));
    assert.equal(f.length, 1, "a nested unregistered agent is still loaded by the runtime");
    assert.ok(f[0].file.split(String.fromCharCode(92)).join("/").endsWith("agents/review/_shadow.md"), f[0].file);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("W1-H2: a nested REGISTERED agent reports nothing, and its scoped name is preserved", () => {
  const dir = withNestedAgents({ "review/security.md": AGENT("security") });
  try {
    const ctx = loadPlugin(dir);
    // The vendor scopes it as <plugin>:review:security, so the subpath is part of the identity and a
    // bare basename would collide with a top-level agents/security.md.
    assert.deepEqual(ctx.agentDocs.map((a) => a.name), ["review/security"]);
    assert.deepEqual(ctx.subagents.map((a) => a.name), ["review/security"]);
    assert.deepEqual(check(ctx), []);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("W1-H2: a filename containing a colon is NOT loaded (the vendor reserves it for scoping)", () => {
  // Asserted against the PREDICATE, never a filesystem fixture. A file named "bad:name.md" cannot exist
  // on Windows: NTFS reads the colon as the alternate-data-stream separator, so writeFileSync SUCCEEDS
  // and the directory ends up holding a file called "bad" with no extension. The fixture version of this
  // test was therefore VACUOUS on the platform validate-windows runs, and a mutation check caught it -
  // removing the guard turned no test red.
  //
  // The rule is the vendor's: Claude Code "doesn't load a file whose name contains one [:]".
  assert.equal(isRuntimeAgentFile("worker.md"), true);
  assert.equal(isRuntimeAgentFile("review-security.md"), true);
  assert.equal(isRuntimeAgentFile("bad:name.md"), false, "the runtime refuses it, so these listers must too");
  assert.equal(isRuntimeAgentFile("plugin:scoped:name.md"), false);
  assert.equal(isRuntimeAgentFile("notes.txt"), false, "only .md is loaded");
  assert.equal(isRuntimeAgentFile("_chain-permitted.yaml"), false);
});

