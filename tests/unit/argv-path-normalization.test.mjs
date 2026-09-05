import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";

const HERE = path.dirname(fileURLToPath(import.meta.url));
import { normalizeArgPath } from "../../scripts/lib/fs-utils.mjs";
import { parseArgs as parseCheckArgs } from "../../scripts/check.mjs";
import { parseArgs as parseWatchArgs } from "../../scripts/standards-watch.mjs";
import { parseArgs as parseEvalRunArgs } from "../../scripts/eval-run.mjs";

// The documented Windows defect (docs/how-to/troubleshoot-the-gate.md, tests/unit/eval-run.test.mjs): a
// backslash path handed to a CLI entry point was silently read as a different directory, so the gate
// reported a clean pass having graded nothing. scripts/lib/eval-run.mjs already normalized paths INSIDE
// the eval-run pipeline; this file covers the other entry points named in the fix - check.mjs,
// evaluate.mjs, tier-report.mjs, standards-watch.mjs, eval-run.mjs's own CLI flags, and the generators -
// which previously had NO argv parsing tests at all.
//
// normalizeArgPath's own branch logic (Windows swap vs POSIX no-op) is covered exhaustively, on every
// platform, with an injected separator in tests/unit/fs-utils.test.mjs. The tests below instead prove
// WIRING: that each entry point actually routes its argv-sourced path(s) through normalizeArgPath, and
// (for the keystone tests) that a real backslash-spelled invocation resolves and grades identically to
// its forward-slash twin. That keystone reproduction is inherently platform-specific - a backslash IS
// the Windows path separator and is NOT one on POSIX - so those tests are explicitly (loudly, with a
// stated reason) scoped to path.sep === "\\" rather than silently asserting nothing useful elsewhere.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SF_FWD = path.join(ROOT, "tests/fixtures/golden/silver-fixture").split(path.sep).join("/");
const SF_BS = SF_FWD.split("/").join("\\");
const WINDOWS_ONLY = path.sep !== "\\" && "reproduces the Windows-only historical defect; cross-platform branch logic for normalizeArgPath itself is covered deterministically (injected separator) in tests/unit/fs-utils.test.mjs";

function runCli(script, args) {
  try {
    const stdout = execFileSync(process.execPath, [path.join(ROOT, script), ...args], { encoding: "utf8" });
    return { code: 0, stdout };
  } catch (e) {
    return { code: e.status ?? 1, stdout: String(e.stdout ?? ""), stderr: String(e.stderr ?? "") };
  }
}

// --- check.mjs: the positional root ---

// Routing is proven by agreeing with normalizeArgPath on the same input, which holds on every
// platform. It is deliberately NOT proven by trimming: an earlier draft trimmed, adversarial review
// caught that a leading or trailing space is a legal POSIX filename character, and these assertions
// now pin the corrected behavior so the trim cannot come back.
test("check.mjs parseArgs routes the positional root through normalizeArgPath and preserves surrounding spaces", () => {
  const raw = " tests/fixtures/golden/silver-fixture ";
  const { root } = parseCheckArgs([raw]);
  assert.equal(root, normalizeArgPath(raw), "the positional must agree with normalizeArgPath");
  assert.equal(root, raw, "spaces are part of a POSIX filename and must survive");
});

test("check.mjs parseArgs normalizes a backslash-spelled root the same way normalizeArgPath does on this host", () => {
  const raw = "some\\nested\\plugin";
  const { root } = parseCheckArgs([raw]);
  assert.equal(root, normalizeArgPath(raw));
});

test("check.mjs parseArgs leaves non-path flags (--mode, --profile, --strict) unaffected by path normalization", () => {
  const { mode, profile, strict } = parseCheckArgs(["some/root", "--mode", "local", "--profile", "plain-plugin", "--strict"]);
  assert.equal(mode, "local");
  assert.equal(profile, "plain-plugin");
  assert.equal(strict, true);
});

// --- check.mjs: an unrecognised flag and a root that is not a directory are refused, not ignored ---
//
// `node scripts/check.mjs . --stict` used to drop the typo without a word and exit 0 having graded
// WITHOUT the --strict the caller asked for; `node scripts/check.mjs /nonexistent` graded an EMPTY
// plugin and reported "library.json is missing" (exit 1), a confident verdict on a directory that is
// not there. Both now exit 2 with one line on stderr, the path the invalid --mode and --profile values
// already take.

test("check.mjs parseArgs collects every unrecognised --flag as unknown and keeps the recognised ones out of it", () => {
  const { unknown, strict, json } = parseCheckArgs(["some/root", "--stict", "--json", "--bogus=1"]);
  assert.deepEqual(unknown, ["--stict", "--bogus=1"]);
  assert.equal(strict, false, "the typo must not be read as --strict");
  assert.equal(json, true);
  const allKnown = ["some/root", "--strict", "--json", "--sarif", "--gha", "--mode", "local", "--mode=local", "--profile", "plain-plugin", "--profile=plain-plugin"];
  assert.deepEqual(parseCheckArgs(allKnown).unknown, [], "every flag recognised before this change is still recognised");
});

