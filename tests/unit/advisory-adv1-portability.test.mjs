// what-it-is:   coverage for ADV1 (portability), ADR 0063 sec 2; backlog E86
// what-it-does: proves the whitelist-half screen fires on a Claude-Code-only top-level key and on two
//               such keys together, stays silent on the six allowed keys and on nested metadata keys,
//               still runs under --profile plain-plugin (it is vendor-cited, not house), and that the
//               firing test can actually go red
// why:          RS-E4's criterion 2, reused by ADR 0063 for the whole advisory layer: "a pattern
//               removed from the catalog stops its fixture firing (the catalog is load-bearing,
//               mutation-tested)". A guard that cannot fail is not a guard
// used-by:      npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { check, meta, SKILLS_API_WHITELIST } from "../../scripts/advisory/adv1-portability.mjs";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { computeAdvisoryLayer } from "../../scripts/check.mjs";
import { ADVISORY_MODULES } from "../../scripts/lib/advisory-registry.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CLAIMS = path.join(REPO, "foundation/claims/vendor-claims.json");

function withPlugin(skillBody, fn) {
  const dir = mkdtempSync(path.join(tmpdir(), "askit-adv1-"));
  try {
    mkdirSync(path.join(dir, "skills", "demo"), { recursive: true });
    writeFileSync(
      path.join(dir, "library.json"),
      JSON.stringify({ name: "t", version: "0.1.0", description: "ADV1 fixture.", standard: "0.17", tier: "universal" }, null, 2)
    );
    writeFileSync(path.join(dir, "skills", "demo", "SKILL.md"), skillBody);
    fn(loadPlugin(dir));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("meta declares ADV1, vendor-cited", () => {
  assert.equal(meta.advisoryId, "ADV1");
  assert.equal(meta.provenance, "vendor-cited");
});

test("SKILLS_API_WHITELIST is exactly the vendor's six fields, sorted", () => {
  assert.deepEqual([...SKILLS_API_WHITELIST], ["allowed-tools", "compatibility", "description", "license", "metadata", "name"]);
});

// DERIVE THE CONSTANT FROM THE CLAIM (ADR 0063, "derive a vendor constant, pin a house one"): the
// whitelist is parsed OUT of the pinned claim's own text, never typed a second time as a literal, so a
// vendor-side change to the claim fails THIS test rather than leaving SKILLS_API_WHITELIST stale beside
// a claim that has already moved on.
test("SKILLS_API_WHITELIST is DERIVED from the skills-api-frontmatter-whitelist vendor claim, not a parallel literal", () => {
  const d = JSON.parse(readFileSync(CLAIMS, "utf8"));
  const claim = d.claims.find((c) => c.id === "skills-api-frontmatter-whitelist");
  assert.ok(claim, "the claim this constant must be derived from is missing from the vendor-claims pin");
  const m = claim.claim.match(/Allowed properties are: (.+)$/);
  assert.ok(m, `the claim's text does not match the expected "Allowed properties are: ..." shape: ${claim.claim}`);
  const fields = m[1].replace(/\.$/, "").split(",").map((s) => s.trim()).sort();
  assert.deepEqual(fields, [...SKILLS_API_WHITELIST].sort(), "a vendor-side whitelist change must fail this test, not silently leave the constant stale");
});

test("fires on a single Claude-Code-only top-level key (argument-hint)", () => {
  withPlugin(
    "---\nname: demo\ndescription: d\nargument-hint: \"<path>\"\n---\n\nbody\n",
    (ctx) => {
      const found = check(ctx);
      assert.equal(found.length, 1);
      assert.match(found[0].message, /`argument-hint`/);
      assert.match(found[0].message, /claude\.ai and the Skills API reject/);
      assert.match(found[0].message, /Claude Code itself accepts/);
      assert.match(found[0].message, /not a defect/);
      assert.equal(found[0].severity, "warn");
    }
  );
});

test("fires once, naming BOTH offending keys sorted, when two are declared together", () => {
  withPlugin(
    "---\nname: demo\ndescription: d\nmodel: opus\nargument-hint: \"<path>\"\n---\n\nbody\n",
    (ctx) => {
      const found = check(ctx);
      assert.equal(found.length, 1, "one finding per SKILL.md, not one per key");
      assert.match(found[0].message, /`argument-hint`, `model`/, "sorted order");
    }
  );
});

test("silent on all six allowed top-level keys together", () => {
  withPlugin(
    "---\nallowed-tools: []\ncompatibility: [claude]\ndescription: d\nlicense: MIT\nmetadata: {}\nname: demo\n---\n\nbody\n",
    (ctx) => assert.deepEqual(check(ctx), [])
  );
});

test("silent on a key nested under metadata - the whitelist governs the top level only", () => {
  withPlugin(
    "---\nname: demo\ndescription: d\nmetadata:\n  version: \"1.0\"\n  argument-hint: \"<path>\"\n---\n\nbody\n",
    (ctx) => assert.deepEqual(check(ctx), [])
  );
});

test("an unparseable frontmatter is another check's finding, not this one's", () => {
  assert.deepEqual(check({ root: "/x", skills: [{ skillMdPath: "/x/s", parseError: "bad yaml", frontmatter: null }] }), []);
});

test("ADV1 still runs under --profile plain-plugin: it is vendor-cited, not house (ADR 0063 sec 1)", () => {
  withPlugin(
    "---\nname: demo\ndescription: d\nargument-hint: \"<path>\"\n---\n\nbody\n",
    (ctx) => {
      const { advisoryFindings } = computeAdvisoryLayer(ctx, { profile: "plain-plugin", advisoryModules: ADVISORY_MODULES });
      assert.ok(advisoryFindings.some((f) => f.advisoryId === "ADV1"), "plain-plugin must not silence a vendor-cited screen");
    }
  );
});

/* ----------------------------------------------------------------------
 * MUTATION PROOF 1, recorded per RS-E4's criterion 2 ("proven able to fail").
 *
 * Mutant applied to scripts/advisory/adv1-portability.mjs: widened SKILLS_API_WHITELIST by adding
 * "argument-hint" to it (the exact field the vendor's own error-message example names as the
 * offending key), then re-ran THIS file alone (9 tests, once the derived-constant test below exists).
 *
 *   BEFORE (correct code): 9 tests, 9 pass, 0 fail.
 *   AFTER  (mutant):       9 tests, 4 pass, 5 fail -
 *     "SKILLS_API_WHITELIST is exactly the vendor's six fields, sorted" (the constant now holds seven)
 *     "SKILLS_API_WHITELIST is DERIVED from the skills-api-frontmatter-whitelist vendor claim" (the
 *       widened 7-entry constant no longer deep-equals the 6 fields parsed from the claim's own text)
 *     "fires on a single Claude-Code-only top-level key (argument-hint)" (found.length was 0, not 1 -
 *       the widened whitelist no longer flagged the field the test fixture exists to catch)
 *     "fires once, naming BOTH offending keys sorted, when two are declared together" (found 1 key,
 *       `model`, not two - argument-hint silently stopped counting as offending)
 *     "ADV1 still runs under --profile plain-plugin" (its fixture also used argument-hint, so it too
 *       stopped firing)
 *
 * MUTATION PROOF 2 - the derived-constant test specifically, isolated from the module-side mutant
 * above. Mutant applied to foundation/claims/vendor-claims.json instead: the
 * skills-api-frontmatter-whitelist claim's text had "license, " removed ("... description, license,
 * metadata, name" -> "... description, metadata, name"), leaving SKILLS_API_WHITELIST itself
 * untouched, then this file was re-run alone.
 *
 *   BEFORE (correct claim): 9 tests, 9 pass, 0 fail.
 *   AFTER  (mutant):        9 tests, 8 pass, 1 fail -
 *     "SKILLS_API_WHITELIST is DERIVED from the skills-api-frontmatter-whitelist vendor claim" (the
 *       claim now parses to five fields, which no longer deep-equals the constant's six) - and ONLY
 *       that test: every firing test still passed, because the SCREEN reads the constant, not the
 *       claim file at runtime. This isolates what the derived-constant test actually proves: that the
 *       constant and the claim cannot drift apart, nothing about ADV1's own firing behaviour.
 *
 * Both mutants were reverted immediately after capturing their results; `git diff` on
 * scripts/advisory/adv1-portability.mjs and foundation/claims/vendor-claims.json is clean.
 * ---------------------------------------------------------------------- */
