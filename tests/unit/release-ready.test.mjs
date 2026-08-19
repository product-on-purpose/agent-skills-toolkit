// what-it-is:   the decision table for release-ready (review wave 2, H2)
// what-it-does: proves which exit codes block a tag, that vendor-watch exit 1 is NOT overridable at any level,
//               and that both release workflows actually invoke the aggregate
// why:          the gate this file guards replaced a CHECKLIST LINE. A line in RELEASE.md asking a human to
//               confirm the vendor watch was green is exactly as reliable as the memory the watch was built to
//               replace, and neither release.yml nor publish-npm.yml ran it. Tests here, and an assertion that
//               the workflows call it, are what make it a gate rather than a second piece of prose
// used-by:      npm test
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GATES, GATE_TIMEOUT_MS, SPAWN_FAILED, gateBlocks, overrideApplies, summarize, exitCodeFor, renderSummary } from "../../scripts/lib/release-ready.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const gate = (id) => GATES.find((g) => g.id === id);
const allPass = () => GATES.map((g) => ({ id: g.id, code: 0 }));
const withCode = (id, code) => allPass().map((r) => (r.id === id ? { ...r, code } : r));

test("everything green is releasable", () => {
  const s = summarize(allPass());
  assert.equal(s.ok, true);
  assert.equal(exitCodeFor(s), 0);
});

test("vendor-watch exit 1 BLOCKS: a claim is gone or stale", () => {
  // The whole reason this aggregate exists. Before it, this was a human ticking a box.
  const s = summarize(withCode("vendor-watch", 1));
  assert.equal(s.ok, false);
  assert.equal(exitCodeFor(s), 1);
  assert.equal(s.rows.find((r) => r.id === "vendor-watch").status, "BLOCK");
});

test("vendor-watch exit 2 BLOCKS: a run that could not read a page proved nothing", () => {
  const s = summarize(withCode("vendor-watch", 2));
  assert.equal(s.ok, false);
  assert.equal(exitCodeFor(s), 1);
});

test("the override excuses an UNREACHABLE page (exit 2) and records why", () => {
  const s = summarize(withCode("vendor-watch", 2), { overrideReason: "code.claude.com returning 503 all morning" });
  assert.equal(s.ok, true);
  assert.equal(s.rows.find((r) => r.id === "vendor-watch").status, "overridden");
  assert.match(renderSummary(s), /OVERRIDE IN EFFECT: code\.claude\.com returning 503/);
});

test("the override does NOT excuse a claim that is gone or stale (exit 1), whatever reason is given", () => {
  // The asymmetry is the design. Exit 2 is a third party's outage; exit 1 is this repository publishing
  // something the vendor no longer says. No reason string makes shipping that acceptable, so none is taken.
  for (const reason of ["we are in a hurry", "known, tracked in #999", "x".repeat(500)]) {
    const s = summarize(withCode("vendor-watch", 1), { overrideReason: reason });
    assert.equal(s.ok, false, `exit 1 was excused by the reason "${reason.slice(0, 24)}"`);
  }
});

test("an EMPTY or whitespace override reason is not an override", () => {
  for (const reason of ["", "   ", "\n", null, undefined]) {
    assert.equal(overrideApplies(gate("vendor-watch"), 2, reason), false);
  }
});

test("the override is scoped to vendor-watch: it cannot excuse the conformance gate", () => {
  const s = summarize(withCode("conformance", 1), { overrideReason: "please" });
  assert.equal(s.ok, false);
  assert.equal(overrideApplies(gate("conformance"), 1, "please"), false);
});

test("EVERY gate blocks on ANY non-zero code, including codes no gate documents", () => {
  // F2. This ran only against `conformance` before, the gate with no `blocksOn` list, so it proved the
  // default branch and nothing else. Every gate is asserted now, because the defect was that the two gates
  // with a list took the OTHER branch.
  for (const g of GATES) {
    assert.equal(gateBlocks(g, 0), false, `${g.id} must pass on 0`);
    for (const code of [1, 2, 3, 42, 127]) {
      assert.equal(gateBlocks(g, code), true, `${g.id} must block on exit ${code}`);
    }
  }
});

