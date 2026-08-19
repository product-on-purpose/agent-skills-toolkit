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
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync, symlinkSync, rmdirSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
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

/**
 * Every write API a source reaches, by NAME or by bracket access (review finding F12).
 *
 * Two defects, and both are lessons this file already knew and had applied only in the other direction.
 *
 * 1. **The scan ran on RAW source.** A comment merely mentioning `writeFileSync(` would have failed it -
 *    the guard-fires-on-its-own-prose class that `stripComments` exists for and that had already bitten
 *    this file three times. It is applied here now too.
 * 2. **`\bapi\s*\(` cannot see `fs["writeFileSync"](p, d)`**, because `"](` is not `(`. Combined with an
 *    `import * as fs` that the brace-delimited import scan also could not see, a real write could be added
 *    to either module while both guards stayed green - and the CLI's docblock would still claim
 *    "WRITE-INCAPABLE BY CONSTRUCTION, and a test enforces it".
 *
 * Extracted as a function rather than inlined, so the GUARD itself can be shown catching a defeat. A guard
 * that has only ever been seen passing is not evidence, which is this file's own opening sentence.
 */
function writeCapableHits(source) {
  const src = stripComments(source);
  return WRITE_APIS.filter(
    // The identifiers come from the fixed list above and contain no metacharacters, so composing them is
    // safe; nothing external reaches this pattern.
    (api) => new RegExp(`\\b${api}\\s*\\(`).test(src) || new RegExp(`\\[\\s*["'\`]${api}["'\`]\\s*\\]`).test(src)
  );
}

