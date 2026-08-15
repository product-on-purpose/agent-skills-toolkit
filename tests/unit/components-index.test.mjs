import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { check, meta } from "../../scripts/checks/components-index.mjs";
import { resolveFindings, gatingFindings } from "../../scripts/lib/resolve-config.mjs";
import { configFrom } from "../../scripts/lib/config.mjs";
import { provenanceByReq } from "../../scripts/lib/registry.mjs";
import { SINCE_BY_REQ } from "../../scripts/lib/standard-gate.mjs";

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");

test("meta declares S3 convergent", () => {
  assert.equal(meta.reqId, "S3");
  assert.equal(meta.tier, "convergent");
});

test("golden silver fixture has matching components index - no error", () => {
  const r = check(loadPlugin(path.join(FIXTURES, "golden/silver-fixture")));
  assert.equal(r.filter((f) => f.severity === "error").length, 0);
});

test("components-drift fixture errors on both declared-missing and on-disk-undeclared", () => {
  const r = check(loadPlugin(path.join(FIXTURES, "anti/components-drift")));
  const errs = r.filter((f) => f.severity === "error");
  assert.ok(errs.some((e) => /cd-missing-skill/.test(e.message) && /not on disk/.test(e.message)));
  assert.ok(errs.some((e) => /cd-on-disk-only/.test(e.message) && /not declared/.test(e.message)));
});

test("missing components is an S3 error", () => {
  const ctx = { library: { data: {} }, skills: [] };
  assert.ok(check(ctx).some((f) => f.reqId === "S3" && /missing/.test(f.message)));
});

test("S3: golden subagent-fixture has matching subagents index - no error", () => {
  const r = check(loadPlugin(path.join(FIXTURES, "golden/subagent-fixture")));
  assert.equal(r.filter((f) => f.severity === "error").length, 0);
});

test("S3 flags a declared subagent missing on disk", () => {
  const ctx = { library: { data: { components: { skills: [], subagents: [{ name: "ghost" }] } } }, skills: [], subagents: [] };
  assert.ok(check(ctx).some((f) => f.reqId === "S3" && /ghost/.test(f.message) && /not on disk/.test(f.message)));
});

test("S3 flags an on-disk subagent not declared", () => {
  const ctx = { library: { data: { components: { skills: [], subagents: [] } } }, skills: [], subagents: [{ name: "rogue" }] };
  assert.ok(check(ctx).some((f) => f.reqId === "S3" && /rogue/.test(f.message) && /not declared/.test(f.message)));
});

test("S3: golden command-fixture has matching commands index - no error", () => {
  const r = check(loadPlugin(path.join(FIXTURES, "golden/command-fixture")));
  assert.equal(r.filter((f) => f.severity === "error").length, 0);
});
test("S3 flags a declared command missing on disk", () => {
  const ctx = { library: { data: { components: { skills: [], commands: [{ name: "ghostcmd" }] } } }, skills: [], subagents: [], commands: [] };
  assert.ok(check(ctx).some((f) => f.reqId === "S3" && /ghostcmd/.test(f.message) && /not on disk/.test(f.message)));
});
test("S3 flags an on-disk command not declared", () => {
  const ctx = { library: { data: { components: { skills: [], commands: [] } } }, skills: [], subagents: [], commands: [{ name: "roguecmd" }] };
  assert.ok(check(ctx).some((f) => f.reqId === "S3" && /roguecmd/.test(f.message) && /not declared/.test(f.message)));
});

// --- ADR 0047 part 2: the workflow half of the mirror, and the window that makes it safe ----------

/** A minimal ctx declaring `declared` workflows in library.json against `onDisk` workflow files. */
function wfCtx(declared, onDisk) {
  return {
    root: "/x",
    library: { data: { components: { workflows: declared } } },
    skills: [], subagents: [], commands: [], mcpServers: [],
    workflows: onDisk.map((name) => ({ name, frontmatter: {} })),
  };
}

test("ADR 0047: a workflow on disk but not declared is reported", () => {
  const f = check(wfCtx([], ["design-sprint"]));
  assert.equal(f.length, 1);
  assert.match(f[0].message, /_workflows\/design-sprint\.md exists on disk but is not declared/);
});

