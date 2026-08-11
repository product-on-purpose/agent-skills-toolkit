import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { runGate, buildJsonReport, formatGithubAnnotations, parseArgs } from "../../scripts/check.mjs";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";

// Proves the three machine-readable gate outputs added by workstream 2 of v1.11.0 ("reach"): --json
// (a gate-only object, not evaluate.mjs's byRule/dispositions report), --sarif (scripts/lib/sarif-render.mjs,
// covered on its own in tests/unit/sarif-render.test.mjs), and --gha (GitHub Actions ::error/::warning
// workflow commands). All three are pure serializations of what runGate() already computed - no new
// verdict, no new severity.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SF = path.join(ROOT, "tests/fixtures/golden/silver-fixture");
const WEAK = path.join(ROOT, "tests/fixtures/anti/weak-description");
const MISSING = path.join(ROOT, "tests/fixtures/anti/missing-library-json");

function runCli(args) {
  try {
    const stdout = execFileSync(process.execPath, [path.join(ROOT, "scripts/check.mjs"), ...args], { encoding: "utf8" });
    return { code: 0, stdout, stderr: "" };
  } catch (e) {
    return { code: e.status ?? 1, stdout: String(e.stdout ?? ""), stderr: String(e.stderr ?? "") };
  }
}

// --- parseArgs: the new flags are recognized without disturbing the existing ones ---

test("parseArgs recognizes --json, --sarif, --gha as independent booleans, defaulting to false", () => {
  const a = parseArgs(["some/root"]);
  assert.equal(a.json, false);
  assert.equal(a.sarif, false);
  assert.equal(a.gha, false);
  const b = parseArgs(["some/root", "--json", "--strict"]);
  assert.equal(b.json, true);
  assert.equal(b.strict, true);
});

// --- buildJsonReport: the pure function behind --json ---

test("buildJsonReport serializes runGate's own return value plus the tier report - nothing more", () => {
  const ctx = loadPlugin(SF);
  const r = runGate(SF, ctx);
  const j = buildJsonReport(SF, ctx, r);
  assert.equal(j.errorCount, r.errorCount);
  assert.equal(j.warnCount, r.warnCount);
  assert.equal(j.exitCode, r.exitCode);
  assert.deepEqual(j.findings, r.findings);
  assert.deepEqual(j.config, r.config);
  assert.ok(j.tierReport, "must carry the tier report the CLI already computes");
  assert.equal(typeof j.tierReport.tier, "string");
  // The gate-only shape, deliberately NOT evaluate.mjs's report: byRule and dispositions are
  // evaluate-specific analysis the gate does not compute (already-settled reasoning, see the effort brief).
  assert.equal(j.byRule, undefined);
  assert.equal(j.dispositions, undefined);
});

test("every finding in buildJsonReport's output carries provenance and effectiveSeverity", () => {
  const ctx = loadPlugin(WEAK);
  const r = runGate(WEAK, ctx);
  const j = buildJsonReport(WEAK, ctx, r);
  assert.ok(j.findings.length > 0, "the fixture must actually produce findings");
  for (const f of j.findings) {
    assert.ok(f.provenance, `finding ${f.reqId ?? f.check} must carry provenance`);
    assert.ok(f.effectiveSeverity, `finding ${f.reqId ?? f.check} must carry effectiveSeverity`);
  }
});

// --- CLI --json: exclusive stdout, valid JSON, exit code unchanged ---

test("CLI check.mjs --json emits ONLY parseable JSON on stdout (no human banner, no tier line)", () => {
  const { code, stdout } = runCli([SF, "--json"]);
  let parsed;
  assert.doesNotThrow(() => { parsed = JSON.parse(stdout); }, `stdout must be nothing but JSON, got:\n${stdout}`);
  assert.ok(Array.isArray(parsed.findings));
  assert.ok(parsed.tierReport);
  assert.equal(code, parsed.exitCode, "the process exit code must equal the JSON's own exitCode");
});

test("CLI check.mjs --json exit code still reflects a real gate failure", () => {
  const { code, stdout } = runCli([MISSING, "--json"]);
  const parsed = JSON.parse(stdout);
  assert.equal(code, 1);
  assert.equal(parsed.exitCode, 1);
  assert.ok(parsed.errorCount >= 1);
});

