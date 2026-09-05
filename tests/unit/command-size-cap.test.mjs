import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { check, meta, CODEX_COMMAND_SKILL_MAX_BYTES } from "../../scripts/checks/command-size-cap.mjs";

/**
 * Command bodies are GENERATED at the exact byte length each case needs, never committed as fixture
 * files. A committed 4000-byte file is not 4000 bytes after a CRLF checkout on the Windows leg, which
 * would make the boundary cases pass or fail by platform rather than by the property under test.
 */
function cmd(name, bytes) {
  const head = `---\nname: ${name}\ndescription: a command\n---\n\n`;
  const pad = "x".repeat(Math.max(0, bytes - Buffer.byteLength(head, "utf8")));
  const body = head + pad;
  assert.equal(Buffer.byteLength(body, "utf8"), bytes, "fixture generator must hit the byte length exactly");
  return body;
}

function ctxWith(targets, commands) {
  const root = mkdtempSync(path.join(tmpdir(), "csc-"));
  mkdirSync(path.join(root, "commands"), { recursive: true });
  const loaded = commands.map(({ name, bytes }) => {
    const file = path.join(root, "commands", `${name}.md`);
    const raw = cmd(name, bytes);
    writeFileSync(file, raw);
    return { name, file, raw, frontmatter: { name }, body: raw, parseError: null };
  });
  return { root, library: { data: { "agent-targets": targets } }, commands: loaded };
}

const warns = (ctx) => check(ctx).filter((f) => f.reqId === "U18");

test("meta declares U18, Universal, since 0.16, vendor-cited", () => {
  assert.equal(meta.reqId, "U18");
  assert.equal(meta.tier, "universal");
  assert.equal(meta.since, "0.16");
  assert.equal(meta.provenance, "vendor-cited");
});

test("the cap constant is the vendor's 4000, not a house number", () => {
  // Pinned so that a change to the constant is a deliberate edit with a re-read behind it, per the
  // dated source read in foundation/sources/codex.md.
  assert.equal(CODEX_COMMAND_SKILL_MAX_BYTES, 4000);
});

test("a 4001-byte command warns on a Codex-targeting plugin", () => {
  const found = warns(ctxWith(["claude", "codex"], [{ name: "big", bytes: 4001 }]));
  assert.equal(found.length, 1);
  assert.equal(found[0].severity, "warn");
  assert.match(found[0].message, /4001 bytes/);
  assert.match(found[0].message, /commands\/big\.md/);
});

test("a 4000-byte command passes: the cap is exceeded at OVER, not AT", () => {
  // The vendor's condition is `rendered.len() > max_bytes`. An off-by-one here would warn on every
  // command that sits exactly on the boundary the vendor accepts.
  assert.equal(warns(ctxWith(["claude", "codex"], [{ name: "exact", bytes: 4000 }])).length, 0);
});

test("a Claude-only plugin with a large command stays clean", () => {
  // The migration never runs, so the size is not a defect of any kind. Reporting it would be the house
  // imposing a foreign vendor's constraint on a plugin that never opted into it (ADR 0029).
  assert.equal(warns(ctxWith(["claude"], [{ name: "big", bytes: 40000 }])).length, 0);
});

test("the finding carries the 0.17 cap, not a bare since", () => {
  // `since` alone gates the moment a consumer adopts 0.16, giving a plugin that adopts the revision no
  // migration window at all. Both constraints are required; this pins the one that is easy to drop.
  const f = warns(ctxWith(["codex"], [{ name: "big", bytes: 5000 }]))[0];
  assert.equal(f.migration.capAt, "warn");
  assert.equal(f.migration.until, "0.17");
});

test("the migration reason is ACTIVATION-NEUTRAL: it never claims a cap is in force", () => {
  // Under --strict the pin is undefined, nothing binds, and this static text is still visible in --json.
  const f = warns(ctxWith(["codex"], [{ name: "big", bytes: 5000 }]))[0];
  assert.doesNotMatch(f.migration.reason, /currently|is capped|until you pin/i);
  assert.match(f.migration.reason, /introduced at Standard 0\.16 and gates at 0\.17/);
});

test("the message states SKIPPED, never truncated", () => {
  // The resolution plan described this as truncation. The vendor's source does `continue`: no SKILL.md is
  // written at all. A message promising a truncated skill sends the author looking for a file that is not
  // there. If this assertion is ever relaxed, re-read the vendor source before changing the wording.
  const f = warns(ctxWith(["codex"], [{ name: "big", bytes: 5000 }]))[0];
  assert.match(f.message, /SKIPS an oversized command rather than truncating it/);
  // Truncation may only appear as the thing being DENIED. A message that promised a truncated skill
  // would send the author looking for a file that was never written.
  assert.doesNotMatch(f.message, /truncat(es|ed|ion)/i);
});

test("the message declares the proxy rather than claiming an exact measure", () => {
  const f = warns(ctxWith(["codex"], [{ name: "big", bytes: 5000 }]))[0];
  assert.match(f.message, /proxy/);
  assert.match(f.message, /RENDERED skill/);
});

test("vacuous with no library.json, no agent-targets, or no commands", () => {
  assert.deepEqual(check({ root: "/x", library: null, commands: [] }), []);
  assert.deepEqual(check({ root: "/x", library: { data: {} }, commands: [] }), []);
  assert.equal(warns(ctxWith(["codex"], [])).length, 0);
});

test("a command whose file could not be read is not reported here", () => {
  // The command-shape checks own an unreadable command. Counting bytes on a null raw would either throw
  // or invent a size.
  const ctx = ctxWith(["codex"], []);
  ctx.commands = [{ name: "broken", file: path.join(ctx.root, "commands", "broken.md"), raw: null, frontmatter: null, body: "", parseError: "boom" }];
  assert.equal(warns(ctx).length, 0);
});

test("every oversized command is reported, not just the first", () => {
  const found = warns(ctxWith(["codex"], [
    { name: "a", bytes: 4001 },
    { name: "b", bytes: 9000 },
    { name: "ok", bytes: 100 },
  ]));
  assert.equal(found.length, 2);
  assert.deepEqual(found.map((f) => f.file).sort(), ["commands/a.md", "commands/b.md"]);
});

test("PROVEN ABLE TO FAIL: the verdict flips at the constant, through check() and derived from it", () => {
  // The spec's acceptance criterion 3, and deliberately NOT written as arithmetic over two literals - a
  // test that compares numbers proves the numbers, not the check. Both cases go through check(), and both
  // sizes are DERIVED from the exported constant, so lowering the constant moves this test with it and the
  // boundary stays proven wherever the vendor puts it. This is the shape the 2026-09-04 audit found missing
  // on U5, where moving the threshold from 0.7 to 0.1 failed no test.
  const cap = CODEX_COMMAND_SKILL_MAX_BYTES;
  assert.equal(warns(ctxWith(["codex"], [{ name: "at", bytes: cap }])).length, 0, "no finding AT the cap");
  assert.equal(warns(ctxWith(["codex"], [{ name: "over", bytes: cap + 1 }])).length, 1, "a finding one byte OVER it");
});
