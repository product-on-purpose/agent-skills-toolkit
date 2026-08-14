// what-it-is:   coverage for U14, restricted fields on plugin-shipped agents (ADR 0045)
// what-it-does: proves the check fires on each field the vendor refuses, stays silent on supported
//               fields, cites the vendor in the finding, resolves per pin, and detects EXACTLY the same
//               fields as the marketplace A6 reading
// why:          the same requirement is read by two scopes, and a field list written down twice is a
//               field list that will disagree with itself - a plugin's verdict must not depend on how it
//               happened to be graded
// used-by:      npm test
import test from "node:test";
import assert from "node:assert/strict";
import { check, meta } from "../../scripts/checks/agent-restricted-fields.mjs";
import {
  AGENT_FIELDS_DOC,
  PLUGIN_AGENT_SUPPORTED_FIELDS,
  PLUGIN_AGENT_UNSUPPORTED_FIELDS,
  unsupportedFieldsOn,
} from "../../scripts/lib/vendor-agent-fields.mjs";
import { PLUGIN_AGENT_UNSUPPORTED_FIELDS as A6_FIELDS } from "../../scripts/lib/marketplace/analyze.mjs";
import { resolveFindings, gatingFindings } from "../../scripts/lib/resolve-config.mjs";
import { configFrom } from "../../scripts/lib/config.mjs";
import { provenanceByReq } from "../../scripts/lib/registry.mjs";
import { SINCE_BY_REQ } from "../../scripts/lib/standard-gate.mjs";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import nodePath from "node:path";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";

const PROV = provenanceByReq();
const ctxWith = (agents) => ({ root: ".", subagents: agents });
const agent = (name, frontmatter, extra = {}) => ({ name, file: `agents/${name}.md`, frontmatter, parseError: null, ...extra });

// --- the check itself ------------------------------------------------------------------------------

test("U14 is registered as a vendor-cited Universal check introduced at Standard 0.13", () => {
  assert.equal(meta.reqId, "U14");
  assert.equal(meta.tier, "universal");
  assert.equal(meta.provenance, "vendor-cited", "the requirement is the vendor's, not this project's convention");
  assert.equal(meta.since, "0.13");
  assert.equal(SINCE_BY_REQ.U14, "0.13", "and the registry agrees");
});

test("each refused field fires, named, with the vendor sentence and the doc link in the finding", () => {
  for (const field of PLUGIN_AGENT_UNSUPPORTED_FIELDS) {
    const out = check(ctxWith([agent("worker", { name: "worker", description: "d", [field]: {} })]));
    assert.equal(out.length, 1, `${field} must produce exactly one finding`);
    assert.equal(out[0].reqId, "U14");
    assert.equal(out[0].severity, "error", "the check emits its TARGET severity; the pin decides the rest");
    assert.match(out[0].message, new RegExp(`\`${field}\``), "the offending field is named");
    assert.match(out[0].message, /For security reasons/, "the vendor's own wording, not a paraphrase");
    assert.ok(out[0].message.includes(AGENT_FIELDS_DOC), "a reader's 'says who' is answered in place");
    assert.equal(out[0].file, `agents/worker.md`);
  }
});

test("an agent declaring ONLY supported fields produces nothing", () => {
  const fm = Object.fromEntries(PLUGIN_AGENT_SUPPORTED_FIELDS.map((f) => [f, "x"]));
  assert.deepEqual(check(ctxWith([agent("clean", fm)])), []);
});

test("all three refused fields on one agent are reported together, in the vendor's listing order", () => {
  const out = check(ctxWith([agent("kitchen-sink", { hooks: {}, permissionMode: "acceptEdits", mcpServers: {} })]));
  assert.equal(out.length, 1, "one finding per agent, not one per field");
  assert.match(out[0].message, /`hooks`, `mcpServers`, `permissionMode`/);
});

test("a field DECLARED but empty still fires: declaring nothing and declaring nothing-useful differ", () => {
  // hasOwnProperty rather than truthiness, on purpose. `hooks: null` is still a field the author wrote
  // and the runtime still refuses it - and this is exactly the case where an author is most likely to
  // believe something is configured.
  assert.equal(check(ctxWith([agent("a", { hooks: null })])).length, 1);
  assert.equal(check(ctxWith([agent("b", { permissionMode: "" })])).length, 1);
});

test("an agent whose frontmatter failed to parse is another check's finding, not this one's", () => {
  // Reporting a field list from an unparseable document would be inventing evidence.
  assert.deepEqual(check(ctxWith([agent("broken", null, { parseError: "bad yaml" })])), []);
  assert.deepEqual(check(ctxWith([agent("none", undefined)])), []);
});

test("a plugin with no agents at all is silent", () => {
  assert.deepEqual(check({ root: "." }), []);
  assert.deepEqual(check(ctxWith([])), []);
});

// --- how it RESOLVES, which is where `since: "0.13"` earns its keep ---------------------------------

