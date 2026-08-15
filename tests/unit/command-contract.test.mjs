import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { check, meta } from "../../scripts/checks/command-contract.mjs";

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");

test("meta declares S7 convergent", () => {
  assert.equal(meta.reqId, "S7");
  assert.equal(meta.tier, "convergent");
});
test("no commands - conditional, no findings", () => {
  assert.deepEqual(check(loadPlugin(path.join(FIXTURES, "golden/minimal-skill"))), []);
});
test("golden command-fixture: maps-to resolves - no findings", () => {
  assert.deepEqual(check(loadPlugin(path.join(FIXTURES, "golden/command-fixture"))), []);
});
test("command-orphan-mapsto: maps-to names a missing skill is an S7 error", () => {
  const r = check(loadPlugin(path.join(FIXTURES, "anti/command-orphan-mapsto")));
  assert.ok(r.some((f) => f.reqId === "S7" && /co-cmd/.test(f.message) && /co-missing-skill/.test(f.message)));
});
test("command-no-mapsto: missing maps-to is an S7 error", () => {
  const r = check(loadPlugin(path.join(FIXTURES, "anti/command-no-mapsto")));
  assert.ok(r.some((f) => f.reqId === "S7" && /cn-cmd/.test(f.message) && /maps-to/.test(f.message)));
});
test("command-no-description: a command with a resolving maps-to but no description is an S7 error (isolates the description branch)", () => {
  const r = check(loadPlugin(path.join(FIXTURES, "anti/command-no-description")));
  assert.ok(r.some((f) => f.reqId === "S7" && /cd-cmd/.test(f.message) && /description/.test(f.message)));
  // maps-to resolves to cd-skill, so no maps-to finding should fire - the description branch is isolated.
  assert.ok(!r.some((f) => /maps-to/.test(f.message)));
});

// --- ADR 0047: ctx.workflows is built, so maps-to can resolve to a real workflow -----------------

test("ADR 0047: maps-to naming a real _workflows/<name>.md resolves, and used to be reported unresolved", () => {
  // The defect this fixes is not a missing feature, it is a gate finding that states something UNTRUE
  // about the consumer's filesystem: "maps-to X but no skill or workflow by that name exists on disk",
  // against a repository containing _workflows/X.md. The remediation it implies - delete the mapping,
  // or rename the workflow into a skill - is destructive advice from a wrong premise.
  const ctx = {
    root: "/x",
    skills: [],
    workflows: [{ name: "fx-arc", frontmatter: { title: "The fx arc" } }],
    commands: [{ name: "fx-run", frontmatter: { description: "run the arc", "maps-to": "fx-arc" } }],
  };
  assert.deepEqual(check(ctx), [], "a command mapping to a workflow on disk must produce no finding");

  // and the negative control: a maps-to naming nothing is still reported.
  const missing = { ...ctx, commands: [{ name: "fx-run", frontmatter: { description: "d", "maps-to": "nope" } }] };
  const f = check(missing);
  assert.equal(f.length, 1);
  assert.match(f[0].message, /no skill or workflow by that name exists on disk/);
});

test("ADR 0047: a workflow name never masks the skill namespace, and both resolve", () => {
  const ctx = {
    root: "/x",
    skills: [{ name: "fx-demo" }],
    workflows: [{ name: "fx-arc", frontmatter: {} }],
    commands: [
      { name: "a", frontmatter: { description: "d", "maps-to": "fx-demo" } },
      { name: "b", frontmatter: { description: "d", "maps-to": "fx-arc" } },
    ],
  };
  assert.deepEqual(check(ctx), []);
});
