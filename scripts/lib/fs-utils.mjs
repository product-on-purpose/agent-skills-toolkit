// what-it-is:   the filesystem helpers
// what-it-does: provides relPath, normalizeArgPath, the component-discovery listers (skills, agents, commands), and other fs helpers
// why:          centralizes path normalization and component discovery so a folder README is never mistaken for a component
// used-by:      imported by the checks, generators, the CLI entry points, and the plugin loader
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

/**
 * Directory names skipped by repo-wide content scanners, matched by basename at any depth:
 * dependency dirs, gitignored scratch, and build-output / tool-cache dirs. Generated artifacts
 * are not authored text, so content hygiene does not apply to them. Defined once here and shared
 * by every repo-wide content scanner (U12 mermaid-valid, G8 folder-readme, S6 source-doc,
 * and evaluate.mjs).
 *
 * Grouped by ecosystem, because the set is graded against third-party plugins and a category
 * covered for one language but not another produces findings that are the toolkit's fault, not
 * the plugin's. Python entries were added after a Python-bearing plugin was reported three G8
 * folder-readme findings for its bytecode caches.
 */
export const SKIP_DIRS = new Set([
  // version control
  ".git",
  // dependency directories
  "node_modules", ".venv", "venv",
  // build output
  "dist", ".astro",
  // tool caches
  ".memsearch", "__pycache__", ".pytest_cache", ".mypy_cache", ".ruff_cache", ".tox",
  // gitignored agent/author scratch
  "_local", "_LOCAL", "_agent-context",
]);

/** Repo-relative, slash-normalized path. Falls back to abs if root is falsy. */
export function relPath(root, abs) {
  return root ? path.relative(root, abs).split(path.sep).join("/") : abs;
}

/**
 * Normalize a filesystem path taken from argv (a CLI positional or a path-valued flag) before it reaches
 * anything else. This closes the recorded defect where a backslash path handed to a CLI entry point on
 * Windows was silently read as a different directory, so the gate graded an empty tree and printed a
 * clean pass (see docs/how-to/troubleshoot-the-gate.md and tests/unit/eval-run.test.mjs).
 *
 * On Windows (`sep === "\\"`, the default - taken from the live `path.sep`) backslashes are converted to
 * forward slashes. On POSIX (`sep === "/"`) the value is returned unchanged apart from trimming: a
 * backslash is a LEGAL filename character there ("my\dir" is a real directory, distinct from "my/dir"),
 * so an unconditional swap would silently resolve to the WRONG path in the opposite direction - the same
 * class of defect, just facing the other way. Do not "simplify" this guard away; the asymmetry is
 * deliberate and both branches are exercised, with an injected separator, in tests/unit/fs-utils.test.mjs
 * so neither platform's behavior can regress unnoticed by only running the suite on the other one.
 *
 * `sep` is a parameter (not read internally from `path.sep` unconditionally) purely so tests can force
 * both branches deterministically on any host.
 *
 * Distinct from scripts/lib/eval-run.mjs's resolvePosix(), which intentionally swaps UNCONDITIONALLY: it
 * normalizes a clone path sourced from the TRACKED CORPUS MANIFEST, which may be authored on one OS and
 * read on another - there, portability of the pinned reference outranks the rare POSIX literal-backslash
 * filename. normalizeArgPath is for a path a human typed on the machine actually running the command
 * right now, where that POSIX case is real and must be respected. The two rules are intentionally
 * different; see resolvePosix's own docblock for the mirror of this note.
 */
export function normalizeArgPath(p, sep = path.sep) {
  const s = String(p ?? "").trim();
  if (!s) return s;
  return sep === "\\" ? s.split("\\").join("/") : s;
}

export function fileExists(p) {
  return existsSync(p) && statSync(p).isFile();
}

/** Read + parse JSON. Missing file => {data:null,parseError:null}; bad JSON => {data:null,parseError:string}. */
export function readJsonSafe(p) {
  if (!existsSync(p)) return { data: null, parseError: null };
  try {
    return { data: JSON.parse(readFileSync(p, "utf8")), parseError: null };
  } catch (e) {
    return { data: null, parseError: e.message };
  }
}

/** Absolute paths of immediate subdirs of <root>/skills that contain a SKILL.md. */
export function listSkillDirs(root) {
  const skillsRoot = path.join(root, "skills");
  if (!existsSync(skillsRoot) || !statSync(skillsRoot).isDirectory()) return [];
  return readdirSync(skillsRoot)
    .map((name) => path.join(skillsRoot, name))
    .filter((dir) => statSync(dir).isDirectory() && fileExists(path.join(dir, "SKILL.md")));
}

/** Absolute paths of agents/*.md subagent definitions, excluding _-prefixed control files (_chain-permitted.yaml, _pairing.yaml) and a folder README.md (a folder guide is not a component). */
export function listAgentFiles(root) {
  const agentsRoot = path.join(root, "agents");
  if (!existsSync(agentsRoot) || !statSync(agentsRoot).isDirectory()) return [];
  return readdirSync(agentsRoot)
    .filter((name) => name.endsWith(".md") && !name.startsWith("_") && name !== "README.md")
    .map((name) => path.join(agentsRoot, name))
    // fileExists guards against a *directory* named "<x>.md" (it would pass the name
    // filter but is not a subagent); mirrors the isDirectory guard in listSkillDirs.
    .filter((p) => fileExists(p));
}

/** Absolute paths of commands/*.md definitions, excluding _-prefixed control files and a folder README.md. */
export function listCommandFiles(root) {
  const commandsRoot = path.join(root, "commands");
  if (!existsSync(commandsRoot) || !statSync(commandsRoot).isDirectory()) return [];
  return readdirSync(commandsRoot)
    .filter((name) => name.endsWith(".md") && !name.startsWith("_") && name !== "README.md")
    .map((name) => path.join(commandsRoot, name))
    // fileExists guards against a directory named "<x>.md" (mirrors listAgentFiles).
    .filter((p) => fileExists(p));
}

/** Recursively list file paths under dir (absolute). [] if dir missing. */
export function walkFiles(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walkFiles(full));
    else out.push(full);
  }
  return out;
}
