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

test("a leading %%{init}%% theming directive is allowed before the diagram keyword", () => {
  inTmp("mermaid-init-", (dir) => {
    writeFileSync(path.join(dir, "a.md"), md("%%{init: {'theme':'base'}}%%\nflowchart LR\n  A --> B"));
    assert.equal(check({ root: dir }).length, 0, "an init-directive-led diagram must pass U12");
  });
});

test("a leading %% comment is allowed before the diagram keyword", () => {
  inTmp("mermaid-lead-comment-", (dir) => {
    writeFileSync(path.join(dir, "a.md"), md("%% a branding note\nflowchart TD\n  A --> B"));
    assert.equal(check({ root: dir }).length, 0);
  });
});

test("a leading --- YAML config block is allowed before the diagram keyword", () => {
  inTmp("mermaid-frontmatter-", (dir) => {
    writeFileSync(path.join(dir, "a.md"), md("---\ntitle: My Diagram\nconfig:\n  theme: forest\n---\nsequenceDiagram\n  A->>B: hi"));
    assert.equal(check({ root: dir }).length, 0);
  });
});

test("a stray bracket inside a %% comment does not trip the balance rule", () => {
  inTmp("mermaid-comment-bracket-", (dir) => {
    writeFileSync(path.join(dir, "a.md"), md("flowchart LR\n  %% note: see step (3 of the runbook\n  A --> B"));
    assert.equal(check({ root: dir }).length, 0, "a bracket in comment prose is ignored");
  });
});

test("a directive with no real diagram keyword after it still fails, citing the diagram line", () => {
  inTmp("mermaid-init-bad-", (dir) => {
    // line 1 is the fence, line 2 the directive, line 3 the (bad) diagram line.
    writeFileSync(path.join(dir, "a.md"), md("%%{init: {'theme':'base'}}%%\nnotadiagram\n  A --> B"));
    const f = check({ root: dir }).find((x) => /recognized diagram keyword/.test(x.message));
    assert.ok(f, "a directive-led block with no keyword must still fail");
    assert.match(f.message, /line 3/, "the finding must cite the diagram line (3), not the fence opener");
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

// Finding 5 (batch-2 C1 triage): U12 validates only LIVE, rendered mermaid. A block whose body is a
// {{TEMPLATE_PLACEHOLDER}} slot (the generator substitutes the real diagram later) and a block commented
// out in HTML are not live diagrams, so structurally validating them is a false positive.
test("a mermaid block that is a pure {{PLACEHOLDER}} template slot is skipped (U12)", () => {
  inTmp("mermaid-tmpl-", (dir) => {
    writeFileSync(path.join(dir, "a.md"), md("{{BUSINESS_CONTEXT_DIAGRAM}}"));
    assert.equal(check({ root: dir }).length, 0, "a pure placeholder block is a template slot, not a malformed diagram");
  });
});

test("an indented pure {{PLACEHOLDER}} block is skipped (U12)", () => {
  inTmp("mermaid-tmpl2-", (dir) => {
    writeFileSync(path.join(dir, "a.md"), md("    {{ER_DIAGRAM}}"));
    assert.equal(check({ root: dir }).length, 0);
  });
});

test("a block mixing a placeholder with a non-keyword first line is still validated (U12)", () => {
  inTmp("mermaid-tmpl-mixed-", (dir) => {
    writeFileSync(path.join(dir, "a.md"), md("notadiagram\n{{X}}"));
    assert.ok(check({ root: dir }).some((x) => /recognized diagram keyword/.test(x.message)), "only a PURE placeholder body is skipped");
  });
});

test("a mermaid block inside an HTML comment is not validated (U12)", () => {
  inTmp("mermaid-comment-", (dir) => {
    writeFileSync(path.join(dir, "a.md"), "Before.\n\n<!-- Example:\n```mermaid\nerDiagram\n    USERS ||--o{ ORDERS : places\n```\n-->\n\nAfter.\n");
    assert.equal(check({ root: dir }).length, 0, "a commented-out diagram does not render, so U12 must not validate it");
  });
});

test("a live diagram is still validated when a commented bad diagram precedes it (U12)", () => {
  inTmp("mermaid-comment-live-", (dir) => {
    writeFileSync(path.join(dir, "a.md"), "<!--\n```mermaid\nnotadiagram\n```\n-->\n\n```mermaid\nnotadiagram\n  A --> B\n```\n");
    const r = check({ root: dir });
    assert.equal(r.length, 1, "the live block is still validated; the commented one is not");
    assert.ok(/recognized diagram keyword/.test(r[0].message));
  });
});

// Adversarial-review catch (ADR 0032): the HTML-comment skip must NOT reach inside a LIVE fence. A
// `<!-- ... -->`-looking span inside a live ```mermaid block is diagram source the renderer receives
// verbatim, not a Markdown comment - so malformed content hidden in it must still fail U12. (U12 must
// validate exactly what renders, never a sanitized body.)
test("an HTML-comment span INSIDE a live mermaid block is not stripped; its content is still validated (U12)", () => {
  inTmp("mermaid-live-htmlcomment-", (dir) => {
    writeFileSync(path.join(dir, "a.md"), md("flowchart LR\n  A --> B <!--\t-->"));
    assert.ok(check({ root: dir }).some((x) => /tab character/.test(x.message)), "a tab hidden in a comment-span inside a LIVE fence is still caught");
  });
});
