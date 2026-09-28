// what-it-is:   the reproduction for issue #323 ("the standards-watch false alarm")
// what-it-does: builds a copy of this checkout's scripts/ tree, with no node_modules anywhere in it or
//               above it, and proves that running scripts/standards-watch.mjs there REFUSES (exit 2)
//               instead of crashing uncaught (exit 1)
// why:          .github/workflows/standards-watch.yml ran the CLI without installing dependencies, on
//               the false premise that it "imports only node builtins and local modules". It does not:
//               ./lib/standards-watch.mjs transitively imports the "yaml" package, so a checkout with no
//               `npm ci` crashed at module LINK time with ERR_MODULE_NOT_FOUND, Node reported that
//               uncaught exception as exit 1, and the workflow's issue step cannot tell that apart from
//               "the upstream moved" - it titled a crash as a finding. A guard that cannot be shown
//               failing is not a guard, so this test reproduces the crash before proving it is fixed.
// used-by:      run by `npm test`; the fix lives in scripts/standards-watch.mjs
//
// Built at RUNTIME rather than committed as a fixture directory, on purpose: it needs no folder README
// (G8), and it cannot go stale relative to the real scripts/ tree, because every run copies THIS
// checkout's scripts/ verbatim.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, cpSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { PIN_REL } from "../../scripts/lib/standards-watch.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// mkdtempSync under os.tmpdir() deliberately, rather than anywhere under this repository: this very
// worktree lives nested inside the main checkout's own directory tree, so Node's ancestor node_modules
// lookup would walk up and find the MAIN CHECKOUT's node_modules and resolve "yaml" from there - which
// silently defeats the whole reproduction (verified: running the unmodified CLI directly in this
// worktree does NOT crash, for exactly that reason). os.tmpdir() has no such ancestor.
const tmp = mkdtempSync(path.join(tmpdir(), "askit-standards-watch-crash-"));

after(() => {
  rmSync(tmp, { recursive: true, force: true, maxRetries: 3 });
});

test("a missing 'yaml' dependency makes standards-watch.mjs REFUSE (exit 2), not crash uncaught (exit 1) - issue #323", () => {
  // The minimal tree the CLI needs to START: its own scripts/ (the whole import graph lives under it)
  // plus the pin file PIN_REL names. No node_modules is copied.
  cpSync(path.join(REPO_ROOT, "scripts"), path.join(tmp, "scripts"), { recursive: true });
  const pinDest = path.join(tmp, PIN_REL);
  mkdirSync(path.dirname(pinDest), { recursive: true });
  cpSync(path.join(REPO_ROOT, PIN_REL), pinDest);

  // Precondition, asserted rather than assumed: "yaml" really cannot be resolved from here. If it
  // resolves anyway (a stray node_modules somewhere up the OS temp directory on this machine), the rest
  // of this test would pass vacuously - it would prove nothing about issue #323 - so a broken
  // precondition must fail loudly instead of letting the test pass for the wrong reason.
  const scriptsDir = path.join(tmp, "scripts");
  const probe = spawnSync(
    process.execPath,
    ["--input-type=module", "-e", "await import('yaml')"],
    { cwd: scriptsDir, encoding: "utf8" }
  );
  assert.notEqual(
    probe.status,
    0,
    `precondition failed: "yaml" resolves from ${scriptsDir}, so this test cannot reproduce the crash ` +
      `it exists to catch. probe stdout: ${probe.stdout}\nprobe stderr: ${probe.stderr}`
  );
  assert.match(
    probe.stderr,
    /ERR_MODULE_NOT_FOUND/,
    `expected the precondition probe to fail with ERR_MODULE_NOT_FOUND, got: ${probe.stderr}`
  );

  const cli = path.join(scriptsDir, "standards-watch.mjs");
  const r = spawnSync(process.execPath, [cli, tmp], { encoding: "utf8" });

  assert.equal(
    r.status,
    2,
    `expected exit 2 (REFUSED); got ${r.status}.\nstdout: ${r.stdout}\nstderr: ${r.stderr}`
  );
  assert.match(
    r.stderr,
    /REFUSED/,
    `stderr must say REFUSED so the workflow's issue step cannot title this a "moved" finding; got: ${r.stderr}`
  );
  assert.match(
    r.stderr,
    /yaml/,
    `stderr must name the missing package so a human can act on it; got: ${r.stderr}`
  );
});
