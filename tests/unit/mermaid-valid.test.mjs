import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { check, meta } from "../../scripts/checks/mermaid-valid.mjs";

// Proves the U12 mermaid-valid Bronze check (scripts/checks/mermaid-valid.mjs): a structurally valid
// fenced ```mermaid block passes; each of the four structural rules (empty, unrecognized first keyword,
// unbalanced brackets ignoring quotes, tab) fails with a naming finding; .mdx is scanned; the shared
// SKIP_DIRS skip applies; a diagram-free tree passes vacuously. Anti cases are built in temp dirs (never
// committed) so the toolkit's own repo-wide U12 self-scan stays green, the no-dashes precedent.

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");
const GOLDEN = path.join(FIXTURES, "golden/mermaid-ok");
const NO_DOCS = path.join(FIXTURES, "golden/minimal-skill"); // a plugin with no diagrams

const FENCE = "```";
function md(body) {
  return `${FENCE}mermaid\n${body}\n${FENCE}\n`;
}
function inTmp(prefix, fn) {
  const dir = mkdtempSync(path.join(tmpdir(), prefix));
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("meta declares U12 universal", () => {
  assert.equal(meta.reqId, "U12");
  assert.equal(meta.tier, "universal");
});

test("a structurally valid diagram passes with no findings (golden fixture)", () => {
  assert.equal(check({ root: GOLDEN }).length, 0);
});

test("an unrecognized first keyword fails naming the rule", () => {
  inTmp("mermaid-kw-", (dir) => {
    writeFileSync(path.join(dir, "a.md"), md("notadiagram LR\n  A --> B"));
    const r = check({ root: dir });
    const f = r.find((x) => /recognized diagram keyword/.test(x.message));
    assert.ok(f, "expected a recognized-keyword finding");
    assert.equal(f.reqId, "U12");
    assert.equal(f.file, "a.md");
  });
});

test("unbalanced brackets fail", () => {
  inTmp("mermaid-bracket-", (dir) => {
    writeFileSync(path.join(dir, "a.md"), md("flowchart LR\n  A[unbalanced --> B]]"));
    const r = check({ root: dir });
    assert.ok(r.some((x) => /unbalanced brackets/.test(x.message)));
  });
});

test("an empty block fails", () => {
  inTmp("mermaid-empty-", (dir) => {
    writeFileSync(path.join(dir, "a.md"), `${FENCE}mermaid\n${FENCE}\n`);
    const r = check({ root: dir });
    assert.ok(r.some((x) => /is empty/.test(x.message)));
  });
});

test("a tab in a block fails (whitespace-sensitive)", () => {
  inTmp("mermaid-tab-", (dir) => {
    writeFileSync(path.join(dir, "a.md"), md("flowchart LR\n\tA --> B"));
    const r = check({ root: dir });
    assert.ok(r.some((x) => /tab character/.test(x.message)));
  });
});

test("a block inside an .mdx file is scanned", () => {
  inTmp("mermaid-mdx-", (dir) => {
    writeFileSync(path.join(dir, "x.mdx"), md("notadiagram\n  A --> B"));
    const r = check({ root: dir });
    assert.ok(r.some((x) => x.file === "x.mdx" && /recognized diagram keyword/.test(x.message)));
  });
});

test("a quoted bracket does not trip the balance rule", () => {
  inTmp("mermaid-quote-", (dir) => {
    writeFileSync(path.join(dir, "a.md"), md('flowchart LR\n  A["a [b] (c)"] --> B["d"]'));
    assert.equal(check({ root: dir }).length, 0);
  });
});

test("an unterminated fence fails", () => {
  inTmp("mermaid-unterm-", (dir) => {
    writeFileSync(path.join(dir, "a.md"), `${FENCE}mermaid\nflowchart LR\n  A --> B\n`);
    const r = check({ root: dir });
    assert.ok(r.some((x) => /unterminated mermaid fence/.test(x.message)));
  });
});

test("stateDiagram-v2 is recognized (longer keyword wins)", () => {
  inTmp("mermaid-state-", (dir) => {
    writeFileSync(path.join(dir, "a.md"), md("stateDiagram-v2\n  [*] --> A\n  A --> [*]"));
    assert.equal(check({ root: dir }).length, 0);
  });
});

test("newer Mermaid diagram types are recognized (xychart-beta, C4Container)", () => {
  inTmp("mermaid-newtypes-", (dir) => {
    writeFileSync(path.join(dir, "a.md"), md('xychart-beta\n  title "x"\n  bar [1, 2, 3]'));
    writeFileSync(path.join(dir, "b.md"), md("C4Container\n  Person(u, \"User\")"));
    assert.equal(check({ root: dir }).length, 0);
  });
});

test("an indented mermaid fence (inside a list/MDX) is still scanned", () => {
  inTmp("mermaid-indent-", (dir) => {
    writeFileSync(path.join(dir, "a.md"), "- a step:\n\n  ```mermaid\n  notadiagram\n    A[[\n  ```\n");
    const r = check({ root: dir });
    assert.ok(r.some((x) => /recognized diagram keyword/.test(x.message)), "indented bad block must be caught");
  });
});

test("an info string after the keyword is allowed (block still validated)", () => {
  inTmp("mermaid-info-", (dir) => {
    writeFileSync(path.join(dir, "a.md"), "```mermaid theme=dark\nnotadiagram\n  A --> B\n```\n");
    const r = check({ root: dir });
    assert.ok(r.some((x) => /recognized diagram keyword/.test(x.message)), "info-string fence must be recognized and validated");
  });
});

test("an unterminated quote in a label is flagged", () => {
  inTmp("mermaid-quoteopen-", (dir) => {
    writeFileSync(path.join(dir, "a.md"), md('flowchart LR\n  A["never closed --> B'));
    const r = check({ root: dir });
    assert.ok(r.some((x) => /unbalanced brackets|unterminated quote/.test(x.message)));
  });
});

test("the generated Pattern S quadrant subtree is skipped; a landing page is still scanned", () => {
  inTmp("mermaid-gen-", (dir) => {
    // a generated quadrant copy with a bad block -> must be IGNORED (build-state independence)
    const gen = path.join(dir, "site", "src", "content", "docs", "how-to");
    mkdirSync(gen, { recursive: true });
    writeFileSync(path.join(gen, "x.md"), md("notadiagram\n  A[["));
    // a hand-authored landing page (a FILE directly under content/docs) with a bad block -> must be CAUGHT
    const landing = path.join(dir, "site", "src", "content", "docs");
    writeFileSync(path.join(landing, "index.md"), md("notadiagram\n  A[["));
    const r = check({ root: dir });
    assert.ok(r.every((x) => !x.file.includes("how-to")), "generated quadrant subtree must be skipped");
    assert.ok(r.some((x) => x.file.replace(/\\/g, "/").endsWith("content/docs/index.md")), "landing page must be scanned");
  });
});

test("a plugin with no diagrams passes vacuously", () => {
  assert.equal(check({ root: NO_DOCS }).length, 0);
});

test("skips node_modules and _local scratch", () => {
  inTmp("mermaid-skip-", (dir) => {
    mkdirSync(path.join(dir, "node_modules"));
    writeFileSync(path.join(dir, "node_modules", "x.md"), md("notadiagram\n  A[["));
    mkdirSync(path.join(dir, "_local"));
    writeFileSync(path.join(dir, "_local", "y.md"), md("notadiagram\n  A[["));
    assert.equal(check({ root: dir }).length, 0);
  });
});
