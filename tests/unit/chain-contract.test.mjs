import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { resolveFindings } from "../../scripts/lib/resolve-config.mjs";
import { configFrom } from "../../scripts/lib/config.mjs";
import { provenanceByReq } from "../../scripts/lib/registry.mjs";

const PROV = provenanceByReq();
import { check, meta } from "../../scripts/checks/chain-contract.mjs";
import { SEVERITY } from "../../scripts/lib/findings.mjs";

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");

test("meta declares S4 convergent", () => {
  assert.equal(meta.reqId, "S4");
  assert.equal(meta.tier, "convergent");
});

test("golden silver fixture (no chaining) - no findings (conditional)", () => {
  assert.deepEqual(check(loadPlugin(path.join(FIXTURES, "golden/silver-fixture"))), []);
});

test("chain-phantom fixture: contract names a callee that has no on-disk component", () => {
  const r = check(loadPlugin(path.join(FIXTURES, "anti/chain-phantom")));
  assert.ok(r.some((f) => f.reqId === "S4" && /this-component-does-not-exist/.test(f.message) && /missing/.test(f.message)));
});

test("chain-orphan fixture: a frontmatter chain invocation not permitted by the contract is an S4 orphan (legacy top-level `chain:` is still read)", () => {
  const ctx = loadPlugin(path.join(FIXTURES, "anti/chain-orphan"));
  // co-caller declares chain at the legacy top-level location deliberately (kept for compatibility);
  // S4 must still read it, or this orphan would go undetected.
  assert.ok(Array.isArray(ctx.skills[0]?.frontmatter?.chain));
  assert.equal(ctx.skills[0]?.frontmatter?.metadata?.chain, undefined);
  const r = check(ctx);
  assert.ok(r.some((f) => f.reqId === "S4" && /co-caller/.test(f.message) && /co-worker/.test(f.message) && /orphan/.test(f.message)));
});

test("chain-scalar-callee fixture: a scalar (non-list) callee is a contract-shape error", () => {
  const r = check(loadPlugin(path.join(FIXTURES, "anti/chain-scalar-callee")));
  assert.ok(r.some((f) => f.reqId === "S4" && /cs-caller/.test(f.message) && /must map to a list/.test(f.message)));
});

test("golden subagent-fixture: chain permitted + subagent in known set - no findings (declared under metadata.chain, the sanctioned location)", () => {
  const ctx = loadPlugin(path.join(FIXTURES, "golden/subagent-fixture"));
  // sf-caller declares its chain under metadata.chain (not top-level), so this is the golden
  // coverage for the new sanctioned location.
  assert.deepEqual(ctx.skills[0]?.frontmatter?.metadata?.chain, ["sf-worker"]);
  assert.equal(ctx.skills[0]?.frontmatter?.chain, undefined);
  // Empty result is the discriminating check: sf-caller -> sf-worker is permitted (no orphan),
  // and sf-worker (a subagent named as a contract callee) is not flagged as a phantom - which
  // it would be if subagents were absent from the known set. So [] proves both behaviors.
  assert.deepEqual(check(ctx), []);
});

test("when both metadata.chain and top-level chain are declared, metadata.chain wins (no merge)", () => {
  const ctx = loadPlugin(path.join(FIXTURES, "golden/subagent-fixture"));
  // sf-caller really declares metadata.chain: [sf-worker], which the contract permits. Graft a
  // conflicting, NOT-permitted top-level chain onto the same in-memory frontmatter: if the reader
  // incorrectly preferred (or merged in) the top-level value, this would surface as an S4 orphan
  // for "sf-not-permitted". It must not - metadata.chain alone must win.
  ctx.skills[0].frontmatter.chain = ["sf-not-permitted"];
  assert.deepEqual(check(ctx), []);
});

test("golden chain-string-fixture: metadata.chain as a comma-separated string is read (the recommended shape)", () => {
  const ctx = loadPlugin(path.join(FIXTURES, "golden/chain-string-fixture"));
  const caller = ctx.skills.find((s) => s.name === "cs-caller-comma");
  // Confirm the fixture actually exercises the string path, not an array.
  assert.equal(typeof caller.frontmatter?.metadata?.chain, "string");
  assert.equal(caller.frontmatter.metadata.chain, "cs-worker-a, cs-worker-b");
  assert.deepEqual(check(ctx), []);
});

test("golden chain-string-fixture: metadata.chain as a whitespace-only-separated string is tolerated", () => {
  const ctx = loadPlugin(path.join(FIXTURES, "golden/chain-string-fixture"));
  const caller = ctx.skills.find((s) => s.name === "cs-caller-space");
  assert.equal(typeof caller.frontmatter?.metadata?.chain, "string");
  assert.equal(caller.frontmatter.metadata.chain, "cs-worker-a cs-worker-b");
  assert.deepEqual(check(ctx), []);
});

