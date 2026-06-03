// what-it-is:   the G8 folder-readme Gold check
// what-it-does: asserts every meaningful folder carries a README.md with a frontmatter title and an
//               inventory section whose listed immediate children set-equal the folder's actual ones
// why:          folder docs that silently drift from their contents are the rot ADR 0024 D1 closes;
//               the inventory set-match is the anti-rot guard (a new or removed child fails until listed)
// used-by:      scripts/lib/registry.mjs (the CHECKS array), via scripts/check.mjs and tier-report.mjs
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { relPath } from "../lib/fs-utils.mjs";
import { finding, SEVERITY } from "../lib/findings.mjs";
import { parseFrontmatter } from "../lib/frontmatter.mjs";
import { SKIP_DIRS } from "./no-dashes.mjs";

export const meta = { id: "folder-readme", tier: "advanced", reqId: "G8" };

// Names that are never inventory items: the README itself, gitignored/scratch/tool dirs (reused from
// the shared SKIP_DIRS, since readdirSync surfaces untracked entries like .git/_local/node_modules),
// lockfiles, and placeholder files. A child whose name is here is neither required in the inventory nor
// reported as a phantom if listed.
const INVENTORY_SKIP = new Set([
  ...SKIP_DIRS,
  "README.md", "package-lock.json", "yarn.lock", "pnpm-lock.yaml", ".gitkeep", ".DS_Store",
]);

// The meaningful-folder allowlist (ADR 0024 D1), checked only where it exists. Two deliberate
// exclusions from the literal ADR list, documented in the P4 SPEC: the repo ROOT (its README is the
// GitHub-rendered project hero, a distinct front-page artifact; root navigation is served by the hero's
// Repository map plus AGENTS.md and INDEX.md), and templates/seed-plugin (its README.md is the seed
// PAYLOAD copied into a scaffolded plugin, not a folder guide; templates/ already lists seed-plugin/).
const FIXED_ROOTS = [
  "scripts", "scripts/checks", "scripts/generators", "scripts/lib",
  "agents", "templates", "evals", ".github/workflows", "site/scripts", "hooks",
];

// Each parent expands to its existing immediate subdirectories (minus the excludes).
const GLOB_ROOTS = [
  { parent: "skills", exclude: [] },
  { parent: "docs", exclude: ["internal"] },
];

function isDir(p) { try { return statSync(p).isDirectory(); } catch { return false; } }

function resolveFolders(root) {
  const out = [];
  for (const rel of FIXED_ROOTS) {
    const abs = path.join(root, rel);
    if (isDir(abs)) out.push(abs);
  }
  for (const { parent, exclude } of GLOB_ROOTS) {
    const parentAbs = path.join(root, parent);
    if (!isDir(parentAbs)) continue;
    for (const name of readdirSync(parentAbs)) {
      if (exclude.includes(name) || INVENTORY_SKIP.has(name)) continue;
      const abs = path.join(parentAbs, name);
      if (isDir(abs)) out.push(abs);
    }
  }
  return out;
}

// Parse the inventory: the FIRST backticked token of each list item under an inventory heading
// (Inventory / Contents / Repository map / Repository structure). Scoping to inventory-section list
// items - and taking only the first backtick per item - means prose backticks (a `node:fs` mention, a
// backticked word inside a child's description) never count as listed, so phantom detection is sound.
// The section is STICKY: once opened, a DEEPER sub-heading (e.g. ### Subdirectories under ## Inventory)
// stays inside it; only a heading at the same or shallower level closes it, so items under a sub-heading
// are not silently dropped. Returns { names, found } so a README with no inventory section can be
// flagged distinctly from a correctly-empty one.
function parseInventory(text) {
  const names = new Set();
  let invLevel = 0; // 0 = outside the inventory; otherwise the heading level that opened it
  let found = false;
  for (const line of text.split(/\r?\n/)) {
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      if (/^(inventory|contents|repository\s+(map|structure))\b/i.test(h[2])) { invLevel = level; found = true; }
      else if (invLevel && level <= invLevel) invLevel = 0; // a same-or-shallower heading closes it
      continue; // a deeper sub-heading keeps us inside the inventory
    }
    if (!invLevel) continue;
    if (!/^\s*[-*]\s/.test(line)) continue; // only list items count
    const m = line.match(/`([^`]+)`/); // the first backtick of the item is the child name
    if (m) names.add(m[1].replace(/\/$/, ""));
  }
  return { names, found };
}

/**
 * G8 (Gold): every meaningful folder carries a README.md with a frontmatter `title` and an inventory
 * whose listed immediate children set-equal the actual immediate children (excluding INVENTORY_SKIP).
 * Reports a missing README, a missing/empty title, each under-listed child (on disk, not in the
 * inventory), and each phantom (in the inventory, not on disk). A new symmetric set-difference - NOT a
 * reuse of index-drift (string equality) or manifest-drift (scalar compares). Vacuous on a plugin with
 * no allowlisted folders. Advanced tier.
 */
export function check(ctx) {
  const root = ctx.root;
  if (!root || !existsSync(root)) return [];
  const out = [];
  for (const folder of resolveFolders(root)) {
    const readmePath = path.join(folder, "README.md");
    const relReadme = relPath(root, readmePath);
    if (!existsSync(readmePath)) {
      out.push(finding(meta.id, SEVERITY.ERROR, `meaningful folder has no README.md (ADR 0024 D1.1); scaffold one with askit-build-docs folder-readme mode.`, { file: relReadme, reqId: meta.reqId }));
      continue;
    }
    let text;
    try { text = readFileSync(readmePath, "utf8"); } catch { continue; }
    const { frontmatter } = parseFrontmatter(text);
    if (!frontmatter || typeof frontmatter.title !== "string" || frontmatter.title.trim() === "") {
      out.push(finding(meta.id, SEVERITY.ERROR, `folder README must carry a non-empty frontmatter "title" (ADR 0024 D1.1).`, { file: relReadme, reqId: meta.reqId }));
    }
    const onDisk = new Set(readdirSync(folder).filter((n) => !INVENTORY_SKIP.has(n)));
    const { names: listed, found: hasInventory } = parseInventory(text);
    if (!hasInventory) {
      out.push(finding(meta.id, SEVERITY.ERROR, `folder README has no inventory section (an "## Inventory" heading listing the immediate children); add one with askit-build-docs folder-readme mode.`, { file: relReadme, reqId: meta.reqId }));
    }
    for (const name of onDisk) {
      if (!listed.has(name)) {
        out.push(finding(meta.id, SEVERITY.ERROR, `child "${name}" exists on disk but is not in the README inventory (under-listed); add it or refresh with askit-build-docs folder-readme mode.`, { file: relReadme, reqId: meta.reqId }));
      }
    }
    for (const name of listed) {
      if (!onDisk.has(name) && !existsSync(path.join(folder, name))) {
        out.push(finding(meta.id, SEVERITY.ERROR, `inventory lists "${name}" but it is not on disk (phantom); remove it or correct the name.`, { file: relReadme, reqId: meta.reqId }));
      }
    }
  }
  return out;
}
