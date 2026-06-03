// what-it-is:   the no-dashes check (U10)
// what-it-does: House style (Standard sec 8): committed authored text MUST NOT contain em-dashes (U+2014) or en-dashes (U+2013); use a hyphen or restructure
// why:          enforces the Standard requirement U10 deterministically, one module per reqId, so the gate stays model-free
// used-by:      registered in scripts/lib/registry.mjs; run by scripts/check.mjs and tier-report.mjs
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { relPath } from "../lib/fs-utils.mjs";
import { finding, SEVERITY } from "../lib/findings.mjs";

export const meta = { id: "no-dashes", tier: "universal", reqId: "U10" };

// Built from code points so this checker never embeds the literal characters it forbids.
const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);
// Skip dependency and gitignored-scratch dirs, plus build-output / tool-cache dirs (dist, .astro):
// generated artifacts are not authored text, so house style does not apply to them. Exported so the
// other repo-wide content checks (U12 mermaid-valid) reuse the same skip set instead of re-listing it.
export const SKIP_DIRS = new Set(["node_modules", ".git", ".memsearch", "_local", "_LOCAL", "_agent-context", "dist", ".astro"]);
const SCAN = /\.(md|mjs)$/;

function collect(dir, out) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    if (SKIP_DIRS.has(name)) continue;
    const full = path.join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) collect(full, out);
    else if (SCAN.test(name)) out.push(full);
  }
}

/**
 * House style (Standard sec 8): committed authored text MUST NOT contain em-dashes
 * (U+2014) or en-dashes (U+2013); use a hyphen or restructure. Scans .md and .mjs under
 * the plugin root, excluding dependencies and gitignored scratch. Universal tier so it
 * applies to every plugin the toolkit grades, and the toolkit dogfoods it.
 */
export function check(ctx) {
  const root = ctx.root;
  if (!root || !existsSync(root)) return [];
  const files = [];
  collect(root, files);
  const out = [];
  for (const f of files) {
    let text;
    try {
      text = readFileSync(f, "utf8");
    } catch {
      continue;
    }
    if (text.includes(EM_DASH) || text.includes(EN_DASH)) {
      out.push(
        finding(
          meta.id,
          SEVERITY.ERROR,
          "contains an em-dash (U+2014) or en-dash (U+2013); use a hyphen or restructure (house style, Standard sec 8).",
          { file: relPath(root, f), reqId: meta.reqId }
        )
      );
    }
  }
  return out;
}
