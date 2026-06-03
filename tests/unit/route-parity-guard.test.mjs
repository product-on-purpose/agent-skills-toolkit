import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";

// Proves the clause 14.11(b) route-parity guard (site/scripts/check-route-parity.mjs): it passes
// when the build matches the committed manifest, FAILS when a previously published route is removed
// (a "Site not found" for existing bookmarks), allows new routes, hard-fails an empty/absent dist
// or a missing baseline, and regenerates the baseline with --update. Site-scoped repo-local test.

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const GUARD = path.join(REPO_ROOT, "site/scripts/check-route-parity.mjs");

function makeDist(relPaths) {
  const dir = mkdtempSync(path.join(os.tmpdir(), "askit-parity-"));
  for (const rel of relPaths) {
    const full = path.join(dir, rel);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, "<h1>page</h1>", "utf8");
  }
  return dir;
}

function makeBaseline(lines) {
  const dir = mkdtempSync(path.join(os.tmpdir(), "askit-parity-base-"));
  const file = path.join(dir, "route-manifest.txt");
  writeFileSync(file, lines.join("\n") + "\n", "utf8");
  return file;
}

function runGuard(distDir, baselineFile, extraArgs = []) {
  return spawnSync(process.execPath, [GUARD, distDir, baselineFile, ...extraArgs], { encoding: "utf8" });
}

test("PASS when the built routes match the committed manifest", () => {
  const dist = makeDist(["index.html", "overview/index.html"]);
  const baseline = makeBaseline(["/index.html", "/overview/index.html"]);
  try {
    const r = runGuard(dist, baseline);
    assert.equal(r.status, 0, `expected exit 0, got ${r.status}\n${r.stdout}`);
  } finally {
    rmSync(dist, { recursive: true, force: true });
    rmSync(path.dirname(baseline), { recursive: true, force: true });
  }
});

test("FAIL when a baseline route is removed from the build", () => {
  const dist = makeDist(["index.html"]);
  const baseline = makeBaseline(["/index.html", "/overview/index.html"]);
  try {
    const r = runGuard(dist, baseline);
    assert.equal(r.status, 1, `expected exit 1, got ${r.status}\n${r.stdout}`);
    assert.match(r.stdout, /\/overview\/index\.html/);
  } finally {
    rmSync(dist, { recursive: true, force: true });
    rmSync(path.dirname(baseline), { recursive: true, force: true });
  }
});

test("PASS (added route allowed) when the build has a route the manifest lacks", () => {
  const dist = makeDist(["index.html", "overview/index.html", "tiers/index.html"]);
  const baseline = makeBaseline(["/index.html", "/overview/index.html"]);
  try {
    const r = runGuard(dist, baseline);
    assert.equal(r.status, 0, `expected exit 0, got ${r.status}\n${r.stdout}`);
    assert.match(r.stdout, /1 new route/);
  } finally {
    rmSync(dist, { recursive: true, force: true });
    rmSync(path.dirname(baseline), { recursive: true, force: true });
  }
});

test("hard-FAIL on an empty-but-existing dist", () => {
  const dist = mkdtempSync(path.join(os.tmpdir(), "askit-parity-empty-"));
  const baseline = makeBaseline(["/index.html"]);
  try {
    const r = runGuard(dist, baseline);
    assert.equal(r.status, 1, `expected exit 1 on empty dist, got ${r.status}`);
  } finally {
    rmSync(dist, { recursive: true, force: true });
    rmSync(path.dirname(baseline), { recursive: true, force: true });
  }
});

test("FAIL on a missing baseline (never a silent pass)", () => {
  const dist = makeDist(["index.html"]);
  const missing = path.join(os.tmpdir(), "askit-parity-no-baseline-xyz.txt");
  try {
    const r = runGuard(dist, missing);
    assert.equal(r.status, 1, `expected exit 1 on missing baseline, got ${r.status}`);
  } finally {
    rmSync(dist, { recursive: true, force: true });
  }
});

test("--update regenerates the baseline from the current build", () => {
  const dist = makeDist(["index.html", "overview/index.html"]);
  const baseline = makeBaseline([]);
  try {
    const r = runGuard(dist, baseline, ["--update"]);
    assert.equal(r.status, 0, `expected exit 0, got ${r.status}\n${r.stderr}`);
    const written = readFileSync(baseline, "utf8").trim().split(/\r?\n/).sort();
    assert.deepEqual(written, ["/index.html", "/overview/index.html"]);
  } finally {
    rmSync(dist, { recursive: true, force: true });
    rmSync(path.dirname(baseline), { recursive: true, force: true });
  }
});
