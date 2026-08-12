// what-it-is:   the bash resolver shared by tests that run action.yml's real shell step
// what-it-does: finds a bash that actually shares this process's environment and filesystem, by
//               spawning each candidate under a bounded, tree-killing supervisor and requiring a clean
//               exit plus two round-trip checks - never by trusting its path string or its output alone
// why:          `execFileSync("bash", ...)` resolves "bash" through PATH, and PATH resolution depends
//               entirely on which shell invoked node. From Git Bash, "bash" resolves to Git's own
//               bash.exe, which shares the Windows filesystem and sees Windows env vars normally. From
//               PowerShell (or cmd), "bash" resolves to C:\Windows\System32\bash.exe - the WSL launcher
//               - which runs the step inside a separate Linux filesystem. WSL does not inherit Windows
//               env vars (RUNNER_TEMP, GITHUB_OUTPUT, ACTION_PATH, ...) unless WSLENV is configured, so
//               every path the step writes silently resolves against the wrong root and the step fails
//               with misleading errors far from the real cause. `npm test` runs via `prepublishOnly`,
//               so this was not a theoretical portability gap: it made `npm publish` fail on the
//               maintainer's own machine from the default Windows shell.
//
//               This file has been through two rounds of adversarial review, and both rounds found the
//               same shape of mistake: checking a proxy for the property that matters, instead of the
//               property itself.
//
//               Round 1: an earlier version trusted a candidate the moment `existsSync` said it was
//               present and its path string didn't look like `C:\Windows\System32\bash.exe`. Both
//               proxies are wrong on real machines - the Microsoft Store "WSL" package installs
//               `bash.exe` as an App Execution Alias under `%LocalAppData%\Microsoft\WindowsApps\`, a
//               reparse point `existsSync` reports as ABSENT (so it slipped past the existence check)
//               yet is directly spawnable (so it runs anyway) and resolves, via `readlinkSync`, to a
//               `wsl.exe` path containing none of "System32", "Sysnative", or "SysWOW64" (so the lexical
//               denylist never saw it either). Fixed by replacing the accept condition with a behavioral
//               probe: spawn the candidate, hand it a unique env var and a real Windows path, and check
//               whether it echoes the var back and writes where this process can read the result.
//
//               Round 2: that probe still checked only whether the RIGHT OUTPUT APPEARED, not whether
//               the candidate actually succeeded, and it used FIXED variable names, not just fixed
//               values. Two more false-accepts followed directly: (a) `execFileSync`'s own `pass`
//               computation never consulted the exit code or thrown error - a candidate that produced
//               the right output and then hung or exited nonzero still read as `pass: true`, and because
//               `execFileSync`'s `timeout` option signals-then-waits for full process closure (which for
//               a launcher that spawns its own child processes is not bounded by the timeout at all), a
//               hanging candidate could hang this process too; (b) with fixed names, an inherited
//               `WSLENV` forwarding exactly those names would let a real WSL candidate satisfy both
//               round-trip checks while the variables the real gate step needs (RUNNER_TEMP,
//               GITHUB_OUTPUT, ACTION_PATH) stayed unavailable - the probe would certify precisely the
//               shell that breaks the thing it exists to gate.
//
//               Fixed here by: (1) a hand-rolled supervisor (`runUnderSupervisor`) that spawns
//               asynchronously, tracks the child's own timing independent of the child's cooperation,
//               and on timeout force-kills the ENTIRE process tree (`taskkill /T /F` on Windows, so a
//               launcher's own children die with it) rather than trusting the child to exit on signal; a
//               candidate passes only when it exits cleanly (code 0, no error, no timeout) AND both
//               round-trip checks hold; (2) per-invocation RANDOM variable names, not just random
//               values, generated fresh for every probe, so no fixed name exists for a WSLENV entry to
//               name; and (3) WSLENV itself is stripped from the environment handed to the candidate
//               regardless, so even an entry that happened to guess or duplicate the random names has
//               nothing to act on. Both (2) and (3) are applied together - see `probeCandidate` - because
//               they are independent, cost nothing to combine, and each covers a gap the other doesn't:
//               (3) alone would still fail if some other Windows-side mechanism besides WSLENV ever
//               forwarded named variables; (2) alone would still fail if the randomization were ever
//               weakened or reused.
//
//               Round 3 found that the round-2 supervisor itself could hang the process it runs in. On
//               timeout, `killProcessTree` ran `taskkill` SYNCHRONOUSLY inside the timer callback (so a
//               slow or blocked `taskkill` could delay the hard-stop timer from firing at all - a
//               synchronous callback blocks every other timer), swallowed every failure, and never fell
//               back to anything if `taskkill` itself was absent or blocked by policy: the child's
//               ChildProcess handle and its stdio streams stayed referenced regardless, so a surviving
//               process kept Node's event loop open even after the hard-stop timer resolved this
//               function's PROMISE. Reproduced live: with the kill forced to fail and an infinite-loop
//               child, the hard-stop settled the promise on schedule, but the child.kill() fallback added
//               by this round's fix is what actually let the process exit - see the regression below.
//               CHANGELOG.md previously said the hard-stop timer meant "the function returns even if the
//               kill does not land" - true of the function, not of the process, and that gap is exactly
//               what this round closes: the function returning was never the same guarantee as the
//               process being able to exit.
//
//               Fixed here, deliberately kept small (a Job Object or other full tree-containment
//               mechanism was considered and rejected as over-engineering for a test helper whose only
//               job is to reject a bad shell): (1) the kill itself moved off the synchronous path (async
//               `execFile`, not `execFileSync`) so it can never block the hard-stop timer from firing;
//               (2) its success or failure is now checked, not discarded; (3) when it can't be confirmed,
//               the immediate child is ALSO killed directly through Node's own handle (`child.kill()`,
//               confirmed to work independently of `taskkill`'s own availability), attempted from BOTH the
//               async kill-failure path and, unconditionally, from the hard-stop itself - a real `taskkill`
//               invocation is its own subprocess with its own OS scheduling, and under heavy concurrent
//               load (running this file inside the full suite) its callback was observed arriving well
//               past the hard-stop bound, so relying on it alone left the fallback kill living only in a
//               callback that could arrive too late to matter; (4) `child.kill()` is followed by a short,
//               fixed grace window (`RELEASE_DELAY_MS`) before unref-ing the handle, not an unref in the
//               same tick - confirmed directly that killing and unref-ing in the same tick let the target
//               survive in roughly 1 of 8 isolated trials, even though the calling process itself exited
//               cleanly every time; (5) that residual - the kill-tree not being confirmed - is reported in
//               the rejection reason instead of silently swallowed.
//
//               None of this fully closes one thing found while verifying it: even a kill Node itself
//               reports as successful (an `exit`/`close` event with `signal: SIGKILL`) can still,
//               occasionally, leave the target OS process running - reproduced directly and repeatedly,
//               independent of system load, and traced to how Git-Bash/MSYS represents its process tree
//               on Windows (a Windows PID does not always correspond 1:1 to what MSYS's own runtime is
//               still doing underneath it), not to a flaw in this file's kill-attempt sequencing. Closing
//               that fully would mean tracking or containing the process tree at the OS level - exactly
//               the Job-Object-shaped mechanism deliberately ruled out above. What this fix DOES achieve,
//               verified directly and repeatedly, is that THIS process - and therefore `npm test` and the
//               `npm publish` it gates - reliably stops waiting and exits within a bounded time regardless
//               of what the candidate does; an orphaned background process is a real, acknowledged,
//               undocumented-away residual, not a hang.
//
//               Round 4 found the SAME shape one level down, in the helper THIS file spawns to do the
//               killing: `killProcessTree` called the real `taskkill` via `execFile`, which returns a
//               REFERENCED `ChildProcess` that was discarded, never captured, never unref'd. Confirmed
//               directly against this exact code path (not just inferred): forcing `ChildProcess.kill()`
//               to fail (so `execFile`'s own internal timeout-driven termination of a stalled helper
//               cannot do anything either) reproduced an unbounded hang - the process waited for the
//               helper's full, uncontrolled lifetime, ending only when an external, outside-Node kill
//               intervened. A `taskkill` that starts and stalls could become exactly the same kind of
//               event-loop anchor already fixed for the candidate, just one call deeper. Fixed the same
//               way, at the source this time rather than after the fact: the helper is now `spawn`'d
//               directly (not via `execFile`) with `stdio: "ignore"` - its output was never used for
//               anything but an occasional diagnostic, which this trades away for the fix - and unref'd
//               IMMEDIATELY, before this process has any idea whether the helper will ever exit. Unref
//               does not stop this process from hearing the helper's outcome (its `exit`/`error` events
//               still fire and still update `killConfirmed`), only from waiting on it.
//
//               Round 4 also found `killConfirmed` being read as more certain than it is: it stays `null`
//               when the async kill attempt is still in flight at the hard-stop (a timing this file's own
//               comments already say was observed - the async attempt regularly finishing AFTER the
//               hard-stop under real load), and the message-building code treated only an explicit `false`
//               as "not confirmed," so a still-pending `null` printed the same message as a confirmed
//               kill. Fixed by treating anything other than `true` as unconfirmed, with wording that
//               distinguishes an attempt that actively failed from one whose outcome was simply never
//               heard back in time - both are honestly "not confirmed," but they are not the same fact.
//
//               THE HONEST GUARANTEE, stated plainly because four rounds now show how easy it is to
//               overstate this kind of check: a candidate is accepted only if, within a bounded timeout,
//               it exits with code 0 after correctly echoing back a randomly-named env var this process
//               set AND correctly writing a randomly-named token to a path this process gave it, with
//               WSLENV stripped from its environment. On rejection, THIS PROCESS reliably stops waiting on
//               the candidate - and on any helper this file spawned to try to kill it - and exits within a
//               bounded time, verified directly and repeatedly under adversarial conditions (taskkill
//               forced to fail, taskkill itself replaced with a helper that starts and stays alive, a
//               genuinely never-ending candidate), so a rejected candidate cannot hang `npm test` or the
//               `npm publish` it gates. What this does NOT guarantee: that the candidate's own OS process
//               is actually terminated by the time this process moves on, or that "killConfirmed: true"
//               (or any value other than an explicit `true`) means more than this process's own best
//               information at the moment it stopped waiting. An unconfirmed tree-kill may leave a
//               descendant running that the direct kill cannot reach; and even a kill this process
//               believes succeeded (Node itself reports a clean SIGKILL exit) can, occasionally, leave the
//               process running regardless - observed directly, tied to how Git-Bash/MSYS represents its
//               process tree on Windows. Either way this process does not wait for it or hold it open, and
//               does not pretend to have confirmed it dead - that is reported honestly in the rejection
//               reason, not swallowed. This is an empirical, bounded-time behavioral test of what THIS
//               process waits for, not a formal proof of process-tree isolation or termination.
// used-by:      tests/unit/action-run-step.test.mjs, tests/unit/resolve-bash.test.mjs
import { existsSync, mkdtempSync, readFileSync, readlinkSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync, spawn } from "node:child_process";

