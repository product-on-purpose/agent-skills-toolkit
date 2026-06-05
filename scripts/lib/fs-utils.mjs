// what-it-is:   the filesystem helpers
// what-it-does: provides relPath, the component-discovery listers (skills, agents, commands), and other fs helpers
// why:          centralizes path normalization and component discovery so a folder README is never mistaken for a component
// used-by:      imported by the checks, generators, and the plugin loader
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

/**
 * Directory names skipped by repo-wide content scanners, matched by basename at any depth:
 * dependency dirs, gitignored scratch, and build-output / tool-cache dirs. Generated artifacts
 * are not authored text, so content hygiene does not apply to them. Defined once here and shared
 * by the repo-wide content checks (U12 mermaid-valid, G8 folder-readme).
 */
export const SKIP_DIRS = new Set(["node_modules", ".git", ".memsearch", "_local", "_LOCAL", "_agent-context", "dist", ".astro"]);

/** Repo-relative, slash-normalized path. Falls back to abs if root is falsy. */
export function relPath(root, abs) {
  return root ? path.relative(root, abs).split(path.sep).join("/") : abs;
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
