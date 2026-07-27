import { test } from "node:test";
import assert from "node:assert/strict";
import { escapeMdCell } from "../../scripts/lib/md-escape.mjs";

// CodeQL js/incomplete-sanitization (high), found FIVE times in this repo across THREE files written by
// three independent authors. Two were fixed in v1.7.0, two more surfaced in standards-watch. Three
// rediscoveries of one mistake is a shape that invites it, so the escape now lives in exactly one place.
// These tests guard that place. Pipes are counted the way Markdown reads them - a pipe is escaped only
// when the backslash run immediately before it is ODD - because textually stripping the two-character
// escape sequence is the same mistake as the bug and yields a test that cannot fail.
const BS = String.fromCharCode(92);
function livePipes(line) {
  let n = 0;
  for (let i = 0; i < line.length; i++) {
    if (line[i] !== "|") continue;
    let slashes = 0;
    for (let j = i - 1; j >= 0 && line[j] === BS; j--) slashes++;
    if (slashes % 2 === 0) n++;
  }
  return n;
}

test("no payload can contribute a live pipe", () => {
  for (const payload of [`x${BS}| INJECTED | tail`, "a|b", `${BS}${BS}|`, `${BS}`, "|", `${BS}|${BS}|`]) {
    assert.equal(livePipes(escapeMdCell(payload)), 0, `payload ${JSON.stringify(payload)} escaped its cell`);
  }
});

test("a newline cannot end the row", () => {
  assert.ok(!/[\r\n]/.test(escapeMdCell("a\nb\r\nc")), "newlines must collapse");
});

test("ordinary text is unchanged", () => {
  assert.equal(escapeMdCell("plain text"), "plain text");
});

test("null and undefined render empty, not as the words", () => {
  assert.equal(escapeMdCell(null), "");
  assert.equal(escapeMdCell(undefined), "");
});
