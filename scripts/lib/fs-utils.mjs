import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

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

/** Absolute paths of agents/*.md subagent definitions, excluding _-prefixed control files (_chain-permitted.yaml, _pairing.yaml). */
export function listAgentFiles(root) {
  const agentsRoot = path.join(root, "agents");
  if (!existsSync(agentsRoot) || !statSync(agentsRoot).isDirectory()) return [];
  return readdirSync(agentsRoot)
    .filter((name) => name.endsWith(".md") && !name.startsWith("_"))
    .map((name) => path.join(agentsRoot, name))
    // fileExists guards against a *directory* named "<x>.md" (it would pass the name
    // filter but is not a subagent); mirrors the isDirectory guard in listSkillDirs.
    .filter((p) => fileExists(p));
}

/** Absolute paths of commands/*.md definitions, excluding _-prefixed control files. */
export function listCommandFiles(root) {
  const commandsRoot = path.join(root, "commands");
  if (!existsSync(commandsRoot) || !statSync(commandsRoot).isDirectory()) return [];
  return readdirSync(commandsRoot)
    .filter((name) => name.endsWith(".md") && !name.startsWith("_"))
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