test("metadata.chain string form: extra whitespace is trimmed and empty segments (e.g. a trailing comma) are dropped", () => {
  const ctx = loadPlugin(path.join(FIXTURES, "golden/subagent-fixture"));
  // sf-caller -> sf-worker is permitted by this fixture's contract. Overwrite the declared chain
  // with a messy string form of the same single edge and confirm it still resolves to [] findings.
  ctx.skills[0].frontmatter.metadata.chain = "  sf-worker ,  ";
  assert.deepEqual(check(ctx), []);
});

test("metadata.chain string form still fires an S4 orphan when the declared invocation is not permitted (proves the string path is actually read, not silently dropped)", () => {
  const ctx = loadPlugin(path.join(FIXTURES, "golden/subagent-fixture"));
  ctx.skills[0].frontmatter.metadata.chain = "sf-not-permitted";
  const r = check(ctx);
  assert.ok(r.some((f) => f.reqId === "S4" && /sf-caller/.test(f.message) && /sf-not-permitted/.test(f.message) && /orphan/.test(f.message)));
});

test("metadata.chain as a string still wins over a conflicting legacy top-level chain (no merge)", () => {
  const ctx = loadPlugin(path.join(FIXTURES, "golden/subagent-fixture"));
  ctx.skills[0].frontmatter.metadata.chain = "sf-worker";
  ctx.skills[0].frontmatter.chain = ["sf-not-permitted"];
  assert.deepEqual(check(ctx), []);
});

// ADR 0041 (scheduled tightening of the string-declared chain shape): a component that names its
// invocation as a STRING was only PARSED starting with the ADR 0040 fix. Main never gated on a string
// declaration at all, so a finding produced ONLY because a string was newly read must not gate-fail a
// plugin that was passing S4 before the toolkit was upgraded. severity is WARN for a string-shaped
// declaration, with a message naming the Standard 0.13 graduation, and unchanged ERROR for an
// array-shaped declaration (the shape main already parsed and gated on).

test("ADR 0041 + 0044: a string-shaped orphan now EMITS error and carries the migration that holds it back", () => {
  // REPLACED at v1.13.0, not deleted. The old version asserted `severity === WARN` and that the raw
  // message named 0.13 - both properties this design deliberately MOVES. A check now emits its target
  // severity always, because a warn-ceiling over a warn finding is what made ADR 0041's graduation
  // inert; and the 0.13 note is now a property of a RESOLVED finding, not an emitted one, because only
  // the resolver knows the pin and whether --strict is on. The replacements below assert the resolved
  // output for the default, lifted, non-binding and strict runs, which is strictly more than the old
  // assertion covered.
  const ctx = loadPlugin(path.join(FIXTURES, "golden/subagent-fixture"));
  ctx.skills[0].frontmatter.metadata.chain = "sf-not-permitted";
  const r = check(ctx);
  const f = r.find((f) => f.reqId === "S4" && /sf-caller/.test(f.message) && /sf-not-permitted/.test(f.message) && /orphan/.test(f.message));
  assert.ok(f, "expected an S4 orphan finding");
  assert.equal(f.severity, SEVERITY.ERROR, "the check emits its TARGET severity");
  assert.equal(f.migration.capAt, SEVERITY.WARN);
  assert.equal(f.migration.until, "0.13");
  assert.ok(!/0\.13/.test(f.message), "the raw message makes no run-specific claim; the note is derived on resolution");
  assert.ok(!/stays capped/.test(f.migration.reason), "the reason is activation-neutral, so it is safe in --json under --strict");
});

test("ADR 0044: the string-shaped S4 finding resolves per PIN - held, lifted, and inert under --strict", () => {
  const ctx = loadPlugin(path.join(FIXTURES, "golden/subagent-fixture"));
  ctx.skills[0].frontmatter.metadata.chain = "sf-not-permitted";
  const raw = check(ctx).filter((f) => f.reqId === "S4" && /orphan/.test(f.message));
  assert.ok(raw.length >= 1);
  const resolve = (pinned) => resolveFindings(raw, configFrom({}), PROV, { pinned, sinceByReq: {} })[0];

  // DEFAULT: pinned below the graduation, so the ceiling binds and the note is emitted.
  const held = resolve("0.12");
  assert.equal(held.effectiveSeverity, "warn", "a consumer pinned at 0.12 sees exactly what it saw before");
  assert.ok(held.migrationNotice, "and is told why");
  assert.match(held.message, /once you pin Standard 0\.13/, "the note is run-specific and derived here");

  // LIFTED: the graduation is real, which is what ADR 0041's own mechanism could never deliver.
  const lifted = resolve("0.13");
  assert.equal(lifted.effectiveSeverity, "error");
  assert.equal(lifted.migrationNotice, null);
  assert.ok(!/once you pin/.test(lifted.message), "nothing is pending, so nothing is promised");

  // STRICT: the caller passes no pin at all, so the ceiling is inert and no graduation is promised in a
  // run where the finding is ALREADY an error - the falsehood that forced the reason to go neutral.
  const strict = resolve(undefined);
  assert.equal(strict.effectiveSeverity, "error");
  assert.equal(strict.migrationNotice, null);
  assert.equal(strict.ceiling, null);
  assert.ok(!/once you pin/.test(strict.message));
});

