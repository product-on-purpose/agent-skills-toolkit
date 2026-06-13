import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { check, resolveRegistrationSource, skillNameFromPath } from "../../scripts/checks/skill-registration.mjs";

// A ctx whose on-disk skills are the given directory names (the loader exposes ctx.skills as
// objects carrying a `dir`; the check keys by path.basename(dir)).
function ctxWithDisk(diskNames, libSkills) {
  return {
    root: ".",
    skills: diskNames.map((n) => ({ dir: `skills/${n}` })),
    library: { data: libSkills === undefined ? {} : { components: { skills: libSkills } } },
  };
}

// Write a throwaway plugin root with a .claude-plugin/marketplace.json, for the rung-2 marketplace path
// (resolveRegistrationSource reads that file from ctx.root). Returns the root; caller cleans up.
function tmpRootWithMarketplace(jsonText) {
  const root = mkdtempSync(path.join(tmpdir(), "askit-u13-"));
  mkdirSync(path.join(root, ".claude-plugin"), { recursive: true });
  writeFileSync(path.join(root, ".claude-plugin", "marketplace.json"), jsonText, "utf8");
  return root;
}

// --- skillNameFromPath (pure) ---

test("skillNameFromPath extracts the <name> segment under skills/", () => {
  assert.equal(skillNameFromPath("skills/foo/SKILL.md"), "foo");
  assert.equal(skillNameFromPath("./skills/bar"), "bar");
  assert.equal(skillNameFromPath("skills\\win\\SKILL.md"), "win"); // windows separators
});

test("skillNameFromPath returns null for a path not under skills/ or a non-string", () => {
  assert.equal(skillNameFromPath("docs/x.md"), null);
  assert.equal(skillNameFromPath("agents/foo.md"), null);
  assert.equal(skillNameFromPath(null), null);
  assert.equal(skillNameFromPath(undefined), null);
});

// --- resolveRegistrationSource precedence (SPEC sec 3) ---

test("resolveRegistrationSource rung 1: library.json components.skills is the registration set", () => {
  const ctx = ctxWithDisk(["a", "b"], [{ name: "a", path: "skills/a/SKILL.md" }, { name: "b", path: "skills/b/SKILL.md" }]);
  const set = resolveRegistrationSource(ctx);
  assert.deepEqual([...set].sort(), ["a", "b"]);
});

test("resolveRegistrationSource rung 1 fires for an EMPTY components.skills array (closes the evasion)", () => {
  // A library.json that opted into enumeration with components.skills:[] but ships skills on disk is an
  // enumerating manifest registering nothing - it must NOT fall through to auto-discovery (R-REG soundness).
  const ctx = ctxWithDisk(["a"], []);
  const set = resolveRegistrationSource(ctx);
  assert.ok(set instanceof Set);
  assert.equal(set.size, 0);
});

test("resolveRegistrationSource rung 3: no enumerating manifest returns null (R-REG-4)", () => {
  const root = mkdtempSync(path.join(tmpdir(), "askit-u13-"));
  try {
    const ctx = { root, skills: [{ dir: "skills/a" }], library: { data: {} } }; // no components key, no marketplace.json
    assert.equal(resolveRegistrationSource(ctx), null);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("resolveRegistrationSource rung 2: marketplace.json plugins[].source under skills/ (R-REG-4 precedence)", () => {
  const root = tmpRootWithMarketplace(JSON.stringify({
    plugins: [
      { name: "company-research", source: "./skills/company-research" },
      { name: "journey-map", source: "./skills/journey-map" },
    ],
  }));
  try {
    const ctx = { root, skills: [{ dir: "skills/company-research" }], library: { data: {} } };
    const set = resolveRegistrationSource(ctx);
    assert.deepEqual([...set].sort(), ["company-research", "journey-map"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("resolveRegistrationSource never throws on a malformed marketplace.json (R-REG-5)", () => {
  const root = tmpRootWithMarketplace("{ this is not valid json ");
  try {
    const ctx = { root, skills: [{ dir: "skills/a" }], library: { data: {} } };
    assert.equal(resolveRegistrationSource(ctx), null); // falls through, no throw
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// --- check (the comparison) ---

test("check headline (R-REG-2): a skill on disk but unregistered is one warn naming it", () => {
  const ctx = ctxWithDisk(["a", "b", "ghost-on-disk"], [{ path: "skills/a/SKILL.md" }, { path: "skills/b/SKILL.md" }]);
  const out = check(ctx);
  assert.equal(out.length, 1);
  assert.equal(out[0].severity, "warn"); // R-REG-6: warn at Standard 0.12 (the burndown)
  assert.equal(out[0].reqId, "U13");
  assert.match(out[0].message, /ghost-on-disk/);
  assert.match(out[0].message, /invisible|register/i);
});

test("check phantom (R-REG-3): a registered skill missing on disk is one warn, distinguished", () => {
  const ctx = ctxWithDisk(["a"], [{ path: "skills/a/SKILL.md" }, { path: "skills/ghost-registered/SKILL.md" }]);
  const out = check(ctx);
  assert.equal(out.length, 1);
  assert.match(out[0].message, /ghost-registered/);
  assert.match(out[0].message, /on disk|cannot be delivered|undeliverable/i);
});

test("check clean: registration set equals on-disk set returns []", () => {
  const ctx = ctxWithDisk(["a", "b"], [{ path: "skills/a/SKILL.md" }, { path: "skills/b/SKILL.md" }]);
  assert.deepEqual(check(ctx), []);
});

test("check no enumerating manifest returns [] (R-REG-4, no false positive)", () => {
  const root = mkdtempSync(path.join(tmpdir(), "askit-u13-"));
  try {
    const ctx = { root, skills: [{ dir: "skills/a" }, { dir: "skills/b" }], library: { data: {} } };
    assert.deepEqual(check(ctx), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("check is pure: two calls deep-equal, input not mutated (R-REG-5)", () => {
  const ctx = ctxWithDisk(["a", "b", "c"], [{ path: "skills/a/SKILL.md" }]);
  const before = JSON.stringify(ctx);
  const r1 = check(ctx);
  const r2 = check(ctx);
  assert.deepEqual(r1, r2);
  assert.equal(JSON.stringify(ctx), before, "ctx must not be mutated");
});
