// what-it-is:   shared assertions for the evaluation-report renderer tests
// what-it-does: the no-dash, self-contained-HTML, and EOL-agnostic golden-snapshot checks the conformance, migration, and release render tests all reuse
// why:          one assertion set so the three report-type test files cannot drift apart (E1, F2 Phase B)
// used-by:      tests/unit/report-render.test.mjs and the migration / release variants
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const EM = String.fromCharCode(0x2014);
const EN = String.fromCharCode(0x2013);

/** No em-dash (U+2014) or en-dash (U+2013) in rendered output (house style; the hook guards author-time). */
export function assertNoDashes(s, label = "output") {
  assert.ok(!s.includes(EM) && !s.includes(EN), `${label} contains an em-dash or en-dash`);
}

/** The HTML must be one self-contained offline file: no external asset, web font, or network reference. */
export function assertSelfContainedHtml(html) {
  assert.ok(!/<link\b/i.test(html), "must not link an external stylesheet");
  assert.ok(!/<script\s+src=/i.test(html), "must not load an external script");
  assert.ok(!/src="https?:/i.test(html), "must not reference an http asset");
  assert.ok(!/@import/i.test(html), "must not @import");
  assert.ok(!/url\(\s*['"]?https?:/i.test(html), "must not fetch a remote url()");
  assert.ok(/<style>/i.test(html), "must inline a <style> block");
  const scripts = html.match(/<script\b/gi) || [];
  assert.equal(scripts.length, 1, "exactly one inline <script>");
}

/**
 * Byte-for-byte golden snapshot, EOL-agnostic. Golden snapshots are canonical LF (the renderer emits LF);
 * a Windows working copy is CRLF (git autocrlf converts on checkout), so normalize both sides. Regenerate
 * and review with UPDATE_SNAPSHOTS=1.
 */
export function assertSnapshot(out, dir, name) {
  const file = path.join(dir, name);
  if (process.env.UPDATE_SNAPSHOTS) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(file, out);
  }
  const norm = (s) => s.replace(/\r\n/g, "\n");
  assert.equal(norm(out), norm(readFileSync(file, "utf8")), `${name} drifted; re-run with UPDATE_SNAPSHOTS=1 to regenerate and review`);
}
