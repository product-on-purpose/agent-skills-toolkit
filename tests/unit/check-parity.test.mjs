import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, readFileSync, cpSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  gitBlobSha1,
  diffMetadataParity,
  summarizePinSkew,
  vendorValidateManifest,
  decideExitCode,
  anyDisagreement,
  PARITY_EXCEPTIONS,
  findException,
  applyExceptions,
  resolveAdrFile,
  validateExceptions,
  summarizeDisagreements,
  formatResultLine,
  metadataParityUnavailableResult,
  PARITY_MODE,
} from "../../scripts/check-parity.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "../..");
const SCRIPT = path.resolve(HERE, "../../scripts/check-parity.mjs");

function tmp() {
  return mkdtempSync(path.join(tmpdir(), "askit-parity-"));
}

// --- gitBlobSha1: the git-blob-sha1 formula documented in
// docs/internal/standards-watch/upstream-pin.json ("sha1('blob ' + length + NUL + bytes)"), verified
// against real `git hash-object` output so a reviewer can check this without trusting the test. ---

test("gitBlobSha1: matches `git hash-object` for a known 3-byte file (\"abc\")", () => {
  assert.equal(gitBlobSha1(Buffer.from("abc")), "f2ba8f84ab5c1bce84a7b441cb1959cfc7093b7f");
});

test("gitBlobSha1: matches the well-known empty-blob hash", () => {
  assert.equal(gitBlobSha1(Buffer.alloc(0)), "e69de29bb2d1d6434b8b29ae775ad8c2e48c5391");
});

// --- diffMetadataParity: the parsed-values half of the parity invariant. A value only "survives" the
// reference parser if it was already a JS string AND comes back byte-identical; this is the exact
// check that would have caught the metadata.chain incident (ADR 0040 / ADR 0041) while `agentskills
// validate`'s exit code alone reported "Valid skill" throughout it. ---

test("diffMetadataParity: identical string values everywhere -> no mismatches", () => {
  const ours = { version: "0.1.3", tier: "universal", chain: "askit-skill-author, askit-reviewer" };
  const reference = { version: "0.1.3", tier: "universal", chain: "askit-skill-author, askit-reviewer" };
  assert.deepEqual(diffMetadataParity(ours, reference), []);
});

test("diffMetadataParity: reproduces the metadata.chain incident (ADR 0040) - a YAML list is silently coerced to a Python list-repr string", () => {
  const ours = { chain: ["askit-skill-author", "askit-reviewer"] };
  const reference = { chain: "['askit-skill-author', 'askit-reviewer']" };
  const mismatches = diffMetadataParity(ours, reference);
  assert.equal(mismatches.length, 1);
  assert.equal(mismatches[0].key, "chain");
  assert.equal(mismatches[0].reason, "coerced-non-string");
  assert.deepEqual(mismatches[0].ours, ["askit-skill-author", "askit-reviewer"]);
  assert.equal(mismatches[0].reference, "['askit-skill-author', 'askit-reviewer']");
});

test("diffMetadataParity: a non-string scalar (YAML boolean/number) is flagged even though it is not a list", () => {
  const ours = { enabled: true, count: 3 };
  const reference = { enabled: "True", count: "3" };
  const mismatches = diffMetadataParity(ours, reference);
  assert.equal(mismatches.length, 2);
  assert.ok(mismatches.every((m) => m.reason === "coerced-non-string"));
});

test("diffMetadataParity: a string value the reference parser altered (e.g. whitespace-trimmed) is flagged as value-changed", () => {
  const ours = { audience: "beginner " };
  const reference = { audience: "beginner" };
  const mismatches = diffMetadataParity(ours, reference);
  assert.equal(mismatches.length, 1);
  assert.equal(mismatches[0].reason, "value-changed");
});

test("diffMetadataParity: a key present locally but absent from the reference parse is flagged, not silently dropped", () => {
  const mismatches = diffMetadataParity({ version: "0.1.0" }, {});
  assert.equal(mismatches.length, 1);
  assert.equal(mismatches[0].reason, "missing-in-reference");
});