test("a gate that could not be SPAWNED is not a pass - on the two gates that needed it", () => {
  // F2, the finding this replaces a vacuous test for. `runGate` maps spawnSync's null status to 127: the
  // process died on a signal or never started, and Number(null) is 0, which would have read as success.
  //
  // The old version asserted this with `withCode("readme-drift", 127)` - the ONE gate with no `blocksOn`
  // list, where the default `code !== 0` rule already applied. It was green while covering neither gate
  // that could actually be reached by the bug. Both network-bound gates are named explicitly here so the
  // test cannot drift back into proving the branch that was never broken.
  for (const id of ["vendor-watch", "action-pins"]) {
    for (const code of [127, 3]) {
      const s = summarize(withCode(id, code));
      assert.equal(s.ok, false, `${id} exit ${code} certified a release nothing checked`);
      assert.equal(exitCodeFor(s), 1);
    }
  }
});

test("no override reason excuses a gate that never ran", () => {
  // The override exists for somebody else's outage, which is a fact about a gate that RAN and could not
  // reach a third party. A gate that failed to spawn proved nothing at all, so there is no reason string
  // that makes shipping past it acceptable. Without this, an operator excusing a vendor 503 would also
  // wave through a gate killed by an OOM.
  for (const id of ["vendor-watch", "action-pins"]) {
    assert.equal(overrideApplies(gate(id), 127, "vendor 503 all morning"), false);
    const s = summarize(withCode(id, 127), { overrideReason: "vendor 503 all morning" });
    assert.equal(s.ok, false);
  }
});

