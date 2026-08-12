// what-it-is:   the bash resolver shared by tests that run action.yml's real shell step
// what-it-does: resolves an explicit, filesystem-verified path to a bash that shares the Windows
//               filesystem, instead of trusting PATH; on win32 it actively rejects the WSL launcher
//               even when PATH resolution offers nothing else
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
// used-by:      tests/unit/action-run-step.test.mjs
import { existsSync } from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

// The WSL launcher always lives directly under one of these Windows system directories, regardless of
// which Linux distribution WSL would actually launch underneath it.
const WSL_LAUNCHER_DIR_PATTERNS = [/\\windows\\system32\\/i, /\\windows\\sysnative\\/i, /\\windows\\syswow64\\/i];

/** True when `candidatePath` is the WSL launcher stub, not a real Windows-filesystem-sharing bash. */
export function isWslLauncherPath(candidatePath) {
  const normalized = path.resolve(candidatePath).toLowerCase();
  return normalized.endsWith("\\bash.exe") && WSL_LAUNCHER_DIR_PATTERNS.some((re) => re.test(normalized));
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
 * On POSIX, plain "bash" via PATH is correct and safe - returned unchanged.
 *
 * On win32, PATH is never trusted directly. Explicit Git-for-Windows install locations are checked
 * first (filesystem existence, not PATH). Only if none of those exist does this fall back to whatever
 * PATH resolves, and even then every PATH candidate that is the WSL launcher is rejected outright and
 * recorded in `rejected` - it is never silently accepted just because nothing else was found.
 *
 * Returns `{ bash, source, searched, rejected }` on success (`bash` is a ready-to-exec path or the
 * literal string "bash"), or `{ bash: null, source: null, searched, rejected, reasonForFailure }` when
 * no suitable bash exists.
 */
export function resolveBash() {
  if (process.platform !== "win32") {
    return { bash: "bash", source: "PATH (POSIX platform: PATH resolution is safe here)", searched: [], rejected: [] };
  }

  const searched = [];
  const rejected = [];

  for (const candidate of explicitGitBashCandidates()) {
    searched.push(candidate);
    if (existsSync(candidate)) {
      return { bash: candidate, source: "explicit Git-for-Windows install location", searched, rejected };
    }
  }

  for (const candidate of pathResolvedCandidates()) {
    searched.push(candidate);
    if (isWslLauncherPath(candidate)) {
      rejected.push({
        path: candidate,
        reason: "WSL launcher: does not inherit Windows env vars, would silently reproduce the RUNNER_TEMP defect",
      });
      continue;
    }
    if (existsSync(candidate)) {
      return { bash: candidate, source: "PATH (verified: not the WSL launcher)", searched, rejected };
    }
  }

  return {
    bash: null,
    source: null,
    searched,
    rejected,
    reasonForFailure:
      "no Git Bash found at any known Git-for-Windows install location, and PATH resolution produced only " +
      "the WSL launcher and/or nothing else. Looked in: " +
      searched.join(", ") +
      (rejected.length > 0 ? `. Rejected: ${rejected.map((r) => `${r.path} (${r.reason})`).join("; ")}` : ""),
  };
}
