// what-it-is:   the source-doc Gold check (G9)
// what-it-does: walks the in-scope source roots and asserts every hand-authored .mjs/.js/.py carries a
//               four-field header docblock (what-it-is / what-it-does / why / used-by) in its first lines
// why:          ADR 0024 D1.2 documents source via folder-READMEs plus header docblocks (not a sibling
//               .md per file); this enforces the docblock half so the tree stays self-orienting, no rot
// used-by:      registered in scripts/lib/registry.mjs; run by scripts/check.mjs; covered by tests/unit/source-doc.test.mjs
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { relPath } from "../lib/fs-utils.mjs";
import { finding, SEVERITY } from "../lib/findings.mjs";

export const meta = { id: "source-doc", tier: "advanced", reqId: "G9" };

const HEADER_LINES = 30;
const EXT = /\.(mjs|js|py)$/;

// Directories skipped by basename anywhere in the walk.
const SKIP_DIRS = new Set([
  "node_modules", ".git", "dist", ".astro",
  "_LOCAL", "_local", "_agent-context", ".memsearch",
]);

// Path fragments (slash-normalized) skipped wherever they occur: intentional fixtures and generated output.
const SKIP_PATHS = ["tests/fixtures/", "site/src/content/docs/"];

// In-scope source roots, relative to the plugin root - only these are walked, which bounds the check and
// keeps it from touching tests/fixtures or the whole repo. A root with no in-scope source contributes
// nothing; today the toolkit's source lives under scripts/, site/scripts/, and hooks/.
const SCOPE_ROOTS = ["scripts", "site/scripts", "hooks"];

// The four logical fields and their recognized aliases (normalized: lowercased, separators removed) plus
// the JSDoc-tag form. Accepting both the lowercase `what-it-is:` and uppercase `WHAT IT IS:` styles, and
// `@what`/`@does`/`@why`/`@usedby`, is presence-not-format (the check never grades prose, only presence).
export const FIELDS = [
  { key: "what-it-is",   aliases: ["whatitis", "what"],            tag: "@what" },
  { key: "what-it-does", aliases: ["whatitdoes", "does"],          tag: "@does" },
  { key: "why",          aliases: ["why", "whyitmatters"],         tag: "@why" },
  { key: "used-by",      aliases: ["usedby", "whatusesit", "uses"], tag: "@usedby" },
];

function norm(label) {
  return label.toLowerCase().replace(/[-_\s]+/g, "");
}

function collect(dir, out) {
  let entries;
  try { entries = readdirSync(dir); } catch { return; }
  for (const name of entries) {
    if (SKIP_DIRS.has(name)) continue;
    const full = path.join(dir, name);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) collect(full, out);
    else if (EXT.test(name)) out.push(full);
  }
}

/** True if any header line satisfies this field. The line MUST be a comment (//, #, or *), so a code
 *  line like `const x = { why: 1 }` cannot spuriously satisfy a field; the value after the label/tag
 *  must be non-empty. */
function fieldPresent(field, headerLines) {
  for (const raw of headerLines) {
    const m = raw.match(/^\s*(\/\/|#|\*)\s*(.*)$/); // require a comment marker
    if (!m) continue;
    const line = m[2];
    const tagMatch = line.match(/^(@\w+)\s+(.+\S)\s*$/);
    if (tagMatch && tagMatch[1].toLowerCase() === field.tag) return true;
    const labMatch = line.match(/^([A-Za-z][A-Za-z\-_ ]*?)\s*:\s*(.+\S)\s*$/);
    if (labMatch) {
      const n = norm(labMatch[1]);
      if (n === norm(field.key) || field.aliases.includes(n)) return true;
    }
  }
  return false;
}

/**
 * G9 (Gold): every hand-authored .mjs/.js/.py under the in-scope source roots carries a header docblock
 * with the four fields (what-it-is / what-it-does / why / used-by) in its first HEADER_LINES lines.
 * Presence plus the four keys only, never prose quality (Design Principle 3). Conditional: a plugin with
 * no in-scope source files passes vacuously. Advanced tier.
 */
export function check(ctx) {
  const root = ctx.root;
  if (!root || !existsSync(root)) return [];
  const files = [];
  for (const rel of SCOPE_ROOTS) {
    const dir = path.join(root, rel);
    if (existsSync(dir)) collect(dir, files);
  }
  const out = [];
  for (const f of files) {
    const rel = relPath(root, f);
    if (SKIP_PATHS.some((p) => rel.includes(p))) continue; // fixtures + generated output
    let header;
    try { header = readFileSync(f, "utf8").split(/\r?\n/).slice(0, HEADER_LINES); } catch { continue; }
    const missing = FIELDS.filter((field) => !fieldPresent(field, header)).map((field) => field.key);
    if (missing.length) {
      out.push(finding(meta.id, SEVERITY.ERROR, `source file is missing the header docblock field(s): ${missing.join(", ")}. Every hand-authored source file MUST carry what-it-is / what-it-does / why / used-by in its first ${HEADER_LINES} lines (ADR 0024 D1.2).`, { file: rel, reqId: meta.reqId }));
    }
  }
  return out;
}
