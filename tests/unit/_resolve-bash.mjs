// what-it-is:   the bash resolver shared by tests that run action.yml's real shell step
// what-it-does: finds a bash that actually shares this process's environment and filesystem, by
//               spawning each candidate and asking it directly - never by trusting its path string
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
//               An earlier version of this file trusted a candidate the moment `existsSync` said it was
//               present and its path string didn't look like `C:\Windows\System32\bash.exe`. A
//               pre-release review found that both proxies are wrong on real machines: the Microsoft
//               Store "WSL" package installs `bash.exe` as an App Execution Alias under
//               `%LocalAppData%\Microsoft\WindowsApps\` - a reparse point that `existsSync` reports as
//               ABSENT (so it slipped past the existence check) yet is directly spawnable (so
//               `execFileSync` runs it anyway) and resolves, via `readlinkSync`, to `wsl.exe` - a path
//               that contains none of "System32", "Sysnative", or "SysWOW64", so the lexical denylist
//               never sees it either. A `GIT_INSTALL_ROOT` (or any explicit install root) whose
//               `bin\bash.exe` is itself a symlink to that same WSL launcher passed the old check
//               exactly the same way: `existsSync` follows the symlink and reports the target as
//               present, without ever asking what the target actually does.
//
//               So this file no longer reasons about path strings to decide what to TRUST (only, as a
//               cheap pre-filter, what to skip probing at all). Every candidate - explicit locations and
//               PATH fallbacks alike - is spawned once and asked directly for the two properties that
//               broke: does it hand back an environment variable this process set (env-inheritance), and
//               can this process read back a token the candidate wrote to a path this process gave it
//               (shared filesystem). Both must round-trip, or the candidate is rejected - immune to
//               aliases, symlinks, reparse points, and junctions, because none of those change what the
//               candidate actually does when run.
// used-by:      tests/unit/action-run-step.test.mjs, tests/unit/resolve-bash.test.mjs
import { existsSync, mkdtempSync, readFileSync, readlinkSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

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

/**
 * The behavioral probe: spawns `candidatePath -c <script>` exactly once, and requires BOTH properties
 * that actually broke to round-trip:
 *
 *  1. env-inheritance - a unique value is set in the child's env; the script echoes it back on stdout.
 *     WSL drops it (no WSLENV entry); Git Bash returns it untouched.
 *  2. shared filesystem - the script writes a unique token to a path THIS process created; this process
 *     then reads that exact path back. WSL writes (if it writes at all) into its own root, invisible
 *     from here; Git Bash writes to the real Windows file, because it IS the real Windows filesystem.
 *
 * A candidate passes only when both checks agree. Never throws: a candidate that fails to spawn at all
 * (wrong architecture, missing DLL, ENOENT, timeout, ...) is reported as a failed probe, not an error.
 */
export function probeCandidate(candidatePath) {
  const probeDir = mkdtempSync(path.join(tmpdir(), "askit-bash-probe-"));
  const probeFile = path.join(probeDir, "probe.txt").replace(/\\/g, "/");
  const nonce = `${process.pid}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const envValue = `askit-env-probe-${nonce}`;
  const fileToken = `askit-file-probe-${nonce}`;

  // Single script, single spawn: echoes the env var (property 1), then attempts the file write
  // (property 2). Its own stderr on the write is discarded - a failed write (e.g. WSL's "$ASKIT_..."
  // vars are simply empty, so the target expands to nothing) is a normal, expected probe failure, not
  // something worth surfacing.
  const script =
    'printf \'ASKIT_PROBE_ENV_ECHO=%s\\n\' "$ASKIT_PROBE_ENV_VALUE"; ' +
    'printf \'%s\' "$ASKIT_PROBE_FILE_TOKEN" > "$ASKIT_PROBE_FILE_PATH" 2>/dev/null; ' +
    "exit 0";

  let stdout = "";
  let spawnError = null;
  try {
    stdout = execFileSync(candidatePath, ["-c", script], {
      env: {
        ...process.env,
        ASKIT_PROBE_ENV_VALUE: envValue,
        ASKIT_PROBE_FILE_TOKEN: fileToken,
        ASKIT_PROBE_FILE_PATH: probeFile,
      },
      encoding: "utf8",
      timeout: 6000,
      windowsHide: true,
    });
  } catch (e) {
    spawnError = e.code || e.signal || e.message;
    stdout = String(e.stdout ?? "");
  }

  const envOk = stdout.includes(`ASKIT_PROBE_ENV_ECHO=${envValue}`);
  let fileOk = false;
  try {
    fileOk = existsSync(probeFile) && readFileSync(probeFile, "utf8") === fileToken;
  } catch {
    fileOk = false;
  }

  rmSync(probeDir, { recursive: true, force: true });

  return { pass: envOk && fileOk, envOk, fileOk, spawnError };
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
 * SysWOW64 case); passing that pre-filter grants nothing. Acceptance requires passing `probeCandidate`:
 * one spawn, both properties (env-inheritance and shared-filesystem round trip) must hold. The first
 * candidate to pass wins, short-circuiting immediately; every candidate that failed - whether by the
 * pre-filter or the probe - is recorded in `rejected` with why, including its resolved symlink target
 * when it has one.
 *
 * Returns `{ bash, source, searched, rejected }` on success (`bash` is a ready-to-exec path or the
 * literal string "bash"), or `{ bash: null, source: null, searched, rejected, reasonForFailure }` when
 * no candidate passed.
 */
export function resolveBash() {
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

    const probe = probeCandidate(candidate);
    if (probe.pass) {
      return { bash: candidate, source: `${origin}, verified by behavioral probe (env-inheritance and shared-filesystem both round-tripped)`, searched, rejected, probe };
    }

    rejected.push({
      path: candidate,
      reason: probe.spawnError
        ? `failed to spawn${targetNote}: ${probe.spawnError}`
        : `failed the behavioral probe${targetNote}: env-inheritance=${probe.envOk ? "ok" : "FAILED"}, shared-filesystem=${probe.fileOk ? "ok" : "FAILED"} (does not share this process's environment/filesystem - this is what a WSL bash launcher looks like from here, regardless of its path)`,
    });
  }

  return {
    bash: null,
    source: null,
    searched,
    rejected,
    reasonForFailure:
      `no candidate passed the behavioral probe (env-inheritance + shared-filesystem round trip) among ${searched.length} checked. ` +
      rejected.map((r) => `${r.path}: ${r.reason}`).join("; "),
  };
}
