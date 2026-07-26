import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.resolve(HERE, "../../scripts/check-readme-version.mjs");

function mkFixture(libVersion, badgeVersion) {
  const dir = mkdtempSync(path.join(tmpdir(), "askit-readme-"));
  writeFileSync(path.join(dir, "library.json"), JSON.stringify({ name: "test-lib", version: libVersion }), "utf8");
  const badgeLine = badgeVersion
    ? `<img src="https://img.shields.io/badge/version-${badgeVersion}-blue?style=flat-square" alt="Version">`
    : "<!-- no version badge -->";
  writeFileSync(path.join(dir, "README.md"), `# Test Lib\n\n${badgeLine}\n`, "utf8");
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
    ].join("\n");
    writeFileSync(path.join(dir, "README.md"), readme, "utf8");
    const r = spawnSync(process.execPath, [SCRIPT, dir], { encoding: "utf8" });
    assert.equal(r.status, 0, "must exit 0 regardless of badge line position");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
