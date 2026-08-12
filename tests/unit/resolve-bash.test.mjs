import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readlinkSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { buildProbeVars, isWslLauncherPath, probeCandidate, resolveBash, resolveSymlinkTarget } from "./_resolve-bash.mjs";

// Regression coverage for two rounds of adversarial review against _resolve-bash.mjs. See that file's
// header for the full narrative; in short:
//
// Round 1: an earlier version trusted a candidate the moment `existsSync` said it was present and its
// path string didn't look like C:\Windows\System32\bash.exe. Both proxies are wrong on real hardware -
// the Microsoft Store WSL package's bash.exe App Execution Alias is reported ABSENT by existsSync yet is
// directly spawnable and resolves to a wsl.exe path that matches no lexical pattern.
//
// Round 2 found the probe that replaced it still checked only whether the right OUTPUT appeared, not
// whether the candidate actually succeeded (a candidate that produced correct output and then hung or
// exited nonzero used to read as `pass: true`), and that it used fixed variable NAMES, not just fixed
// values, which an inherited WSLENV could forward by name across the WSL boundary and manufacture
// exactly the same false accept.
//
// Windows-only: the behavior under test (Git-for-Windows install locations, WSL launcher aliases, App
// Execution Alias reparse points, WSLENV) has no POSIX analogue. resolveBash()'s POSIX branch is a
// one-line passthrough with nothing here to probe.
const NOT_WIN32 = process.platform !== "win32" && "Windows-only: exercises WSL-launcher-vs-Git-Bash probing, which has no POSIX analogue";

const SYSTEM32_BASH = "C:\\Windows\\System32\\bash.exe";

/**
 * The real, underlying binary the Microsoft Store WSL package's bash.exe App Execution Alias resolves
 * to, discovered via readlinkSync against the live alias - the same lookup _resolve-bash.mjs's own
 * resolveSymlinkTarget performs. Program Files\WindowsApps itself is NOT directory-listable (EPERM,
 * confirmed on real hardware: it is locked down by Windows regardless of the current user's admin
 * status), so this cannot be discovered by scanning - it can only be read through the alias, which is
 * exactly why the real defect was invisible to a lexical/directory-based check in the first place. Its
 * path contains none of System32/Sysnative/SysWOW64, so it is the case the lexical pre-filter cannot
 * catch - only the probe can.
 */
function findWslPackageExe() {
  const alias = path.join(process.env.LocalAppData || "", "Microsoft", "WindowsApps", "bash.exe");
  try {
    const target = readlinkSync(alias);
    return target && existsSync(target) ? target : null;
  } catch {
    return null;
  }
}

/** A real, working bash for tests that need a genuine interpreter (the supervisor/exit-code tests do
 * not care WHICH bash - they exercise runUnderSupervisor's own bookkeeping, not WSL-vs-Git behavior). */
async function findRealBashOrSkip(t) {
  const resolution = await resolveBash();
  if (!resolution.bash) {
    t.skip("no working bash found on this machine to drive the supervisor tests - " + resolution.reasonForFailure);
    return null;
  }
  return resolution.bash;
}

function listProbeDirs() {
  try {
    return new Set(readdirSync(tmpdir()).filter((name) => name.startsWith("askit-bash-probe-")));
  } catch {
    return new Set();
  }
}

test("a genuine Git Bash passes the behavioral probe", async (t) => {
  if (NOT_WIN32) {
    t.skip(NOT_WIN32);
    return;
  }
  const resolution = await resolveBash();
  if (!resolution.bash) {
    t.skip("no Git Bash found on this machine to probe - " + resolution.reasonForFailure);
    return;
  }
  const probe = await probeCandidate(resolution.bash);
  assert.equal(probe.pass, true, `expected ${resolution.bash} to pass the probe: ${JSON.stringify(probe)}`);
  assert.equal(probe.cleanExit, true, "a real Git Bash must exit cleanly (code 0, no error, no timeout)");
  assert.equal(probe.envOk, true, "a real Git Bash must echo back an env var this process set");
  assert.equal(probe.fileOk, true, "a real Git Bash must write where this process can read it back");
});

test("the real C:\\Windows\\System32\\bash.exe, when present, fails the behavioral probe directly - not merely by lexical name", async (t) => {
  if (NOT_WIN32) {
    t.skip(NOT_WIN32);
    return;
  }
  if (!existsSync(SYSTEM32_BASH)) {
    t.skip("C:\\Windows\\System32\\bash.exe is not present on this machine (WSL not installed)");
    return;
  }
  // Calls probeCandidate() directly, bypassing isWslLauncherPath() entirely - the assertion is that the
  // BEHAVIORAL check rejects it on its own, proving the fix does not still lean on the path string.
  const probe = await probeCandidate(SYSTEM32_BASH);
  assert.equal(probe.pass, false, "the WSL launcher must fail the probe");
  assert.equal(probe.envOk, false, "WSL does not inherit this process's env vars without WSLENV");
  assert.equal(probe.fileOk, false, "WSL writes into its own filesystem root, invisible to this process");
});

