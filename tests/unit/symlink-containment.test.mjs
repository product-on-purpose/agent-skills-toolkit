import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { isInsideRoot, listAgentFiles, walkFiles } from "../../scripts/lib/fs-utils.mjs";
import { check as docsFrontmatter } from "../../scripts/checks/docs-frontmatter.mjs";
import { check as mermaidValid } from "../../scripts/checks/mermaid-valid.mjs";
import { check as docsPresence } from "../../scripts/checks/docs-presence.mjs";
import { check as sourceDoc } from "../../scripts/checks/source-doc.mjs";
import { check as folderReadme } from "../../scripts/checks/folder-readme.mjs";

// Symlink containment for every directory walker. `docs/esc -> /usr` made the gate walk the host
// filesystem (G7 reported 178 pages under /usr), and `docs/loop -> ..` made it recurse until
// ENAMETOOLONG (431 findings, and a thrown error out of the agents/ lister). Each walker now skips a
// directory whose real path lies outside the plugin root (isInsideRoot) and one whose real path it
// already entered (a per-walk set seeded with the root).
//
// The fixture is built in a temp dir: a plugin root beside an `outside` tree, with symlinks from
// docs/, scripts/ and agents/ pointing out of the plugin and back up to its root. The plugin carries
// one deliberately broken page, source file and agent of its own, so every walker is proven to still
// run, and everything outside is broken the same way, so a walker that escaped would be caught.

const NO_SYMLINKS = process.platform === "win32"
  && "creating a symlink needs a privilege Windows does not grant by default; isInsideRoot's own path arithmetic is covered on every platform below";

const FENCE = "```";
const BAD_PAGE = `# page\n\n${FENCE}mermaid\nnotadiagram\n${FENCE}\n`;

function buildFixture() {
  const base = mkdtempSync(path.join(tmpdir(), "askit-symlink-"));
  const root = path.join(base, "plugin");
  const outside = path.join(base, "outside");
  mkdirSync(path.join(root, "docs", "how-to"), { recursive: true });
  mkdirSync(path.join(root, "scripts"), { recursive: true });
  mkdirSync(path.join(root, "agents"), { recursive: true });
  mkdirSync(outside, { recursive: true });
  writeFileSync(path.join(root, "library.json"), JSON.stringify({ name: "symlink-fixture", version: "1.0.0", tier: "advanced" }));
  writeFileSync(path.join(root, "AGENTS.md"), "# symlink-fixture\n");
  writeFileSync(path.join(root, "docs", "how-to", "own.md"), BAD_PAGE);
  writeFileSync(path.join(root, "scripts", "own.mjs"), "export const own = 1;\n");
  writeFileSync(path.join(root, "agents", "own.md"), "---\nname: own\ndescription: the plugin's own agent\n---\n");
  // Outside the plugin: three broken pages, a complete architecture pair, a docblock-less source
  // file, and an agent. None of them may be reported or listed.
  for (const n of ["one", "two", "three"]) writeFileSync(path.join(outside, `${n}.md`), BAD_PAGE);
  writeFileSync(path.join(outside, "arch.md"), "---\ndoc-role: architecture-overview\n---\n\n[detail](./arch-detail.md)\n");
  writeFileSync(path.join(outside, "arch-detail.md"), "---\ndoc-role: architecture-detailed\n---\n\n# detail\n");
  writeFileSync(path.join(outside, "escaped.mjs"), "export const escaped = 1;\n");
  writeFileSync(path.join(outside, "rogue.md"), "---\nname: rogue\ndescription: an agent outside the plugin\n---\n");
  for (const dir of ["docs", "scripts", "agents"]) {
    symlinkSync(outside, path.join(root, dir, "esc"), "dir");
    symlinkSync("..", path.join(root, dir, "loop"), "dir");
  }
  return { base, root };
}

const rel = (root, abs) => path.relative(root, abs).split(path.sep).join("/");
const namesEscape = (f) => /(^|[\\/])(esc|loop)[\\/]/.test(`${f.file ?? ""} ${f.message}`);