// Known WSL launcher directories - always true when they match, but (see file header) NOT exhaustive:
// the WindowsApps App Execution Alias resolves to a path under Program Files\WindowsApps\...\wsl.exe,
// which matches none of these. Used only to skip a spawn for the obvious cases; never used to accept.
const WSL_LAUNCHER_DIR_PATTERNS = [/\\windows\\system32\\/i, /\\windows\\sysnative\\/i, /\\windows\\syswow64\\/i];

/** Cheap, non-authoritative: true when `candidatePath` LOOKS like the WSL launcher stub by directory. */
export function isWslLauncherPath(candidatePath) {
  const normalized = path.resolve(candidatePath).toLowerCase();
  return normalized.endsWith("\\bash.exe") && WSL_LAUNCHER_DIR_PATTERNS.some((re) => re.test(normalized));
}

/**
 * Best-effort symlink/reparse-point target, for diagnostics only (never for accept/reject decisions).
 * `realpathSync` fully resolves ordinary symlinks; App Execution Alias reparse points reject it with
 * EACCES (observed on real hardware), so this falls back to `readlinkSync`, which reads the alias's
 * recorded target directly. Returns null when the candidate isn't a link, or nothing could be read.
 */
export function resolveSymlinkTarget(candidatePath) {
  try {
    const real = realpathSync(candidatePath);
    return path.resolve(real).toLowerCase() === path.resolve(candidatePath).toLowerCase() ? null : real;
  } catch {
    try {
      return readlinkSync(candidatePath) || null;
    } catch {
      return null;
    }
  }
}

