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
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { check, meta, SKILLS_API_WHITELIST } from "../../scripts/advisory/adv1-portability.mjs";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { computeAdvisoryLayer } from "../../scripts/check.mjs";
import { ADVISORY_MODULES } from "../../scripts/lib/advisory-registry.mjs";

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
 * MUTATION PROOF, recorded per RS-E4's criterion 2 ("proven able to fail").
 *
 * Mutant applied to scripts/advisory/adv1-portability.mjs: widened SKILLS_API_WHITELIST by adding
 * "argument-hint" to it (the exact field the vendor's own error-message example names as the
 * offending key), then re-ran THIS file alone.
 *
 *   BEFORE (correct code): 8 tests, 8 pass, 0 fail.
 *   AFTER  (mutant):       8 tests, 4 pass, 4 fail -
 *     "SKILLS_API_WHITELIST is exactly the vendor's six fields, sorted" (the constant now holds seven)
 *     "fires on a single Claude-Code-only top-level key (argument-hint)" (found.length was 0, not 1 -
 *       the widened whitelist no longer flagged the field the test fixture exists to catch)
 *     "fires once, naming BOTH offending keys sorted, when two are declared together" (found 1 key,
 *       `model`, not two - argument-hint silently stopped counting as offending)
 *     "ADV1 still runs under --profile plain-plugin" (its fixture also used argument-hint, so it too
 *       stopped firing)
 *
 * The mutant was reverted immediately after capturing this result; `git diff` on
 * scripts/advisory/adv1-portability.mjs is clean.
 * ---------------------------------------------------------------------- */