/** Any `import * as x from "node:fs"`, which the brace-delimited import scan cannot see. */
function fsNamespaceImports(source) {
  return [...stripComments(source).matchAll(/import\s+\*\s+as\s+\w+\s+from\s*["']node:fs(?:\/promises)?["']/g)].map(
    (m) => m[0]
  );
}

test("F12: the write guard catches a BRACKET-ACCESSED write, not merely a named call", () => {
  assert.deepEqual(writeCapableHits('import * as fs from "node:fs";\nfs["writeFileSync"](p, d);'), ["writeFileSync"]);
  assert.deepEqual(writeCapableHits("fs['rmSync'](p);"), ["rmSync"]);
  assert.deepEqual(writeCapableHits("writeFileSync(p, d);"), ["writeFileSync"]);
});

test("F12: the write guard catches a NAMESPACE import of node:fs, which no brace scan can see", () => {
  assert.equal(fsNamespaceImports('import * as fs from "node:fs";').length, 1);
  assert.equal(fsNamespaceImports('import { readFileSync } from "node:fs";').length, 0);
});

test("F12: the write guard does NOT fire on the prose explaining it", () => {
  // The inverse class, and the one this file has already shipped three times. Every sentence describing
  // what these modules must not do contains the very tokens being scanned for.
  assert.deepEqual(writeCapableHits("// this module never calls writeFileSync(path, data)\nconst x = 1;"), []);
  assert.deepEqual(writeCapableHits('/* no fs["rmSync"](p) here */\nconst y = 2;'), []);
});

for (const [label, file] of [["the lib", LIB], ["the CLI", CLI]]) {
  test(`${label} references no filesystem write API (the watch reports; a human re-pins)`, () => {
    const hits = writeCapableHits(readFileSync(file, "utf8"));
    assert.deepEqual(hits, [], `${label} would be able to write: ${hits.join(", ")}`);
  });

  test(`${label} imports only read APIs from node:fs`, () => {
    const src = readFileSync(file, "utf8");
    const imports = [...src.matchAll(/import\s*\{([^}]*)\}\s*from\s*"node:fs(?:\/promises)?"/g)]
      .flatMap((m) => m[1].split(",").map((s) => s.trim()).filter(Boolean));
    const bad = imports.filter((n) => !/^(readFileSync|readdirSync|statSync|existsSync|realpathSync)$/.test(n));
    assert.deepEqual(bad, [], `${label} imports non-read fs API: ${bad.join(", ")}`);
    // ...and the whole-namespace form, which the scan above is structurally unable to see.
    const ns = fsNamespaceImports(src);
    assert.deepEqual(ns, [], `${label} imports node:fs wholesale, so the named-import allowlist proves nothing`);
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

test("ONE COMMIT, TWO TAGS: a label naming the SPECIFIC one is correct - the wave-1 false positive", () => {
  // Measured live 2026-08-18: softprops/action-gh-release carries v3.0.2 and v3 on one commit, v1 and
  // v0.1.15 on another. Reading only the FIRST tag the registry listed turned this repository's own
  // correct `# v3.0.2` label into a release-blocking false finding, on response ordering nobody controls.
  // That protection is what this test exists for and it must survive every later change.
  const both = { resolvedVersions: ["v3.0.2", "v3"], latestVersion: "v3.0.2" };
  assert.equal(evaluatePin(shaPin("v3.0.2 pinned 2026-07-26"), both).verdict, VERDICT.OK);
  // ...and a version that is on NEITHER tag is still caught.
  assert.equal(evaluatePin(shaPin("v3.0.1 pinned 2026-07-26"), both).verdict, VERDICT.LABEL_DISAGREES);
  // The `# v3` spelling was ALSO accepted here until review finding F3, which is a separate defect with
  // its own test below: a floating tag matches forever, so the label could never disagree.
  assert.equal(evaluatePin(shaPin("v3 pinned 2026-07-26"), both).verdict, VERDICT.LABEL_FLOATS);
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

// --- F11: two more ways to look at nothing and report a clean pass ----------

test("F11: a root that EXISTS but holds no pin sources REFUSES, rather than reporting a clean zero", () => {
  // The root-exists check caught a typo'd path and nothing else. A monorepo subpackage, a mis-set
  // working-directory, or a typo that happens to name a REAL directory all yielded
  // `0 pins ... Every label is accurate` at exit 0 - indistinguishable from a genuine clean pass.
  //
  // Note what is NOT being claimed: a missing `.github/workflows`, or a missing action manifest, is
  // still individually fine, because a plugin need not ship CI. BOTH absent means this tool was pointed
  // somewhere it cannot answer a question about, which is a refusal.
  const dir = mkdtempSync(path.join(tmpdir(), "askit-empty-root-"));
  try {
    assert.throws(() => pinSourceFiles(dir), /no workflow files and no action manifest/);
  } finally {
    rmdirSync(dir);
  }
});

test("F11: an action.yaml is found, because GitHub Actions accepts both spellings", () => {
  // The workflow scan four lines above already accepted both extensions; the manifest lookup did not,
  // so a repository spelling it `action.yaml` had that file silently excluded from the scan.
  const dir = mkdtempSync(path.join(tmpdir(), "askit-yaml-root-"));
  const manifest = path.join(dir, "action.yaml");
  try {
    writeFileSync(manifest, "name: t\n", "utf8");
    assert.deepEqual(pinSourceFiles(dir), [manifest]);
  } finally {
    unlinkSync(manifest);
    rmdirSync(dir);
  }
});

test("F11: the report says HOW MANY FILES it read, so looking at nothing cannot render as looking and finding nothing", () => {
  const out = renderReport(buildReport([], () => ({}), { sources: 7 }));
  assert.match(out, /read from 7 file/);
});

// ---------------------------------------------------------------------------
// Review wave 2, findings F3 to F8: the correctness cluster.
//
// Every one of these is a way the checker reached the WRONG verdict on input it
// will actually meet. Four of them blocked a correct pin, which this file's own
// docblock calls the worst outcome it recognises, and two of them let a defect
// through while printing a verdict that sounded like coverage.
// ---------------------------------------------------------------------------

// --- F4: the comment parser -------------------------------------------------

test("F4: the claim is the LAST version in the comment, because Dependabot writes 'from X to Y'", () => {
  // The pin is CORRECT in every line here and the checker blocked it, at exit 1, which no reason string can
  // override. Taking the FIRST v-token read the superseded version as the claim. This shape is expected
  // input: the correction in 05-ci-plan.md records that Dependabot rewrites these comments.
  assert.equal(versionInComment("bumped from v4.37.6 to v4.37.7"), "v4.37.7");
  assert.equal(versionInComment("renovate: from v2 to v3.0.2"), "v3.0.2");
  assert.equal(versionInComment("was v3, now v4 pinned 2026-08-16"), "v4");
});

test("F4: a version needs no `v`, and the `v` may be capital", () => {
  // aquasecurity/trivy-action ships tags named `0.28.0`. Both spellings returned null, which is
  // LABEL_MISSING - a blocking label problem reported against a perfectly good label.
  assert.equal(versionInComment("0.28.0 pinned 2026-01-01"), "0.28.0");
  assert.equal(versionInComment("V4.37.7 pinned 2026-08-16"), "V4.37.7");
});

test("F4: a DATE is not a version, and neither is a sha fragment", () => {
  // The guard against the fix: accepting a bare `4.37.7` must not start reading `2026-08-16` as v2026.
  // A bare number is only a version when it carries a dot, which a hyphenated date never does.
  assert.equal(versionInComment("pinned 2026-08-16"), null);
  assert.equal(versionInComment("pinned by hand, see ADR 0053"), null);
  assert.equal(versionInComment("3d0d988 v3.0.2"), "v3.0.2");
  assert.equal(versionInComment("v4.37.7 pinned 2026-08-16"), "v4.37.7");
});

test("F4: `v4.37.7` and `4.37.7` are the SAME version on both sides of the comparison", () => {
  // The inverse block: a correct `# v4.37.7` comment against a registry tag literally named `4.37.7`
  // failed the raw string comparison and was reported as a disagreement.
  assert.equal(evaluatePin(shaPin("v0.28.0 pinned 2026-01-01"), { resolvedVersions: ["0.28.0"] }).verdict, VERDICT.OK);
  assert.equal(evaluatePin(shaPin("0.28.0 pinned 2026-01-01"), { resolvedVersions: ["v0.28.0"] }).verdict, VERDICT.OK);
  assert.equal(evaluatePin(shaPin("V4.37.7"), { resolvedVersions: ["v4.37.7"] }).verdict, VERDICT.OK);
});

test("F4: a Dependabot-rewritten comment on a CORRECT pin passes", () => {
  const r = evaluatePin(shaPin("bumped from v4.37.6 to v4.37.7"), { resolvedVersions: ["v4.37.7", "v4"] });
  assert.equal(r.verdict, VERDICT.OK);
});

test("F4: when the label really does disagree, the detail names every version the comment held", () => {
  // No new verdict for ambiguity - the human sees both tokens and decides. A second verdict here would be
  // surface for no added decision.
  const r = evaluatePin(shaPin("bumped from v4.37.6 to v4.37.7"), { resolvedVersions: ["v5.0.0"] });
  assert.equal(r.verdict, VERDICT.LABEL_DISAGREES);
  assert.match(r.detail, /v4\.37\.6/);
  assert.match(r.detail, /v4\.37\.7/);
});

// --- F5: block-scalar headers ----------------------------------------------

test("F5: every legal block-scalar header is recognised, comment and indentation indicator included", () => {
  // A header this regex misses is a header whose SHELL PAYLOAD gets parsed as YAML, so a `uses:`-shaped
  // line inside a heredoc becomes a pin and BLOCKS the release. The file's own docstring example `body: |2+`
  // did not match the regex that documented it.
  for (const header of ["run: |", "run: |-", "run: |2-", "run: |-2", "body: |2+", "script: >-", "run: >+3 # c", "run: | # trailing comment"]) {
    const text = `    ${header}\n      uses: evil/action@${"b".repeat(40)} # v9.9.9\n    name: after`;
    assert.deepEqual(parsePins(text, "w.yml"), [], `${header} was not recognised as a block scalar`);
  }
});

test("F5: a real step AFTER a block scalar is still parsed", () => {
  // The inverse guard. A block-scalar fix that swallowed the rest of the file would hide real pins, which
  // is the same defect wearing the other mask.
  const text = `    run: | # trailing comment\n      echo uses: not/a@pin\n    uses: real/action@v7 # v7`;
  const pins = parsePins(text, "w.yml");
  assert.equal(pins.length, 1);
  assert.equal(pins[0].action, "real/action");
});

// --- F3: a floating label can never disagree -------------------------------

test("F3: a bare major label on a SHA pin is a defect, because it follows the SHA forever", () => {
  // The permissive multi-tag rule was a correct wave-1 fix for a false positive whose SIDE EFFECT was never
  // weighed: a floating major tag is not a fact about the commit, it is a pointer that moves to every new
  // release commit. `resolved.includes('v3')` therefore stays true however far the SHA advances, so the
  // exact Dependabot drift this whole check exists to catch became invisible - in the pin format this
  // repository's own runbook prescribed. Verified at three successive releases.
  for (const specific of ["v3.0.2", "v3.1.0", "v3.5.9"]) {
    const r = evaluatePin(shaPin("v3 pinned 2026-07-26"), { resolvedVersions: [specific, "v3"] });
    assert.equal(r.verdict, VERDICT.LABEL_FLOATS, `# v3 against ${specific} must not pass`);
    // A plain substring check, not a constructed RegExp. Escaping only `.` out of a string being compiled
    // into a pattern is the partial-escaping shape CodeQL flags, and correctly: it reads as sanitised while
    // handling one metacharacter. The assertion never needed a pattern in the first place.
    assert.ok(r.detail.includes(specific), `the detail must name ${specific}, the version to write instead`);
  }
});

test("F3: a floating label is only FLOATS when it matched; otherwise DISAGREES is the sharper verdict", () => {
  // Ordering matters. `# v3` against a commit tagged v4.0.0 and v4 is not under-specified, it is WRONG,
  // and saying so is more useful than telling the author their label moves.
  const r = evaluatePin(shaPin("v3 pinned 2026-07-26"), { resolvedVersions: ["v4.0.0", "v4"] });
  assert.equal(r.verdict, VERDICT.LABEL_DISAGREES);
});

test("F3: when a commit carries ONLY a floating tag, that label is the best available and passes", () => {
  // The escape hatch is load-bearing: some actions publish nothing but major tags, and demanding a specific
  // version there would block a pin whose author has no better label to write. A rule that cannot be
  // satisfied is a false finding with extra steps.
  assert.equal(evaluatePin(shaPin("v3 pinned 2026-07-26"), { resolvedVersions: ["v3"] }).verdict, VERDICT.OK);
});

test("F3: a floating label BLOCKS at exit 1, the code no reason string can override", () => {
  // It is a defect in this repository's own file, not somebody else's outage, so it takes the same exit
  // code as every other label problem. ADR 0053's split decides this.
  const report = reportOf([[shaPin("v3"), { resolvedVersions: ["v3.0.2", "v3"] }]]);
  assert.equal(report.counts.labelFloats, 1);
  assert.equal(exitCodeFor(report), 1);
  assert.match(renderReport(report), /do not change the SHA to match the comment/i);
});

// --- F6: a release tag that is not a version number ------------------------

test("F6: an unparseable latest release means currency is UNKNOWN, never 'current'", () => {
  // github/codeql-action's releases/latest tag is `codeql-bundle-v2.26.3`. `majorOf` returns null for it,
  // which short-circuited the BEHIND guard - while `latest` being truthy set currencyUnknown FALSE, so the
  // report dropped its "Currency was NOT checked" line and the major-tag branch printed the ref
  // "is self-describing and CURRENT", flatly asserting the fact it had just failed to establish.
  //
  // The fix is NOT to parse harder. `codeql-bundle-v2.26.3` is a different numbering series from the
  // action's own v4 tags; extracting a 2 from it and comparing would report a current pin as BEHIND.
  const bundle = "codeql-bundle-v2.26.3";
  const sha = evaluatePin(shaPin("v4.37.7"), { resolvedVersions: ["v4.37.7", "v4"], latestVersion: bundle });
  assert.equal(sha.verdict, VERDICT.OK);
  assert.equal(sha.currencyUnknown, true);

  const tag = evaluatePin(tagPin("v4", null), { latestVersion: bundle });
  assert.equal(tag.verdict, VERDICT.OK);
  assert.equal(tag.currencyUnknown, true);
  // The false claim was the phrase "is self-describing and current". Naming the release it could not
  // compare is fine and useful; ASSERTING the pin is current on that basis is the defect.
  assert.doesNotMatch(tag.detail, /and current\b/, "it must not claim currency it could not compare");
  assert.match(tag.detail, /currency NOT checked/);
  assert.match(tag.detail, /not a version number/);
});

test("F6: an unparseable latest release still reaches the report's 'currency NOT checked' line", () => {
  const out = renderReport(reportOf([[tagPin("v4", null), { latestVersion: "codeql-bundle-v2.26.3" }]]));
  assert.match(out, /Currency was NOT checked for 1 pin/);
});

// --- F7: the `other` ref kind ----------------------------------------------

test("F7: a full-tag ref and a contradicting comment is caught, exactly as a major tag would be", () => {
  // `refKind: other` returned OK unconditionally, so a flatly contradicting label passed at exit 0 while
  // the identical contradiction on a bare major tag raised LABEL_CONTRADICTS_REF one branch above. A full
  // tag is self-describing in the same way, so it takes the same contract.
  const r = evaluatePin(tagPin("v4.1.1", "v7.0.0 pinned 2026-01-01"), { latestVersion: "v4.2.0" });
  assert.equal(r.verdict, VERDICT.LABEL_CONTRADICTS_REF);
});

test("F7: the contradiction is MAJOR-level, so a more precise comment on the same major passes", () => {
  const r = evaluatePin(tagPin("v4.1.1", "v4.2.0"), { latestVersion: "v4.2.0" });
  assert.equal(r.verdict, VERDICT.OK);
});

test("F7: a failed lookup on a full-tag ref reports unknown currency, never a silent OK", () => {
  // The branch never read `resolution.error`, so a 404 or a rate limit printed a clean row.
  const r = evaluatePin(tagPin("v4.1.1", null), { error: "403 rate limit exceeded" });
  assert.equal(r.currencyUnknown, true);
  assert.match(r.detail, /rate limit/);
});

test("F7: a full-tag ref behind its action's current major is reported BEHIND", () => {
  // Leaving `other` currency-blind would be F6's hole in a second place.
  const r = evaluatePin(tagPin("v4.1.1", null), { latestVersion: "v7.0.1" });
  assert.equal(r.verdict, VERDICT.BEHIND);
});

test("F7: a BRANCH ref judges nothing and says so", () => {
  const r = evaluatePin(tagPin("main", null), { latestVersion: "v7.0.1" });
  assert.equal(r.verdict, VERDICT.OK);
  assert.equal(r.currencyUnknown, true);
});

// ---------------------------------------------------------------------------
// The module-entry guard (review finding F1)
//
// A watch that never RAN exits with the same code as a watch that found nothing
// wrong. Everything above this line tests the checker; these test that the
// checker is reached at all.
// ---------------------------------------------------------------------------

/** Remove a link without ever recursing into what it points at. */
function removeLink(p) {
  try {
    rmdirSync(p); // a Windows directory junction
  } catch {
    try {
      unlinkSync(p); // a POSIX symlink to a directory
    } catch {
      /* already gone, or never created */
    }
  }
}

test("the CLI RUNS when it is invoked through a symlinked checkout", (t) => {
  // F1. The guard compared a realpath-resolved `import.meta.url` against an UNRESOLVED `argv[1]`: Node's
  // loader canonicalises the first and nobody touches the second, so through a junction or symlink the two
  // never matched. `main()` did not run, the process printed NOTHING and exited 0, and `release-ready`
  // recorded `ok action-pins (exit 0)` over zero pins. macOS `/tmp`, container mounts and symlinked CI
  // workspaces all arrive by this path, and nothing else runs this check, so the no-op is caught nowhere.
  //
  // SPAWNED rather than imported, deliberately: the defect is in the entry guard, and only an invocation
  // exercises it. A nonexistent root keeps the test offline and instant, and makes the assertion sharp -
  // the run must REFUSE, and a refusal is proof that `main()` was reached.
  const dir = mkdtempSync(path.join(tmpdir(), "askit-entry-guard-"));
  const link = path.join(dir, "checkout");
  try {
    symlinkSync(REPO_ROOT, link, "junction");
  } catch {
    removeLink(link);
    rmdirSync(dir);
    t.skip("this platform will not create a link without elevation");
    return;
  }
  try {
    const cli = path.join(link, "scripts", "action-pin-watch.mjs");
    const r = spawnSync(process.execPath, [cli, path.join(dir, "no-such-root")], { encoding: "utf8" });
    const out = `${r.stdout ?? ""}${r.stderr ?? ""}`;
    assert.match(out, /REFUSED/, `invoked through a link the CLI said nothing; it printed ${JSON.stringify(out)}`);
    assert.equal(r.status, 2, "a run that proved nothing about any pin must never exit 0");
  } finally {
    removeLink(link);
    rmdirSync(dir);
  }
});