test("a candidate whose path does not lexically look like a WSL launcher, but resolves to one, is rejected by the probe", async (t) => {
  if (NOT_WIN32) {
    t.skip(NOT_WIN32);
    return;
  }
  const wslPackageExe = findWslPackageExe();
  if (!wslPackageExe) {
    t.skip("could not locate the Microsoft Store WSL package's wsl.exe under Program Files\\WindowsApps on this machine");
    return;
  }

  const fakeRoot = mkdtempSync(path.join(tmpdir(), "askit-symlink-probe-"));
  const binDir = path.join(fakeRoot, "bin");
  mkdirSync(binDir, { recursive: true });
  const symlinkBash = path.join(binDir, "bash.exe");

  try {
    symlinkSync(wslPackageExe, symlinkBash, "file");
  } catch (e) {
    t.skip(`cannot create a symlink without Developer Mode or elevation on this machine: ${e.message}`);
    rmSync(fakeRoot, { recursive: true, force: true });
    return;
  }

  try {
    // The crux of "not lexical": neither the symlink's own path nor its resolved target matches
    // System32/Sysnative/SysWOW64, so the cheap pre-filter genuinely cannot reject this one.
    assert.equal(isWslLauncherPath(symlinkBash), false, "sanity: the symlink's own path must not look like a WSL launcher by name");
    const target = resolveSymlinkTarget(symlinkBash);
    assert.ok(target, "resolveSymlinkTarget must resolve the symlink to its real target for diagnostics");
    assert.equal(isWslLauncherPath(target), false, "sanity: the resolved target must not match the lexical pattern either - this is exactly the case the probe exists for");

    const probe = await probeCandidate(symlinkBash);
    assert.equal(probe.pass, false, `a symlink to the WSL package executable must fail the probe: ${JSON.stringify(probe)}`);
  } finally {
    rmSync(fakeRoot, { recursive: true, force: true });
  }
});

test("a GIT_INSTALL_ROOT whose bin\\bash.exe is a symlink to the WSL package executable is rejected by resolveBash(), proving explicit candidates are no longer trusted on existsSync alone", async (t) => {
  if (NOT_WIN32) {
    t.skip(NOT_WIN32);
    return;
  }
  const wslPackageExe = findWslPackageExe();
  if (!wslPackageExe) {
    t.skip("could not locate the Microsoft Store WSL package's wsl.exe under Program Files\\WindowsApps on this machine");
    return;
  }

  const fakeRoot = mkdtempSync(path.join(tmpdir(), "askit-fake-git-install-root-"));
  const binDir = path.join(fakeRoot, "bin");
  mkdirSync(binDir, { recursive: true });
  const fakeBash = path.join(binDir, "bash.exe");

  try {
    symlinkSync(wslPackageExe, fakeBash, "file");
  } catch (e) {
    t.skip(`cannot create a symlink without Developer Mode or elevation on this machine: ${e.message}`);
    rmSync(fakeRoot, { recursive: true, force: true });
    return;
  }

  const previousGitInstallRoot = process.env.GIT_INSTALL_ROOT;
  try {
    // The crux of the regression: existsSync alone would have accepted this candidate outright under
    // the old design (a symlink target existing is exactly what existsSync follows and reports true
    // for) - so this assertion pins down that the old accept condition really is satisfied here.
    assert.equal(existsSync(fakeBash), true, "sanity: existsSync must report this symlinked candidate as present (this is the exact condition the old code trusted)");

    process.env.GIT_INSTALL_ROOT = fakeRoot;
    const resolution = await resolveBash();

    assert.notEqual(resolution.bash, fakeBash, "resolveBash() must not accept the symlinked GIT_INSTALL_ROOT candidate merely because it exists");
    const rejection = resolution.rejected.find((r) => path.resolve(r.path).toLowerCase() === path.resolve(fakeBash).toLowerCase());
    assert.ok(rejection, `the fake candidate must appear in resolveBash()'s rejected list: ${JSON.stringify(resolution.rejected)}`);
    assert.match(rejection.reason, /probe/i, "the rejection must be attributed to the behavioral probe, not silently dropped");
  } finally {
    if (previousGitInstallRoot === undefined) delete process.env.GIT_INSTALL_ROOT;
    else process.env.GIT_INSTALL_ROOT = previousGitInstallRoot;
    rmSync(fakeRoot, { recursive: true, force: true });
  }
});

// --- round 2, finding 1: output round-tripping is not proof of success ---