// --- formatGithubAnnotations: the pure function behind --gha ---

test("formatGithubAnnotations emits ::error / ::warning workflow commands keyed off effectiveSeverity", () => {
  const findings = [
    { check: "c", severity: "error", effectiveSeverity: "error", message: "boom", file: "a.md", reqId: "U6", line: null },
    { check: "c", severity: "warn", effectiveSeverity: "warn", message: "meh", file: "b.md", reqId: "G8", line: null },
  ];
  const out = formatGithubAnnotations(findings, undefined);
  const lines = out.split("\n");
  assert.ok(lines[0].startsWith("::error file=a.md::"), lines[0]);
  assert.ok(lines[1].startsWith("::warning file=b.md::"), lines[1]);
});

test("formatGithubAnnotations includes line= only when the finding has one", () => {
  const findings = [
    { check: "c", severity: "error", effectiveSeverity: "error", message: "boom", file: "a.md", reqId: "U12", line: 10 },
    { check: "c", severity: "error", effectiveSeverity: "error", message: "boom2", file: "b.md", reqId: "U6", line: null },
  ];
  const out = formatGithubAnnotations(findings, undefined);
  const lines = out.split("\n");
  assert.match(lines[0], /^::error file=a\.md,line=10::/);
  assert.match(lines[1], /^::error file=b\.md::/, "no line= when the finding carries none");
});

test("formatGithubAnnotations omits suppressed and off findings (nothing to annotate)", () => {
  const findings = [
    { check: "c", severity: "error", effectiveSeverity: "error", message: "boom", file: "a.md", reqId: "U6", suppressed: true },
    { check: "c", severity: "error", effectiveSeverity: "off", message: "boom2", file: "b.md", reqId: "S1" },
  ];
  assert.equal(formatGithubAnnotations(findings, undefined), "");
});

test("formatGithubAnnotations escapes % \\r \\n in the message and : , in the file property (GitHub workflow-command escaping)", () => {
  const findings = [
    { check: "c", severity: "error", effectiveSeverity: "error", message: "100% broken\nline two", file: "a,weird:file.md", reqId: "U6" },
  ];
  const out = formatGithubAnnotations(findings, undefined);
  assert.match(out, /file=a%2Cweird%3Afile\.md/, "comma and colon must be escaped in the property value");
  assert.match(out, /100%25 broken%0Aline two/, "percent and newline must be escaped in the message");
});

// --- CLI --gha ---

test("CLI check.mjs --gha emits GitHub Actions annotation lines for a fixture with real findings", () => {
  const { stdout, code } = runCli([WEAK, "--gha"]);
  const lines = stdout.trim().split("\n").filter(Boolean);
  assert.ok(lines.length > 0, "the weak-description fixture must produce at least one annotation");
  for (const line of lines) assert.match(line, /^::(error|warning) /);
  assert.equal(code, 0, "WEAK's warning does not fail the gate");
});

test("CLI check.mjs --gha prints nothing when there is nothing to annotate", () => {
  const { stdout } = runCli([ROOT, "--gha"]);
  assert.equal(stdout, "", "this repo's own gate run is clean (0 errors, 0 warnings)");
});

// --- mutual exclusivity: at most one output-mode flag ---

test("CLI check.mjs rejects combining --json with --sarif or --gha", () => {
  const a = runCli([SF, "--json", "--sarif"]);
  assert.equal(a.code, 2);
  assert.match(a.stderr, /only one of/i);
  const b = runCli([SF, "--json", "--gha"]);
  assert.equal(b.code, 2);
});

// --- CLI --sarif: a real, valid SARIF document from this repo ---

test("CLI check.mjs --sarif emits a parseable SARIF 2.1.0 document on stdout only", () => {
  const { code, stdout } = runCli([WEAK, "--sarif"]);
  const doc = JSON.parse(stdout);
  assert.equal(doc.version, "2.1.0");
  assert.ok(Array.isArray(doc.runs[0].results));
  assert.equal(code, 0);
});