test("CLI check.mjs exits 2 naming an unknown flag, and grades nothing", () => {
  const r = runCli("scripts/check.mjs", [SF_FWD, "--stict"]);
  assert.equal(r.code, 2);
  assert.match(r.stderr, /unknown flag '--stict'/);
  assert.equal(r.stdout, "", "nothing is graded or printed when a flag is wrong");
});

test("CLI check.mjs exits 2 when the root does not exist or is not a directory, instead of grading an empty plugin", () => {
  const missing = path.join(tmpdir(), `askit-no-such-root-${process.pid}`);
  const r = runCli("scripts/check.mjs", [missing]);
  assert.equal(r.code, 2);
  assert.match(r.stderr, /root '.*askit-no-such-root-.*' is not a directory/);
  assert.equal(r.stdout, "", "no verdict is printed for a directory that is not there");
  const file = runCli("scripts/check.mjs", [path.join(SF_FWD, "library.json")]);
  assert.equal(file.code, 2, "a file is not a plugin root either");
  assert.match(file.stderr, /is not a directory/);
});

// --- standards-watch.mjs: the positional root, --pin, --snapshot-dir ---

test("standards-watch.mjs parseArgs routes the positional root through normalizeArgPath and preserves surrounding spaces", () => {
  const raw = " my-plugin ";
  const { root } = parseWatchArgs([raw]);
  assert.equal(root, normalizeArgPath(raw));
  assert.equal(root, raw, "spaces are part of a POSIX filename and must survive");
});

test("standards-watch.mjs parseArgs routes --pin and --snapshot-dir through normalizeArgPath without trimming", () => {
  const rawPin = " docs/pin.json ";
  const rawDir = " local/mirror ";
  const { pin, snapshotDir } = parseWatchArgs(["--pin", rawPin, "--snapshot-dir", rawDir]);
  assert.equal(pin, normalizeArgPath(rawPin));
  assert.equal(snapshotDir, normalizeArgPath(rawDir));
  assert.equal(pin, rawPin, "a path-valued flag must not be trimmed either");
});

test("standards-watch.mjs parseArgs normalizes a backslash-spelled root the same way normalizeArgPath does on this host", () => {
  const raw = "some\\nested\\plugin";
  const { root } = parseWatchArgs([raw]);
  assert.equal(root, normalizeArgPath(raw));
});

// --- eval-run.mjs (the CLI, not the lib): positionals plus the path-valued flags ---

test("eval-run.mjs parseArgs routes positionals (target ids/paths) through normalizeArgPath without trimming", () => {
  const raw = " fixture-plugin ";
  const args = parseEvalRunArgs([raw]);
  assert.equal(args.positionals[0], normalizeArgPath(raw));
  assert.equal(args.positionals[0], raw, "spaces are part of a POSIX filename and must survive");
});

test("eval-run.mjs parseArgs normalizes path-valued flags but leaves non-path flags untouched", () => {
  const args = parseEvalRunArgs([
    "some-id",
    "--out-dir", "  my-out  ",
    "--manifest", "  my-manifest.json  ",
    "--subpath", "  sub/dir  ",
    "--sha", "  abc123  ",
  ]);
  assert.equal(args["out-dir"], "  my-out  ", "a path-valued flag keeps its spaces");
  assert.equal(args["manifest"], "  my-manifest.json  ");
  assert.equal(args["subpath"], "  sub/dir  ");
  assert.equal(args["sha"], "  abc123  ", "a sha is not a filesystem path and must be left exactly as typed");
  // The distinction that matters is the separator conversion, not trimming.
  assert.equal(args["out-dir"], normalizeArgPath("  my-out  "), "routed through normalizeArgPath");
});

test("eval-run.mjs parseArgs normalizes a backslash-spelled --manifest the same way normalizeArgPath does on this host", () => {
  const raw = "some\\nested\\corpus.json";
  const args = parseEvalRunArgs(["id", "--manifest", raw]);
  assert.equal(args.manifest, normalizeArgPath(raw));
});

// --- the keystone integration proof: the historical defect is closed ---

test(
  "CLI evaluate.mjs: a backslash-spelled path to a real fixture resolves to the same plugin as its forward-slash spelling, and grades it (not a vacuous clean pass)",
  { skip: WINDOWS_ONLY },
  () => {
    const fwd = runCli("scripts/evaluate.mjs", [SF_FWD, "--format=json"]);
    const bs = runCli("scripts/evaluate.mjs", [SF_BS, "--format=json"]);
    // Gate exit is filtered to the declared-tier ceiling (the silver fixture declares convergent, so its
    // Gold-only G2/G4/G5 errors stay below the exit-code threshold); summary.errors is the un-filtered
    // count, which is the honest signal that real grading happened - the control this test relies on.
    assert.equal(fwd.code, 0, "sanity: the forward-slash run's exit code reflects the declared-tier ceiling, not a crash");
    const rFwd = JSON.parse(fwd.stdout);
    const rBs = JSON.parse(bs.stdout);
    assert.equal(rBs.target, rFwd.target, "the backslash spelling normalizes to the identical target string as the forward-slash spelling");
    assert.equal(rBs.scope, "plugin", "the backslash-spelled path is recognized as the plugin, not an unknown/empty scope");
    assert.deepEqual(rBs.summary, rFwd.summary, "grading is identical regardless of which separator style was typed");
    assert.ok(rBs.summary.errors > 0 || rBs.summary.warns > 0, "real findings were produced; a vacuous 0/0 here would mean nothing was actually graded");
  }
);