test("write-then-exit-nonzero: a candidate that produces correct output but then exits nonzero is rejected, not accepted on output alone", async (t) => {
  if (NOT_WIN32) {
    t.skip(NOT_WIN32);
    return;
  }
  const bash = await findRealBashOrSkip(t);
  if (!bash) return;

  // _testTailCommand drives the exact same probeCandidate() code path (script build, env, supervisor,
  // finally-guaranteed directory cleanup) a real candidate would go through - only the tail after the
  // genuine round-trip write differs, reproducing precisely the shape the finding named: "echoes the
  // variable and writes the token and then [misbehaves]".
  const probe = await probeCandidate(bash, { _testTailCommand: "exit 7" });

  assert.equal(probe.envOk, true, "sanity: the echo really did happen before the bad exit");
  assert.equal(probe.fileOk, true, "sanity: the file write really did happen before the bad exit");
  assert.equal(probe.cleanExit, false, "a nonzero exit must not read as a clean exit");
  assert.equal(probe.pass, false, "a nonzero exit must reject the candidate even though both round-trip checks succeeded");
  assert.match(probe.spawnError, /exited with code 7/, "the rejection reason must name the real exit code, not stay silent about why");
});

test("write-then-hang: a candidate that produces correct output but then hangs is rejected within a bounded time, and its process tree is actually killed", async (t) => {
  if (NOT_WIN32) {
    t.skip(NOT_WIN32);
    return;
  }
  const bash = await findRealBashOrSkip(t);
  if (!bash) return;

  const before = listProbeDirs();
  const started = Date.now();
  // A short timeout keeps this test fast while still exercising the real kill-the-tree code path -
  // the production default (5s) is a size choice, not a different code path.
  const probe = await probeCandidate(bash, { timeoutMs: 700, _testTailCommand: "while true; do sleep 1; done" });
  const elapsedMs = Date.now() - started;

  assert.equal(probe.envOk, true, "sanity: the echo really did happen before the hang");
  assert.equal(probe.fileOk, true, "sanity: the file write really did happen before the hang");
  assert.equal(probe.cleanExit, false, "a timeout must not read as a clean exit");
  assert.equal(probe.pass, false, "a hanging candidate must be rejected even though both round-trip checks succeeded");
  assert.match(probe.spawnError, /timed out/i, "the rejection reason must say it timed out, not something opaque");
  // Bounds this process's own wait, not just the candidate's: proves the supervisor enforces the timeout
  // itself rather than trusting execFileSync's timeout semantics (which can block past the nominal bound
  // waiting for the child's full process closure - see _resolve-bash.mjs's header). Generous margin
  // above timeoutMs + the module's KILL_GRACE_MS (2s) to stay robust on a loaded CI box.
  assert.ok(elapsedMs < 700 + 2000 + 3000, `probeCandidate() must return within a bounded time even for a hanging candidate; took ${elapsedMs}ms`);

  // The killed-candidate path must still clean up: probeCandidate's own probe directory (mkdtempSync'd
  // internally) must not survive a forced kill - proven here by diffing the temp directory's own
  // askit-bash-probe-* entries before and after, since the directory itself is never exposed to callers.
  const after = listProbeDirs();
  const leaked = [...after].filter((name) => !before.has(name));
  assert.deepEqual(leaked, [], `the probe directory must be removed even when the candidate had to be force-killed; leaked: ${JSON.stringify(leaked)}`);
});

// --- round 2, finding 2: fixed variable NAMES let an inherited WSLENV recreate the false accept ---

test("WSLENV forwarding the probe's own variable names does not let a WSL candidate pass (WSLENV is stripped from the candidate's environment)", async (t) => {
  if (NOT_WIN32) {
    t.skip(NOT_WIN32);
    return;
  }
  if (!existsSync(SYSTEM32_BASH)) {
    t.skip("C:\\Windows\\System32\\bash.exe is not present on this machine (WSL not installed)");
    return;
  }

  // _testVars lets this test know, in advance, exactly the variable names probeCandidate() will set -
  // in production those names are freshly randomized per call and never predictable in advance, which is
  // itself half of the fix; this override exists solely so a WSLENV string naming the RIGHT variables
  // can be constructed, to prove the OTHER half of the fix (WSLENV-stripping) holds even in the worst
  // case where the names are, hypothetically, known.
  const vars = buildProbeVars();
  const previousWslenv = process.env.WSLENV;
  process.env.WSLENV = `${vars.envValueVar}:${vars.fileTokenVar}:${vars.filePathVar}`;
  try {
    const probe = await probeCandidate(SYSTEM32_BASH, { _testVars: vars });
    assert.equal(probe.pass, false, "WSLENV forwarding the exact probe variable names must not cause a WSL candidate to pass");
    assert.equal(probe.envOk, false, "the WSL launcher must still not have received the env var - WSLENV was stripped before the candidate ever saw it");
    assert.equal(probe.fileOk, false, "the WSL launcher must still not have written where this process can see it");
  } finally {
    if (previousWslenv === undefined) delete process.env.WSLENV;
    else process.env.WSLENV = previousWslenv;
  }
});
