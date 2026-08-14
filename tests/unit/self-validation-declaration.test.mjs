// what-it-is:   the E35 acceptance fixtures for library.json `selfValidation` (W4)
// what-it-does: builds one plugin per rejected design and asserts the generator emits the npx form for
//               every plugin that has not DECLARED otherwise, that a malformed declaration cannot
//               influence generation, and that G4 agrees with the generator in all seven cases
// why:          three drafts inferred identity from a side effect - a path, a CI mention, a name - and
//               each felt like identity and none of them was. These fixtures exist to kill them: a
//               future "simplification" back to any of the three fails here rather than shipping a false
//               instruction into a consumer's own repository over their signature
// used-by:      npm test
import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { renderIndex, renderLegacyIndex } from "../../scripts/generators/gen-index.mjs";
import { resolveFindings } from "../../scripts/lib/resolve-config.mjs";
import { configFrom } from "../../scripts/lib/config.mjs";
import { provenanceByReq } from "../../scripts/lib/registry.mjs";
import { check as indexDrift } from "../../scripts/checks/index-drift.mjs";
import { check as libraryJson } from "../../scripts/checks/library-json.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const NPX_LINE = "Self-validating: `npx agent-skills-toolkit .`.";
const VENDORED_LINE = "Self-validating: `node scripts/check.mjs`.";
const PROV = provenanceByReq();

