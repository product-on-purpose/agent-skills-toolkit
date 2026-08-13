import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readlinkSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync, spawn } from "node:child_process";
import {
  buildProbeVars,
  isWslLauncherPath,
  KILL_GRACE_MS,
  probeCandidate,
  resolveBash,
  resolveSymlinkTarget,
  STUCK_HELPER_LIFETIME_MS,
} from "./_resolve-bash.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));

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
 * Scheduling slack this file adds on top of a bound the module under test declares for itself. It is
 * the only arbitrary number in these timing assertions, and it is deliberately large (E37).
 *
 * Every wall-clock assertion here is dominated by PROCESS SPAWN, not by computation, so the pressure
 * that inflates it is process-tree and memory contention rather than CPU saturation - measured: a
 * correct supervisor stayed inside its bound under 48 busy processes on 32 cores, yet the same
 * assertions failed on a workstation carrying 32 leaked toolchain processes with 189 node children.
 * A margin sized for an idle machine measures the machine, not the code.
 */
const SCHEDULING_SLACK_MS = 10000;

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
  const probeTimeoutMs = 700;
  const probe = await probeCandidate(bash, { timeoutMs: probeTimeoutMs, _testTailCommand: "while true; do sleep 1; done" });
  const elapsedMs = Date.now() - started;

  assert.equal(probe.envOk, true, "sanity: the echo really did happen before the hang");
  assert.equal(probe.fileOk, true, "sanity: the file write really did happen before the hang");
  assert.equal(probe.cleanExit, false, "a timeout must not read as a clean exit");
  assert.equal(probe.pass, false, "a hanging candidate must be rejected even though both round-trip checks succeeded");
  assert.match(probe.spawnError, /timed out/i, "the rejection reason must say it timed out, not something opaque");
  // Bounds this process's own wait, not just the candidate's: proves the supervisor enforces the timeout
  // itself rather than trusting execFileSync's timeout semantics (which can block past the nominal bound
  // waiting for the child's full process closure - see _resolve-bash.mjs's header).
  //
  // The bound is DERIVED from the supervisor's own declared contract - runUnderSupervisor settles within
  // `timeoutMs + KILL_GRACE_MS` - instead of restating it as a literal, so it keeps describing that
  // function if the constant ever moves. What this test owns is only the slack on top, and that slack is
  // deliberately generous (E37). The candidate here is `while true; do sleep 1; done`, which never exits
  // on its own, so a supervisor that failed to enforce its own timeout would not overshoot this bound by
  // a few hundred milliseconds: it would never return at all, and this test would hang rather than fail
  // an inequality. ANY finite bound therefore proves exactly what a tight one proves, while a tight one
  // additionally fails on a loaded workstation - which is precisely what the previous hard-coded bound
  // did. That bound also restated the grace constant as a literal, so this file could silently stop
  // describing the supervisor; both defects are gone by deriving the bound instead of copying it.
  const boundMs = probeTimeoutMs + KILL_GRACE_MS + SCHEDULING_SLACK_MS;
  assert.ok(
    elapsedMs < boundMs,
    `probeCandidate() must return within a bounded time even for a hanging candidate; took ${elapsedMs}ms against a bound of ${boundMs}ms`
  );

  // The killed-candidate path must still clean up: probeCandidate's own probe directory (mkdtempSync'd
  // internally) must not survive a forced kill - proven here by diffing the temp directory's own
  // askit-bash-probe-* entries before and after, since the directory itself is never exposed to callers.
  const after = listProbeDirs();
  const leaked = [...after].filter((name) => !before.has(name));
  assert.deepEqual(leaked, [], `the probe directory must be removed even when the candidate had to be force-killed; leaked: ${JSON.stringify(leaked)}`);

  // This case lets the REAL taskkill run, so unlike the two below it is not orphaning anything by
  // construction - and on an idle machine it measurably does not, 0 leaked across 5 runs. Under load it
  // does: one candidate survived during the acceptance runs, which is E32's core finding showing up
  // exactly where E32 says it will. Cleaning up here therefore tidies after a known, deferred defect in
  // the supervisor rather than after this file's own scaffolding, which is precisely why assertCleanedUp
  // reports a surviving candidate instead of failing on it. Keyed on this process's own pid because
  // probeCandidate ran in-process; node:test runs the cases in a file sequentially, so no other probe
  // from this file is in flight here.
  assertCleanedUp(t, reapProcessesLeftBy(process.pid));
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

