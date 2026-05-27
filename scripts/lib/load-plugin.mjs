import { readFileSync } from "node:fs";
import path from "node:path";
import { readJsonSafe, fileExists, listSkillDirs } from "./fs-utils.mjs";
import { parseFrontmatter } from "./frontmatter.mjs";

/** @returns {PluginContext} */
export function loadPlugin(root) {
  const libPath = path.join(root, "library.json");
  const library = { path: libPath, ...readJsonSafe(libPath) };

  const agentsMd = path.join(root, "AGENTS.md");
  const agentsMdPath = fileExists(agentsMd) ? agentsMd : null;

  const skills = listSkillDirs(root).map((dir) => {
    const skillMdPath = path.join(dir, "SKILL.md");
    let raw;
    try {
      raw = readFileSync(skillMdPath, "utf8");
    } catch (e) {
      return { name: path.basename(dir), dir, skillMdPath, raw: null, frontmatter: null, body: "", parseError: e.message };
    }
    const { frontmatter, body, parseError } = parseFrontmatter(raw);
    return { name: path.basename(dir), dir, skillMdPath, raw, frontmatter, body, parseError };
  });

  return { root, library, agentsMdPath, skills };
}
