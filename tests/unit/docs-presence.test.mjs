import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { check } from "../../scripts/checks/docs-presence.mjs";

// Proves the G10 docs-presence check: a complete docs tree passes; an empty Diataxis quadrant, an ADR
// without ## TL;DR, an unlinked architecture overview, and an incomplete (xor) architecture pair each
// fail; a plugin with no docs/ tree passes vacuously; a ## TL;DR inside a code fence does not count.

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");
const ok = path.join(FIXTURES, "golden/docs-presence-ok");
const emptyTut = path.join(FIXTURES, "anti/docs-presence-empty-tutorials");
const noTldr = path.join(FIXTURES, "anti/docs-presence-adr-no-tldr");
const unlinked = path.join(FIXTURES, "anti/docs-presence-arch-unlinked");
const noDocs = path.join(FIXTURES, "golden/minimal-skill"); // no docs/ tree

test("a complete docs tree passes G10 with no findings", () => {
  assert.equal(check(loadPlugin(ok)).length, 0);
});

test("an empty Diataxis quadrant fails G10", () => {
  const f = check(loadPlugin(emptyTut));
  assert.ok(f.some((x) => /docs\/tutorials/.test(x.message)));
  assert.ok(f.length > 0 && f.every((x) => x.reqId === "G10" && x.severity === "error"));
});

test("an ADR missing ## TL;DR fails G10", () => {
  assert.ok(check(loadPlugin(noTldr)).some((x) => /TL;DR/.test(x.message)));
});

test("an architecture overview that does not link the detailed page fails G10", () => {
  assert.ok(check(loadPlugin(unlinked)).some((x) => /does not link/.test(x.message)));
});

test("an incomplete architecture pair (only one marker) fails G10", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "g10-xor-"));
  try {
    for (const q of ["tutorials", "how-to", "reference", "explanation"]) {
      mkdirSync(path.join(dir, "docs", q), { recursive: true });
      writeFileSync(path.join(dir, "docs", q, "a.md"), "# a\n");
    }
    // Only the overview marker; no detailed page -> incomplete pair.
    writeFileSync(path.join(dir, "docs", "explanation", "architecture.md"), "---\ndoc-role: architecture-overview\n---\n\n# A\n");
    assert.ok(check({ root: dir }).some((x) => /architecture pair is incomplete/.test(x.message)));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a ## TL;DR inside a code fence does not satisfy the ADR rule", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "g10-fence-"));
  try {
    for (const q of ["tutorials", "how-to", "reference", "explanation"]) {
      mkdirSync(path.join(dir, "docs", q), { recursive: true });
      writeFileSync(path.join(dir, "docs", q, "a.md"), "# a\n");
    }
    writeFileSync(path.join(dir, "docs", "explanation", "architecture.md"), "---\ndoc-role: architecture-overview\n---\n\n[d](./d.md)\n");
    writeFileSync(path.join(dir, "docs", "explanation", "d.md"), "---\ndoc-role: architecture-detailed\n---\n# d\n");
    mkdirSync(path.join(dir, "docs", "internal", "decisions"), { recursive: true });
    // The ## TL;DR is inside a fence, so it must NOT count.
    writeFileSync(path.join(dir, "docs", "internal", "decisions", "0001-x.md"), "# x\n\n```\n## TL;DR\nfenced\n```\n");
    assert.ok(check({ root: dir }).some((x) => /TL;DR/.test(x.message)), "a fenced TL;DR must not satisfy the rule");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a plugin with no docs/ tree passes G10 vacuously", () => {
  assert.equal(check(loadPlugin(noDocs)).length, 0);
});
