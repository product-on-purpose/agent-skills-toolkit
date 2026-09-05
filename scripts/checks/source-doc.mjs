// what-it-is:   the source-doc Gold check (G9)
// what-it-does: walks the in-scope source roots and asserts every hand-authored .mjs/.js/.py carries a
//               four-field header docblock (what-it-is / what-it-does / why / used-by) in its first lines
// why:          ADR 0024 D1.2 documents source via folder-READMEs plus header docblocks (not a sibling
//               .md per file); this enforces the docblock half so the tree stays self-orienting, no rot
// used-by:      registered in scripts/lib/registry.mjs; run by scripts/check.mjs; covered by tests/unit/source-doc.test.mjs
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { relPath, SKIP_DIRS } from "../lib/fs-utils.mjs"; // SKIP_DIRS: shared directory skip set, matched by basename at any depth
import { finding, SEVERITY } from "../lib/findings.mjs";

export const meta = { id: "source-doc", tier: "advanced", reqId: "G9", since: "0.10", provenance: "house" };

const HEADER_LINES = 30;
// The most of one header line fieldPresent examines. A docblock label line is never anywhere near this
// long, and the cap is what bounds the label match below on a pathological line (see fieldPresent).
const MAX_LINE = 2000;
const EXT = /\.(mjs|js|py)$/;

// Path fragments (slash-normalized) skipped wherever they occur: intentional fixtures and generated output.
const SKIP_PATHS = ["tests/fixtures/", "site/src/content/docs/"];

// In-scope source roots, relative to the plugin root - only these are walked, which bounds the check and
// keeps it from touching tests/fixtures or the whole repo. A root with no in-scope source contributes
// nothing; today the toolkit's source lives under scripts/, site/scripts/, and hooks/.
const SCOPE_ROOTS = ["scripts", "site/scripts", "hooks"];

// The four logical fields and their recognized aliases (normalized: lowercased, separators removed) plus
// the JSDoc-tag form. Accepting both the lowercase `what-it-is:` and uppercase `WHAT IT IS:` styles, and
// `@what`/`@does`/`@why`/`@usedby`, is presence-not-format (the check never grades prose, only presence).
// Aliases are the full, unambiguous label forms only (no bare "what" / "does" / "uses"): a one-word
// stray comment like "// uses: the foo helper" must NOT satisfy the used-by field. "why" is the key
// itself (the canonical label), so it is matched as the key, not added as a short alias.
export const FIELDS = [
  { key: "what-it-is",   aliases: ["whatitis"],               tag: "@what" },
  { key: "what-it-does", aliases: ["whatitdoes"],             tag: "@does" },
  { key: "why",          aliases: ["whyitmatters"],           tag: "@why" },
  { key: "used-by",      aliases: ["usedby", "whatusesit"],   tag: "@usedby" },
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
    // Trimmed and capped BEFORE either match. The label pattern ends in `\s*:\s*(.*\S)\s*$`, which is
    // quadratic on trailing whitespace: every retreat of the greedy `\s*` re-runs `(.*\S)` over the
    // rest of the line, so a first line of `// what-it-is:` followed by 300000 spaces never finished
    // and hung the whole gate. Trimming removes the run entirely; the cap bounds whatever is left.
    const line = m[2].trim().slice(0, MAX_LINE);
    // The value must be non-empty after trimming (one or more non-space chars), so `// why:` with no
    // value fails while a single-character value passes.
    const tagMatch = line.match(/^(@\w+)\s+(.*\S)\s*$/);
    if (tagMatch && tagMatch[1].toLowerCase() === field.tag) return true;
    const labMatch = line.match(/^([A-Za-z][A-Za-z\-_ ]*?)\s*:\s*(.*\S)\s*$/);
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
