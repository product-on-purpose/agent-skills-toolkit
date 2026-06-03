// what-it-is:   the docs-frontmatter check (G7)
// what-it-does: asserts every published docs/** page (excluding docs/internal/) carries the frontmatter taxonomy (title, description with no colon-space, audience, level)
// why:          enforces the Standard requirement G7 deterministically, one module per reqId, so the gate stays model-free
// used-by:      registered in scripts/lib/registry.mjs; run by scripts/check.mjs and tier-report.mjs
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { relPath } from "../lib/fs-utils.mjs";
import { finding, SEVERITY } from "../lib/findings.mjs";
import { parseFrontmatter } from "../lib/frontmatter.mjs";

export const meta = { id: "docs-frontmatter", tier: "advanced", reqId: "G7" };

const AUDIENCE = new Set(["non-engineer", "engineer", "both"]);
const LEVEL = new Set(["beginner", "intermediate", "advanced"]);

/** Collect every *.md under dir, recursively. */
function collect(dir, out) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    const full = path.join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) collect(full, out);
    else if (name.endsWith(".md")) out.push(full);
  }
}

/**
 * G7 (Gold): every published documentation page under docs/** (excluding docs/internal/, which is
 * committed maintainer governance and never published) carries the docs frontmatter taxonomy
 * (Standard sec 8.4): `title` (non-empty string), `description` (non-empty string with no ": "
 * colon-space), `audience` in {non-engineer, engineer, both}, `level` in {beginner, intermediate,
 * advanced}, optional `tags` (array of strings) and `doc-role`. The taxonomy is what makes the docs
 * tree audience-aware and lets the site generator emit each page. Conditional: a plugin with no
 * public docs/ tree passes vacuously. Distinct from `frontmatter-valid` (U3), which validates a
 * component's SKILL.md / agent frontmatter, not docs pages. Advanced tier.
 */
export function check(ctx) {
  const root = ctx.root;
  if (!root) return [];
  const docsDir = path.join(root, "docs");
  if (!existsSync(docsDir)) return []; // no docs tree -> vacuous.
  const internal = path.join(docsDir, "internal");

  const files = [];
  collect(docsDir, files);
  const out = [];

  for (const f of files) {
    // The governance tree is never published and is out of scope.
    if (f === internal || f.startsWith(internal + path.sep)) continue;
    const rel = relPath(root, f);

    let text;
    try {
      text = readFileSync(f, "utf8");
    } catch {
      continue;
    }

    const { frontmatter, parseError } = parseFrontmatter(text);
    if (parseError || !frontmatter) {
      out.push(finding(meta.id, SEVERITY.ERROR, `docs page has no valid YAML frontmatter (${parseError || "missing"}); every docs/** page MUST carry the taxonomy (Standard sec 8.4).`, { file: rel, reqId: meta.reqId }));
      continue;
    }

    const fm = frontmatter;
    if (typeof fm.title !== "string" || fm.title.trim() === "") {
      out.push(finding(meta.id, SEVERITY.ERROR, `frontmatter "title" must be a non-empty string (Standard sec 8.4).`, { file: rel, reqId: meta.reqId }));
    }
    if (typeof fm.description !== "string" || fm.description.trim() === "") {
      out.push(finding(meta.id, SEVERITY.ERROR, `frontmatter "description" must be a non-empty string (Standard sec 8.4).`, { file: rel, reqId: meta.reqId }));
    } else if (fm.description.includes(": ")) {
      out.push(finding(meta.id, SEVERITY.ERROR, `frontmatter "description" must not contain a colon-space; restructure with a comma or a space-hyphen-space (Standard sec 8.4).`, { file: rel, reqId: meta.reqId }));
    }
    if (!AUDIENCE.has(fm.audience)) {
      out.push(finding(meta.id, SEVERITY.ERROR, `frontmatter "audience" must be one of non-engineer, engineer, both (got ${JSON.stringify(fm.audience)}).`, { file: rel, reqId: meta.reqId }));
    }
    if (!LEVEL.has(fm.level)) {
      out.push(finding(meta.id, SEVERITY.ERROR, `frontmatter "level" must be one of beginner, intermediate, advanced (got ${JSON.stringify(fm.level)}).`, { file: rel, reqId: meta.reqId }));
    }
    if ("tags" in fm && fm.tags !== undefined) {
      if (!Array.isArray(fm.tags) || !fm.tags.every((t) => typeof t === "string")) {
        out.push(finding(meta.id, SEVERITY.ERROR, `frontmatter "tags", if present, must be an array of strings.`, { file: rel, reqId: meta.reqId }));
      }
    }
  }
  return out;
}