test("the report says a gate could not be SPAWNED, instead of printing why that gate exists", () => {
  // Output that misdescribes its own decision is the defect class this aggregate was built to remove, and
  // the renderer already carries that rule for the override line. A BLOCK row at 127 printing "a SHA pin's
  // comment is the only half a reviewer reads" tells the operator a pin label is wrong. Nothing was read.
  const out = renderSummary(summarize(withCode("action-pins", 127)));
  assert.match(out, /BLOCK\s+action-pins\s+\(exit 127\)/);
  assert.match(out, /could not be run/i);
  assert.doesNotMatch(out, /a SHA pin's comment is the only half/);
  assert.match(out, /NOT releasable/);
});

test("an UNKNOWN gate id in the results blocks rather than being ignored", () => {
  // A result the summary cannot attribute is a bug in the caller. Skipping it would report a clean release
  // from a run whose gates did not match the declared list.
  const s = summarize([...allPass(), { id: "not-a-gate", code: 0 }]);
  assert.equal(s.ok, false);
});

test("the report never claims an override was in effect when nothing was overridden", () => {
  // Caught by running the CLI against a deliberately-broken pin: a blocked run printed "OVERRIDE IN EFFECT"
  // above "NOT releasable", which reads as an exception having been granted. It had not been - the design's
  // whole point is that exit 1 cannot be. Output that misdescribes its own decision is the class of defect
  // this aggregate exists to remove, so it does not get to have one.
  const out = renderSummary(summarize(withCode("vendor-watch", 1), { overrideReason: "trying to sneak past" }));
  assert.doesNotMatch(out, /OVERRIDE IN EFFECT/);
  assert.match(out, /Override offered and NOT APPLIED/);
  assert.match(out, /NOT releasable/);
});

test("a real override names exactly which gate it excused", () => {
  const out = renderSummary(summarize(withCode("vendor-watch", 2), { overrideReason: "vendor 503" }));
  assert.match(out, /OVERRIDE IN EFFECT: vendor 503/);
  assert.match(out, /It excused: vendor-watch \(exit 2\)/);
});

test("the report leads with what blocks", () => {
  const out = renderSummary(summarize(withCode("vendor-watch", 1)));
  const lines = out.split("\n").filter((l) => /^(ok|BLOCK|override|UNKNOWN)/.test(l));
  assert.match(lines[0], /^BLOCK/);
  assert.match(out, /NOT releasable/);
});

// --- F9: one reason, more than one refusal --------------------------------

const withCodes = (ids, code) => allPass().map((r) => (ids.includes(r.id) ? { ...r, code } : r));

test("F9: one reason CAN excuse both network gates at once, and the summary names both", () => {
  // The path the test helper could never reach, because it only ever set ONE gate non-zero. ADR 0053
  // decided to reuse the single flag deliberately, rejecting a second near-identical one as proliferation,
  // and its stated safeguard is that the summary names which gates an override actually applied to. That
  // safeguard was never asserted. It is now.
  const s = summarize(withCodes(["vendor-watch", "action-pins"], 2), { overrideReason: "GitHub API and the vendor host both 503" });
  assert.equal(s.ok, true);
  assert.deepEqual(s.rows.filter((r) => r.status === "overridden").map((r) => r.id).sort(), ["action-pins", "vendor-watch"]);
  const out = renderSummary(s);
  assert.ok(out.includes("vendor-watch (exit 2)"), "the summary must name vendor-watch as excused");
  assert.ok(out.includes("action-pins (exit 2)"), "the summary must name action-pins as excused");
});

test("F9: excusing MORE THAN ONE refusal says so in as many words", () => {
  // The residual risk the finding names: an operator reaching for the flag because of a known vendor
  // outage silently also waives an unrelated action-registry refusal. The operator flow already surfaces
  // both (the run fails, the table is read, the flag is added), so the remedy is to say plainly that one
  // reason covered two things rather than to add a second flag ADR 0053 considered and rejected.
  const two = renderSummary(summarize(withCodes(["vendor-watch", "action-pins"], 2), { overrideReason: "outage" }));
  assert.match(two, /2 separate refusals/);
  const one = renderSummary(summarize(withCode("vendor-watch", 2), { overrideReason: "outage" }));
  assert.doesNotMatch(one, /separate refusals/, "one excused gate must not be described as several");
});

test("F9: a reason still cannot excuse a LABEL problem sitting beside a refusal", () => {
  // The wave-1 lesson, re-asserted now that two gates can fail together: exit 1 outranks exit 2, so a
  // network reason string can never carry a proven defect through with it.
  const mixed = allPass().map((r) => (r.id === "vendor-watch" ? { ...r, code: 2 } : r.id === "action-pins" ? { ...r, code: 1 } : r));
  const s = summarize(mixed, { overrideReason: "GitHub API 503" });
  assert.equal(s.ok, false);
  assert.equal(s.rows.find((r) => r.id === "action-pins").status, "BLOCK");
});

// --- F10: nothing bounded how long anything could take ---------------------

test("F10: EVERY job in EVERY workflow declares timeout-minutes", () => {
  // `grep -rn timeout-minutes .github/workflows/` returned nothing. A hung job is not a theoretical risk
  // here: `publish-npm.yml` uses `cancel-in-progress: false`, deliberately, so a stuck prepare job blocked
  // every later publish dispatch until a human noticed and cancelled it. Bounding the job is the fix for
  // that; auto-cancelling an in-flight publish would be worse than the stuck job.
  const dir = path.join(REPO, ".github", "workflows");
  const files = readdirSync(dir).filter((n) => n.endsWith(".yml") || n.endsWith(".yaml"));
  assert.ok(files.length > 0, "there must be workflows to check");
  const missing = [];
  for (const name of files) {
    const doc = parseYaml(readFileSync(path.join(dir, name), "utf8"));
    for (const [jobId, job] of Object.entries(doc?.jobs ?? {})) {
      if (typeof job?.["timeout-minutes"] !== "number") missing.push(`${name}:${jobId}`);
    }
  }
  assert.deepEqual(missing, [], `jobs with no timeout-minutes: ${missing.join(", ")}`);
});

test("F10: the gate runner declares a spawn timeout, and a timed-out gate BLOCKS", () => {
  // The composition matters more than the number: spawnSync's timeout kills the child, `status` comes back
  // null, `runGate` maps null to SPAWN_FAILED, and F2's fix makes SPAWN_FAILED block. A gate that ran out
  // of time therefore cannot certify a release, for the same reason a gate that never started cannot.
  assert.equal(typeof GATE_TIMEOUT_MS, "number");
  assert.ok(GATE_TIMEOUT_MS > 0, "a timeout of zero or less would disable the bound rather than set it");
  assert.equal(gateBlocks(gate("action-pins"), SPAWN_FAILED), true);
});

test("R4: a job that runs the aggregate outlives EVERY gate timing out inside it", () => {
  // Fix-code review, 2026-08-19. F10 set a 10-minute gate timeout under 20-minute jobs. One hung gate
  // worked as designed - killed, status null, SPAWN_FAILED, blocked, diagnostic printed. TWO hung gates did
  // not: a network blackhole hangs both network-bound gates, the job is cancelled at its own limit before
  // `renderSummary` ever runs, and the operator gets a bare job cancellation instead of "this gate could
  // not be RUN". The diagnostic F2 exists to print cannot print in the correlated failure it was built for.
  //
  // Asserted as arithmetic rather than fixed by hand, so the two numbers cannot drift apart again: the job
  // must outlast every gate hanging at once.
  // The job budget is NOT spent on gates alone, and the first version of this assertion pretended it was -
  // third-round review, S3. Before `release-ready.mjs` starts, `publish-npm.yml:prepare` runs a
  // `fetch-depth: 0` checkout, setup-node, four verifier scripts, a second checkout, `npm ci` and the full
  // suite (over a thousand tests, more than a minute locally and more again on a hosted runner - the exact
  // count is deliberately not quoted here, because quoting one was itself a fourth-round finding the moment
  // the same commit changed it). Comparing the job cap against
  // the gate total alone left that entire preamble unbudgeted, so the correlated case could still cancel
  // the job before `renderSummary` printed - losing the exact diagnostic this arithmetic exists to keep.
  const PREAMBLE_ALLOWANCE_MS = 20 * 60_000;
  const worstCaseMs = GATES.length * GATE_TIMEOUT_MS + PREAMBLE_ALLOWANCE_MS;
  const dir = path.join(REPO, ".github", "workflows");
  const running = [];
  for (const name of readdirSync(dir).filter((n) => n.endsWith(".yml"))) {
    const text = readFileSync(path.join(dir, name), "utf8");
    if (!text.includes("scripts/release-ready.mjs")) continue;
    const doc = parseYaml(text);
    for (const [jobId, job] of Object.entries(doc?.jobs ?? {})) {
      const steps = JSON.stringify(job?.steps ?? []);
      if (!steps.includes("scripts/release-ready.mjs")) continue;
      running.push(`${name}:${jobId}`);
      assert.ok(
        job["timeout-minutes"] * 60_000 > worstCaseMs,
        `${name}:${jobId} caps at ${job["timeout-minutes"]}m, but ${GATES.length} gates can hang for ` +
          `${(GATES.length * GATE_TIMEOUT_MS) / 60_000}m on top of a ${PREAMBLE_ALLOWANCE_MS / 60_000}m ` +
          `checkout-install-test preamble, so the job dies before the aggregate can report why`
      );
    }
  }
  assert.ok(running.length >= 2, `expected both release workflows to run the aggregate; found ${running.join(", ")}`);
});

test("BOTH release workflows invoke the aggregate, or it is prose again", () => {
  // The finding this file answers was not "there is no aggregate" - it was that the release-blocking
  // preconditions lived in a checklist. An aggregate no workflow calls is the same defect in a new file.
  for (const rel of [".github/workflows/release.yml", ".github/workflows/publish-npm.yml"]) {
    const wf = readFileSync(path.join(REPO, rel), "utf8");
    assert.match(wf, /scripts\/release-ready\.mjs/, `${rel} does not run the release-ready aggregate`);
  }
});

test("the RELEASE.md checklist points at the command rather than asking for a memory", () => {
  const md = readFileSync(path.join(REPO, "docs/internal/RELEASE.md"), "utf8");
  assert.match(md, /npm run release-ready/, "the checklist must name the command that proves the line");
});
