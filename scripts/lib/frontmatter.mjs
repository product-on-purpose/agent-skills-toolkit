import { parse as parseYaml } from "yaml";

const FENCE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

/**
 * @param {string} text full SKILL.md contents
 * @returns {{frontmatter: object|null, body: string, parseError: string|null}}
 */
export function parseFrontmatter(text) {
  const m = text.match(FENCE);
  if (!m) {
    return { frontmatter: null, body: text, parseError: "missing YAML frontmatter (--- fenced block at top)" };
  }
  try {
    const data = parseYaml(m[1]);
    if (data === null || typeof data !== "object" || Array.isArray(data)) {
      return { frontmatter: null, body: m[2], parseError: "frontmatter is not a key/value map" };
    }
    return { frontmatter: data, body: m[2], parseError: null };
  } catch (e) {
    return { frontmatter: null, body: m[2], parseError: e.message };
  }
}
