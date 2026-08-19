// what-it-is:   unit tests for the action-pin watch (E45, ADR 0053)
// what-it-does: proves each verdict can actually be produced, proves the EXIT-CODE ORDERING that review
//               wave 1 corrected, proves the parser skips what it must and reads what it must, and proves
//               both modules are write-incapable
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
import { pinSourceFiles } from "../../scripts/action-pin-watch.mjs";
import { GATES, summarize, gateBlocks, overrideApplies } from "../../scripts/lib/release-ready.mjs";

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

/**
 * Source with block and line comments removed.
 *
 * Load-bearing, and the reason is a lesson this file learned three times. A guard that greps source text
 * for a forbidden construct also matches the PROSE EXPLAINING the guard: the child_process assertion below
 * failed on both modules because both document that they do not import it, and the purity assertion then
 * failed on the words `import(` inside its own docblock. Both are the false-report class this repository
 * grades other tools on. Stripping comments fixes the class rather than deleting the sentences.
 */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

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
    // Comments stripped, then an actual IMPORT matched rather than a mention. The first version regexed
    // for the bare string `node:child_process` over raw source and failed on both modules, because both
    // DOCUMENT that they do not import it. See `stripComments`.
    const src = stripComments(readFileSync(file, "utf8"));
    assert.ok(!/node:child_process/.test(src), `${file} references child_process outside a comment`);
  });
}