test("diffMetadataParity: a key the reference produced that we never declared is flagged, not silently ignored", () => {
  const mismatches = diffMetadataParity({}, { version: "0.1.0" });
  assert.equal(mismatches.length, 1);
  assert.equal(mismatches[0].reason, "missing-here");
});

test("diffMetadataParity: both sides absent (no metadata: block at all) -> no mismatches (vacuous, not a violation)", () => {
  assert.deepEqual(diffMetadataParity(null, null), []);
  assert.deepEqual(diffMetadataParity(undefined, undefined), []);
});

// --- summarizePinSkew: the two-identity comparison the task requires (source blob pin vs the PyPI
// release the harness actually runs). Grounded in a REAL measured skew found while building this
// harness: the PyPI 0.1.1 wheel's skills_ref/parser.py is not byte-identical to the pinned upstream
// blob (docs/internal/standards-watch/upstream-pin.json), which is exactly the divergence this
// function exists to surface rather than silently assume away. ---

test("summarizePinSkew: flags a real measured skew (PyPI 0.1.1 parser.py vs the pinned source blob)", () => {
  const pinnedArtifacts = [
    { path: "skills-ref/src/skills_ref/parser.py", role: "reference-implementation", blobSha: "690c14e27b61405e3b1346dc22c8678cd3e79b35" },
  ];
  const installedBlobs = { "parser.py": { blobSha: "07bef6527b035f8fd89c0844813dd0fe43f512ba", bytes: 3541 } };
  const rows = summarizePinSkew(pinnedArtifacts, installedBlobs);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].match, false);
  assert.equal(rows[0].pinnedSha, "690c14e27b61405e3b1346dc22c8678cd3e79b35");
  assert.equal(rows[0].installedSha, "07bef6527b035f8fd89c0844813dd0fe43f512ba");
});

test("summarizePinSkew: reports match true when the installed blob equals the pinned blob", () => {
  const pinnedArtifacts = [
    { path: "skills-ref/src/skills_ref/validator.py", role: "reference-implementation", blobSha: "same-sha" },
  ];
  const installedBlobs = { "validator.py": { blobSha: "same-sha", bytes: 10 } };
  const rows = summarizePinSkew(pinnedArtifacts, installedBlobs);
  assert.equal(rows[0].match, true);
});

test("summarizePinSkew: an artifact the installed probe never reported (uvx unavailable) is match: null, not a false skew", () => {
  const pinnedArtifacts = [
    { path: "skills-ref/src/skills_ref/models.py", role: "reference-implementation", blobSha: "abc" },
  ];
  const rows = summarizePinSkew(pinnedArtifacts, {});
  assert.equal(rows[0].match, null);
  assert.equal(rows[0].installedSha, null);
});

test("summarizePinSkew: ignores non-reference-implementation pin entries (e.g. normative-prose)", () => {
  const pinnedArtifacts = [
    { path: "docs/specification.mdx", role: "normative-prose", blobSha: "xyz" },
  ];
  assert.deepEqual(summarizePinSkew(pinnedArtifacts, {}), []);
});

// --- vendorValidateManifest: the fallback engaged only when the real `claude` CLI is not on PATH.
// Deliberately reduced-fidelity (only the one hard requirement: a manifest exists, parses, and
// carries "name") - never claims to reproduce the real validator's full rule set. ---

