// what-it-is:   unit tests for the action-pin watch (E45, ADR 0053)
// what-it-does: proves each verdict can actually be produced, proves the EXIT-CODE SPLIT that is this
//               check's central decision, and proves both modules are write-incapable
// why:          this repository has shipped two guards that could never fail - two vendor claims pinned as
//               bare tokens, and a README drift guard covering four of five front-door claims. A guard that
//               has only ever been seen passing is not evidence. Every verdict below is demonstrated
// used-by:      `npm test`
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  VERDICT,
  parsePins,
  classifyRef,
  versionInComment,
  majorOf,
  evaluatePin,
  buildReport,
  exitCodeFor,
  renderReport,
} from "../../scripts/lib/action-pin-watch.mjs";

const SELF = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(SELF), "../..");
const LIB = path.join(REPO_ROOT, "scripts", "lib", "action-pin-watch.mjs");
const CLI = path.join(REPO_ROOT, "scripts", "action-pin-watch.mjs");

// ---------------------------------------------------------------------------
// Write-incapability. Same shape as the standards watch's, for the same reason:
// deciding whether the COMMENT or the PIN is the wrong half is a human's call.
// ---------------------------------------------------------------------------

const WRITE_APIS = [
  "writeFileSync", "writeFile", "appendFileSync", "appendFile", "mkdirSync", "mkdir",
  "rmSync", "rm", "unlinkSync", "unlink", "renameSync", "rename", "copyFileSync", "copyFile",
];