const DEFAULT_PROBE_TIMEOUT_MS = 5000;
// Extra bound, beyond the primary timeout, for the forced kill itself to actually land and the child's
// stdio to close. This is what makes the bound REAL: execFileSync's own `timeout` option cannot bound
// this (it signals, then still blocks waiting for full process closure - see the file header), so this
// function guarantees its own return within timeoutMs + KILL_GRACE_MS no matter what the candidate does.
const KILL_GRACE_MS = 2000;
// Short, fixed window releaseHandles() waits before unref-ing an already-kill()'d child, so the OS has a
// fair chance to actually finish the termination this process just requested (see releaseHandles' own
// comment for the empirical reason this exists - it does not delay this function's own return).
const RELEASE_DELAY_MS = 750;

/**
 * Attempts to terminate `pid` and everything it spawned, WITHOUT blocking the event loop AND WITHOUT
 * ever becoming a new reason this process stays alive.
 *
 * `taskkill` is spawned directly (not via `execFile`) so its `ChildProcess` handle is unref'd
 * IMMEDIATELY, before this process knows whether the helper itself will ever exit (round 4 finding: a
 * helper spawned via `execFile` keeps a REFERENCED handle by default; if `taskkill` itself starts and
 * then stalls - or its own termination is refused, confirmed directly by forcing `ChildProcess.kill()`
 * to fail and observing this exact code shape hang for as long as the helper kept running - nothing
 * ever unrefs that handle, and it becomes exactly the same kind of event-loop anchor already fixed for
 * the candidate, one level down). Unref does not stop this function from hearing the helper's outcome -
 * only from waiting on it - so `killConfirmed` is still reported accurately whenever the helper does
 * finish; it just never costs this process a wait to find out.
 *
 * Resolves `true` only when the helper itself exits with code 0. Resolves `false` on any failure
 * (spawn error, nonzero exit) or when `forceFailure` is set (test-only: deterministically simulates the
 * candidate-kill failure case without depending on whether `taskkill` actually happens to be available
 * on the machine running the test). `stuckHelper` (test-only) substitutes a genuinely long-running,
 * self-terminating stand-in for `taskkill` so a regression can prove this process does not wait for the
 * helper to finish. A `false` result, or a promise that never settles because the helper never exits,
 * does not mean nothing was attempted - it means the caller cannot trust that the tree is actually gone,
 * and must decide what to do next (see `runUnderSupervisor`).
 */