test("ADR 0047: a declared workflow with no file on disk is reported", () => {
  const f = check(wfCtx([{ name: "ghost" }], []));
  assert.equal(f.length, 1);
  assert.match(f[0].message, /declares "ghost" but it is not on disk under _workflows\//);
});

test("ADR 0047: a correctly mirrored workflow reports nothing", () => {
  assert.deepEqual(check(wfCtx([{ name: "design-sprint" }], ["design-sprint"])), []);
});

test("ADR 0047: EVERY workflow-mirror finding carries the migration window", () => {
  // S3's meta.since is "0.x", so a subrule under it inherits NO window unless each finding carries
  // its own (ADR 0044 point 4). A finding that forgets the metadata gates immediately at every pin,
  // which is the difference between a migration and a breaking change. Assert it on the findings
  // rather than on the constant, so adding a fourth branch without the metadata fails here.
  const all = [
    ...check(wfCtx([], ["a", "b"])),
    ...check(wfCtx([{ name: "ghost" }], [])),
    ...check(wfCtx([{ name: 42 }], [])),
  ];
  assert.ok(all.length >= 4);
  for (const f of all) {
    assert.deepEqual(
      f.migration,
      { capAt: "warn", until: "0.15", reason: "the workflow half of the components mirror is introduced at Standard 0.14 and gates at 0.15" },
      `a workflow-mirror finding shipped with no window: ${f.message}`
    );
  }
});

test("ADR 0047: the migration `reason` is ACTIVATION-NEUTRAL and never claims a cap is in force", () => {
  // Under --strict the pin is undefined, nothing binds, and the finding is a LIVE ERROR while this
  // static metadata is still visible in --json. A reason asserting "capped at warn until you pin" is
  // then false on screen. Round 17 of the v1.13.0 review caught exactly this wording on U1's
  // selfValidation subrule; the run-specific migrationNotice is what may describe an active cap.
  const [f] = check(wfCtx([], ["a"]));
  assert.doesNotMatch(f.migration.reason, /\bcapped\b|\bis capped\b|\buntil you\b|\bcurrently\b/i);
});

test("ADR 0047: the workflow mirror is a WARN below 0.15 and a gate-failing error at 0.15", () => {
  const raw = check(wfCtx([], ["design-sprint"]));
  const PROV = provenanceByReq();
  const resolve = (pinned) =>
    resolveFindings(raw, configFrom({}), PROV, { pinned, sinceByReq: SINCE_BY_REQ })[0];

  for (const pin of ["0.13", "0.14"]) {
    const held = resolve(pin);
    assert.equal(held.severity, "error", "the check emits its TARGET severity, always (ADR 0044)");
    assert.equal(held.effectiveSeverity, "warn", `pinned ${pin} must not gate on a 0.15 tightening`);
    assert.equal(gatingFindings([held]).length, 0);
    assert.equal(held.ceiling.constraints.find((c) => c.cause === "until").due, "0.15");
  }

  const due = resolve("0.15");
  assert.equal(due.effectiveSeverity, "error", "at 0.15 the tightening is in force");
  assert.equal(due.ceiling, null, "nothing binds any more");
  assert.equal(gatingFindings([due]).length, 1);
});

// --- ADR 0046 point 5: S3 stops claiming a declared, on-disk agent file is absent ------------------

test("ADR 0046: a DECLARED, on-disk underscore-prefixed agent is not reported as missing", () => {
  // The second, opposite defect the E42 measurement found and nobody had filed. Before this, the gate
  // rewarded CONCEALING an unregistered agent file (silence) and punished DECLARING it (a false claim
  // that the file is not on disk). Correcting it can only remove a finding, so it needs no window.
  const ctx = {
    root: "/x",
    library: { data: { components: { subagents: [{ name: "_shadow" }] } } },
    skills: [], commands: [], mcpServers: [], workflows: [],
    subagents: [],                                   // registration list EXCLUDES it
    agentDocs: [{ name: "_shadow" }],                // the runtime loads it
  };
  const missing = check(ctx).filter((f) => /is not on disk under agents\//.test(f.message));
  assert.deepEqual(missing, [], "the file IS on disk; the gate must not say otherwise");
});

test("ADR 0046: the opposite direction is UNCHANGED and still reads the registration list", () => {
  // Deliberate asymmetry. This direction is the tightening and U15 owns it; widening it here would
  // tell the author to declare agents/README.md as a subagent, creating the phantom. A test pins the
  // asymmetry so a future reviewer cannot "fix" it as an oversight.
  const ctx = {
    root: "/x",
    library: { data: { components: { subagents: [] } } },
    skills: [], commands: [], mcpServers: [], workflows: [],
    subagents: [{ name: "registered" }],
    agentDocs: [{ name: "registered" }, { name: "README" }],
  };
  const undeclared = check(ctx).filter((f) => /exists on disk but is not declared/.test(f.message));
  assert.equal(undeclared.length, 1, "only the REGISTERED agent drives this direction");
  assert.match(undeclared[0].message, /agents\/registered\.md/);
  assert.ok(
    !undeclared.some((f) => /README/.test(f.message)),
    "S3 must never demand that a folder guide be declared as a subagent"
  );
});
