import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { existsSync, mkdirSync, mkdtempSync, readlinkSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { isWslLauncherPath, probeCandidate, resolveBash, resolveSymlinkTarget } from "./_resolve-bash.mjs";

// Regression coverage for the pre-release review finding: an earlier version of _resolve-bash.mjs
// trusted a candidate the moment `existsSync` said it was present and its path string didn't look like
// C:\Windows\System32\bash.exe. Both proxies are wrong on real hardware - see _resolve-bash.mjs's header
// for the full finding (the Microsoft Store WSL package's bash.exe App Execution Alias is reported
// ABSENT by existsSync yet is directly spawnable and resolves to a wsl.exe path that matches no lexical
// pattern). These tests exercise the fix - a behavioral probe (env-inheritance + shared-filesystem round
// trip) that every candidate must pass - directly, not just indirectly through action-run-step.test.mjs.
//
// Windows-only: the behavior under test (Git-for-Windows install locations, WSL launcher aliases,
// App Execution Alias reparse points) has no POSIX analogue. resolveBash()'s POSIX branch is a one-line
// passthrough with nothing here to probe.
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

test("a genuine Git Bash passes the behavioral probe", (t) => {
  if (NOT_WIN32) {
    t.skip(NOT_WIN32);
    return;
  }
  const resolution = resolveBash();
  if (!resolution.bash) {
    t.skip("no Git Bash found on this machine to probe - " + resolution.reasonForFailure);
    return;
  }
  const probe = probeCandidate(resolution.bash);
  assert.equal(probe.pass, true, `expected ${resolution.bash} to pass the probe: ${JSON.stringify(probe)}`);
  assert.equal(probe.envOk, true, "a real Git Bash must echo back an env var this process set");
  assert.equal(probe.fileOk, true, "a real Git Bash must write where this process can read it back");
});

test("the real C:\\Windows\\System32\\bash.exe, when present, fails the behavioral probe directly - not merely by lexical name", (t) => {
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
  const probe = probeCandidate(SYSTEM32_BASH);
  assert.equal(probe.pass, false, "the WSL launcher must fail the probe");
  assert.equal(probe.envOk, false, "WSL does not inherit this process's env vars without WSLENV");
  assert.equal(probe.fileOk, false, "WSL writes into its own filesystem root, invisible to this process");
});

test("a candidate whose path does not lexically look like a WSL launcher, but resolves to one, is rejected by the probe", (t) => {
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

    const probe = probeCandidate(symlinkBash);
    assert.equal(probe.pass, false, `a symlink to the WSL package executable must fail the probe: ${JSON.stringify(probe)}`);
  } finally {
    rmSync(fakeRoot, { recursive: true, force: true });
  }
});

test("a GIT_INSTALL_ROOT whose bin\\bash.exe is a symlink to the WSL package executable is rejected by resolveBash(), proving explicit candidates are no longer trusted on existsSync alone", (t) => {
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
    const resolution = resolveBash();

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
