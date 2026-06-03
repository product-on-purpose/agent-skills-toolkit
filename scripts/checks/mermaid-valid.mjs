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

// One named constant, easy to extend with a new diagram type. Longer variants (stateDiagram-v2) are
// listed before their prefixes so the longer keyword is available to startsWith matching.
const DIAGRAM_KEYWORDS = [
  "flowchart", "graph", "sequenceDiagram", "classDiagram",
  "stateDiagram-v2", "stateDiagram", "erDiagram", "journey",
  "gantt", "pie", "mindmap", "timeline", "quadrantChart",
  "gitGraph", "C4Context",
];

const SCAN = /\.(md|mdx)$/;

function collect(dir, out) {
  let entries;
  try { entries = readdirSync(dir); } catch { return; }
  for (const name of entries) {
    if (SKIP_DIRS.has(name)) continue; // skip node_modules/.git/dist/.astro/_local/... by basename
    const full = path.join(dir, name);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) collect(full, out);
    else if (SCAN.test(name)) out.push(full);
  }
}

/** Extract fenced mermaid blocks: returns [{ startLine, body, unterminated? }]. */
function extractMermaidBlocks(text) {
  const lines = text.split(/\r?\n/);
  const blocks = [];
  let open = null;
  for (let i = 0; i < lines.length; i++) {
    if (open === null && /^```mermaid\s*$/.test(lines[i])) { open = { startLine: i + 1, body: [] }; continue; }
    if (open !== null && /^```\s*$/.test(lines[i])) { open.body = open.body.join("\n"); blocks.push(open); open = null; continue; }
    if (open !== null) open.body.push(lines[i]);
  }
  if (open !== null) { open.body = open.body.join("\n"); open.unterminated = true; blocks.push(open); }
  return blocks;
}

/** True iff brackets [] () {} balance across s, ignoring characters inside "..." quoted spans. */
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
  return stack.length === 0;
}

/**
 * U12 (Bronze): every fenced ```mermaid block in a tracked .md/.mdx file is structurally well-formed.
 * Four rules: non-empty body; first non-blank line begins with a recognized diagram keyword; brackets
 * balanced ignoring quoted spans; no tab character. Repo-wide content hygiene (like U10 no-dashes, it
 * does NOT exclude docs/internal/). A file with no mermaid block contributes nothing (vacuous pass).
 * Structural only - a full Mermaid parse needs the browser runtime; the astro-mermaid site build is the
 * render-time layer (Design Principle 3: portable gate plus build-time evidence).
 */
export function check(ctx) {
  const root = ctx.root;
  if (!root || !existsSync(root)) return [];
  const files = [];
  collect(root, files);
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
        out.push(finding(meta.id, SEVERITY.ERROR, `mermaid block at line ${b.startLine} has unbalanced brackets [] () {} (quotes ignored).`, { file: rel, reqId: meta.reqId }));
      }
      if (body.includes("\t")) {
        out.push(finding(meta.id, SEVERITY.ERROR, `mermaid block at line ${b.startLine} contains a tab character; mermaid is whitespace-sensitive, use spaces.`, { file: rel, reqId: meta.reqId }));
      }
    }
  }
  return out;
}