for (const [label, file] of [["the lib", LIB], ["the CLI", CLI]]) {
  test(`${label} references no filesystem write API (the watch reports; a human re-pins)`, () => {
    const src = readFileSync(file, "utf8");
    const hits = WRITE_APIS.filter((api) => new RegExp(`\\b${api}\\s*\\(`).test(src));
    assert.deepEqual(hits, [], `${label} would be able to write: ${hits.join(", ")}`);
  });

  test(`${label} imports only read APIs from node:fs`, () => {
    const src = readFileSync(file, "utf8");
    const imports = [...src.matchAll(/import\s*\{([^}]*)\}\s*from\s*"node:fs(?:\/promises)?"/g)]
      .flatMap((m) => m[1].split(",").map((s) => s.trim()).filter(Boolean));
    const bad = imports.filter((n) => !/^(readFileSync|readdirSync|statSync|existsSync|realpathSync)$/.test(n));
    assert.deepEqual(bad, [], `${label} imports non-read fs API: ${bad.join(", ")}`);
  });

  test(`${label} imports no child_process (no shelling out to a writer, and no gh CLI dependency)`, () => {
    // Match an actual IMPORT, not a mention. The first version of this test regexed for the bare string
    // `node:child_process` and failed on both modules - because both DOCUMENT that they do not import it.
    // A guard that fires on the sentence explaining the guard is the exact false-report class this
    // repository grades others on, so it is fixed here rather than worked around by deleting the comment.
    const src = readFileSync(file, "utf8");
    const imported =
      /(?:^|\n)\s*import\s[^\n]*["']node:child_process["']/.test(src) ||
      /require\s*\(\s*["']node:child_process["']\s*\)/.test(src) ||
      /\bimport\s*\(\s*["']node:child_process["']\s*\)/.test(src);
    assert.ok(!imported, `${file} imports child_process`);
  });
}

test("the deterministic half imports NOTHING - it is pure by construction", () => {
  const src = readFileSync(LIB, "utf8");
  const imports = [...src.matchAll(/^\s*import\s.+$/gm)].map((m) => m[0]);
  assert.deepEqual(imports, [], `the lib must take every fact as an argument; it imports: ${imports.join(" | ")}`);
});

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

test("parsePins reads both the `uses:` and the `- uses:` step shapes, with line numbers", () => {
  const text = [
    "jobs:",
    "  a:",
    "    steps:",
    "      - name: x",
    "        uses: actions/checkout@v7",
    "      - uses: actions/setup-node@v7",
  ].join("\n");
  const pins = parsePins(text, "w.yml");
  assert.equal(pins.length, 2);
  assert.equal(pins[0].line, 5);
  assert.equal(pins[1].line, 6);
  assert.equal(pins[1].action, "actions/setup-node");
});

test("a subpath action resolves to ONE action, so a three-step CodeQL job costs one lookup", () => {
  const text = [
    "        uses: github/codeql-action/init@abc",
    "        uses: github/codeql-action/analyze@abc",
  ].join("\n");
  const pins = parsePins(text, "w.yml");
  assert.equal(pins[0].action, "github/codeql-action");
  assert.equal(pins[1].action, "github/codeql-action");
});

test("the trailing comment and the version inside it are separated", () => {
  const [pin] = parsePins("        uses: a/b@ff2f1c62 # v4.37.7 pinned 2026-08-16", "w.yml");
  assert.equal(pin.comment, "v4.37.7 pinned 2026-08-16");
  assert.equal(pin.claimed, "v4.37.7");
});

test("classifyRef separates the opaque ref from the self-describing one", () => {
  assert.equal(classifyRef("ff2f1c621b7f889edc0d3c761ac2e6a3f8cdb0dd"), "sha");
  assert.equal(classifyRef("v7"), "major-tag");
  assert.equal(classifyRef("v7.0.1"), "other");
  assert.equal(classifyRef("main"), "other");
});

test("versionInComment finds a version and, importantly, reports its ABSENCE distinctly", () => {
  assert.equal(versionInComment("v4.37.7 pinned 2026-08-16"), "v4.37.7");
  assert.equal(versionInComment("v3 pinned 2026-07-26"), "v3");
  assert.equal(versionInComment("pinned by hand, see ADR 0053"), null);
  assert.equal(versionInComment(null), null);
});

test("majorOf tolerates both the tag and the bare-version spellings", () => {
  assert.equal(majorOf("v4.37.7"), "4");
  assert.equal(majorOf("4.37.7"), "4");
  assert.equal(majorOf("codeql-bundle-v2.26.3"), null);
});

// ---------------------------------------------------------------------------
// Every verdict, demonstrated. Criterion 4: the check must be shown FAILING.
// ---------------------------------------------------------------------------

const shaPin = (comment) => parsePins(`        uses: a/b@${"a".repeat(40)}${comment ? ` # ${comment}` : ""}`, "w.yml")[0];
const tagPin = (ref, comment) => parsePins(`        uses: a/b@${ref}${comment ? ` # ${comment}` : ""}`, "w.yml")[0];

test("a SHA pin whose label names the version it resolves to is OK", () => {
  const r = evaluatePin(shaPin("v4.37.7 pinned 2026-08-16"), { resolvedVersion: "v4.37.7" });
  assert.equal(r.verdict, VERDICT.OK);
});

test("a SHA pin whose label names a DIFFERENT version DISAGREES - the defect caught three times by eye", () => {
  const r = evaluatePin(shaPin("v4.37.6 pinned 2026-08-09"), { resolvedVersion: "v4.37.7" });
  assert.equal(r.verdict, VERDICT.LABEL_DISAGREES);
  assert.match(r.detail, /v4\.37\.6/);
  assert.match(r.detail, /v4\.37\.7/);
});

test("the real 2026-08-18 instance: an UNDER-SPECIFIED label disagrees, and that is the rule ADR 0053 chose", () => {
  // `# v3` is not FALSE - v3.0.2 is a v3 - but it names nothing a reviewer can check, which is how the
  // next bump becomes invisible. The stricter rule is the decision; this test pins it.
  const r = evaluatePin(shaPin("v3 pinned 2026-07-26"), { resolvedVersion: "v3.0.2" });
  assert.equal(r.verdict, VERDICT.LABEL_DISAGREES);
});

test("a SHA pin with NO version comment is a label problem, not a pass", () => {
  const r = evaluatePin(shaPin(null), { resolvedVersion: "v3.0.2" });
  assert.equal(r.verdict, VERDICT.LABEL_MISSING);
});

test("a SHA pin whose lookup FAILED is UNRESOLVED, never OK - a lookup that did not happen proves nothing", () => {
  const r = evaluatePin(shaPin("v1.0.0"), { error: "403 rate limit exceeded" });
  assert.equal(r.verdict, VERDICT.UNRESOLVED);
});

test("a SHA that resolves to no tag is UNRESOLVED, not a disagreement - we cannot confirm OR deny", () => {
  const r = evaluatePin(shaPin("v1.0.0"), { resolvedVersion: null });
  assert.equal(r.verdict, VERDICT.UNRESOLVED);
});

test("a major-tag pin needs no comment at all, because the ref IS the version", () => {
  assert.equal(evaluatePin(tagPin("v7", null), { latestVersion: "v7.0.1" }).verdict, VERDICT.OK);
});

test("a major-tag pin whose comment CONTRADICTS its ref is a label problem", () => {
  const r = evaluatePin(tagPin("v7", "v5 pinned 2026-01-01"), { latestVersion: "v7.0.1" });
  assert.equal(r.verdict, VERDICT.LABEL_CONTRADICTS_REF);
});

test("a major-tag pin behind the current major is BEHIND", () => {
  const r = evaluatePin(tagPin("v4", null), { latestVersion: "v7.0.0" });
  assert.equal(r.verdict, VERDICT.BEHIND);
});

test("a failed lookup on a TAG pin is not a refusal, because the label question was already answered", () => {
  // The ref is self-describing, so nothing the registry could have said would change this verdict.
  // Refusing here would block a release on a rate limit that could not have mattered.
  assert.equal(evaluatePin(tagPin("v7", null), { error: "500" }).verdict, VERDICT.OK);
});

// ---------------------------------------------------------------------------
// The exit-code SPLIT. This is ADR 0053's central decision and the reason this
// check is not simply a copy of the vendor watch.
// ---------------------------------------------------------------------------

const reportOf = (pairs) => buildReport(pairs.map(([p]) => p), (pin) => pairs.find(([p]) => p === pin)[1]);

test("SPLIT: a pin merely BEHIND does not block - that is news about somebody else's release", () => {
  const r = reportOf([[tagPin("v4", null), { latestVersion: "v7.0.0" }]]);
  assert.equal(r.counts.behind, 1);
  assert.equal(exitCodeFor(r), 0, "a behind pin must NOT block a release on an upstream cadence nobody here controls");
});

test("SPLIT: a LABEL disagreement blocks - that is a defect in this repository's own file", () => {
  const r = reportOf([[shaPin("v1.0.0"), { resolvedVersion: "v2.0.0" }]]);
  assert.equal(exitCodeFor(r), 1);
});

test("SPLIT: a missing label blocks too", () => {
  assert.equal(exitCodeFor(reportOf([[shaPin(null), { resolvedVersion: "v2.0.0" }]])), 1);
});

test("REFUSAL outranks everything: exit 2 even when a label also disagrees", () => {
  const r = reportOf([
    [shaPin("v1.0.0"), { resolvedVersion: "v2.0.0" }],
    [shaPin("v9.9.9"), { error: "429 rate limited" }],
  ]);
  assert.equal(r.counts.labelDisagrees, 1);
  assert.equal(r.counts.unresolved, 1);
  assert.equal(exitCodeFor(r), 2, "a run that could not perform a lookup must not report a label verdict as final");
});

test("a clean run exits 0, and BEHIND rows do not silently vanish from the report", () => {
  const r = reportOf([
    [shaPin("v4.37.7"), { resolvedVersion: "v4.37.7" }],
    [tagPin("v4", null), { latestVersion: "v7.0.0" }],
  ]);
  assert.equal(exitCodeFor(r), 0);
  assert.equal(r.counts.behind, 1);
  assert.match(renderReport(r), /BEHIND/, "an advisory finding must still be printed, or nobody learns it");
});

test("the renderer prints EVERY row, because a report showing only failures cannot be read as coverage", () => {
  const r = reportOf([
    [shaPin("v4.37.7"), { resolvedVersion: "v4.37.7" }],
    [tagPin("v7", null), { latestVersion: "v7.0.1" }],
  ]);
  const out = renderReport(r);
  assert.equal((out.match(/\[OK\]/g) || []).length, 2);
});

test("the renderer's remediation says CORRECT THE COMMENT, never change the SHA to match it", () => {
  const out = renderReport(reportOf([[shaPin("v1.0.0"), { resolvedVersion: "v2.0.0" }]]));
  assert.match(out, /do not change the SHA to match the comment/i);
});
