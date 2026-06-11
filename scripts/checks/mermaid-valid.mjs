// what-it-is:   the U12 mermaid-valid Bronze check
// what-it-does: structurally validates every fenced ```mermaid block in tracked .md/.mdx files
//               (non-empty; a recognized diagram keyword on the first diagram line, after any leading
//               %%{init}%% directive, %% comment, or --- config block; brackets balanced ignoring
//               quotes and comments; no tabs)
// why:          a malformed diagram renders as a broken box on the docs site; this portable gate
//               catches it deterministically without the heavy mermaid runtime (the astro-mermaid
//               build is the render-time second layer of the toolkit's two-layer philosophy)
// used-by:      scripts/lib/registry.mjs (the CHECKS array), scripts/check.mjs, scripts/tier-report.mjs
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { relPath, SKIP_DIRS } from "../lib/fs-utils.mjs"; // SKIP_DIRS: shared directory skip set, matched by basename at any depth
import { finding, SEVERITY } from "../lib/findings.mjs";

export const meta = { id: "mermaid-valid", tier: "universal", reqId: "U12", since: "0.10", provenance: "objective" };

// The recognized Mermaid diagram-type keywords, kept in one named constant so a new diagram type is a
// one-line addition. Covers the current Mermaid registry (mermaid-js/mermaid diagram-orchestration):
// the classic types plus the full C4 family and the newer (-beta) types. Rule 2 is a startsWith match,
// so a longer keyword that is a prefix of another (block-beta / block, packet-beta / packet) is harmless
// to list both ways; order does not affect correctness because any prefix match passes.
const DIAGRAM_KEYWORDS = [
  "flowchart", "graph", "sequenceDiagram", "classDiagram",
  "stateDiagram-v2", "stateDiagram", "erDiagram", "journey",
  "gantt", "pie", "mindmap", "timeline", "quadrantChart", "gitGraph",
  "C4Context", "C4Container", "C4Component", "C4Dynamic", "C4Deployment",
  "xychart-beta", "sankey-beta", "block-beta", "block", "requirementDiagram",
  "packet-beta", "packet", "kanban", "architecture-beta", "radar-beta",
  "treemap", "zenuml", "info",
];

const SCAN = /\.(md|mdx)$/;

// The generated Pattern S docs collection (ADR 0024 D2): immediate subdirectories of this path are
// emitted from docs/** by site/scripts/gen-docs-site.mjs on every build, gitignored, and rebuilt - so
// scanning them makes U12's result depend on whether the site was built. Their mermaid blocks are
// verbatim copies of the public docs/ blocks (already validated at their source), so skipping the
// generated subtrees keeps U12 deterministic without losing coverage. The hand-authored landing pages,
// which are FILES directly under this path (not in subdirectories), stay in scope.
const GENERATED_DOCS = ["site", "src", "content", "docs"].join("/");

function collect(root, dir, out) {
  const relDir = path.relative(root, dir).split(path.sep).join("/");
  let entries;
  try { entries = readdirSync(dir); } catch { return; }
  for (const name of entries) {
    if (SKIP_DIRS.has(name)) continue; // skip node_modules/.git/dist/.astro/_local/... by basename
    const full = path.join(dir, name);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) {
      if (relDir === GENERATED_DOCS) continue; // skip the generated Pattern S quadrant subtrees
      collect(root, full, out);
    } else if (SCAN.test(name)) {
      out.push(full);
    }
  }
}

