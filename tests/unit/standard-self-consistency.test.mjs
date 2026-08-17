// what-it-is:   a self-consistency guard over STANDARD.md as a PUBLISHED normative document
// what-it-does: asserts the component-wide contract in sec 3.8 does not contradict the component-specific
//               sections, and that the present-tense spine and version claims agree with the registry
// why:          review wave 2 found the shipped Standard contradicting itself: sec 3.8 made the sec 8.1
//               discoverability bar mandatory for EVERY component while sec 3.2 demoted it to a SHOULD for
//               commands and sec 8.1 excluded them outright, so a command could simultaneously conform to
//               and violate the same document. Every other claim in this repository is machine-checked;
//               the normative text a consumer actually diffs was not
// used-by:      npm test
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CHECKS } from "../../scripts/lib/registry.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const STANDARD = readFileSync(path.join(REPO, "STANDARD.md"), "utf8");
const LIBRARY = JSON.parse(readFileSync(path.join(REPO, "library.json"), "utf8"));

/** The body of one `### N.N` section, so a claim is attributed to the section that makes it. */
function section(num) {
  const start = STANDARD.indexOf(`### ${num} `);
  assert.notEqual(start, -1, `sec ${num} not found`);
  const rest = STANDARD.slice(start);
  const end = rest.indexOf("\n### ", 1);
  return end === -1 ? rest : rest.slice(0, end);
}

test("sec 3.8's component-wide description rule does NOT contradict sec 3.2 and sec 8.1", () => {
  // The defect, exactly: sec 3.8 said the description MUST satisfy the 8.1 bar, full stop, for every
  // component. Sec 3.2 says a command's agreement with its skill is a SHOULD, and sec 8.1 scopes itself
  // to skills. A command therefore conformed to and violated the document at once - and it shipped.
  const s38 = section("3.8");
  const unqualified = /`description` MUST satisfy the discoverability bar \(8\.1\)\./.test(s38);
  assert.equal(
    unqualified,
    false,
    "sec 3.8 must not make the 8.1 bar unconditional: sec 3.2 and sec 8.1 both exclude commands from it"
  );
  // and it must say WHICH component type the bar applies to, or the exclusion is only implied
  assert.match(s38, /SKILL'?s? description MUST/i, "sec 3.8 must scope the bar to skills explicitly");
  assert.match(s38, /COMMAND/i, "sec 3.8 must state the command exception where the contract is stated");
});

test("sec 8.1 scopes itself, and sec 3.2 agrees with it", () => {
  const s81 = section("8.1");
  const s32 = section("3.2");
  assert.match(s81, /applies to a SKILL'?s? description/i, "sec 8.1 must state its own scope");
  assert.match(s32, /not held to the sec 8\.1 discoverability bar/i, "sec 3.2 must state the exclusion");
  // The two sections must not disagree about whether a command is in scope.
  assert.doesNotMatch(s32, /a command'?s? `?description`? MUST satisfy the discoverability bar/i);
});

test("every present-tense spine count in STANDARD.md matches the registry", () => {
  // Historical version notes record what the spine WAS at an earlier version and must not be rewritten;
  // present-tense claims must be true today. The distinguishing marker is the leading "> vX.Y:" quote.
  const n = CHECKS.length;
  const presentTense = STANDARD.split("\n").filter((l) => !l.startsWith("> v"));
  for (const line of presentTense) {
    const m = line.match(/the spine is[^=]*=\s*\*\*(\d+)\*\*/);
    if (m) assert.equal(Number(m[1]), n, `a present-tense spine claim says ${m[1]}; the registry has ${n}`);
  }
});

test("the historical version notes are NOT rewritten when the spine grows", () => {
  // The v0.13 note records a 31-check spine and the U11-U14 range. Those are facts about 0.13 and stay
  // true forever; a bulk find-and-replace over spine counts would silently falsify the release history.
  const v013 = STANDARD.split("\n").find((l) => l.startsWith("> v0.13:"));
  assert.ok(v013, "the v0.13 version note must still exist");
  assert.match(v013, /= \*\*31\*\*/, "the v0.13 note records a 31-check spine and must keep doing so");
  assert.match(v013, /`U11-U14`/, "the v0.13 note records the U11-U14 range and must keep doing so");
});

test("STANDARD.md's declared version matches the pin this repository adopts", () => {
  // A Standard that authors 0.14 while its own plugin pins something else is not credible, and the two
  // drifting apart is exactly the class of records defect this repository keeps finding.
  const declared = STANDARD.match(/\*\*Standard version (\d+\.\d+)\*\*/);
  assert.ok(declared, "STANDARD.md must declare its version in the header");
  assert.equal(
    declared[1],
    LIBRARY.standard,
    `STANDARD.md declares ${declared[1]} but library.json pins ${LIBRARY.standard}`
  );
});