test("the deterministic half imports NOTHING, dynamic imports included", () => {
  // Wave 1 finding: the first version asserted only `^\s*import\s.+$`, so adding
  // `const os = await import("node:os")` inside a function would have left it green. The purity claim is
  // the reason the whole verdict table is testable offline, so its guard must cover every import form.
  // Strip comments FIRST. Without this the scan matches the words 'import(' inside the very docblock
  // that explains the rule - which is how the first two versions of a guard in this file failed, and is
  // the false-report class this repository grades others on. Third time; the lesson is now in code.
  const src = stripComments(readFileSync(LIB, "utf8"));
  const statik = [...src.matchAll(/^\s*import\s.+$/gm)].map((m) => m[0].trim());
  const dynamic = [...src.matchAll(/\bimport\s*\(/g)].map((m) => m[0]);
  const req = [...src.matchAll(/\brequire\s*\(/g)].map((m) => m[0]);
  assert.deepEqual(statik, [], `the lib must take every fact as an argument; static imports: ${statik.join(" | ")}`);
  assert.deepEqual(dynamic, [], "the lib must contain no dynamic import()");
  assert.deepEqual(req, [], "the lib must contain no require()");
});

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

test("parsePins reads both the `uses:` and the `- uses:` step shapes, with line numbers", () => {
  const text = ["jobs:", "  a:", "    steps:", "      - name: x", "        uses: actions/checkout@v7", "      - uses: actions/setup-node@v7"].join("\n");
  const pins = parsePins(text, "w.yml");
  assert.equal(pins.length, 2);
  assert.equal(pins[0].line, 5);
  assert.equal(pins[1].action, "actions/setup-node");
});

test("a `uses:` line inside a `run: |` block scalar is NOT a pin - a false finding is the worst outcome", () => {
  // Wave 1 finding 2. That line is shell payload, not a step. Parsing it reported LABEL_DISAGREES against
  // a structurally correct workflow, which is the failure mode this repository exists to prevent.
  const text = [
    "    steps:",
    "      - run: |",
    "          cat <<'EOF'",
    "          uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v1.0.0",
    "          EOF",
    "      - uses: actions/setup-node@v7",
  ].join("\n");
  const pins = parsePins(text, "w.yml");
  assert.equal(pins.length, 1, "only the real step is a pin");
  assert.equal(pins[0].action, "actions/setup-node");
});

test("a block scalar ends at the first line indented back to its introducer, blank lines notwithstanding", () => {
  const text = ["      - run: |", "          echo hi", "", "          echo bye", "      - uses: actions/checkout@v7"].join("\n");
  assert.equal(parsePins(text, "w.yml").length, 1);
});

test("a QUOTED uses value is a pin - legal YAML the first parser silently missed", () => {
  for (const q of ['"', "'"]) {
    const pins = parsePins(`      - uses: ${q}actions/checkout@v7${q}`, "w.yml");
    assert.equal(pins.length, 1, `quoted with ${q} must parse`);
    assert.equal(pins[0].ref, "v7");
  }
});

test("a ref containing a slash parses - `owner/action@feature/foo` is legal", () => {
  const [pin] = parsePins("      - uses: a/b@feature/foo", "w.yml");
  assert.equal(pin.ref, "feature/foo");
  assert.equal(pin.refKind, "other");
});

test("a subpath action resolves to ONE action, so a three-step CodeQL job costs one lookup", () => {
  const pins = parsePins(["        uses: github/codeql-action/init@abc", "        uses: github/codeql-action/analyze@abc"].join("\n"), "w.yml");
  assert.equal(pins[0].action, "github/codeql-action");
  assert.equal(pins[1].action, "github/codeql-action");
});

test("the trailing comment and the version inside it are separated", () => {
  const [pin] = parsePins("        uses: a/b@ff2f1c62 # v4.37.7 pinned 2026-08-16", "w.yml");
  assert.equal(pin.comment, "v4.37.7 pinned 2026-08-16");
  assert.equal(pin.claimed, "v4.37.7");
});

test("classifyRef treats an UPPERCASE sha as a sha - git object ids are case-insensitive", () => {
  // Wave 1 finding 5: a lowercase-only test sent a real full SHA down the `other` branch, where no label
  // contract applies, so a real SHA pin with a wrong label passed at exit 0.
  assert.equal(classifyRef("ff2f1c621b7f889edc0d3c761ac2e6a3f8cdb0dd"), "sha");
  assert.equal(classifyRef("FF2F1C621B7F889EDC0D3C761AC2E6A3F8CDB0DD"), "sha");
  assert.equal(classifyRef("v7"), "major-tag");
  assert.equal(classifyRef("v7.0.1"), "other");
});

test("versionInComment finds a version and, importantly, reports its ABSENCE distinctly", () => {
  assert.equal(versionInComment("v4.37.7 pinned 2026-08-16"), "v4.37.7");
  assert.equal(versionInComment("pinned by hand, see ADR 0053"), null);
  assert.equal(versionInComment(null), null);
});

test("majorOf tolerates both the tag and the bare-version spellings", () => {
  assert.equal(majorOf("v4.37.7"), "4");
  assert.equal(majorOf("4.37.7"), "4");
  assert.equal(majorOf("codeql-bundle-v2.26.3"), null);
});

// ---------------------------------------------------------------------------
// Every verdict, demonstrated.
// ---------------------------------------------------------------------------

const shaPin = (comment) => parsePins(`        uses: a/b@${"a".repeat(40)}${comment ? ` # ${comment}` : ""}`, "w.yml")[0];
const tagPin = (ref, comment) => parsePins(`        uses: a/b@${ref}${comment ? ` # ${comment}` : ""}`, "w.yml")[0];

test("a SHA pin whose label names the version it resolves to is OK", () => {
  const r = evaluatePin(shaPin("v4.37.7 pinned 2026-08-16"), { resolvedVersions: ["v4.37.7"], latestVersion: "v4.37.7" });
  assert.equal(r.verdict, VERDICT.OK);
});

test("ONE COMMIT, TWO TAGS: a label naming EITHER is correct - the wave-1 false positive", () => {
  // Measured live 2026-08-18: softprops/action-gh-release carries v3.0.2 and v3 on one commit, v1 and
  // v0.1.15 on another. Reading only the FIRST tag the registry listed turned this repository's own
  // correct `# v3` label into a release-blocking false finding, on response ordering nobody controls.
  const both = { resolvedVersions: ["v3.0.2", "v3"], latestVersion: "v3.0.2" };
  assert.equal(evaluatePin(shaPin("v3.0.2 pinned 2026-07-26"), both).verdict, VERDICT.OK);
  assert.equal(evaluatePin(shaPin("v3 pinned 2026-07-26"), both).verdict, VERDICT.OK);
  // ...and a version that is on NEITHER tag is still caught.
  assert.equal(evaluatePin(shaPin("v3.0.1 pinned 2026-07-26"), both).verdict, VERDICT.LABEL_DISAGREES);
});

test("the real historical E45 defect: comment v4.37.6 against a SHA resolving to v4.37.7", () => {
  const r = evaluatePin(shaPin("v4.37.6 pinned 2026-08-09"), { resolvedVersions: ["v4.37.7", "v4"] });
  assert.equal(r.verdict, VERDICT.LABEL_DISAGREES);
  assert.match(r.detail, /v4\.37\.6/);
  assert.match(r.detail, /v4\.37\.7/);
});

test("a SHA pin with NO version comment is a label problem, not a pass", () => {
  assert.equal(evaluatePin(shaPin(null), { resolvedVersions: ["v3.0.2"] }).verdict, VERDICT.LABEL_MISSING);
});

test("a SHA pin whose lookup FAILED is UNRESOLVED, never OK - a lookup that did not happen proves nothing", () => {
  assert.equal(evaluatePin(shaPin("v1.0.0"), { error: "403 rate limit exceeded" }).verdict, VERDICT.UNRESOLVED);
});

test("a SHA that resolves to no tag is UNRESOLVED, not a disagreement - we cannot confirm OR deny", () => {
  assert.equal(evaluatePin(shaPin("v1.0.0"), { resolvedVersions: [] }).verdict, VERDICT.UNRESOLVED);
});

test("a SHA pin CAN be BEHIND - staleness matters most exactly where the ref is fixed", () => {
  // Wave 1 finding 6: the SHA branch returned OK before ever consulting latestVersion, so a fixed pin
  // years behind was indistinguishable from a current one.
  const r = evaluatePin(shaPin("v4.4.0"), { resolvedVersions: ["v4.4.0"], latestVersion: "v7.0.1" });
  assert.equal(r.verdict, VERDICT.BEHIND);
});

test("a major-tag pin needs no comment at all, because the ref IS the version", () => {
  assert.equal(evaluatePin(tagPin("v7", null), { latestVersion: "v7.0.1" }).verdict, VERDICT.OK);
});

test("a major-tag pin whose comment CONTRADICTS its ref is a label problem", () => {
  assert.equal(evaluatePin(tagPin("v7", "v5 pinned 2026-01-01"), { latestVersion: "v7.0.1" }).verdict, VERDICT.LABEL_CONTRADICTS_REF);
});

test("a major-tag pin behind the current major is BEHIND", () => {
  assert.equal(evaluatePin(tagPin("v4", null), { latestVersion: "v7.0.0" }).verdict, VERDICT.BEHIND);
});

test("a failed lookup on a TAG pin is OK on the LABEL but must NOT claim currency", () => {
  // Wave 1 finding 4: the first version said "is self-describing and current" after a 503, asserting the
  // exact fact it had just failed to establish.
  const r = evaluatePin(tagPin("v6", null), { error: "503 Service Unavailable" });
  assert.equal(r.verdict, VERDICT.OK, "the label question is answered by the ref alone");
  assert.equal(r.currencyUnknown, true);
  assert.doesNotMatch(r.detail, /\bcurrent\b(?!.*NOT)/, "must not assert currency it did not check");
  assert.match(r.detail, /NOT checked/);
});

// ---------------------------------------------------------------------------
// The exit-code ordering, corrected by wave 1, and its release-gate integration.
// ---------------------------------------------------------------------------

const reportOf = (pairs) => buildReport(pairs.map(([p]) => p), (pin) => pairs.find(([p]) => p === pin)[1]);

test("SPLIT: a pin merely BEHIND does not block - that is news about somebody else's release", () => {
  const r = reportOf([[tagPin("v4", null), { latestVersion: "v7.0.0" }]]);
  assert.equal(r.counts.behind, 1);
  assert.equal(exitCodeFor(r), 0, "a behind pin must NOT block a release on an upstream cadence nobody here controls");
});

test("SPLIT: a LABEL disagreement blocks - that is a defect in this repository's own file", () => {
  assert.equal(exitCodeFor(reportOf([[shaPin("v1.0.0"), { resolvedVersions: ["v2.0.0"] }]])), 1);
});

test("SPLIT: a missing label blocks too", () => {
  assert.equal(exitCodeFor(reportOf([[shaPin(null), { resolvedVersions: ["v2.0.0"] }]])), 1);
});

test("a refusal alone exits 2", () => {
  assert.equal(exitCodeFor(reportOf([[shaPin("v1.0.0"), { error: "429" }]])), 2);
});

test("A KNOWN DEFECT OUTRANKS UNCERTAINTY: label problem + refusal exits 1, not 2", () => {
  // Wave 1 finding 1, and it is the reason this ordering was inverted. `release-ready` makes code 2
  // overridable; with the old ordering, one wrong label plus one unrelated 503 collapsed to exit 2 and a
  // network reason string waved the wrong label straight through - contradicting ADR 0053's own claim
  // that no reason can excuse a disagreeing label.
  const r = reportOf([
    [shaPin("v1.0.0"), { resolvedVersions: ["v2.0.0"] }],
    [shaPin("v9.9.9"), { error: "429 rate limited" }],
  ]);
  assert.equal(r.counts.labelDisagrees, 1);
  assert.equal(r.counts.unresolved, 1);
  assert.equal(exitCodeFor(r), 1, "a run that proved a DEFECT did not prove nothing");
});

test("INTEGRATION: no override can make a release with a known bad label releasable", () => {
  // The end-to-end version of the finding above, through the real gate table rather than the watch alone.
  const gate = GATES.find((g) => g.id === "action-pins");
  assert.ok(gate, "the action-pins gate must exist");
  assert.equal(gateBlocks(gate, 1), true);
  assert.equal(overrideApplies(gate, 1, "GitHub API outage"), false, "code 1 is not overridable by any reason");
  const summary = summarize([{ id: gate.id, code: 1 }], { overrideReason: "GitHub API outage" });
  assert.equal(summary.ok, false, "a label defect must block even with an override offered");
});

test("INTEGRATION: an override CAN excuse a pure refusal, and only a pure refusal", () => {
  const gate = GATES.find((g) => g.id === "action-pins");
  assert.equal(overrideApplies(gate, 2, "GitHub API outage"), true);
  assert.equal(summarize([{ id: gate.id, code: 2 }], { overrideReason: "GitHub API outage" }).ok, true);
  assert.equal(summarize([{ id: gate.id, code: 2 }], {}).ok, false, "without a reason, a refusal still blocks");
});

// ---------------------------------------------------------------------------
// Reporting and file discovery
// ---------------------------------------------------------------------------

test("the renderer prints EVERY row, because a report showing only failures cannot be read as coverage", () => {
  const out = renderReport(reportOf([
    [shaPin("v4.37.7"), { resolvedVersions: ["v4.37.7"], latestVersion: "v4.37.7" }],
    [tagPin("v7", null), { latestVersion: "v7.0.1" }],
  ]));
  assert.equal((out.match(/\[OK\]/g) || []).length, 2);
});

test("the renderer's remediation says CORRECT THE COMMENT, never change the SHA to match it", () => {
  const out = renderReport(reportOf([[shaPin("v1.0.0"), { resolvedVersions: ["v2.0.0"] }]]));
  assert.match(out, /do not change the SHA to match the comment/i);
});

test("the renderer never claims currency it did not check", () => {
  const out = renderReport(reportOf([[tagPin("v7", null), { error: "503" }]]));
  assert.match(out, /Currency was NOT checked for 1 pin/);
});

test("pinSourceFiles REFUSES a root that does not exist rather than reporting a clean zero", () => {
  // Wave 1 finding 7: swallowing every exception meant a typo'd path produced `0 pins, exit 0` - a clean
  // bill of health for a tree nothing had looked at.
  assert.throws(() => pinSourceFiles(path.join(REPO_ROOT, "_definitely_not_a_real_root_")), /root does not exist/);
});

test("pinSourceFiles finds this repository's own workflows and action.yml", () => {
  const files = pinSourceFiles(REPO_ROOT).map((f) => path.relative(REPO_ROOT, f).replace(/\\/g, "/"));
  assert.ok(files.includes("action.yml"));
  assert.ok(files.some((f) => f.startsWith(".github/workflows/")));
});