function killProcessTree(pid, { forceFailure = false, stuckHelper = false } = {}) {
  return new Promise((resolve) => {
    if (!pid || forceFailure) {
      resolve(false);
      return;
    }
    if (process.platform === "win32") {
      // /T walks and kills the whole process tree rooted at pid (not just the immediate child - a WSL
      // launcher's own descendants die with it); /F forces termination. The stuck-helper stand-in is a
      // genuinely long-running (but self-terminating, so it does not litter the machine) process,
      // standing in for a taskkill that starts and never comes back.
      const [command, args] = stuckHelper
        ? [process.execPath, ["-e", "setTimeout(() => {}, 5000)"]]
        : ["taskkill", ["/PID", String(pid), "/T", "/F"]];

      let helper;
      try {
        helper = spawn(command, args, { stdio: "ignore", windowsHide: true });
      } catch {
        resolve(false);
        return;
      }
      // The fix itself: unref BEFORE knowing the outcome, not after - see the doc comment above.
      helper.unref();

      let settled = false;
      helper.on("error", () => {
        if (settled) return;
        settled = true;
        resolve(false);
      });
      helper.on("exit", (code) => {
        if (settled) return;
        settled = true;
        resolve(code === 0);
      });
    } else {
      try {
        process.kill(-pid, "SIGKILL");
        resolve(true);
      } catch {
        resolve(false);
      }
    }
  });
}