test("ADR 0041: an array-shaped orphan (metadata.chain as a list) is still SEVERITY.ERROR, unchanged", () => {
  const ctx = loadPlugin(path.join(FIXTURES, "golden/subagent-fixture"));
  ctx.skills[0].frontmatter.metadata.chain = ["sf-not-permitted"];
  const r = check(ctx);
  const f = r.find((f) => f.reqId === "S4" && /sf-caller/.test(f.message) && /sf-not-permitted/.test(f.message) && /orphan/.test(f.message));
  assert.ok(f, "expected an S4 orphan finding");
  assert.equal(f.severity, SEVERITY.ERROR);
  assert.doesNotMatch(f.message, /0\.13/);
});

test("ADR 0041 + 0044: the chain-string-no-contract fixture EMITS error and carries the migration (see the resolved-output test above)", () => {
  const ctx = loadPlugin(path.join(FIXTURES, "anti/chain-string-no-contract"));
  assert.equal(typeof ctx.skills[0]?.frontmatter?.metadata?.chain, "string");
  const r = check(ctx);
  assert.equal(r.length, 1);
  assert.equal(r[0].reqId, "S4");
  assert.equal(r[0].severity, SEVERITY.ERROR, "the check emits its TARGET severity");
  assert.match(r[0].message, /agents\/_chain-permitted\.yaml is missing/);
  assert.equal(r[0].migration.until, "0.13", "and the migration is what holds it back per-pin");
  assert.ok(!/0\.13/.test(r[0].message), "the raw message makes no run-specific claim");
});

test("ADR 0041: same chain-string-no-contract plugin, with the declaration mutated to an ARRAY, still produces SEVERITY.ERROR for the missing-contract finding, unchanged", () => {
  const ctx = loadPlugin(path.join(FIXTURES, "anti/chain-string-no-contract"));
  ctx.skills[0].frontmatter.metadata.chain = ["cx-callee"];
  const r = check(ctx);
  assert.equal(r.length, 1);
  assert.equal(r[0].reqId, "S4");
  assert.equal(r[0].severity, SEVERITY.ERROR);
  assert.match(r[0].message, /agents\/_chain-permitted\.yaml is missing/);
  assert.doesNotMatch(r[0].message, /0\.13/);
});

// Round-2 adversarial review (high severity): resolveFindings applied a consumer's rules override
// with HIGHER precedence than the severity emitted here, so `rules.S4 = "error"` could promote a
// warn-first string-shaped finding back into a gate-failing error - defeating the whole point of
// this file's WARN branches. The fix is a finding-level migration cap (scripts/lib/resolve-config.mjs)
// that `resolveFindings` enforces as a ceiling no override can cross. These two branches are where
// that cap metadata must originate; the array-shaped paths must carry NONE of it.

test("ADR 0041 round 2: the string-shaped missing-contract finding carries migration cap metadata (capAt warn, until 0.13)", () => {
  const ctx = loadPlugin(path.join(FIXTURES, "anti/chain-string-no-contract"));
  const r = check(ctx);
  assert.equal(r.length, 1);
  assert.deepEqual(r[0].migration, { capAt: SEVERITY.WARN, until: "0.13", reason: r[0].migration?.reason });
  assert.equal(typeof r[0].migration.reason, "string");
  assert.ok(r[0].migration.reason.length > 0, "the cap must carry a human-readable reason, surfaced to a consumer");
});

test("ADR 0041 round 2: the array-shaped missing-contract finding carries NO migration metadata at all", () => {
  const ctx = loadPlugin(path.join(FIXTURES, "anti/chain-string-no-contract"));
  ctx.skills[0].frontmatter.metadata.chain = ["cx-callee"];
  const r = check(ctx);
  assert.equal(r.length, 1);
  assert.equal(r[0].migration, null, "the array path is completely untouched by the migration cap");
});

test("ADR 0041 round 2: a string-shaped orphan finding carries migration cap metadata (capAt warn, until 0.13)", () => {
  const ctx = loadPlugin(path.join(FIXTURES, "golden/subagent-fixture"));
  ctx.skills[0].frontmatter.metadata.chain = "sf-not-permitted";
  const r = check(ctx);
  const f = r.find((f) => f.reqId === "S4" && /orphan/.test(f.message));
  assert.ok(f);
  assert.deepEqual(f.migration, { capAt: SEVERITY.WARN, until: "0.13", reason: f.migration?.reason });
  assert.ok(f.migration.reason.length > 0);
});

test("ADR 0041 round 2: an array-shaped orphan finding carries NO migration metadata at all", () => {
  const ctx = loadPlugin(path.join(FIXTURES, "golden/subagent-fixture"));
  ctx.skills[0].frontmatter.metadata.chain = ["sf-not-permitted"];
  const r = check(ctx);
  const f = r.find((f) => f.reqId === "S4" && /orphan/.test(f.message));
  assert.ok(f);
  assert.equal(f.migration, null, "the array path is completely untouched by the migration cap");
});
