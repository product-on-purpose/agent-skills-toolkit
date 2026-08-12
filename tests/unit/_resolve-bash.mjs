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
//               THE HONEST GUARANTEE, stated plainly because the first two rounds show how easy it is to
//               overstate this kind of check: a candidate is accepted only if, within a bounded timeout,
//               it exits with code 0 after correctly echoing back a randomly-named env var this process
//               set AND correctly writing a randomly-named token to a path this process gave it, with
//               WSLENV stripped from its environment. That closes every concrete bypass found so far. It
//               is an empirical, bounded-time behavioral test, not a formal proof of isolation - a
//               future candidate that genuinely satisfies that same observable contract within the
//               timeout window would still be accepted, because at that point it has stopped being
//               distinguishable, from here, from a bash that actually shares this process's environment
//               and filesystem.
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

/** Forcibly terminates `pid` and everything it spawned. Best-effort; never throws. */
function killProcessTree(pid) {
  if (!pid) return;
  if (process.platform === "win32") {
    try {
      // /T walks and kills the whole process tree rooted at pid (not just the immediate child - a WSL
      // launcher's own descendants die with it); /F forces termination.
      execFileSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore", timeout: 3000 });
    } catch {
      // already exited, or taskkill couldn't reach it - nothing more this function can do
    }
  } else {
    try {
      process.kill(-pid, "SIGKILL");
    } catch {
      try {
        process.kill(pid, "SIGKILL");
      } catch {
        // already gone
      }
    }
  }
}

/**
 * Spawns `candidatePath args...` under a bound this process enforces itself, and force-kills the ENTIRE
 * process tree on timeout rather than trusting the child to honor a signal. Never throws: spawn
 * failures, nonzero exits, signals, and timeouts are all reported in the returned object, so the caller
 * can require every one of them to be clean before accepting a candidate.
 *
 * Returns `{ code, signal, stdout, stderr, timedOut, error }`.
 */
function runUnderSupervisor(candidatePath, args, env, timeoutMs) {
  return new Promise((resolve) => {
    let settled = false;
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let timer = null;
    let hardStop = null;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      if (hardStop) clearTimeout(hardStop);
      resolve(result);
    };

    let child;
    try {
      child = spawn(candidatePath, args, { env, windowsHide: true });
    } catch (err) {
      finish({ code: null, signal: null, stdout, stderr, timedOut: false, error: err });
      return;
    }

    timer = setTimeout(() => {
      timedOut = true;
      killProcessTree(child.pid);
    }, timeoutMs);

    // Guarantees this promise settles even if the kill above does not fully land (an uninterruptible
    // wait, a descendant taskkill can't see, ...) - this function must never hang the caller.
    hardStop = setTimeout(() => {
      finish({ code: null, signal: null, stdout, stderr, timedOut: true, error: null });
    }, timeoutMs + KILL_GRACE_MS);

    child.stdout?.on("data", (d) => {
      stdout += d;
    });
    child.stderr?.on("data", (d) => {
      stderr += d;
    });
    child.on("error", (err) => finish({ code: null, signal: null, stdout, stderr, timedOut, error: err }));
    child.on("close", (code, signal) => finish({ code, signal, stdout, stderr, timedOut, error: null }));
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
  const spawnError = result.error
    ? result.error.code || result.error.message
    : result.timedOut
      ? "timed out and was forcibly terminated (process tree killed)"
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
 * candidate fast to verify). `options._testVars` / `options._testTailCommand` let tests substitute
 * known variables or a misbehaving tail command while exercising this exact function, including its
 * `finally`-guaranteed directory cleanup - they are not part of the public contract.
 *
 * Never throws. The probe directory is always removed, on every path - success, failure, spawn error,
 * or forced kill - via `finally`.
 */
export async function probeCandidate(candidatePath, options = {}) {
  const { timeoutMs = DEFAULT_PROBE_TIMEOUT_MS, _testVars, _testTailCommand } = options;
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

    const result = await runUnderSupervisor(candidatePath, ["-c", script], env, timeoutMs);
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
