// what-it-is:   the plugin loader
// what-it-does: builds the check context (root, library, skills, subagents, agentDocs, commands, workflows, manifests) that every check reads
// why:          loading once into a shared context keeps each check synchronous and free of its own I/O setup
// used-by:      imported by scripts/check.mjs, tier-report.mjs, evaluate.mjs, and the unit tests
import { readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { readJsonSafe, fileExists, listSkillDirs, listAgentFiles, listRuntimeAgentDocs, listCommandFiles, listWorkflowFiles } from "./fs-utils.mjs";
import { parseFrontmatter } from "./frontmatter.mjs";

const isDir = (p) => existsSync(p) && statSync(p).isDirectory();

/**
 * The plugin SHAPE test: a directory looks like a plugin if it carries library.json, AGENTS.md, or a
 * skills/ subdirectory. Lives here, in the loader, rather than privately inside evaluate.mjs, because
 * marketplace scope (ADR 0039) has to ask the same question of every catalogue member and importing it
 * back out of evaluate.mjs would be a cycle. One copy means a member and a directly-graded plugin can
 * never be judged by two drifting definitions of "is this a plugin".
 */
export function looksLikePlugin(target) {
  return (
    existsSync(path.join(target, "library.json")) ||
    existsSync(path.join(target, "AGENTS.md")) ||
    isDir(path.join(target, "skills"))
  );
}

/** Load one skill directory into a SkillInfo. Read failure becomes a parseError (fail-safe). */
export function loadSkill(dir) {
  const skillMdPath = path.join(dir, "SKILL.md");
  let raw;
  try {
    raw = readFileSync(skillMdPath, "utf8");
  } catch (e) {
    return { name: path.basename(dir), dir, skillMdPath, raw: null, frontmatter: null, body: "", parseError: e.message };
  }
  const { frontmatter, body, parseError } = parseFrontmatter(raw);
  return { name: path.basename(dir), dir, skillMdPath, raw, frontmatter, body, parseError };
}

/** Load one agents/<name>.md into a SubagentInfo (parallel to loadSkill). Read failure becomes a parseError (fail-safe). */
export function loadSubagent(file) {
  let raw;
  try {
    raw = readFileSync(file, "utf8");
  } catch (e) {
    return { name: path.basename(file, ".md"), file, raw: null, frontmatter: null, body: "", parseError: e.message };
  }
  const { frontmatter, body, parseError } = parseFrontmatter(raw);
  return { name: path.basename(file, ".md"), file, raw, frontmatter, body, parseError };
}

/** Load one commands/<name>.md into a CommandInfo (parallel to loadSubagent). */
export function loadCommand(file) {
  let raw;
  try {
    raw = readFileSync(file, "utf8");
  } catch (e) {
    return { name: path.basename(file, ".md"), file, raw: null, frontmatter: null, body: "", parseError: e.message };
  }
  const { frontmatter, body, parseError } = parseFrontmatter(raw);
  return { name: path.basename(file, ".md"), file, raw, frontmatter, body, parseError };
}

/** @returns {PluginContext} */
export function loadPlugin(root) {
  const libPath = path.join(root, "library.json");
  const library = { path: libPath, ...readJsonSafe(libPath) };

  const agentsMd = path.join(root, "AGENTS.md");
  const agentsMdPath = fileExists(agentsMd) ? agentsMd : null;

  const skills = listSkillDirs(root).map((dir) => loadSkill(dir));
  const subagents = listAgentFiles(root).map((f) => loadSubagent(f));
  // Everything the RUNTIME loads from agents/, a superset of what the plugin registers: README.md and
  // underscore-prefixed files are excluded from registration and loaded anyway. A check about what a
  // plugin SHIPS must read this list, not `subagents`.
  const agentDocs = listRuntimeAgentDocs(root).map((f) => loadSubagent(f));
  const commands = listCommandFiles(root).map((f) => loadCommand(f));
  // Workflows are a first-class Convergent component (Standard sec 3.4) that the loader never knew
  // about, so `S7` read `ctx.workflows` and always got `undefined`: a command declaring
  // `maps-to: <a real workflow>` was reported as resolving to nothing, which is a gate finding making
  // a FALSE statement about the consumer's filesystem. `loadSubagent` is reused for the shape, and the
  // name is the FILENAME basename, not a frontmatter field - workflows in the wild carry `title`, and
  // the basename is what both `maps-to` and the Standard's `_workflows/<name>.md` refer to.
  const workflows = listWorkflowFiles(root).map((f) => loadSubagent(f));

  const claude = readJsonSafe(path.join(root, ".claude-plugin", "plugin.json"));
  const codex = readJsonSafe(path.join(root, ".codex-plugin", "plugin.json"));

  // One portable .mcp.json at the plugin root holds ALL servers (Standard sec 3.9).
  // Parse its mcpServers map into a list of { name, def }; absent => [].
  const mcp = readJsonSafe(path.join(root, ".mcp.json"));
  const mcpPresent = mcp.data !== null || mcp.parseError !== null;
  const mcpMap = mcp.data && typeof mcp.data.mcpServers === "object" && mcp.data.mcpServers !== null ? mcp.data.mcpServers : null;
  const mcpServers = mcpMap ? Object.entries(mcpMap).map(([name, def]) => ({ name, def })) : [];
  const mcpPath = mcpPresent ? ".mcp.json" : null;
  const mcpParseError = mcp.parseError;
  // Present + valid JSON but no usable mcpServers object => malformed (mcp-valid fails closed).
  const mcpMalformed = mcpPresent && !mcp.parseError && mcpMap === null;

  return { root, library, agentsMdPath, skills, subagents, agentDocs, commands, workflows, claudeManifest: claude.data, codexManifest: codex.data, mcpServers, mcpPath, mcpParseError, mcpMalformed };
}