/**
 * Spawns `candidatePath args...` under a bound this process enforces itself, and attempts to force-kill
 * the ENTIRE process tree on timeout rather than trusting the child to honor a signal. Never throws:
 * spawn failures, nonzero exits, signals, and timeouts are all reported in the returned object, so the
 * caller can require every one of them to be clean before accepting a candidate.
 *
 * What this function guarantees, precisely (round 3 finding: the round-2 version conflated these two):
 * it always SETTLES ITS OWN PROMISE within timeoutMs + KILL_GRACE_MS, no matter what the candidate does.
 * It does NOT guarantee the candidate's whole process tree is actually terminated by then - only that
 * this process stops waiting on it. On any path where the tree-kill is not confirmed, the immediate
 * child is killed directly through Node's own handle (confirmed independent of `taskkill`'s own
 * availability - see resolve-bash.test.mjs), and regardless of whether even that succeeds, the
 * ChildProcess and its stdio streams are unref'd and destroyed, so neither the immediate child nor
 * anything still writing to its pipes can keep this process's event loop open. A descendant beyond the
 * immediate child that the direct kill cannot reach is the one thing this cannot confirm dead - `result
 * .killConfirmed` reports that honestly rather than staying silent about it.
 *
 * Returns `{ code, signal, stdout, stderr, timedOut, killConfirmed, error }`. `killConfirmed` is `null`
 * when no timeout occurred (nothing to kill), and `true`/`false` once a kill was attempted.
 */
function runUnderSupervisor(candidatePath, args, env, timeoutMs, testHooks = {}) {
  return new Promise((resolve) => {
    let settled = false;
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let killConfirmed = null;
    let timer = null;
    let hardStop = null;
    let child;

    // Directly, synchronously (from this process's point of view - no subprocess involved) attempts to
    // terminate the immediate child through Node's own handle, independent of whatever the async
    // `taskkill` attempt is doing. This exists because `taskkill` itself is a subprocess with its own OS
    // scheduling: under heavy concurrent load (observed running this file inside the full suite, where
    // many other files spawn subprocesses in parallel) its callback can be delayed well past this
    // function's own hard-stop bound, so the fallback kill living only inside that delayed callback can
    // end up running too late to matter. `child.kill()` does not have that dependency - confirmed
    // independently reliable regardless of `taskkill`'s own availability or timing (see
    // resolve-bash.test.mjs) - so the hard-stop below calls it directly rather than only hoping the async
    // attempt gets there first. Idempotent and safe to call on an already-dead child.
    const killImmediateChild = () => {
      try {
        child?.kill("SIGKILL");
      } catch {
        // already gone, or this platform/permission set refuses it - nothing more to try directly
      }
    };

    // Stops this process from waiting on a handle that turned out not to matter: called whenever a kill
    // attempt was not confirmed successful, and again defensively from the hard-stop regardless of what
    // the kill reported - idempotent and safe to call on an already-closed handle, so calling it twice
    // costs nothing. Destroys stdio immediately (safe at any point), but does NOT unref the child in the
    // same synchronous tick as the kill attempt: on Windows, ChildProcess.kill() does not guarantee the
    // underlying termination request has actually been dispatched by the time it returns - confirmed
    // directly (killing, unref-ing, and letting the caller exit in the very same tick let the target
    // survive in roughly 1 of 8 trials, even though the calling process itself exited cleanly every
    // time). So this gives the kill a short, fixed, BOUNDED grace window (RELEASE_DELAY_MS) to actually
    // land - via the child's own `exit` event if it comes first, otherwise the timeout - before finally
    // releasing the reference. This does not delay `finish()` (the promise this function returns already
    // resolved by the time this runs) or reintroduce an unbounded wait - it only means this process keeps
    // a reference open for up to RELEASE_DELAY_MS longer than before, specifically so the OS gets a fair
    // chance to finish what this process just asked it to do.
    const releaseHandles = () => {
      try {
        child?.stdout?.destroy();
      } catch {
        // already destroyed or never existed
      }
      try {
        child?.stderr?.destroy();
      } catch {
        // already destroyed or never existed
      }
      if (!child) return;
      let unrefed = false;
      const unrefNow = () => {
        if (unrefed) return;
        unrefed = true;
        try {
          child.stdout?.unref?.();
        } catch {
          // not all stream implementations expose unref(); harmless if absent
        }
        try {
          child.stderr?.unref?.();
        } catch {
          // not all stream implementations expose unref(); harmless if absent
        }
        try {
          child.unref();
        } catch {
          // already gone
        }
      };
      child.once("exit", unrefNow);
      setTimeout(unrefNow, RELEASE_DELAY_MS);
    };

    const finish = (result) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      if (hardStop) clearTimeout(hardStop);
      resolve(result);
    };

    try {
      child = spawn(candidatePath, args, { env, windowsHide: true });
    } catch (err) {
      finish({ code: null, signal: null, stdout, stderr, timedOut: false, killConfirmed: null, error: err });
      return;
    }

    timer = setTimeout(() => {
      timedOut = true;
      // Fire-and-forget, but never blocking: killProcessTree is itself async now, so this callback
      // returns immediately and the hard-stop timer below is free to fire on schedule regardless of how
      // long the kill attempt takes (round 3's first finding).
      killProcessTree(child.pid, testHooks).then((killed) => {
        killConfirmed = killed;
        if (!killed) {
          // The tree-kill could not be confirmed: still do the one thing this process CAN do
          // unilaterally - terminate the immediate child through Node's own handle - then stop holding
          // the event loop open regardless of whether even that succeeds. A descendant beyond this
          // immediate child is the residual this cannot confirm dead; that is reported by the caller via
          // killConfirmed, not hidden here.
          killImmediateChild();
          releaseHandles();
        }
      });
    }, timeoutMs);

    // Guarantees this promise settles even if the kill above does not fully land (an uninterruptible
    // wait, a descendant taskkill can't see, ...) - this function must never hang the CALLER. It does
    // not, by itself, guarantee the underlying process has exited - see the doc comment above. It DOES
    // also make its own direct attempt on the immediate child (killImmediateChild), independent of and
    // not waiting on whatever the async taskkill attempt above is still doing, precisely so a slow
    // taskkill under load cannot leave the immediate child un-terminated just because its own fallback
    // hadn't run yet by the time this fires.
    hardStop = setTimeout(() => {
      killImmediateChild();
      releaseHandles();
      finish({ code: null, signal: null, stdout, stderr, timedOut: true, killConfirmed, error: null });
    }, timeoutMs + KILL_GRACE_MS);

    child.stdout?.on("data", (d) => {
      stdout += d;
    });
    child.stderr?.on("data", (d) => {
      stderr += d;
    });
    child.on("error", (err) => finish({ code: null, signal: null, stdout, stderr, timedOut, killConfirmed, error: err }));
    child.on("close", (code, signal) => finish({ code, signal, stdout, stderr, timedOut, killConfirmed, error: null }));
  });
}

