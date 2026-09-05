// what-it-is:   the frontmatter parser
// what-it-does: parses YAML frontmatter into { frontmatter, body, parseError } with a single runtime dependency (yaml)
// why:          every frontmatter check reads through one parser so parse behavior is consistent and fail-safe
// used-by:      imported by frontmatter-valid, docs-frontmatter, folder-readme, and the loaders
import { parse as parseYaml } from "yaml";

const FENCE = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/;

/**
 * @param {string} text full SKILL.md contents
 * @returns {{frontmatter: object|null, body: string, parseError: string|null}}
 */
export function parseFrontmatter(text) {
  // A UTF-8 byte-order mark survives readFileSync(..., "utf8") as a leading U+FEFF, and FENCE is anchored
  // at the start of the string, so a SKILL.md saved by an editor that writes one was graded "missing YAML
  // frontmatter" and the plugin fell to Tier: None. The mark is an encoding signature, not content, so
  // it is dropped before the match and never reaches the body (tests/unit/frontmatter.test.mjs).
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
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