test("docs-frontmatter, mermaid-valid and docs-presence never report a page reached through a symlink out of the plugin or back to its root", { skip: NO_SYMLINKS }, () => {
  const { base, root } = buildFixture();
  try {
    const fm = docsFrontmatter({ root });
    assert.deepEqual(fm.map((f) => f.file), ["docs/how-to/own.md"], "exactly the plugin's own page, which has no frontmatter");

    const mm = mermaidValid({ root });
    assert.deepEqual(mm.map((f) => f.file), ["docs/how-to/own.md"], "exactly the plugin's own broken diagram");

    const dp = docsPresence({ root });
    assert.ok(dp.length > 0, "the hollow docs tree must produce findings");
    assert.ok(dp.every((f) => !namesEscape(f)), `no G10 finding may name docs/esc/ or docs/loop/:\n${dp.map((f) => `${f.file} ${f.message}`).join("\n")}`);
    // Rule 3 is the one place an escape would leave no path behind: the outside overview links its
    // detailed page, so a walk that reached it through docs/esc would find a complete, linked pair and
    // report nothing. The incomplete-pair finding with both markers absent is the proof it did not.
    assert.ok(
      dp.some((f) => /architecture pair is incomplete.*overview=false, detailed=false/.test(f.message)),
      `the architecture pair that exists only outside the plugin does not count as the plugin's:\n${dp.map((f) => f.message).join("\n")}`,
    );
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("source-doc, folder-readme, the agents/ lister and walkFiles stay inside the plugin too", { skip: NO_SYMLINKS }, () => {
  const { base, root } = buildFixture();
  try {
    const sd = sourceDoc({ root });
    assert.deepEqual(sd.map((f) => f.file), ["scripts/own.mjs"], "exactly the plugin's own docblock-less source file");

    const fr = folderReadme({ root });
    assert.ok(fr.every((f) => !/docs\/esc\//.test(f.file)), "a docs/* entry that resolves outside the plugin is not a folder of it");
    assert.ok(fr.some((f) => f.file === "docs/how-to/README.md"), "the plugin's own docs folder is still graded");

    assert.deepEqual(listAgentFiles(root).map((f) => rel(root, f)), ["agents/own.md"], "the agents/ walk lists the plugin's own agent only, and terminates");

    assert.deepEqual(walkFiles(path.join(root, "docs")).map((f) => rel(root, f)), ["docs/how-to/own.md"], "walkFiles is contained by the directory it was given");
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("isInsideRoot: the root and a child are inside; a sibling sharing the prefix, the parent, an unrelated path and a missing path are not", () => {
  const base = mkdtempSync(path.join(tmpdir(), "askit-inside-"));
  try {
    const root = path.join(base, "plugin");
    const sibling = path.join(base, "plugin-2");
    const outside = path.join(base, "outside");
    mkdirSync(path.join(root, "docs"), { recursive: true });
    mkdirSync(sibling);
    mkdirSync(outside);
    assert.equal(isInsideRoot(root, root), true, "the root is inside itself");
    assert.equal(isInsideRoot(root, path.join(root, "docs")), true, "a child is inside");
    assert.equal(isInsideRoot(root, sibling), false, "a sibling that merely shares the root's name as a prefix is outside");
    assert.equal(isInsideRoot(root, base), false, "the parent is outside");
    assert.equal(isInsideRoot(root, outside), false, "an unrelated directory is outside");
    assert.equal(isInsideRoot(root, path.join(root, "missing")), false, "a path that cannot be resolved is never inside");
    assert.equal(isInsideRoot(path.join(base, "no-such-root"), root), false, "a root that cannot be resolved contains nothing");
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("isInsideRoot resolves symlinks before deciding", { skip: NO_SYMLINKS }, () => {
  const { base, root } = buildFixture();
  try {
    assert.equal(isInsideRoot(root, path.join(root, "docs", "esc")), false, "a link out of the plugin is outside, whatever its own path says");
    assert.equal(isInsideRoot(root, path.join(root, "docs", "loop")), true, "a link back to the root resolves to the root, which is inside; the visited set is what stops the loop");
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});