// --- round 3 / round 4: a rejection must not hang the process it runs in ---
//
// The finding, both times, was specifically about PROCESS EXIT, not about probeCandidate()'s return
// value - a hung handle can only be observed by watching whether a process that created it can still
// exit on its own. That can't be tested by calling probeCandidate() directly from within this test's
// own process (this process is going to keep running other tests regardless of what one probe leaks).
// So this spawns a disposable, single-purpose Node process whose ENTIRE job is to await one
// probeCandidate() call and then fall off the end of its script - deliberately never calling
// process.exit() itself, since that would force the process down regardless of any leaked handle and
// defeat the entire point of the test. Node's own natural "drain the event loop, then exit" behavior is
// exactly what a leaked, still-referenced handle would block - the same reproduction shape the reviewer
// used both rounds (an outer bound around an inner process, checking whether it exits on its own rather
// than trusting a resolved promise).
async function runDisposableProbeScript(bash, optionsSource, outerGuardMs = 10000) {
  const resolveBashModuleUrl = pathToFileURL(path.join(HERE, "_resolve-bash.mjs")).href;
  const dir = mkdtempSync(path.join(tmpdir(), "askit-supervisor-exit-"));
  const scriptPath = path.join(dir, "probe-child.mjs");

  const innerScript =
    `import { probeCandidate } from ${JSON.stringify(resolveBashModuleUrl)};\n` +
    `const probe = await probeCandidate(${JSON.stringify(bash)}, ${optionsSource});\n` +
    `console.log("SUPERVISOR_TEST_RESULT=" + JSON.stringify(probe));\n` +
    `console.log("SUPERVISOR_TEST_DONE");\n`;
  // No process.exit() anywhere in the inner script, on purpose - see the comment block above.
  writeFileSync(scriptPath, innerScript, "utf8");

  try {
    const started = Date.now();
    return await new Promise((resolve) => {
      const child = spawn(process.execPath, [scriptPath], { windowsHide: true });
      // Reported back so the caller can reap what this process leaves behind. buildProbeVars() seeds its
      // nonce with `process.pid`, so every probe THIS inner process spawns carries `ASKIT_PROBE_<pid>_`
      // in its own command line - which is what makes the cleanup below addressable to one run rather
      // than to "anything that looks like a probe", the distinction that matters because `node --test`
      // runs test files in parallel and action-run-step.test.mjs drives this same module.
      const childPid = child.pid;
      let stdout = "";
      let settled = false;
      // A generous OUTER bound, independent of the inner script's own short probe timeout: this is not
      // a tight timing assertion, it exists only so this test itself cannot hang forever if the fix
      // regresses. If this fires, the inner process is force-killed from here and the test fails loudly
      // rather than hanging the suite the way the original defect would have hung `npm publish`.
      const outerGuard = setTimeout(() => {
        if (settled) return;
        settled = true;
        try {
          child.kill();
        } catch {
          // best-effort
        }
        resolve({ hungPastOuterGuard: true, stdout, elapsedMs: Date.now() - started, code: null, childPid });
      }, outerGuardMs);
      child.stdout.on("data", (d) => {
        stdout += d;
      });
      child.on("close", (code) => {
        if (settled) return;
        settled = true;
        clearTimeout(outerGuard);
        resolve({ hungPastOuterGuard: false, stdout, elapsedMs: Date.now() - started, code, childPid });
      });
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Kills everything the inner process `ownerPid` left running, and reports both what was there and what
 * survived. Two kinds, and both are deliberate leavings rather than defects in the code under test:
 *
 *   - the PROBE CANDIDATE, `while true; do sleep 1; done`, which never exits on its own. A test that
 *     substitutes the stuck-helper stand-in, or forces the tree-kill to fail, has by construction
 *     prevented the REAL tree-kill from ever running, so its candidate is expected to be orphaned.
 *     Measured before this existed: exactly one per invocation, from two of the nine cases in this file.
 *   - the STUCK-HELPER stand-in, which does self-terminate, but not for STUCK_HELPER_LIFETIME_MS. That
 *     is longer than a run of this case takes, so under the repeated-runs acceptance protocol the
 *     helpers would overlap and pile up even though each one individually goes away.
 *
 * Cleaning both up is the harness's own obligation, not evidence about the supervisor: the caller
 * asserts only that nothing survived THIS function, which keeps a suite run from accreting the orphans
 * E32 tracks without pretending the supervisor killed something it was deliberately never allowed to
 * kill.
 *
 * Both are addressed by a marker carrying `ownerPid`, never by process name - the candidate through the
 * nonce buildProbeVars seeds from `process.pid`, the helper through a comment planted in its own `-e`
 * source. That is what makes this safe to run inside a suite: `node --test` runs test files in parallel
 * and action-run-step.test.mjs drives this same module, so a sweep for bash processes, for
 * `ASKIT_PROBE_*`, or for "some node process holding a timer" could all kill something another file is
 * still waiting on.
 *
 * Find, kill and re-check happen in ONE PowerShell round trip on purpose: a Windows process query costs
 * on the order of a second, and this runs in two tests, so splitting it into separate list and verify
 * calls measurably lengthened the file for no extra information.
 */
function reapProcessesLeftBy(ownerPid) {
  const script = [
    // Both markers are run-scoped by the owning process's pid, and both require a delimiter after it, so
    // pid 123 can never match pid 1234.
    `$candidate = '*ASKIT_PROBE_${ownerPid}_*'`,
    `$helper = '*askit-stuck-helper ${ownerPid} *'`,
    // ONE Win32_Process query per phase, not one per process kind. Measured on this workstation: the
    // PowerShell process itself costs about 0.7s to start but each Win32_Process query costs about 1s, so
    // the query count is what this function pays for, and a find-then-verify cycle over two kinds is four
    // queries done naively and two done like this.
    `function Get-Leftovers {`,
    `  Get-CimInstance Win32_Process -Filter "Name='bash.exe' OR Name='node.exe'" |`,
    `    Where-Object { ($_.Name -eq 'bash.exe' -and $_.CommandLine -like $candidate) -or ($_.Name -eq 'node.exe' -and $_.CommandLine -like $helper) }`,
    `}`,
    `$found = @(Get-Leftovers)`,
    `$foundCandidates = @($found | Where-Object { $_.Name -eq 'bash.exe' })`,
    `$foundHelpers = @($found | Where-Object { $_.Name -eq 'node.exe' })`,
    // taskkill /T, not Stop-Process: the candidate is a shell loop that keeps forking, so its tree has to
    // go, not just the one PID that happened to be listed.
    //
    // Retried, with a lengthening settle window, because a single attempt is not reliable under load:
    // during the acceptance runs one orphan survived its first forced kill on a contended machine and
    // then died on the first attempt once the machine was idle. That is E32's own finding - a kill Node
    // and Windows both report as successful, against a process that is still there - so the cleanup has
    // to be written for a kill that sometimes does not land the first time.
    `$survived = $found`,
    `foreach ($attempt in 1..3) {`,
    `  if ($survived.Count -eq 0) { break }`,
    `  foreach ($p in $survived) { & taskkill /PID $p.ProcessId /T /F *> $null }`,
    `  Start-Sleep -Milliseconds (300 * $attempt)`,
    `  $survived = @(Get-Leftovers)`,
    `}`,
    // Reported by kind, because which kind survived means different things: a surviving HELPER would be
    // this file's own scaffolding accumulating, which is a defect in the test. A surviving CANDIDATE is
    // E32 in the supervisor, which this release deliberately does not fix.
    `"CANDIDATES:" + (($foundCandidates | ForEach-Object { $_.ProcessId }) -join ',')`,
    `"HELPERS:" + (($foundHelpers | ForEach-Object { $_.ProcessId }) -join ',')`,
    `"SURVIVED_CANDIDATES:" + ((@($survived | Where-Object { $_.Name -eq 'bash.exe' }) | ForEach-Object { $_.ProcessId }) -join ',')`,
    `"SURVIVED_HELPERS:" + ((@($survived | Where-Object { $_.Name -eq 'node.exe' }) | ForEach-Object { $_.ProcessId }) -join ',')`,
  ].join("\n");

  let out;
  try {
    out = execFileSync("powershell", ["-NoProfile", "-NonInteractive", "-Command", script], {
      encoding: "utf8",
      windowsHide: true,
    });
  } catch {
    // The query itself could not run. Report nothing found rather than inventing a survivor: a cleanup
    // helper that cannot look must not be able to fail the test it is cleaning up after. Callers that
    // read `helpers` as evidence must therefore check it is non-empty, not merely that it is not wrong.
    return { candidates: [], helpers: [], survivedCandidates: [], survivedHelpers: [] };
  }

  const pidsLabelled = (label) => {
    const line = out.split(/\r?\n/).find((l) => l.startsWith(label));
    if (!line) return [];
    return line
      .slice(label.length)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map(Number);
  };
  return {
    candidates: pidsLabelled("CANDIDATES:"),
    helpers: pidsLabelled("HELPERS:"),
    survivedCandidates: pidsLabelled("SURVIVED_CANDIDATES:"),
    survivedHelpers: pidsLabelled("SURVIVED_HELPERS:"),
  };
}

/**
 * The cleanup contract every case that reaps shares, kept in one place so the three read identically.
 *
 * A surviving HELPER fails the case. That is this file's own scaffolding, it exists only because these
 * tests substitute it for taskkill, and a stand-in that outlives the case it serves would accumulate
 * across a suite run at STUCK_HELPER_LIFETIME_MS apiece. Deferring E32 is a decision about the
 * production supervisor; it is not licence for this file to leak more.
 *
 * A surviving CANDIDATE is reported and does not fail the case. That is E32 itself - a forced kill that
 * Windows reports as succeeding against a process still running - and it is deliberately unfixed in this
 * release. Failing on it would put a deferred defect back in the way of every run on a loaded machine,
 * which is the exact flakiness this workstream exists to remove. Measured during acceptance: one
 * candidate in twenty-five runs survived three forced kills under spawn-heavy load, and none did idle.
 */
function assertCleanedUp(t, reaped) {
  if (reaped.survivedCandidates.length > 0) {
    t.diagnostic(
      `E32 residue: ${reaped.survivedCandidates.length} probe candidate(s) survived a forced tree-kill and are still running: ${JSON.stringify(reaped.survivedCandidates)}`
    );
  }
  assert.deepEqual(
    reaped.survivedHelpers,
    [],
    `no stuck-helper stand-in may outlive the case that spawned it; ${reaped.helpers.length} found, still alive: ${JSON.stringify(reaped.survivedHelpers)}`
  );
}

test("taskkill unavailable/failing does not hang the process: a hung candidate that outlives the hard-stop still lets the process exit on its own", async (t) => {
  if (NOT_WIN32) {
    t.skip(NOT_WIN32);
    return;
  }
  const bash = await findRealBashOrSkip(t);
  if (!bash) return;

  // _testForceKillFailure simulates taskkill being absent or blocked deterministically - see
  // _resolve-bash.mjs's probeCandidate() doc comment - so this reproduces the finding without depending
  // on taskkill's real availability on whatever machine runs this test.
  const outcome = await runDisposableProbeScript(
    bash,
    '{\n  timeoutMs: 500,\n  _testTailCommand: "while true; do sleep 1; done",\n  _testForceKillFailure: true,\n}'
  );

  // Forcing the tree-kill to fail is precisely what leaves this candidate orphaned, so this test carries
  // the same cleanup obligation as the round-4 test below and for the same reason: measured before this
  // was added, this case was one of two one-per-run contributors to the accumulation E32 tracks.
  //
  // The reap sits in a `finally` rather than after the assertions because a FAILING run is exactly when
  // orphans must not be left behind. The 93 this workstation was carrying were accumulated by runs that
  // did not all pass, and cleanup written below an assertion is cleanup that only happens on the days it
  // is not needed.
  let reaped;
  try {
    // The actual proof: the inner Node process exited ON ITS OWN (nothing in the inner script calls
    // process.exit(), and this test only kills it if the outer guard fires) - meaning nothing leaked in
    // probeCandidate() kept its event loop open, which is exactly what the pre-fix code did (hard-stop
    // resolves the promise; the process itself stays alive waiting on the still-referenced child).
    assert.equal(outcome.hungPastOuterGuard, false, `the child Node process must exit on its own well within the outer guard; it did not (stdout so far: ${JSON.stringify(outcome.stdout)})`);
    assert.match(outcome.stdout, /SUPERVISOR_TEST_DONE/, "the inner script must have actually completed the awaited probeCandidate() call, not exited early for some unrelated reason");
    assert.match(outcome.stdout, /"pass":false/, "sanity: the hung, unkillable-by-taskkill candidate must still be rejected, not accepted");
    assert.match(outcome.stdout, /process tree kill attempt failed/, "the rejection reason must honestly report that the tree-kill attempt failed, not stay silent about it");
  } finally {
    reaped = reapProcessesLeftBy(outcome.childPid);
  }
  assertCleanedUp(t, reaped);
});

// --- round 4, high finding: the KILL HELPER itself must not become the new event-loop anchor ---
//
// killProcessTree spawns "taskkill" to try to kill the candidate. If that helper starts and then stays
// alive - its own termination refused or simply never arriving - and nothing ever unrefs its handle, the
// helper becomes exactly the same kind of anchor already fixed for the candidate, one call deeper.
// _testStuckHelper substitutes a genuinely long-running stand-in for taskkill, so this reproduces the
// finding deterministically without depending on real taskkill actually hanging on whatever machine runs
// this test. The stand-in self-terminates after STUCK_HELPER_LIFETIME_MS, but substituting it also means
// the real tree-kill never runs, so this test orphans its own candidate and reaps it below (E32/E37).
test("a taskkill helper that starts and stays alive does not hang the process either: the outer Node process exits on its own regardless of the helper's own fate", async (t) => {
  if (NOT_WIN32) {
    t.skip(NOT_WIN32);
    return;
  }
  const bash = await findRealBashOrSkip(t);
  if (!bash) return;

  // The outer guard is the discriminator, and it is DERIVED from the helper's lifetime because that
  // lifetime is the only thing separating the two outcomes this test tells apart: a supervisor that never
  // waited for the helper exits as soon as its own hard-stop fires, and one that waited is released only
  // when the helper dies. Stating either as a literal is what broke this test (E37) - at a bar of 5000ms
  // against a helper lifetime of 5000ms, ONE number meant both "did not wait" and "waited, then the helper
  // died", so a correct supervisor measured at 5331ms on a loaded workstation read as a failure while a
  // genuinely waiting one could have read as a pass. The fix is a wider GAP, never a higher bar.
  //
  // Sized from measurement, not taste: a correct run takes 3.3 to 3.8s idle and was seen above 10s under
  // spawn-heavy load, while a waiting one would take the helper's full lifetime. At a lifetime of 60s the
  // guard sits at 30s - roughly twice the worst correct run observed, and half of the waiting one.
  //
  // An earlier revision of this test tried to remove the clock entirely by asserting the helper was still
  // ALIVE once this process had exited, which a waiting supervisor could not produce. That does not work,
  // and the reason is worth keeping: on Windows the helper is torn down WITH its parent rather than
  // outliving it on its own timer. Traced directly - helper alive at the instant the inner process
  // closed, gone by the next poll, while the candidate survived indefinitely. So "the helper survived"
  // is unobservable after the fact even when the code is correct, and the guard is what has to decide.
  const outerGuardMs = STUCK_HELPER_LIFETIME_MS / 2;
  const outcome = await runDisposableProbeScript(
    bash,
    '{\n  timeoutMs: 500,\n  _testTailCommand: "while true; do sleep 1; done",\n  _testStuckHelper: true,\n}',
    outerGuardMs
  );

  // Substituting the helper meant the real tree-kill never ran, so this test has just orphaned its own
  // candidate - measured at exactly one per invocation, and it is `while true; do sleep 1; done`, which
  // never exits on its own. Reap it and require that nothing survived, so a suite run does not accrete
  // the orphans E32 tracks (measured before this fix: five per run of this file, none of them from a case
  // that let the real taskkill run). This asserts the HARNESS cleaned up after itself and says nothing
  // about the supervisor, which was deliberately never allowed to kill this candidate. The reap is in a
  // `finally` for the reason given in the round-3 test above: a failing run is when it matters most.
  let reaped;
  try {
    // Same proof as the round-3 test above, this time with a REAL (if substituted) helper process left
    // running rather than a forced-failure short-circuit - the inner process must still exit on its own
    // well before the stuck helper's natural lifetime elapses, proving this process never waited for the
    // helper either. The guard sits between the two, so a supervisor that DID wait is caught by the guard
    // rather than running the helper's full lifetime out.
    assert.equal(outcome.hungPastOuterGuard, false, `the child Node process must exit on its own well within the outer guard (${outerGuardMs}ms), regardless of the stuck helper still running; it did not (stdout so far: ${JSON.stringify(outcome.stdout)})`);
    assert.match(outcome.stdout, /SUPERVISOR_TEST_DONE/, "the inner script must have actually completed the awaited probeCandidate() call, not exited early for some unrelated reason");
    assert.match(outcome.stdout, /"pass":false/, "sanity: the hung candidate must still be rejected, not accepted");
    // The stuck helper's own outcome can never arrive in time (it does not exit on its own until
    // STUCK_HELPER_LIFETIME_MS has elapsed), so killConfirmed stays null the whole time this process is
    // running - the round-4 "unconfirmed, not silently claimed confirmed" wording, not the "process tree
    // killed" wording a confirmed kill gets.
    assert.match(outcome.stdout, /outcome was still unknown/, "an unconfirmed kill (the helper never reported back in time) must not be reported as a confirmed one");
  } finally {
    reaped = reapProcessesLeftBy(outcome.childPid);
  }

  // Discharges "no helper outlives this case". In practice the helper is already gone by the time this
  // runs, because Windows tears it down with its parent, so it is a guarantee rather than an expectation
  // - and the right shape either way: if that behaviour ever changed, a 60s helper would start
  // accumulating and this would say so. See assertCleanedUp for why a surviving CANDIDATE does not fail.
  assertCleanedUp(t, reaped);
});
