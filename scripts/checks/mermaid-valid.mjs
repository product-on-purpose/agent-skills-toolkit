// what-it-is:   the U12 mermaid-valid Bronze check
// what-it-does: structurally validates every fenced ```mermaid block in tracked .md/.mdx files
//               (non-empty, recognized first keyword, brackets balanced ignoring quotes, no tabs)
// why:          a malformed diagram renders as a broken box on the docs site; this portable gate
//               catches it deterministically without the heavy mermaid runtime (the astro-mermaid
//               build is the render-time second layer of the toolkit's two-layer philosophy)
// used-by:      scripts/lib/registry.mjs (the CHECKS array), scripts/check.mjs, scripts/tier-report.mjs
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { relPath } from "../lib/fs-utils.mjs";
import { finding, SEVERITY } from "../lib/findings.mjs";
import { SKIP_DIRS } from "./no-dashes.mjs"; // shared directory skip set, matched by basename at any depth

export const meta = { id: "mermaid-valid", tier: "universal", reqId: "U12" };

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
    for (const b of extractMermaidBlocks(text)) {
      if (b.unterminated) {
        out.push(finding(meta.id, SEVERITY.ERROR, `unterminated mermaid fence starting at line ${b.startLine}.`, { file: rel, reqId: meta.reqId }));
        continue;
      }
      const body = b.body;
      if (body.trim() === "") {
        out.push(finding(meta.id, SEVERITY.ERROR, `mermaid block at line ${b.startLine} is empty.`, { file: rel, reqId: meta.reqId }));
        continue;
      }
      const first = body.split(/\r?\n/).find((l) => l.trim() !== "")?.trim() ?? "";
      if (!DIAGRAM_KEYWORDS.some((kw) => first.startsWith(kw))) {
        out.push(finding(meta.id, SEVERITY.ERROR, `mermaid block at line ${b.startLine} does not start with a recognized diagram keyword (got ${JSON.stringify(first.split(/\s+/)[0])}).`, { file: rel, reqId: meta.reqId }));
      }
      if (!bracketsBalanced(body)) {
        out.push(finding(meta.id, SEVERITY.ERROR, `mermaid block at line ${b.startLine} has unbalanced brackets [] () {} or an unterminated quote (quotes ignored for bracket counting).`, { file: rel, reqId: meta.reqId }));
      }
      if (body.includes("\t")) {
        out.push(finding(meta.id, SEVERITY.ERROR, `mermaid block at line ${b.startLine} contains a tab character; mermaid is whitespace-sensitive, use spaces.`, { file: rel, reqId: meta.reqId }));
      }
    }
  }
  return out;
}