test(
  "CLI tier-report.mjs: backslash and forward-slash spellings of the same root produce identical --json output",
  { skip: WINDOWS_ONLY },
  () => {
    const fwd = runCli("scripts/tier-report.mjs", [SF_FWD, "--json"]);
    const bs = runCli("scripts/tier-report.mjs", [SF_BS, "--json"]);
    assert.equal(fwd.code, 0);
    assert.equal(bs.code, 0);
    assert.deepEqual(JSON.parse(bs.stdout), JSON.parse(fwd.stdout));
  }
);

test(
  "CLI generators (gen-index, gen-manifest, sync-agents-md): backslash and forward-slash root spellings produce byte-identical output",
  { skip: WINDOWS_ONLY },
  () => {
    const cases = [
      ["scripts/generators/gen-index.mjs", []],
      ["scripts/generators/gen-manifest.mjs", ["--target=resolved"]],
      ["scripts/generators/sync-agents-md.mjs", []],
    ];
    for (const [script, extraArgs] of cases) {
      const fwd = runCli(script, [SF_FWD, ...extraArgs]);
      const bs = runCli(script, [SF_BS, ...extraArgs]);
      assert.equal(fwd.code, 0, `${script} (forward-slash) should succeed`);
      assert.equal(bs.code, 0, `${script} (backslash) should succeed`);
      assert.equal(bs.stdout, fwd.stdout, `${script}: backslash and forward-slash root must render byte-identical output`);
    }
  }
);

// --- Write-mode targeting: the path must not be silently retargeted at a sibling ---
//
// Raised by adversarial review on the v1.10.1 release branch. An earlier draft of normalizeArgPath
// trimmed surrounding whitespace. On POSIX a leading or trailing space is a legal filename character,
// so "plugin " and "plugin" are two DIFFERENT directories, and three callers of this function write
// files (gen-index, gen-manifest, sync-agents-md, all in --write mode). Trimming would therefore
// silently emit generated files into a sibling directory the caller never named, which is a worse
// outcome than the read-the-wrong-tree defect the normalization exists to close.
//
// This is the integration proof rather than a unit assertion: it builds two real, distinct plugin
// roots and confirms a --write run touches only the one it was given. It is POSIX-only because
// Windows silently strips trailing spaces from directory names, so the two roots cannot be made to
// exist there at all. Skipped loudly with a reason instead of quietly asserting nothing.
test("gen-index --write targets only the requested root when a sibling differs by a trailing space", (t) => {
  if (path.sep === "\\") {
    t.skip("POSIX-only: Windows strips trailing spaces from directory names, so the two roots cannot coexist");
    return;
  }

  const base = mkdtempSync(path.join(tmpdir(), "askit-argv-space-"));
  const plain = path.join(base, "plugin");
  const spaced = path.join(base, "plugin ");

  const seed = (root, name) => {
    mkdirSync(path.join(root, "skills", "demo-skill"), { recursive: true });
    writeFileSync(
      path.join(root, "library.json"),
      JSON.stringify({
        name,
        version: "0.1.0",
        standard: "0.12",
        tier: "universal",
        prefix: "demo-",
        "agent-targets": ["claude"],
        components: { skills: [{ name: "demo-skill", path: "skills/demo-skill/SKILL.md", version: "0.1.0", tier: "universal", status: "active" }] },
      }),
      "utf8"
    );
    writeFileSync(
      path.join(root, "skills", "demo-skill", "SKILL.md"),
      "---\nname: demo-skill\ndescription: A demo skill used as a fixture. Use when testing argv path targeting.\n---\n\n# demo-skill\n",
      "utf8"
    );
  };

  try {
    mkdirSync(plain, { recursive: true });
    mkdirSync(spaced, { recursive: true });
    seed(plain, "plain-plugin-fixture");
    seed(spaced, "spaced-plugin-fixture");

    const GEN = path.resolve(HERE, "../../scripts/generators/gen-index.mjs");
    execFileSync(process.execPath, [GEN, spaced, "--write"], { encoding: "utf8" });

    assert.ok(existsSync(path.join(spaced, "INDEX.md")), "the requested root must receive the generated index");
    assert.ok(
      !existsSync(path.join(plain, "INDEX.md")),
      "the sibling root differing only by a trailing space must be left untouched"
    );

    // And the content must belong to the root that was actually named.
    const written = readFileSync(path.join(spaced, "INDEX.md"), "utf8");
    assert.match(written, /spaced-plugin-fixture/, "the index must describe the plugin it was pointed at");
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});