test("vendorValidateManifest: passes on a minimal valid .claude-plugin/plugin.json", () => {
  const dir = tmp();
  try {
    mkdirSync(path.join(dir, ".claude-plugin"));
    writeFileSync(path.join(dir, ".claude-plugin", "plugin.json"), JSON.stringify({ name: "foo" }));
    const r = vendorValidateManifest(dir);
    assert.equal(r.pass, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("vendorValidateManifest: fails with the real validator's own wording when no manifest exists", () => {
  const dir = tmp();
  try {
    const r = vendorValidateManifest(dir);
    assert.equal(r.pass, false);
    assert.match(r.reason, /No manifest found/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("vendorValidateManifest: fails when plugin.json has no non-empty \"name\"", () => {
  const dir = tmp();
  try {
    mkdirSync(path.join(dir, ".claude-plugin"));
    writeFileSync(path.join(dir, ".claude-plugin", "plugin.json"), JSON.stringify({ version: "1.0.0" }));
    const r = vendorValidateManifest(dir);
    assert.equal(r.pass, false);
    assert.match(r.reason, /"name"/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("vendorValidateManifest: fails on unparseable JSON rather than throwing", () => {
  const dir = tmp();
  try {
    mkdirSync(path.join(dir, ".claude-plugin"));
    writeFileSync(path.join(dir, ".claude-plugin", "plugin.json"), "{ not json");
    const r = vendorValidateManifest(dir);
    assert.equal(r.pass, false);
    assert.match(r.reason, /JSON/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- decideExitCode / anyDisagreement: the one-line gating flip this release deliberately does not
// take. Tested now so the flip (PARITY_MODE "report-only" -> "gating" in scripts/check-parity.mjs) is
// known to behave correctly on the day it is made, not discovered then. ---

test("decideExitCode: report-only mode always exits 0, even with a disagreement", () => {
  assert.equal(decideExitCode("report-only", true), 0);
  assert.equal(decideExitCode("report-only", false), 0);
});

test("decideExitCode: gating mode exits 1 only when a disagreement was found", () => {
  assert.equal(decideExitCode("gating", true), 1);
  assert.equal(decideExitCode("gating", false), 0);
});

test("anyDisagreement: true when any vendor-validate result ran and did not pass", () => {
  const results = [
    { kind: "vendor-validate", ran: true, pass: true },
    { kind: "vendor-validate", ran: true, pass: false },
  ];
  assert.equal(anyDisagreement(results), true);
});

test("anyDisagreement: false when every vendor-validate result passed", () => {
  const results = [{ kind: "vendor-validate", ran: true, pass: true }];
  assert.equal(anyDisagreement(results), false);
});

test("anyDisagreement: a result that did not run (ran: false) is never a disagreement, even if pass is false/null", () => {
  const results = [{ kind: "vendor-validate", ran: false, pass: null }];
  assert.equal(anyDisagreement(results), false);
});

test("anyDisagreement: an executed metadata-parity mismatch DOES count - this is the class the harness exists to detect (pre-release review finding, corrected)", () => {
  const results = [{ kind: "metadata-parity", ran: true, pass: false }];
  assert.equal(anyDisagreement(results), true);
});

test("anyDisagreement: a passing metadata-parity result does not count", () => {
  const results = [{ kind: "metadata-parity", ran: true, pass: true }];
  assert.equal(anyDisagreement(results), false);
});

test("anyDisagreement: FAIL CLOSED - metadataParityUnavailableResult() (the reference parser could not run at all) counts as a disagreement", () => {
  assert.equal(anyDisagreement([metadataParityUnavailableResult()]), true);
});

test("anyDisagreement: an unrecognized result kind never counts - the function does not accidentally treat everything as gating", () => {
  const results = [{ kind: "pin-skew", ran: true, pass: false }];
  assert.equal(anyDisagreement(results), false);
});

test("metadataParityUnavailableResult: fails closed by construction - pass is the literal false, not null/undefined", () => {
  const r = metadataParityUnavailableResult();
  assert.equal(r.kind, "metadata-parity");
  assert.equal(r.pass, false);
  assert.equal(r.ran, false);
});

test("anyDisagreement: a documented exception is never counted, even though pass is false", () => {
  const results = [
    { kind: "vendor-validate", ran: true, pass: false, exception: { adr: "0043", reason: "on purpose" } },
  ];
  assert.equal(anyDisagreement(results), false);
});

test("anyDisagreement: a broken exception-list reference (exception-integrity, pass: false) DOES count", () => {
  const results = [{ kind: "exception-integrity", ran: true, pass: false }];
  assert.equal(anyDisagreement(results), true);
});

// --- The documented-exception path (coordinator follow-up, 2026-08-11): the harness must never
// silently drop a first-party disagreement, even one this project deliberately decided to accept. It
// must ANNOTATE it with the ADR that authorizes it, and distinguish "documented, will never gate" from
// "undocumented, would gate" in both the per-line output and the summary. Minimal by design - a fixed
// array, not a general suppression engine (the coordinator's own instruction) - sized to the one real
// case this release actually has: templates/seed-plugin vs ADR 0043. ---

test("PARITY_EXCEPTIONS: carries the one real, currently-live exception (templates/seed-plugin, ADR 0043)", () => {
  const e = PARITY_EXCEPTIONS.find((x) => x.target === "templates/seed-plugin" && x.tool === "claude");
  assert.ok(e, "expected a documented exception for templates/seed-plugin/claude");
  assert.equal(e.adr, "0043");
  assert.ok(e.reason && e.reason.length > 0, "an exception without a reason is not documented, it is asserted");
});

test("findException: matches on exact target + tool", () => {
  const exceptions = [{ target: "templates/seed-plugin", tool: "claude", adr: "0043", reason: "r" }];
  const found = findException(exceptions, { target: "templates/seed-plugin", tool: "claude" });
  assert.equal(found.adr, "0043");
});

test("findException: the vendored claude fallback (\"claude-fallback\") matches a \"claude\" exception - same vendor rule, reduced-fidelity path", () => {
  const exceptions = [{ target: "templates/seed-plugin", tool: "claude", adr: "0043", reason: "r" }];
  const found = findException(exceptions, { target: "templates/seed-plugin", tool: "claude-fallback" });
  assert.equal(found.adr, "0043");
});

test("findException: no match returns null - a different target or tool is never silently covered", () => {
  const exceptions = [{ target: "templates/seed-plugin", tool: "claude", adr: "0043", reason: "r" }];
  assert.equal(findException(exceptions, { target: "skills/askit-decision", tool: "claude" }), null);
  assert.equal(findException(exceptions, { target: "templates/seed-plugin", tool: "skills-ref" }), null);
});

test("applyExceptions: attaches the exception to a matching FAILING result, without changing pass/ran/detail", () => {
  const exceptions = [{ target: "templates/seed-plugin", tool: "claude", adr: "0043", reason: "on purpose" }];
  const results = [{ kind: "vendor-validate", tool: "claude", target: "templates/seed-plugin", ran: true, pass: false, detail: "raw output" }];
  const out = applyExceptions(results, exceptions);
  assert.equal(out[0].pass, false, "an annotated result is still reported as a failure, never hidden");
  assert.equal(out[0].detail, "raw output");
  assert.equal(out[0].exception.adr, "0043");
});

test("applyExceptions: a PASSING result is left alone even if an exception entry exists for it (nothing to explain)", () => {
  const exceptions = [{ target: "templates/seed-plugin", tool: "claude", adr: "0043", reason: "r" }];
  const results = [{ kind: "vendor-validate", tool: "claude", target: "templates/seed-plugin", ran: true, pass: true }];
  const out = applyExceptions(results, exceptions);
  assert.equal(out[0].exception, undefined);
});

test("applyExceptions: a FAILING result with no matching exception is left unannotated - this is the undocumented case", () => {
  const results = [{ kind: "vendor-validate", tool: "skills-ref", target: "skills/askit-decision", ran: true, pass: false }];
  const out = applyExceptions(results, []);
  assert.equal(out[0].exception, undefined);
  assert.equal(out[0].pass, false, "still reported as a failure");
});

test("applyExceptions: non-vendor-validate results pass through unchanged", () => {
  const results = [{ kind: "metadata-parity", target: "x", ran: true, pass: false }];
  assert.deepEqual(applyExceptions(results, []), results);
});

test("formatResultLine: a documented exception is annotated with its ADR, not dropped", () => {
  const result = { kind: "vendor-validate", tool: "claude", target: "templates/seed-plugin", ran: true, pass: false, exception: { adr: "0043", reason: "on purpose" } };
  const rendered = formatResultLine(result);
  assert.match(rendered, /\[FAIL, documented exception: ADR 0043\]/);
  assert.match(rendered, /templates\/seed-plugin/);
});

test("formatResultLine: an undocumented disagreement still reports as an ordinary failure", () => {
  const result = { kind: "vendor-validate", tool: "skills-ref", target: "skills/askit-decision", ran: true, pass: false };
  const rendered = formatResultLine(result);
  assert.equal(rendered, "  [FAIL] skills/askit-decision");
  assert.doesNotMatch(rendered, /documented exception/);
});

test("formatResultLine: a passing result reports PASS regardless of any exception field", () => {
  const result = { kind: "vendor-validate", tool: "claude", target: "x", ran: true, pass: true };
  assert.equal(formatResultLine(result), "  [PASS] x");
});

test("resolveAdrFile: resolves a real ADR number to its file under docs/internal/decisions/", () => {
  const dir = tmp();
  try {
    mkdirSync(path.join(dir, "docs", "internal", "decisions"), { recursive: true });
    writeFileSync(path.join(dir, "docs", "internal", "decisions", "0043-bronze-scaffold-defaults-a-minimal-native-manifest.md"), "# 0043");
    const resolved = resolveAdrFile(dir, "0043");
    assert.ok(resolved && resolved.endsWith("0043-bronze-scaffold-defaults-a-minimal-native-manifest.md"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("resolveAdrFile: returns null when no file with that ADR number prefix exists", () => {
  const dir = tmp();
  try {
    mkdirSync(path.join(dir, "docs", "internal", "decisions"), { recursive: true });
    assert.equal(resolveAdrFile(dir, "9999"), null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("validateExceptions: an exception whose ADR resolves to a real file produces no finding", () => {
  const dir = tmp();
  try {
    mkdirSync(path.join(dir, "docs", "internal", "decisions"), { recursive: true });
    writeFileSync(path.join(dir, "docs", "internal", "decisions", "0043-bronze-scaffold-defaults-a-minimal-native-manifest.md"), "# 0043");
    const exceptions = [{ target: "templates/seed-plugin", tool: "claude", adr: "0043", reason: "r" }];
    assert.deepEqual(validateExceptions(exceptions, dir), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("validateExceptions: an exception whose ADR does NOT resolve is itself reported as a finding - a broken citation authorizes nothing", () => {
  const dir = tmp();
  try {
    mkdirSync(path.join(dir, "docs", "internal", "decisions"), { recursive: true });
    const exceptions = [{ target: "templates/seed-plugin", tool: "claude", adr: "9999", reason: "r" }];
    const findings = validateExceptions(exceptions, dir);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].kind, "exception-integrity");
    assert.equal(findings[0].pass, false);
    assert.match(findings[0].detail, /ADR 9999/);
    assert.match(findings[0].detail, /does not resolve/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("summarizeDisagreements: splits vendor-validate failures into documented vs undocumented", () => {
  const results = [
    { kind: "vendor-validate", ran: true, pass: true },
    { kind: "vendor-validate", ran: true, pass: false, exception: { adr: "0043", reason: "r" } },
    { kind: "vendor-validate", ran: true, pass: false },
  ];
  assert.deepEqual(summarizeDisagreements(results), { total: 2, documented: 1, undocumented: 1 });
});

test("summarizeDisagreements: every disagreement documented -> undocumented is 0", () => {
  const results = [{ kind: "vendor-validate", ran: true, pass: false, exception: { adr: "0043", reason: "r" } }];
  assert.deepEqual(summarizeDisagreements(results), { total: 1, documented: 1, undocumented: 0 });
});

test("summarizeDisagreements: no failures -> all zero", () => {
  assert.deepEqual(summarizeDisagreements([{ kind: "vendor-validate", ran: true, pass: true }]), { total: 0, documented: 0, undocumented: 0 });
});

// --- CLI end-to-end: the real thing, against this repository, skipped when the vendor CLIs are not
// on PATH so `npm test` stays green in the plain `validate` / `validate-windows` CI jobs (which
// deliberately do not install claude/uvx - only the new validator-parity job does). Locally, or in
// that job, this proves the script actually runs rather than only its pure helpers. ---

function commandAvailable(cmd) {
  // shell:false deliberately - see scripts/check-parity.mjs's SPAWN_OPTS comment for why shell:true
  // is the wrong default here, even on Windows.
  const r = spawnSync(cmd, ["--version"], { encoding: "utf8" });
  return !r.error;
}

const HAS_CLAUDE = commandAvailable("claude");
const HAS_UVX = commandAvailable("uvx");

test(
  "CLI: `node scripts/check-parity.mjs .` exits 0 and prints the gating banner and every section",
  { skip: !(HAS_CLAUDE && HAS_UVX) && "claude and/or uvx not on PATH in this environment" },
  () => {
    const r = spawnSync(process.execPath, [SCRIPT, "."], { cwd: REPO_ROOT, encoding: "utf8" });
    assert.equal(r.status, 0, `expected exit 0 (clean tree, one documented exception); stderr: ${r.stderr}`);
    // Since the v1.12.0 flip the SHIPPED default is gating, and the banner must say so without the word
    // "override" - the override wording is reserved for a run that actually passed --mode=, so a CI log
    // never misreports the harness's own configuration.
    assert.match(r.stdout, /GATING \(PARITY_MODE = "gating"\)/);
    assert.doesNotMatch(r.stdout, /REPORT-ONLY/);
    assert.match(r.stdout, /ADR 0042/);
    assert.match(r.stdout, /claude plugin validate/);
    assert.match(r.stdout, /skills-ref/);
    // The live, currently-real documented exception (ADR 0043 - Bronze scaffold defaults a minimal
    // native manifest): templates/seed-plugin fails --strict on a missing author, on purpose, and the
    // harness must ANNOTATE that line rather than print a bare, unexplained [FAIL].
    assert.match(r.stdout, /\[FAIL, documented exception: ADR 0043\]\s+templates\/seed-plugin/);
    assert.match(r.stdout, /reason:.*author/i);
  }
);

// --- The gating flip, proven end-to-end (pre-release adversarial review finding, corrected): a real
// seeded metadata-parity mismatch must exit 1 under the SHIPPED default, which since v1.12.0 is
// "gating". Both directions are still exercised: the default (no flag) proves what a real invocation
// does, and `--mode=report-only` proves the mode switch still works the other way, so a future flip
// back would not have to rediscover the branch. Before v1.12.0 these assertions were reversed. ---

/**
 * An ISOLATED copy of just the subtrees scripts/check-parity.mjs reads from its `root` argument
 * (skills/, templates/seed-plugin/, .claude-plugin/, docs/internal/decisions/,
 * docs/internal/standards-watch/), in a fresh temp directory. The test below mutates a skill's
 * SKILL.md to seed a real metadata-parity failure; an EARLIER version of this test mutated the real,
 * shared, concurrently-edited repository file in place instead, and it raced - caught live when a
 * full `npm test` run failed with "the fixture line was not found" because some other process had the
 * real file mid-mutation at the same moment. A throwaway copy removes the race entirely: nothing here
 * is shared with any other agent or process, and there is no restore step to skip on a crash - the
 * whole directory is simply deleted afterward, mutated or not.
 */
function buildIsolatedParityCopy() {
  const dir = mkdtempSync(path.join(tmpdir(), "askit-parity-copy-"));
  for (const rel of [".claude-plugin", "templates/seed-plugin", "skills", "docs/internal/decisions", "docs/internal/standards-watch"]) {
    cpSync(path.join(REPO_ROOT, rel), path.join(dir, rel), { recursive: true });
  }
  return dir;
}

test(
  "CLI: a real seeded metadata-parity mismatch exits 1 under the shipped default (gating) and 0 under --mode=report-only (this is the exact class the pre-release review found was NOT gating)",
  { skip: !(HAS_CLAUDE && HAS_UVX) && "claude and/or uvx not on PATH in this environment" },
  () => {
    const copyRoot = buildIsolatedParityCopy();
    try {
      const skillMd = path.join(copyRoot, "skills", "askit-decision", "SKILL.md");
      const original = readFileSync(skillMd, "utf8");
      const mutated = original.replace(
        "  audience: advanced",
        "  audience:\n    - advanced\n    - beginner"
      );
      assert.notEqual(
        mutated,
        original,
        "the fixture line \"  audience: advanced\" was not found in skills/askit-decision/SKILL.md - update this test if that file's frontmatter changed"
      );
      writeFileSync(skillMd, mutated);

      // No flag: this is exactly what CI and a contributor's own machine run, so it is the assertion
      // that actually protects the flip.
      const shipped = spawnSync(process.execPath, [SCRIPT, copyRoot], { encoding: "utf8" });
      assert.equal(
        shipped.status,
        1,
        `the shipped default (gating since v1.12.0) must exit 1 on a real metadata-parity mismatch - this is the exact defect the pre-release review found; stdout:\n${shipped.stdout}\nstderr: ${shipped.stderr}`
      );
      assert.match(shipped.stdout, /GATING/);
      assert.match(shipped.stdout, /\[MISMATCH\] skills\/askit-decision/);
      assert.match(shipped.stdout, /metadata-parity: \d+ finding\(s\).*BLOCKS this run/);

      const reportOnly = spawnSync(process.execPath, [SCRIPT, copyRoot, "--mode=report-only"], { encoding: "utf8" });
      assert.equal(reportOnly.status, 0, `--mode=report-only must exit 0 even with a real seeded mismatch; stderr: ${reportOnly.stderr}`);
      assert.match(reportOnly.stdout, /REPORT-ONLY \(PARITY_MODE override = "report-only"\)/);
      assert.match(reportOnly.stdout, /\[MISMATCH\] skills\/askit-decision/);
      assert.match(reportOnly.stdout, /metadata-parity: \d+ finding/);
    } finally {
      rmSync(copyRoot, { recursive: true, force: true });
    }
  }
);

test(
  "CLI: --mode=gating with NO disagreement (clean repo state) still exits 0 - gating only fails on a real disagreement, not on being in gating mode",
  { skip: !(HAS_CLAUDE && HAS_UVX) && "claude and/or uvx not on PATH in this environment" },
  () => {
    // Run against the real, unmodified repository: its only known vendor-validate disagreement
    // (templates/seed-plugin vs --strict) is documented (ADR 0043) and every skill's metadata.*
    // currently round-trips clean, so this proves gating does not fail merely by being engaged - only
    // an actual undocumented disagreement (proven by the test above) does. Kept explicit rather than
    // relying on the shipped default, so it still asserts the same thing if PARITY_MODE ever moves.
    const r = spawnSync(process.execPath, [SCRIPT, ".", "--mode=gating"], { cwd: REPO_ROOT, encoding: "utf8" });
    // The live repo's one documented exception (ADR 0043) is expected and must not gate even here.
    assert.equal(r.status, 0, `expected exit 0 (documented exception only, no undocumented disagreement); stdout:\n${r.stdout}\nstderr: ${r.stderr}`);
    assert.match(r.stdout, /GATING/);
    // The documented-exception summary line must now read in the present tense, since enforcement is on.
    assert.match(r.stdout, /Nothing here blocks this run/);
  }
);

// The shipped constant itself, asserted directly. The banner and exit-code tests above all skip when
// the vendor CLIs are absent, so without this the v1.12.0 flip could be silently reverted and every
// remaining test would still pass on a machine (or a CI leg) without `claude`/`uvx` installed.
test("PARITY_MODE ships as 'gating' (the v1.12.0 flip, ADR 0042's scheduled discharge)", () => {
  assert.equal(PARITY_MODE, "gating");
});