test("U14 is a warn below its introduction pin and a gate-failing error at 0.13 (ADR 0044's ceiling)", () => {
  const raw = check(ctxWith([agent("worker", { hooks: {} })]));
  const resolve = (pinned, config = configFrom({})) =>
    resolveFindings(raw, config, PROV, { pinned, sinceByReq: SINCE_BY_REQ })[0];

  const held = resolve("0.12");
  assert.equal(held.effectiveSeverity, "warn", "a check that did not exist at your pin cannot gate you");
  assert.equal(gatingFindings([held]).length, 0);
  assert.equal(held.ceiling.constraints[0].cause, "since", "an INTRODUCTION, not a tightening");

  const adopted = resolve("0.13");
  assert.equal(adopted.effectiveSeverity, "error");
  assert.equal(gatingFindings([adopted]).length, 1);

  // E26 IS THE REASON U14 NEEDS NO MIGRATION METADATA. Under the old ordering the pin downgrade was a
  // pre-pass, so this override would have beaten it and handed a gate-failing error to a plugin pinned
  // at 0.12 for a check that did not exist at its pin - the invariant broken by this release's own new
  // check. The ceiling runs last, so the override is honoured and then held back.
  const overridden = resolve("0.12", configFrom({ rules: { U14: "error" } }));
  assert.equal(overridden.effectiveSeverity, "warn", "a consumer's own override cannot outrank the pin");
  assert.ok(overridden.ceiling, "and the consumer is told why rather than seeing it silently ignored");
});

// --- CROSS-SCOPE PARITY ----------------------------------------------------------------------------

test("U14 and the marketplace A6 reading detect exactly the same fields, from one shared list", () => {
  // The parity requirement of ADR 0045, asserted rather than assumed. Before the shared module the list
  // existed in analyze.mjs alone; duplicating it for the plugin scope is how the two would drift, and a
  // plugin's verdict must not depend on whether it was graded on its own or as a catalogue member.
  assert.deepEqual([...A6_FIELDS], [...PLUGIN_AGENT_UNSUPPORTED_FIELDS], "the two scopes read one list");

  const shapes = [
    { hooks: {} },
    { mcpServers: { a: 1 } },
    { permissionMode: "acceptEdits" },
    { hooks: null, mcpServers: {} },
    { name: "ok", description: "d" },
    {},
    null,
  ];
  for (const fm of shapes) {
    const viaShared = unsupportedFieldsOn(fm);
    const viaA6 = fm && typeof fm === "object"
      ? A6_FIELDS.filter((f) => Object.prototype.hasOwnProperty.call(fm, f))
      : [];
    assert.deepEqual(viaShared, viaA6, `detection must agree for ${JSON.stringify(fm)}`);
  }
});

test("the supported and unsupported lists are disjoint, so no field is both", () => {
  const supported = new Set(PLUGIN_AGENT_SUPPORTED_FIELDS);
  for (const f of PLUGIN_AGENT_UNSUPPORTED_FIELDS) {
    assert.ok(!supported.has(f), `${f} cannot be both supported and refused`);
  }
});

test("U14 reads every agent file the RUNTIME loads, not only the ones registered", () => {
  // The check iterated ctx.subagents, which comes from listAgentFiles - and that discovery excludes
  // README.md and underscore-prefixed files, because those are not REGISTERED subagents. Claude Code
  // loads every .md in agents/ regardless: folder-readme.mjs records the probe where a directory holding
  // real-agent.md, README.md, _README.md and README.txt registered THREE subagents. So a plugin could put
  // `hooks` or `mcpServers` in agents/_unsafe.md, ship it to a runtime that loads it, and still earn a
  // clean verdict from the check written to forbid exactly that.
  const dir = mkdtempSync(nodePath.join(tmpdir(), "askit-u14-runtime-"));
  try {
    mkdirSync(nodePath.join(dir, "agents"), { recursive: true });
    writeFileSync(nodePath.join(dir, "library.json"), JSON.stringify({ name: "t", version: "0.1.0", description: "A fixture proving U14 reads runtime-loaded agent files.", standard: "0.13", tier: "universal" }, null, 2));
    writeFileSync(nodePath.join(dir, "agents", "_unsafe.md"), "---\nname: sneaky\ndescription: An agent hidden behind an underscore prefix.\nhooks:\n  PreToolUse: ./x.sh\n---\n\nbody\n");
    writeFileSync(nodePath.join(dir, "agents", "README.md"), "---\ntitle: Agents\ndescription: A folder guide Claude nonetheless loads as an agent.\nmcpServers:\n  evil: {}\n---\n\nbody\n");

    const ctx = loadPlugin(dir);
    assert.deepEqual(ctx.subagents.map((a) => a.name), [], "neither file is REGISTERED - that is the whole trap");
    assert.deepEqual(ctx.agentDocs.map((a) => a.name).sort(), ["README", "_unsafe"], "but both are loaded at runtime");

    const found = check(ctx);
    const names = found.map((x) => x.message.match(/agent "([^"]+)"/)[1]).sort();
    assert.deepEqual(names, ["README", "_unsafe"], "and U14 now reports both");
    assert.ok(found.every((x) => x.severity === "error"), "at error severity, like any other U14 finding");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