/** Build a plugin, run fn(dir), always clean up. */
function withPlugin(build, fn) {
  const dir = mkdtempSync(path.join(tmpdir(), "askit-selfval-"));
  try {
    build(dir);
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
const writeLib = (dir, extra = {}) =>
  writeFileSync(path.join(dir, "library.json"), JSON.stringify({ name: "consumer", version: "0.1.0", tier: "universal", ...extra }, null, 2));

/**
 * The acceptance table. Every row is a plugin shape and the line it must produce, and every row exists
 * because some design would have produced the OTHER line for it.
 */
const CASES = [
  {
    what: "no scripts/check.mjs at all - the ordinary consumer",
    build: (dir) => writeLib(dir),
    expect: NPX_LINE,
  },
  {
    what: "an UNRELATED scripts/check.mjs (kills draft 1: existsSync on a generic path)",
    build: (dir) => {
      writeLib(dir);
      mkdirSync(path.join(dir, "scripts"), { recursive: true });
      // Somebody else's program, at a path that is not distinctive to this toolkit in any way.
      writeFileSync(path.join(dir, "scripts", "check.mjs"), "// a linter this plugin happens to ship\n");
    },
    expect: NPX_LINE,
    kills: "draft 1 would tell this plugin's readers to self-validate by running someone else's program",
  },
  {
    what: "an unrelated scripts/check.mjs PLUS a workflow referencing it, so G2 passes (kills draft 2)",
    build: (dir) => {
      writeLib(dir);
      mkdirSync(path.join(dir, "scripts"), { recursive: true });
      writeFileSync(path.join(dir, "scripts", "check.mjs"), "// unrelated\n");
      mkdirSync(path.join(dir, ".github", "workflows"), { recursive: true });
      writeFileSync(path.join(dir, ".github", "workflows", "ci.yml"), "jobs:\n  v:\n    steps:\n      - run: node scripts/check.mjs .\n");
    },
    expect: NPX_LINE,
    kills: "G2 regex-matches workflow YAML; a CI that merely MENTIONS the gate satisfied draft 2",
  },
  {
    what: "a plugin NAMED agent-skills-toolkit with no vendored gate (kills draft 3: a name is authored data)",
    build: (dir) => writeLib(dir, { name: "agent-skills-toolkit" }),
    expect: NPX_LINE,
    kills: "a fork, a rename, or an unrelated plugin using the name got the same false instruction",
  },
  {
    what: 'selfValidation: "banana" - a malformed declaration cannot influence generation',
    build: (dir) => writeLib(dir, { selfValidation: "banana" }),
    expect: NPX_LINE,
    u1Finding: true,
  },
  {
    what: "selfValidation: 7 - wrong TYPE, same treatment",
    build: (dir) => writeLib(dir, { selfValidation: 7 }),
    expect: NPX_LINE,
    u1Finding: true,
  },
  {
    what: 'selfValidation: "vendored" - the DECLARED case, the only way to get the vendored form',
    build: (dir) => writeLib(dir, { selfValidation: "vendored" }),
    expect: VENDORED_LINE,
  },
];

test("the generator emits the declared form, and only a DECLARATION can select the vendored one", () => {
  for (const c of CASES) {
    withPlugin(c.build, (dir) => {
      const md = renderIndex(loadPlugin(dir));
      assert.ok(md.includes(c.expect), `${c.what}: expected ${c.expect}${c.kills ? ` (${c.kills})` : ""}`);
      const other = c.expect === NPX_LINE ? VENDORED_LINE : NPX_LINE;
      assert.ok(!md.includes(other), `${c.what}: must not also emit ${other}`);
    });
  }
});

test("G4 agrees with the generator in all seven cases: what it writes is what the checker accepts", () => {
  // Both read the same one field, so generator and checker cannot disagree. If they ever could, a plugin
  // would be told to regenerate a file the generator had just produced.
  for (const c of CASES) {
    withPlugin(c.build, (dir) => {
      const ctx = loadPlugin(dir);
      writeFileSync(path.join(dir, "INDEX.md"), renderIndex(ctx));
      const out = indexDrift(loadPlugin(dir));
      assert.deepEqual(out, [], `${c.what}: G4 must accept the file the generator just wrote`);
    });
  }
});

test("a malformed selfValidation is a U1 finding, and it carries its own migration ceiling", () => {
  for (const c of CASES.filter((x) => x.u1Finding)) {
    withPlugin(c.build, (dir) => {
      const out = libraryJson(loadPlugin(dir)).filter((f) => /selfValidation/.test(f.message));
      assert.equal(out.length, 1, `${c.what}: expected exactly one U1 finding`);
      assert.equal(out[0].reqId, "U1");
      // ADR 0044: a NEW SUBRULE under an existing reqId inherits that reqId's `since` and would
      // otherwise get no migration window at all - a red-ward movement INSIDE the invariant's scope,
      // because an unknown library.json field was simply ignored before this release.
      assert.equal(out[0].migration.capAt, "warn");
      assert.equal(out[0].migration.until, "0.13");
    });
  }
});

test("an ABSENT selfValidation is not a finding: the default is the safe one", () => {
  withPlugin((dir) => writeLib(dir), (dir) => {
    const out = libraryJson(loadPlugin(dir)).filter((f) => /selfValidation/.test(f.message));
    assert.deepEqual(out, [], "absent means npx, which is correct for every plugin that does not vendor the gate");
  });
});

test("this repository generates the VENDORED form and its committed INDEX.md stays byte-identical", () => {
  // The seventh acceptance case, and the one that proves the fix did not quietly change our own output:
  // this repository declares selfValidation "vendored" because it genuinely does vendor the gate.
  const ctx = loadPlugin(REPO_ROOT);
  const rendered = renderIndex(ctx);
  assert.ok(rendered.includes(VENDORED_LINE), "this toolkit vendors its own gate and declares it");
  const norm = (s) => s.replace(/\r\n/g, "\n").replace(/\s+$/, "");
  assert.equal(norm(readFileSync(path.join(REPO_ROOT, "INDEX.md"), "utf8")), norm(rendered), "committed INDEX.md is unchanged");
});

test("selfValidation is deliberately ABSENT from the generated native manifests", () => {
  // It is an askit-house field with no meaning to Claude Code or Codex. U8 compares only name and
  // version, and adding it would put a field into someone else's ecosystem manifest for the benefit of
  // our own generator.
  const claude = JSON.parse(readFileSync(path.join(REPO_ROOT, ".claude-plugin", "plugin.json"), "utf8"));
  assert.ok(!("selfValidation" in claude), "the Claude manifest carries no askit-house field");
});

// --- the G4 migration cap: OUR drift is capped, everyone else's is not ------------------------------

test("G4 caps the EXACT legacy rendering at warn until 0.14, and lifts at 0.14", () => {
  // The migration this release schedules. A plugin whose INDEX.md matches the pre-v1.13.0 rendering
  // exactly is carrying drift THIS TOOLKIT generated, and gating it on our defect would move a live
  // verdict - which is precisely why the v1.12.0 attempt was reverted.
  withPlugin((dir) => writeLib(dir), (dir) => {
    const ctx = loadPlugin(dir);
    writeFileSync(path.join(dir, "INDEX.md"), renderLegacyIndex(ctx));
    const [f] = indexDrift(loadPlugin(dir));
    assert.ok(f, "the legacy rendering is still drift");
    assert.equal(f.reqId, "G4");
    assert.equal(f.severity, "error", "it emits its target severity; the ceiling decides the rest");
    assert.equal(f.migration.capAt, "warn");
    assert.equal(f.migration.until, "0.14");
    assert.match(f.message, /selfValidation/, "and says how to keep the vendored form if that is genuinely true");

    const resolve = (pinned) => resolveFindings([f], configFrom({}), PROV, { pinned, sinceByReq: {} })[0];
    assert.equal(resolve("0.13").effectiveSeverity, "warn", "held at 0.13, so nobody is gated on our defect");
    assert.equal(resolve("0.14").effectiveSeverity, "error", "and the cap LIFTS at 0.14 - an inert cap would pass every other row");
  });
});

test("G4 does NOT cap drift of any other kind: the migration cannot swallow a real defect", () => {
  withPlugin((dir) => writeLib(dir), (dir) => {
    const ctx = loadPlugin(dir);
    // A hand-edited section, which is exactly what G4 exists to catch.
    writeFileSync(path.join(dir, "INDEX.md"), renderIndex(ctx) + "\n\n## Hand-written section\n");
    const [f] = indexDrift(loadPlugin(dir));
    assert.ok(f);
    assert.equal(f.migration, null, "no cap: this drift is the author's, not ours");
    const held = resolveFindings([f], configFrom({}), PROV, { pinned: "0.13", sinceByReq: {} })[0];
    assert.equal(held.effectiveSeverity, "error", "and it gates at any pin");
  });
});

test("a plugin that legitimately vendors the gate is NOT caught by the legacy cap", () => {
  // Its current rendering and the legacy rendering are identical, so a correctly-declared vendored
  // plugin whose INDEX is up to date has no drift at all - the cap never enters the picture.
  withPlugin((dir) => writeLib(dir, { selfValidation: "vendored" }), (dir) => {
    const ctx = loadPlugin(dir);
    writeFileSync(path.join(dir, "INDEX.md"), renderIndex(ctx));
    assert.deepEqual(indexDrift(loadPlugin(dir)), []);
  });
});
