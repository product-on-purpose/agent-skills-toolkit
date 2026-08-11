import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.resolve(HERE, "../../scripts/check-readme-version.mjs");

// Every fixture carries a `## Status` section because the guard treats a missing one as a hard
// failure. That is deliberate: a check that quietly passes when the thing it inspects is absent is
// worse than no check, which is the lesson `docs/internal/STATUS.md` learned the expensive way.
// `statusVersion` defaults to the library version so the badge tests stay focused on the badge;
// pass it explicitly to exercise Status-section drift.
function mkFixture(libVersion, badgeVersion, { statusVersion = libVersion, extraStatus = "" } = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), "askit-readme-"));
  writeFileSync(path.join(dir, "library.json"), JSON.stringify({ name: "test-lib", version: libVersion }), "utf8");
  const badgeLine = badgeVersion
    ? `<img src="https://img.shields.io/badge/version-${badgeVersion}-blue?style=flat-square" alt="Version">`
    : "<!-- no version badge -->";
  const status = `## Status\n\n- **Version** - \`${statusVersion}\`.\n${extraStatus}`;
  writeFileSync(path.join(dir, "README.md"), `# Test Lib\n\n${badgeLine}\n\n${status}\n`, "utf8");
  return dir;
}

// --- RED: exits 1 on version mismatch ---

test("check-readme-version: exits 1 when badge version disagrees with library.json version", () => {
  const dir = mkFixture("1.6.1", "1.2.0");
  try {
    const r = spawnSync(process.execPath, [SCRIPT, dir], { encoding: "utf8" });
    assert.equal(r.status, 1, "must exit 1 for version mismatch");
    const out = (r.stdout ?? "") + (r.stderr ?? "");
    assert.match(out, /1\.2\.0|1\.6\.1/, "output must mention the differing versions");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- GREEN: exits 0 on exact match ---

test("check-readme-version: exits 0 when badge version matches library.json version", () => {
  const dir = mkFixture("1.6.1", "1.6.1");
  try {
    const r = spawnSync(process.execPath, [SCRIPT, dir], { encoding: "utf8" });
    assert.equal(r.status, 0, "must exit 0 for matching versions");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- Format-shift: extra content before the badge still works ---

test("check-readme-version: locates the badge regardless of its line position", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "askit-readme-"));
  try {
    writeFileSync(path.join(dir, "library.json"), JSON.stringify({ name: "test-lib", version: "2.0.0" }), "utf8");
    const readme = [
      "# Title",
      "",
      "Some description here.",
      "",
      "Another paragraph with links and stuff.",
      "",
      '<p>',
      '  <img src="https://img.shields.io/badge/version-2.0.0-blue?style=flat-square" alt="Version 2.0.0">',
      '</p>',
      "",
      "## Status",
      "",
      "- **Version** - `2.0.0`.",
      "",
    ].join("\n");
    writeFileSync(path.join(dir, "README.md"), readme, "utf8");
    const r = spawnSync(process.execPath, [SCRIPT, dir], { encoding: "utf8" });
    assert.equal(r.status, 0, "must exit 0 regardless of badge line position");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- The `## Status` claims: the front-door prose nothing used to check ---
//
// docs/internal/RELEASE.md has always promised "README Status matches the declared tier + version
// (drift = error)" and described itself as a one-to-one mirror of an automated gate. Only the badge
// was ever checked. These cover the rest of that promise.

test("check-readme-version: exits 1 when a version in the Status section disagrees, even with a correct badge", () => {
  const dir = mkFixture("1.10.1", "1.10.1", { statusVersion: "1.10.0" });
  try {
    const r = spawnSync(process.execPath, [SCRIPT, dir], { encoding: "utf8" });
    assert.equal(r.status, 1, "a stale version in Status must fail even when the badge is right");
    const out = (r.stdout ?? "") + (r.stderr ?? "");
    assert.match(out, /## Status/, "output must say where the drift is");
    assert.match(out, /1\.10\.0/, "output must name the stale version");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("check-readme-version: exits 1 when the Status section is missing entirely", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "askit-readme-"));
  try {
    writeFileSync(path.join(dir, "library.json"), JSON.stringify({ name: "test-lib", version: "3.0.0" }), "utf8");
    writeFileSync(
      path.join(dir, "README.md"),
      '# T\n\n<img src="https://img.shields.io/badge/version-3.0.0-blue" alt="v">\n',
      "utf8"
    );
    const r = spawnSync(process.execPath, [SCRIPT, dir], { encoding: "utf8" });
    // A guard that passes when its subject is absent is worse than no guard.
    assert.equal(r.status, 1, "a missing Status section must fail rather than silently skip");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("check-readme-version: still reads Status when it is the LAST section in the file", () => {
  // Regression guard. The first implementation isolated the section with a lookahead for the next
  // `## ` heading, which matched nothing when Status came last, silently disabling every Status
  // check. Section order must not be able to turn the guard off.
  const dir = mkFixture("4.1.0", "4.1.0", { statusVersion: "9.9.9" });
  try {
    const r = spawnSync(process.execPath, [SCRIPT, dir], { encoding: "utf8" });
    assert.equal(r.status, 1, "Status drift must be caught when Status is the final section");
    const out = (r.stdout ?? "") + (r.stderr ?? "");
    assert.match(out, /9\.9\.9/, "output must name the stale version found in the last section");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("check-readme-version: exits 1 when the Status section misstates the spine size", () => {
  // The spine count is read from the live check registry, so a README claiming a stale number fails
  // without anyone having to remember to update a second list.
  const dir = mkFixture("5.0.0", "5.0.0", { extraStatus: "- **Validation spine** - 1 checks.\n" });
  try {
    const r = spawnSync(process.execPath, [SCRIPT, dir], { encoding: "utf8" });
    assert.equal(r.status, 1, "a wrong spine count must fail");
    const out = (r.stdout ?? "") + (r.stderr ?? "");
    assert.match(out, /spine/i, "output must name the spine claim");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("check-readme-version: exits 1 when the Status section misstates the skill count", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "askit-readme-"));
  try {
    writeFileSync(
      path.join(dir, "library.json"),
      JSON.stringify({ name: "t", version: "6.0.0", components: { skills: [{ name: "a" }, { name: "b" }] } }),
      "utf8"
    );
    writeFileSync(
      path.join(dir, "README.md"),
      '# T\n\n<img src="https://img.shields.io/badge/version-6.0.0-blue" alt="v">\n\n## Status\n\n- **Components** - 7 skills.\n',
      "utf8"
    );
    const r = spawnSync(process.execPath, [SCRIPT, dir], { encoding: "utf8" });
    assert.equal(r.status, 1, "a wrong skill count must fail");
    const out = (r.stdout ?? "") + (r.stderr ?? "");
    assert.match(out, /7 skills.*registers 2|2/, "output must contrast the claim with the register");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
