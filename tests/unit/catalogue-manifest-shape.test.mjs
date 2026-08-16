// what-it-is:   coverage for U17 (catalogue-manifest-shape), ADR 0052
// what-it-does: asserts the three branches, the shapes that must stay silent, and the THREE-PIN behaviour
// why:          "warn-only at 0.14, gates at 0.15" is the decision, and it needs `since` and `until` binding
//               SIMULTANEOUSLY - the first check in the spine to carry both. A test that only checked the
//               emitted severity would pass with either constraint missing
// used-by:      npm test
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { check, meta } from "../../scripts/checks/catalogue-manifest-shape.mjs";
import { looksLikeMarketplaceOfSkills, underSkills } from "../../scripts/lib/marketplace/manifest.mjs";
import { resolveFindings, gatingFindings } from "../../scripts/lib/resolve-config.mjs";
import { configFrom } from "../../scripts/lib/config.mjs";
import { provenanceByReq } from "../../scripts/lib/registry.mjs";
import { SINCE_BY_REQ } from "../../scripts/lib/standard-gate.mjs";

/** A directory whose .claude-plugin/marketplace.json holds `body` verbatim (or none at all). */
function withManifest(body) {
  const dir = mkdtempSync(path.join(tmpdir(), "askit-u17-"));
  if (body !== null) {
    mkdirSync(path.join(dir, ".claude-plugin"), { recursive: true });
    writeFileSync(path.join(dir, ".claude-plugin", "marketplace.json"), body);
  }
  return dir;
}
const run = (body) => {
  const dir = withManifest(body);
  try { return check({ root: dir }); } finally { rmSync(dir, { recursive: true, force: true }); }
};
const BAD_JSON = '{ "name": "c", "plugins": [ { "source": "./a"  <<< NOT JSON';
const entries = (...sources) => JSON.stringify({ name: "c", plugins: sources.map((s, i) => ({ name: `p${i}`, source: s })) });

test("meta declares U17 universal, objective, since 0.14", () => {
  assert.equal(meta.reqId, "U17");
  assert.equal(meta.tier, "universal");
  assert.equal(meta.provenance, "objective", "whether a file parses is the most objective property there is");
  assert.equal(meta.since, "0.14");
});

test("an absent manifest is silent", () => {
  assert.deepEqual(run(null), []);
});

test("an UNPARSEABLE manifest is reported, and quotes the parser's own position", () => {
  // Today this produces no finding from anybody: marketplace scope declines a catalogue it cannot read,
  // and U13 swallows the parse error by design (R-REG-5). "Does not parse" without a position is
  // unactionable on a large file, and this is the one branch where the tool knows where to look.
  const f = run(BAD_JSON);
  assert.equal(f.length, 1);
  assert.match(f[0].message, /is present but does not parse as JSON/);
  // Assert the ACTUAL thrown message is carried, not a regex a prose word can satisfy. The first
  // version matched /position|line|column|Expected/i, and "declines a catalogue it cannot read"
  // contains "line" - so emptying the detail left the test green. The mutation check caught it.
  // Same substring-versus-token defect check-readme-version records ("031" inside "1,031-check").
  let thrown = "";
  try { JSON.parse(BAD_JSON); } catch (e) { thrown = String(e.message); }
  assert.ok(thrown.length > 0, "the fixture must actually be unparseable");
  assert.ok(
    f[0].message.includes(thrown.slice(0, 40)),
    `the parser's own detail must survive verbatim; expected the message to contain ${JSON.stringify(thrown.slice(0, 40))}`
  );
  assert.match(f[0].message, /catalogued by NOTHING/);
});

test("a manifest with no plugins array is reported", () => {
  const f = run(JSON.stringify({ name: "c" }));
  assert.equal(f.length, 1);
  assert.match(f[0].message, /has no "plugins" array/);
});

test("a MIXED manifest is reported with BOTH counts and the split remediation", () => {
  const f = run(entries("./skills/local-helper", "../member-a", "../member-b"));
  assert.equal(f.length, 1);
  assert.match(f[0].message, /MIXES entry kinds: 1 resolve under skills\/ and 2 point elsewhere/);
  assert.match(f[0].message, /Split it into one manifest per kind/);
});

test("a pure marketplace-OF-SKILLS is silent, and a pure marketplace-OF-PLUGINS is silent", () => {
  // Both are supported shapes with live instances: deanpeters ships 47 skill entries, and six of the
  // seven real manifests measured are of-plugins. U17 reports the shapes NOBODY can read, not these.
  assert.deepEqual(run(entries("./skills/a", "./skills/b")), []);
  assert.deepEqual(run(entries("../plugin-a", "../plugin-b")), []);
});