const blankRun = (s) => s.replace(/[^\n]/g, " "); // keep newlines, blank everything else
const FENCE_OPEN = /^\s*(`{3,}|~{3,})/; // an opener is >= 3 of the same marker (info string may follow)

// Neutralize HTML comments before extracting blocks, but ONLY a comment that BEGINS OUTSIDE a code
// fence. A ```mermaid block commented out in `<!-- ... -->` is not rendered, so validating it is a false
// positive (the C1 templates keep an erDiagram EXAMPLE inside a comment) - that comment is blanked so the
// fence no longer matches. But a `<!-- ... -->`-looking span INSIDE a live fence is diagram source the
// renderer receives verbatim, NOT a Markdown comment, so it must be left intact and validated (the
// adversarial-review catch: never validate a sanitized body the renderer will not see). Fence tracking
// follows CommonMark closer rules - the SAME marker, length >= the opener, and only whitespace after -
// so a body line that merely starts with ``` (with trailing text) does not falsely close a live block.
// Blanking preserves newlines so finding line numbers are unchanged.
function stripHtmlComments(text) {
  const lines = (text || "").split("\n");
  let fence = null; // { marker: "`"|"~", len } while inside a fenced block
  let inComment = false;
  for (let i = 0; i < lines.length; i++) {
    if (inComment) {
      const end = lines[i].indexOf("-->");
      if (end === -1) { lines[i] = blankRun(lines[i]); continue; }
      lines[i] = blankRun(lines[i].slice(0, end + 3)) + lines[i].slice(end + 3);
      inComment = false;
      continue;
    }
    if (fence) {
      const close = lines[i].match(/^\s*(`{3,}|~{3,})\s*$/); // closer: marker run, only whitespace after
      if (close && close[1][0] === fence.marker && close[1].length >= fence.len) fence = null;
      continue; // leave fence content (incl. any <!--) untouched
    }
    // Outside a fence and a comment: an opening fence wins over inline-comment handling on this line (its
    // ``` info string is fence syntax, not prose); else blank complete inline comments and, if a comment
    // opens unclosed here, it owns the rest of the document until --> (a ``` it wraps is comment content).
    const open = lines[i].match(FENCE_OPEN);
    if (open) { fence = { marker: open[1][0], len: open[1].length }; continue; }
    let line = lines[i].replace(/<!--[\s\S]*?-->/g, blankRun);
    const c = line.indexOf("<!--");
    if (c !== -1) { lines[i] = line.slice(0, c) + blankRun(line.slice(c)); inComment = true; continue; }
    lines[i] = line;
  }
  return lines.join("\n");
}

// A mermaid block whose body is nothing but {{PLACEHOLDER}} token lines is a TEMPLATE SLOT: the skill
// substitutes the real diagram at generation time, so there is no live diagram to structurally validate
// (the C1 documentation templates are full of these). Require at least one non-blank line and that every
// non-blank line be a lone `{{NAME}}` token (Finding 5 / ADR 0032).
function isTemplatePlaceholder(bodyLines) {
  const nonBlank = bodyLines.filter((l) => l.trim() !== "");
  return nonBlank.length > 0 && nonBlank.every((l) => /^\s*\{\{[^{}]*\}\}\s*$/.test(l));
}

/** Extract fenced mermaid blocks: returns [{ startLine, body, unterminated? }]. Allows an indented
 *  fence and an info string after the word `mermaid` (e.g. inside MDX components); the closer is any
 *  indented or column-0 ``` line. */
function extractMermaidBlocks(text) {
  const lines = text.split(/\r?\n/);
  const blocks = [];
  let open = null;
  for (let i = 0; i < lines.length; i++) {
    if (open === null && /^\s*```mermaid(\s.*)?$/.test(lines[i])) { open = { startLine: i + 1, body: [] }; continue; }
    if (open !== null && /^\s*```\s*$/.test(lines[i])) { open.body = open.body.join("\n"); blocks.push(open); open = null; continue; }
    if (open !== null) open.body.push(lines[i]);
  }
  if (open !== null) { open.body = open.body.join("\n"); open.unterminated = true; blocks.push(open); }
  return blocks;
}

/** True iff brackets [] () {} balance across s, ignoring characters inside "..." quoted spans. An
 *  unterminated quote span (odd number of unescaped quotes) is itself malformed and fails: Mermaid
 *  escapes a literal quote as #quot;, not \", so a raw odd quote count is unambiguously suspect. The
 *  odd-quote parity-inversion subset that still balances is delegated to the render-time layer. */
function bracketsBalanced(s) {
  const closers = { "]": "[", ")": "(", "}": "{" };
  const stack = [];
  let inQuote = false;
  for (const ch of s) {
    if (ch === '"') { inQuote = !inQuote; continue; }
    if (inQuote) continue;
    if (ch === "[" || ch === "(" || ch === "{") stack.push(ch);
    else if (ch in closers) { if (stack.pop() !== closers[ch]) return false; }
  }
  return stack.length === 0 && !inQuote;
}

// Mermaid permits three constructs BEFORE the diagram-type line, all stripped by the renderer before
// it detects the type: a leading YAML frontmatter block fenced by `---`, `%%{init: ...}%%` theming
// directives, and `%%` line comments. Skip them, then return the first real diagram line so the
// keyword test does not false-reject a validly themed diagram (and so the finding can cite that line).
// Returns { index, text }: index is the 0-based line within bodyLines, or -1 if the body holds no
// diagram line (only frontmatter/directives/blanks).
function diagramLine(bodyLines) {
  let i = 0;
  while (i < bodyLines.length && bodyLines[i].trim() === "") i++; // leading blanks
  if (i < bodyLines.length && bodyLines[i].trim() === "---") {
    // a leading --- config frontmatter block: skip through its closing --- line
    let j = i + 1;
    while (j < bodyLines.length && bodyLines[j].trim() !== "---") j++;
    i = j < bodyLines.length ? j + 1 : bodyLines.length;
  }
  while (i < bodyLines.length) {
    const t = bodyLines[i].trim();
    if (t === "" || t.startsWith("%%")) { i++; continue; } // blanks, %%{init}%% directives, %% comments
    break;
  }
  return i < bodyLines.length ? { index: i, text: bodyLines[i].trim() } : { index: -1, text: "" };
}

/** Remove Mermaid `%%` line comments (and `%%{init}%%` directive lines) from s before bracket
 *  counting, honoring "..." quoted spans so a `%%` inside a label is kept as literal text. Without this
 *  a lone bracket in comment prose, or the {} in an init directive's JSON, would fail the balance rule. */
function stripComments(s) {
  let out = "";
  let inQuote = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '"') { inQuote = !inQuote; out += ch; continue; }
    if (!inQuote && ch === "%" && s[i + 1] === "%") {
      while (i < s.length && s[i] !== "\n") i++; // drop the rest of the line
      out += "\n"; // keep the line break so line structure is preserved
      continue;
    }
    out += ch;
  }
  return out;
}

/**
 * U12 (Bronze): every fenced ```mermaid block in a tracked .md/.mdx file is structurally well-formed.
 * Four rules: non-empty body; first non-blank line begins with a recognized diagram keyword; brackets
 * balanced ignoring quoted spans; no tab character. Repo-wide content hygiene (like U10 no-dashes, it
 * does NOT exclude docs/internal/), minus the generated Pattern S copies (kept deterministic). A file
 * with no mermaid block contributes nothing (vacuous pass). Structural only - a full Mermaid parse
 * needs the browser runtime; the astro-mermaid site build is the render-time layer (Design Principle 3).
 */
export function check(ctx) {
  const root = ctx.root;
  if (!root || !existsSync(root)) return [];
  const files = [];
  collect(root, root, files);
  const out = [];
  for (const f of files) {
    let text;
    try { text = readFileSync(f, "utf8"); } catch { continue; }
    if (!text.includes("```mermaid")) continue; // fast skip: no diagram -> vacuous for this file
    const rel = relPath(root, f);
    for (const b of extractMermaidBlocks(stripHtmlComments(text))) {
      if (b.unterminated) {
        out.push(finding(meta.id, SEVERITY.ERROR, `unterminated mermaid fence starting at line ${b.startLine}.`, { file: rel, reqId: meta.reqId }));
        continue;
      }
      const body = b.body;
      if (body.trim() === "") {
        out.push(finding(meta.id, SEVERITY.ERROR, `mermaid block at line ${b.startLine} is empty.`, { file: rel, reqId: meta.reqId }));
        continue;
      }
      // Find the diagram-type line, skipping any leading --- config block, %%{init}%% directive, and
      // %% comment lines (Mermaid strips these before detecting the type). Cite that line, not the fence.
      const bodyLines = body.split(/\r?\n/);
      if (isTemplatePlaceholder(bodyLines)) continue; // a {{...}} template slot is not a live diagram
      const dl = diagramLine(bodyLines);
      const firstWord = dl.text.split(/\s+/)[0] ?? "";
      if (dl.index === -1 || !DIAGRAM_KEYWORDS.some((kw) => dl.text.startsWith(kw))) {
        const lineNo = dl.index === -1 ? b.startLine : b.startLine + 1 + dl.index;
        out.push(finding(meta.id, SEVERITY.ERROR, `mermaid block starting at line ${b.startLine} has no recognized diagram keyword on its first diagram line (line ${lineNo}, got ${JSON.stringify(firstWord)}).`, { file: rel, reqId: meta.reqId }));
      }
      // Strip %% comments/directives (honoring quotes) before counting, so a lone bracket in comment
      // prose or an init directive's JSON braces does not fail the balance rule.
      if (!bracketsBalanced(stripComments(body))) {
        out.push(finding(meta.id, SEVERITY.ERROR, `mermaid block at line ${b.startLine} has unbalanced brackets [] () {} or an unterminated quote (quotes ignored for bracket counting).`, { file: rel, reqId: meta.reqId }));
      }
      if (body.includes("\t")) {
        out.push(finding(meta.id, SEVERITY.ERROR, `mermaid block at line ${b.startLine} contains a tab character; mermaid is whitespace-sensitive, use spaces.`, { file: rel, reqId: meta.reqId }));
      }
    }
  }
  return out;
}
