// what-it-is:   the docs-presence Gold check (G10)
// what-it-does: asserts the four Diataxis dirs are non-empty, every ADR carries a ## TL;DR, and the
//               architecture overview page resolvably links its detailed companion
// why:          a presence/linkage bar so a Gold library cannot ship a hollow or unnavigable docs tree
// used-by:      registered in scripts/lib/registry.mjs; run by scripts/check.mjs; covered by tests/unit/docs-presence.test.mjs
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { relPath } from "../lib/fs-utils.mjs";
import { finding, SEVERITY } from "../lib/findings.mjs";
import { parseFrontmatter } from "../lib/frontmatter.mjs";

export const meta = { id: "docs-presence", tier: "advanced", reqId: "G10" };

const DIATAXIS = ["tutorials", "how-to", "reference", "explanation"];

/** True if dir exists and contains at least one *.md (recursively). A .gitkeep-only or non-.md dir is empty. */
function hasMarkdown(dir) {
  let entries;
  try { entries = readdirSync(dir); } catch { return false; }
  for (const name of entries) {
    const full = path.join(dir, name);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) { if (hasMarkdown(full)) return true; }
    else if (name.endsWith(".md")) return true;
  }
  return false;
}

/** Strip fenced code blocks (backtick and tilde) so a ## TL;DR inside a fence is not matched. */
function stripFences(text) {
  return text.replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, "");
}

function hasTldr(text) {
  return /^## TL;DR\s*$/m.test(stripFences(text));
}

/** Collect docs/** *.md excluding docs/internal/**. */
function collectPublic(docsDir, internal, out) {
  let entries;
  try { entries = readdirSync(docsDir); } catch { return; }
  for (const name of entries) {
    const full = path.join(docsDir, name);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (full === internal || full.startsWith(internal + path.sep)) continue;
    if (st.isDirectory()) collectPublic(full, internal, out);
    else if (name.endsWith(".md")) out.push(full);
  }
}

/**
 * G10 (Gold): three lifecycle-rigor facts about a plugin's docs tree - the four Diataxis quadrants are
 * non-empty, every ADR (docs/internal/decisions/NNNN-*.md except README) carries a ## TL;DR, and the
 * page marked doc-role: architecture-overview resolvably links the page marked architecture-detailed.
 * Conditional: vacuous when there is no docs/ tree; the ADR sub-rule is conditional on the decisions dir.
 * Advanced tier.
 */
export function check(ctx) {
  const root = ctx.root;
  if (!root) return [];
  const docsDir = path.join(root, "docs");
  if (!existsSync(docsDir)) return []; // no docs tree -> vacuous.
  const internal = path.join(docsDir, "internal");
  const out = [];

  // Rule 1: Diataxis presence.
  for (const name of DIATAXIS) {
    const dir = path.join(docsDir, name);
    if (!hasMarkdown(dir)) {
      out.push(finding(meta.id, SEVERITY.ERROR, `Diataxis directory docs/${name} is missing or has no *.md page; each quadrant MUST be non-empty (Standard sec 2.6 G10).`, { file: `docs/${name}`, reqId: meta.reqId }));
    }
  }

  // Rule 2: ADR TL;DR (conditional on docs/internal/decisions/).
  const decisions = path.join(internal, "decisions");
  if (existsSync(decisions)) {
    let names = [];
    try { names = readdirSync(decisions); } catch { names = []; }
    for (const name of names) {
      if (name === "README.md") continue;
      if (!/^\d{4}-.*\.md$/.test(name)) continue;
      const full = path.join(decisions, name);
      let text;
      try { text = readFileSync(full, "utf8"); } catch { continue; }
      if (!hasTldr(text)) {
        out.push(finding(meta.id, SEVERITY.ERROR, `ADR ${relPath(root, full)} has no "## TL;DR" block; every decision record MUST carry a decision summary under a ## TL;DR heading (Standard sec 10.4).`, { file: relPath(root, full), reqId: meta.reqId }));
      }
    }
  }

  // Rule 3: the architecture pair exists, is marked, and the overview links the detailed page.
  const pages = [];
  collectPublic(docsDir, internal, pages);
  const overviews = [], detaileds = [];
  for (const f of pages) {
    let text;
    try { text = readFileSync(f, "utf8"); } catch { continue; }
    const { frontmatter } = parseFrontmatter(text);
    const role = frontmatter && frontmatter["doc-role"];
    if (role === "architecture-overview") overviews.push({ file: f, text });
    else if (role === "architecture-detailed") detaileds.push({ file: f });
  }
  // A duplicate marker would make rule 3 resolve the pair by readdir order (platform-dependent), so
  // flag it explicitly. The listed names are sorted, so the message is identical across filesystems.
  for (const [role, list] of [["architecture-overview", overviews], ["architecture-detailed", detaileds]]) {
    if (list.length > 1) {
      out.push(finding(meta.id, SEVERITY.ERROR, `more than one page carries doc-role: ${role} (${list.map((x) => relPath(root, x.file)).sort().join(", ")}); exactly one page MUST, or the architecture pair would resolve by filesystem order (G10 rule 3).`, { file: "docs", reqId: meta.reqId }));
    }
  }
  const overview = overviews[0] || null;
  const detailed = detaileds[0] || null;
  if (!overview || !detailed) {
    // Three-way presence rule: neither, or exactly one, marker present is an incomplete pair.
    out.push(finding(meta.id, SEVERITY.ERROR, `the architecture pair is incomplete: a page MUST carry doc-role: architecture-overview and another doc-role: architecture-detailed (found overview=${!!overview}, detailed=${!!detailed}); R-CONTENT-4 / G10 rule 3.`, { file: "docs", reqId: meta.reqId }));
  } else if (overviews.length === 1 && detaileds.length === 1) {
    // Only resolve the link when the pair is unambiguous; a duplicate is reported above instead.
    const overviewDir = path.dirname(overview.file);
    const wantRel = relPath(root, detailed.file);
    let linked = false;
    const linkRe = /\]\(([^)]+)\)/g;
    let m;
    while ((m = linkRe.exec(overview.text)) !== null) {
      const target = m[1].split("#")[0].split("?")[0].trim();
      if (!target || /^[a-z]+:/i.test(target)) continue; // skip external schemes
      // A leading-slash target is repo-root-relative (a docs-site absolute path), not filesystem-absolute.
      const abs = target.startsWith("/") ? path.join(root, target.slice(1)) : path.resolve(overviewDir, target);
      const resolved = relPath(root, abs);
      if (resolved === wantRel) { linked = true; break; }
    }
    if (!linked) {
      out.push(finding(meta.id, SEVERITY.ERROR, `architecture overview (${relPath(root, overview.file)}) does not link the detailed page (${wantRel}); add a resolvable markdown link (G10 rule 3).`, { file: relPath(root, overview.file), reqId: meta.reqId }));
    }
  }
  return out;
}