test("pm-skills' single self-pointing entry shape is silent", () => {
  // The live embedded-marketplace instance the scope router goes out of its way not to disturb. It
  // parses and is not mixed, so U17 must add nothing to it.
  assert.deepEqual(run(JSON.stringify({ name: "pm", plugins: [{ name: "pm-skills", source: { source: "url", url: "https://x/pm.git" } }] })), []);
});

test("U17 and the scope router share ONE definition of 'resolves under skills/'", () => {
  // Two copies of this question is exactly how the mixed case became invisible: the router and the
  // checker would then be free to disagree about which manifests are mixed, which is worse than the
  // defect U17 reports. Asserted against the shared export rather than by reading the source.
  assert.equal(underSkills("./skills/foo"), true);
  assert.equal(underSkills("../other-plugin"), false);
  // DISCRIMINATING cases. A naive `source.includes("skill")` agrees with the real implementation on
  // the two above, so those alone cannot detect a reimplementation - the mutation check proved it.
  // These separate "contains the word skill" from "has a skills/ PATH SEGMENT with a child".
  assert.equal(underSkills("../my-skills-repo/plugin"), false, "a repo NAMED skills is not a skills/ path");
  assert.equal(underSkills("./skills"), false, "skills/ with no child names no skill directory");
  assert.equal(underSkills("packages/foo/skills/bar"), true, "a nested skills/<name> still resolves");
  assert.equal(underSkills({ source: "url", url: "https://x" }), false, "a non-string source resolves nowhere");
  const mixed = { plugins: [{ source: "./skills/a" }, { source: "../b" }] };
  assert.equal(looksLikeMarketplaceOfSkills(mixed), true, "the router claims a mixed manifest ENTIRELY, which is the defect");
  assert.equal(mixed.plugins.filter((p) => underSkills(p.source)).length, 1);
});

test("U17 is WARN at 0.13 AND at 0.14, and gates only at 0.15", () => {
  // The decision. `since: 0.14` alone would gate the moment a consumer adopts 0.14; `until: 0.15` alone
  // would expose a plugin pinned below 0.14 to a check that did not exist at its pin. BOTH constraints
  // bind at once, which makes this the first check in the spine to carry both - ADR 0044 point 2
  // anticipated it and specified that the reported `due` is the MAXIMUM across them.
  const raw = run(entries("./skills/a", "../b"));
  const PROV = provenanceByReq();
  const resolve = (pinned) => resolveFindings(raw, configFrom({}), PROV, { pinned, sinceByReq: SINCE_BY_REQ })[0];

  for (const pin of ["0.13", "0.14"]) {
    const held = resolve(pin);
    assert.equal(held.severity, "error", "the check emits its TARGET severity, always");
    assert.equal(held.effectiveSeverity, "warn", `pinned ${pin} must not gate on a preventive check`);
    assert.equal(gatingFindings([held]).length, 0);
    assert.equal(held.ceiling.due, "0.15", "the reported due is the MAXIMUM across both active constraints");
  }

  const due = resolve("0.15");
  assert.equal(due.effectiveSeverity, "error");
  assert.equal(due.ceiling, null);
  assert.equal(gatingFindings([due]).length, 1);
});

test("the migration reason is ACTIVATION-NEUTRAL and never claims a cap is in force", () => {
  const [f] = run(entries("./skills/a", "../b"));
  assert.doesNotMatch(f.migration.reason, /\bcapped\b|\buntil you\b|\bcurrently\b|\bis held\b/i);
  assert.equal(f.migration.until, "0.15");
  assert.equal(f.migration.capAt, "warn");
});


// --- wave 1, H1: an entry with no usable `source` is examined by NOBODY ---------------------------

test("W1-H1: an entry with NO source is a shape error, not something to quietly drop", () => {
  // Found by adversarial review wave 1. The first implementation filtered entries down to those with a
  // source before partitioning, so a source-less entry vanished: skillEntries 1, otherEntries 0, not
  // mixed, no finding. U13 claims the manifest (one source resolves under skills/) and ignores that
  // entry too; marketplace scope declines the whole file. The entry is therefore examined by no scope,
  // which is EXACTLY the routing hole U17 exists to close - and it passed cleanly.
  const f = run(JSON.stringify({ name: "c", plugins: [{ name: "skill-a", source: "./skills/a" }, { name: "plugin-b" }] }));
  assert.equal(f.length, 1, "a source-less entry must be reported");
  assert.match(f[0].message, /plugin-b|no usable "source"|cannot be routed/i);
});

test("W1-H1: a source-less entry is reported even in an otherwise pure catalogue", () => {
  const pure = run(JSON.stringify({ name: "c", plugins: [{ name: "a", source: "../plugin-a" }, { name: "b" }] }));
  assert.equal(pure.length, 1, "no scope can route an entry with no source, mixed or not");
});