/**
 * Fresh, unique variable NAMES (not just values) for one probe invocation - the fix for the WSLENV
 * false-accept: a fixed name is a target an inherited WSLENV entry can name in advance, a random one
 * generated per call is not.
 */
export function buildProbeVars() {
  const nonce = `${process.pid}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  return {
    envValueVar: `ASKIT_PROBE_${nonce}_V`,
    fileTokenVar: `ASKIT_PROBE_${nonce}_T`,
    filePathVar: `ASKIT_PROBE_${nonce}_P`,
    envValue: `askit-env-${nonce}`,
    fileToken: `askit-file-${nonce}`,
  };
}

function buildProbeScript(vars, tailCommand) {
  return (
    `printf 'ASKIT_PROBE_ECHO=%s\\n' "$${vars.envValueVar}"; ` +
    `printf '%s' "$${vars.fileTokenVar}" > "$${vars.filePathVar}" 2>/dev/null; ` +
    tailCommand
  );
}

/** Removes WSLENV (any casing) from `env` in place, so nothing in it can be forwarded across a WSL
 * boundary by name - independent of, and in addition to, randomizing the names themselves. */
function stripWslenv(env) {
  for (const key of Object.keys(env)) {
    if (key.toLowerCase() === "wslenv") delete env[key];
  }
  return env;
}

function evaluateProbeResult(result, vars, probeFile) {
  const envOk = result.stdout.includes(`ASKIT_PROBE_ECHO=${vars.envValue}`);
  let fileOk = false;
  try {
    fileOk = existsSync(probeFile) && readFileSync(probeFile, "utf8") === vars.fileToken;
  } catch {
    fileOk = false;
  }
  // The round-1 fix; the round-2 finding is exactly that this alone is not enough - it says nothing
  // about the exit code (a candidate can produce correct output and then hang or fail) - so `pass`
  // below ALSO requires cleanExit.
  const cleanExit = !result.error && !result.timedOut && result.code === 0;
  // killConfirmed is `true` only when the tree-kill helper itself reported success. Everything else -
  // `false` (it actively failed) AND `null` (its outcome was still unknown when this process stopped
  // waiting, a timing this file's own header documents observing under real load) - is UNCONFIRMED, not
  // just an explicit `false`: treating `null` as anything but unconfirmed is exactly the round-4 finding
  // (a still-pending kill printed the same message as a confirmed one, contradicting the guarantee this
  // file states). The two unconfirmed cases still get different wording, because they are different
  // facts: one is "it tried and failed," the other is "this process never found out."
  const spawnError = result.error
    ? result.error.code || result.error.message
    : result.timedOut
      ? result.killConfirmed === true
        ? "timed out and was forcibly terminated (process tree killed)"
        : result.killConfirmed === false
          ? "timed out; the process tree kill attempt failed (a descendant process may still be running) " +
            "- the immediate child was signalled directly and this process stopped waiting on it"
          : "timed out; the process tree kill's outcome was still unknown when this process stopped " +
            "waiting for it (a descendant process may still be running) - the immediate child was " +
            "signalled directly and this process stopped waiting on it"
      : result.code !== 0
        ? `exited with code ${result.code}${result.signal ? ` (signal ${result.signal})` : ""}`
        : null;
  return { pass: cleanExit && envOk && fileOk, envOk, fileOk, cleanExit, spawnError };
}

/**
 * The behavioral probe: spawns `candidatePath -c <script>` exactly once, under `runUnderSupervisor`, and
 * requires ALL THREE properties that have broken across two rounds of review to hold:
 *
 *  1. clean exit - code 0, no thrown/spawn error, and no timeout. (Round 2: output alone was not proof
 *     of success - a candidate that produced the right output and then hung or exited nonzero used to
 *     read as a pass.)
 *  2. env-inheritance - a randomly-NAMED, randomly-valued variable is set in the child's env; the script
 *     echoes it back on stdout. WSL drops it (no WSLENV entry can name a variable it was never told
 *     about); Git Bash returns it untouched.
 *  3. shared filesystem - the script writes a unique token to a path THIS process created; this process
 *     then reads that exact path back. WSL writes (if it writes at all) into its own root, invisible
 *     from here; Git Bash writes to the real Windows file, because it IS the real Windows filesystem.
 *
 * WSLENV is stripped from the candidate's environment regardless of whether the names it might name
 * happen to match (round 2's second finding) - both defenses are applied together; see the file header
 * for why neither alone is sufficient on its own.
 *
 * `options.timeoutMs` overrides the default bound (used by tests to keep a deliberately-hanging
 * candidate fast to verify). `options._testVars` / `options._testTailCommand` / `options
 * ._testForceKillFailure` / `options._testStuckHelper` let tests substitute known variables, a
 * misbehaving tail command, a deterministically-failing tree-kill (simulating `taskkill` being absent or
 * blocked, without depending on whether it actually is on the machine running the test), or a
 * `taskkill` stand-in that starts and stays alive (round 4: proving this process does not wait for the
 * KILL HELPER either, not just the candidate) while exercising this exact function, including its
 * `finally`-guaranteed directory cleanup - none of these are part of the public contract.
 *
 * Never throws. The probe directory is always removed, on every path - success, failure, spawn error,
 * or forced kill - via `finally`.
 */
export async function probeCandidate(candidatePath, options = {}) {
  const { timeoutMs = DEFAULT_PROBE_TIMEOUT_MS, _testVars, _testTailCommand, _testForceKillFailure, _testStuckHelper } = options;
  const probeDir = mkdtempSync(path.join(tmpdir(), "askit-bash-probe-"));
  try {
    const probeFile = path.join(probeDir, "probe.txt").replace(/\\/g, "/");
    const vars = _testVars || buildProbeVars();
    const script = buildProbeScript(vars, _testTailCommand || "exit 0");
    const env = stripWslenv({
      ...process.env,
      [vars.envValueVar]: vars.envValue,
      [vars.fileTokenVar]: vars.fileToken,
      [vars.filePathVar]: probeFile,
    });

    const result = await runUnderSupervisor(candidatePath, ["-c", script], env, timeoutMs, {
      forceFailure: Boolean(_testForceKillFailure),
      stuckHelper: Boolean(_testStuckHelper),
    });
    return evaluateProbeResult(result, vars, probeFile);
  } finally {
    rmSync(probeDir, { recursive: true, force: true });
  }
}

/** Every place Git for Windows is known to install bash.exe, derived from env vars, not PATH. */
function explicitGitBashCandidates() {
  const roots = new Set();
  if (process.env.GIT_INSTALL_ROOT) roots.add(process.env.GIT_INSTALL_ROOT);
  for (const envVar of ["ProgramFiles", "ProgramFiles(x86)", "ProgramW6432"]) {
    if (process.env[envVar]) roots.add(path.join(process.env[envVar], "Git"));
  }
  if (process.env.LocalAppData) roots.add(path.join(process.env.LocalAppData, "Programs", "Git"));

  const candidates = [];
  for (const root of roots) {
    candidates.push(path.join(root, "bin", "bash.exe"));
    candidates.push(path.join(root, "usr", "bin", "bash.exe"));
  }
  return candidates;
}

/** Every "bash" PATH would resolve to, via the same `where` lookup a shell performs, worst case first. */
function pathResolvedCandidates() {
  try {
    const out = execFileSync("where", ["bash"], { encoding: "utf8" });
    return out
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Resolves a bash suitable for driving action.yml's real shell step end-to-end.
 *
 * On POSIX, plain "bash" via PATH is correct and safe - returned unchanged, unprobed (there is no
 * WSL-style filesystem/environment boundary to cross there).
 *
 * On win32, every candidate - explicit Git-for-Windows install locations, checked first, then whatever
 * PATH resolves - is proved, not guessed about. The lexical WSL-launcher check runs first ONLY as a
 * cheap pre-filter that can reject a candidate without spawning it (the obvious System32/Sysnative/
 * SysWOW64 case); passing that pre-filter grants nothing. Acceptance requires passing `probeCandidate`
 * (see its own doc comment, and the file header, for exactly what that does and does not guarantee). The
 * first candidate to pass wins, short-circuiting immediately; every candidate that failed - whether by
 * the pre-filter or the probe - is recorded in `rejected` with why, including its resolved symlink
 * target when it has one.
 *
 * Returns `{ bash, source, searched, rejected }` on success (`bash` is a ready-to-exec path or the
 * literal string "bash"), or `{ bash: null, source: null, searched, rejected, reasonForFailure }` when
 * no candidate passed.
 */
export async function resolveBash() {
  if (process.platform !== "win32") {
    return { bash: "bash", source: "PATH (POSIX platform: PATH resolution is safe here)", searched: [], rejected: [] };
  }

  const searched = [];
  const rejected = [];

  const seen = new Set();
  const ordered = [];
  for (const candidate of explicitGitBashCandidates()) {
    const key = path.resolve(candidate).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    ordered.push({ path: candidate, origin: "explicit Git-for-Windows install location" });
  }
  for (const candidate of pathResolvedCandidates()) {
    const key = path.resolve(candidate).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    ordered.push({ path: candidate, origin: "PATH" });
  }

  for (const { path: candidate, origin } of ordered) {
    searched.push(candidate);
    const target = resolveSymlinkTarget(candidate);
    const targetNote = target ? ` -> ${target}` : "";

    if (isWslLauncherPath(candidate) || (target && isWslLauncherPath(target))) {
      rejected.push({
        path: candidate,
        reason: `known WSL launcher directory${targetNote} (rejected by the cheap pre-filter, never spawned)`,
      });
      continue;
    }

    const probe = await probeCandidate(candidate);
    if (probe.pass) {
      return {
        bash: candidate,
        source: `${origin}, verified by behavioral probe (clean exit, env-inheritance, and shared-filesystem all confirmed)`,
        searched,
        rejected,
        probe,
      };
    }

    rejected.push({
      path: candidate,
      reason:
        `failed the behavioral probe${targetNote}: ${probe.spawnError ?? "output did not round-trip"} ` +
        `(clean-exit=${probe.cleanExit ? "ok" : "FAILED"}, env-inheritance=${probe.envOk ? "ok" : "FAILED"}, shared-filesystem=${probe.fileOk ? "ok" : "FAILED"})`,
    });
  }

  return {
    bash: null,
    source: null,
    searched,
    rejected,
    reasonForFailure:
      `no candidate passed the behavioral probe (clean exit + env-inheritance + shared-filesystem round trip) among ${searched.length} checked. ` +
      rejected.map((r) => `${r.path}: ${r.reason}`).join("; "),
  };
}
