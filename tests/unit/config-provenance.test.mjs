// what-it-is:   W1a coverage for config provenance (ADR 0044)
// what-it-does: asserts every resolved setting carries who chose it - grader, subject, or default - and
//               that the origin-bearing shape never reaches the published --json contract
// why:          the published-verdict trust step must distinguish a rubric the GRADER selected from one
//               the SUBJECT wrote about itself, and before W1a those were indistinguishable by the time
//               the resolver ran: four entry points each merged CLI options into one flat object
// used-by:      npm test
import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { readFileSync, writeFileSync, mkdtempSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import {
  CONFIG_FILENAME,
  DEFAULT_CONFIG,
  ORIGIN,
  configFrom,
  loadConfig,
  publicConfig,
  withGraderOptions,
} from "../../scripts/lib/config.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..", "..");

function withConfig(data, fn) {
  const dir = mkdtempSync(path.join(tmpdir(), "askit-provenance-"));
  try {
    mkdirSync(path.join(dir, "skills"), { recursive: true });
    writeFileSync(path.join(dir, CONFIG_FILENAME), JSON.stringify(data), "utf8");
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// --- what the subject owns -------------------------------------------------------------------------

test("W1a: every setting read from the subject's own askit.config.json is stamped subject-owned", () => {
  withConfig(
    {
      mode: "published-verdict",
      profile: "plain-plugin",
      rules: { U6: "warn" },
      suppressions: [{ reqId: "U6", reason: "documented waiver" }],
    },
    (dir) => {
      const { config } = loadConfig(dir);
      assert.deepEqual(config.mode, { value: "published-verdict", origin: ORIGIN.SUBJECT });
      assert.deepEqual(config.profile, { value: "plain-plugin", origin: ORIGIN.SUBJECT });
      assert.deepEqual(config.rules.U6, { value: "warn", origin: ORIGIN.SUBJECT });
      // The suppression origin has to live ON THE ENTRY: matchSuppression returns this very object, so
      // once matching has happened there is nowhere else to recover the owner from.
      assert.equal(config.suppressions[0].origin, ORIGIN.SUBJECT);
    }
  );
});

test("W1a: an absent config owns nothing - every setting is default-origin", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "askit-provenance-none-"));
  try {
    const { config } = loadConfig(dir);
    assert.deepEqual(config, DEFAULT_CONFIG);
    assert.equal(config.mode.origin, ORIGIN.DEFAULT);
    assert.equal(config.profile.origin, ORIGIN.DEFAULT);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("W1a: a REJECTED subject value keeps the default's origin, never the subject's", () => {
  // The distinction is load-bearing rather than pedantic: the trust step acts on subject-owned settings,
  // so a malformed config that could claim ownership of the value it failed to set would be claiming
  // ownership of the DEFAULT - and a default lowers nothing, which is the whole reason defaults are a
  // third category rather than an owner.
  withConfig({ mode: "nonsense", profile: "nope", rules: { U6: "loud" } }, (dir) => {
    const { config } = loadConfig(dir);
    assert.deepEqual(config.mode, DEFAULT_CONFIG.mode);
    assert.deepEqual(config.profile, DEFAULT_CONFIG.profile);
    assert.equal(config.mode.origin, ORIGIN.DEFAULT);
    assert.equal(config.profile.origin, ORIGIN.DEFAULT);
    assert.equal(config.rules.U6, undefined, "an invalid severity is not a rule at all");
  });
});

// --- what the grader owns --------------------------------------------------------------------------

test("W1a: caller-supplied options are grader-owned, and an absent option leaves the subject's setting alone", () => {
  const subject = configFrom({ mode: "local", profile: "plain-plugin", rules: { U6: "warn" } }, ORIGIN.SUBJECT);

  const bothSupplied = withGraderOptions(subject, { mode: "published-verdict", profile: "askit-library" });
  assert.deepEqual(bothSupplied.mode, { value: "published-verdict", origin: ORIGIN.GRADER });
  assert.deepEqual(bothSupplied.profile, { value: "askit-library", origin: ORIGIN.GRADER });

  // The half that matters: NOT supplying an option must not reattribute the subject's own choice to the
  // grader. A blanket re-stamp would hand every subject-configured profile a grader's exemption.
  const neitherSupplied = withGraderOptions(subject, {});
  assert.deepEqual(neitherSupplied.profile, { value: "plain-plugin", origin: ORIGIN.SUBJECT });
  assert.deepEqual(neitherSupplied.mode, { value: "local", origin: ORIGIN.SUBJECT });

  // Rules and suppressions have no CLI surface today, so they pass through untouched.
  assert.deepEqual(bothSupplied.rules.U6, { value: "warn", origin: ORIGIN.SUBJECT });
});

test("W1a: the same profile string carries a different owner depending on who supplied it", () => {
  // This is the entire point of the workstream, reduced to one assertion: before W1a these two configs
  // were byte-identical by the time resolveFindings saw them.
  withConfig({ profile: "plain-plugin" }, (dir) => {
    const subjectChose = loadConfig(dir).config;
    const graderChose = withGraderOptions(loadConfig(dir).config, { profile: "plain-plugin" });
    assert.equal(subjectChose.profile.value, graderChose.profile.value);
    assert.notEqual(subjectChose.profile.origin, graderChose.profile.origin);
    assert.equal(subjectChose.profile.origin, ORIGIN.SUBJECT);
    assert.equal(graderChose.profile.origin, ORIGIN.GRADER);
  });
});

// --- the external contract is unchanged ------------------------------------------------------------

test("W1a: publicConfig republishes the exact origin-free shape --json has always carried", () => {
  const cfg = configFrom({
    mode: "published-verdict",
    profile: "plain-plugin",
    rules: { U6: "warn", G10: "off" },
    suppressions: [{ reqId: "U6", reason: "why", file: "a.md" }],
  });
  const published = publicConfig(cfg);

  assert.deepEqual(published, {
    mode: "published-verdict",
    profile: "plain-plugin",
    rules: { U6: "warn", G10: "off" },
    suppressions: [{ reqId: "U6", reason: "why", file: "a.md" }],
  });
  // Provenance is a resolution input, not a new external contract. Publishing the origin-bearing shape
  // would change the type of config.rules.<reqId> from a string to an object for every automation
  // reading the gate's JSON, which W1a is not permitted to do: it is plumbing.
  assert.equal(typeof published.rules.U6, "string");
  assert.ok(!("origin" in published.suppressions[0]), "a published suppression carries no origin");
});

test("W1a: configFrom and publicConfig round-trip", () => {
  const plain = {
    mode: "local",
    profile: "askit-library",
    rules: { U6: "warn" },
    suppressions: [{ reqId: "U6", reason: "r", file: undefined, message: undefined }],
  };
  assert.deepEqual(publicConfig(configFrom(plain)), plain);
});

// --- ownership PARITY across the entry points ------------------------------------------------------

test("W1a: no entry point hand-rolls the grader merge, so the five paths cannot drift apart", () => {
  // ADR 0044 makes ownership parity a REQUIREMENT, not an expectation: an implementation that threads
  // origin through one entry point passes a gate test while publishing a different verdict from
  // `evaluate`. Until the trust step lands there is no behavioural difference to observe, so the guard
  // is structural - and structural is what actually prevents the drift, because the failure mode is a
  // fifth path being added later with the old spread copied into it.
  //
  // The marketplace per-member path is deliberately absent from this list: gradeMember() calls runGate(),
  // so it inherits check.mjs's ownership rather than building config of its own. That is the property
  // ADR 0034's rooted-per-member invariant was built to give, and a separate merge there would be a
  // second place for the answer to differ.
  const entryPoints = ["scripts/check.mjs", "scripts/evaluate.mjs"];
  for (const rel of entryPoints) {
    const src = readFileSync(path.join(REPO, rel), "utf8");
    assert.ok(src.includes("withGraderOptions"), `${rel} must merge caller options through withGraderOptions`);
    assert.ok(
      !/\.\.\.\s*\(\s*(opts\.)?mode\s*\?/.test(src),
      `${rel} still spreads a raw mode option over config, which erases its origin`
    );
    assert.ok(
      !/\.\.\.\s*\(\s*(opts\.)?profile\s*\?/.test(src),
      `${rel} still spreads a raw profile option over config, which erases its origin`
    );
  }

  // tier-report.mjs has no caller options at all, so it has nothing to stamp grader-owned; what it must
  // not do is rebuild the config shape by hand.
  const tierReport = readFileSync(path.join(REPO, "scripts/tier-report.mjs"), "utf8");
  assert.ok(
    !/profile:\s*"askit-library"/.test(tierReport),
    "tier-report.mjs must take its config from loadConfig, never assemble one"
  );
});

test("W1a: the marketplace per-member path routes through runGate, so member configs stay subject-owned", () => {
  const src = readFileSync(path.join(REPO, "scripts/lib/marketplace/evaluate-marketplace.mjs"), "utf8");
  assert.ok(/runGate\(/.test(src), "gradeMember must grade through runGate");
  assert.ok(
    !/loadConfig\(/.test(src),
    "the marketplace scope must not load member config itself; grading a catalogue does not make the grader the owner of a member's file"
  );
});
