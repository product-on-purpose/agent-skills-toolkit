// what-it-is:   coverage for ADV4 (substance signals), ADR 0063 sec 2; backlog E61
// what-it-does: proves the three signals (body-length floor, description-duplicate, placeholder
//               catalogue) fire independently, that measure() reads raw ctx regardless of profile or
//               suppression, that the module is registered and runs under --profile askit-library but
//               not under plain-plugin (house-provenance), and that no matcher contains any fixture's
//               literal words
// why:          E61 (the tier certifies file shape); ADR 0063 sec 4's falsifiable-test constraints
// used-by:      npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { check, measure, meta, BODY_WORD_FLOOR, DESCRIPTION_DUPLICATE_THRESHOLD, PLACEHOLDER_PHRASES } from "../../scripts/advisory/adv4-substance.mjs";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { computeAdvisoryLayer } from "../../scripts/check.mjs";
import { ADVISORY_MODULES, ADVISORY_BY_ID, HOUSE_ADVISORY_IDS } from "../../scripts/lib/advisory-registry.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function withPlugin(skills, fn) {
  const dir = mkdtempSync(path.join(tmpdir(), "askit-adv4-"));
  try {
    writeFileSync(
      path.join(dir, "library.json"),
      JSON.stringify({ name: "t", version: "0.1.0", description: "ADV4 fixture.", standard: "0.17", tier: "universal" }, null, 2)
    );
    for (const [name, { description, body }] of Object.entries(skills)) {
      mkdirSync(path.join(dir, "skills", name), { recursive: true });
      writeFileSync(
        path.join(dir, "skills", name, "SKILL.md"),
        `---\nname: ${name}\ndescription: ${description}\n---\n\n${body}\n`
      );
    }
    fn(loadPlugin(dir));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("meta declares ADV4, house provenance", () => {
  assert.equal(meta.advisoryId, "ADV4");
  assert.equal(meta.provenance, "house");
});

test("ADV4 is registered in ADVISORY_REGISTRY and ADVISORY_MODULES, house provenance", () => {
  assert.equal(ADVISORY_BY_ID.get("ADV4")?.provenance, "house");
  assert.ok(ADVISORY_MODULES.some((m) => m.meta.advisoryId === "ADV4"), "ADV4 must be in the shipped module list");
  assert.ok(HOUSE_ADVISORY_IDS.includes("ADV4"), "ADV4 must be in the house-provenance off-set");
});

test("body-length floor fires at or under BODY_WORD_FLOOR words, stays silent above it", () => {
  const shortBody = Array.from({ length: BODY_WORD_FLOOR }, () => "word").join(" ");
  const longBody = Array.from({ length: BODY_WORD_FLOOR + 5 }, () => "word").join(" ");
  withPlugin({
    short: { description: "Converts a list of tasks into a prioritized plan for the team to follow.", body: shortBody },
    long: { description: "Summarizes a spreadsheet of sales data into a quarterly report for leadership.", body: longBody },
  }, (ctx) => {
    const findings = check(ctx);
    const short = findings.filter((f) => f.check === "adv4-substance-body-length" && f.file.includes("short"));
    const long = findings.filter((f) => f.check === "adv4-substance-body-length" && f.file.includes("long"));
    assert.equal(short.length, 1, "at-or-under the floor must fire");
    assert.equal(long.length, 0, "clearly over the floor must not fire");
  });
});

test("description-duplicate fires at or above DESCRIPTION_DUPLICATE_THRESHOLD, stays silent below it", () => {
  withPlugin({
    a: { description: "Converts a CSV file into a formatted summary table for quick review.", body: "A body long enough to clear the substance floor on its own, with real instructional content describing exactly how the skill should proceed step by step." },
    b: { description: "Converts a CSV file into a formatted summary table for quick review.", body: "A body long enough to clear the substance floor on its own, with real instructional content describing exactly how the other skill should proceed step by step." },
    c: { description: "Schedules a recurring calendar reminder for a weekly team stand-up meeting.", body: "A body long enough to clear the substance floor on its own, with real instructional content describing exactly how this third skill should proceed from end to end." },
  }, (ctx) => {
    const findings = check(ctx).filter((f) => f.check === "adv4-substance-description-duplicate");
    assert.ok(findings.length >= 1, "two identical descriptions must fire the duplicate signal");
    assert.ok(!findings.some((f) => f.message.includes('"c"')), "an unrelated description must not be flagged as a duplicate");
  });
});

// W6 finding 4: a placeholder phrase fires only when it is the WHOLE content of a paragraph, never a
// substring inside a longer sentence - so the fixture body below puts the phrase on its own paragraph,
// with unrelated filler in a second paragraph to keep the body comfortably over BODY_WORD_FLOOR too.
test("placeholder-phrase catalogue fires on a generic placeholder phrase occupying its own paragraph", () => {
  withPlugin({
    ph: {
      description: "Converts a list of tasks into a prioritized plan for the team to follow.",
      body: "Placeholder content.\n\nThis body exists only to exercise the placeholder-phrase signal in isolation from the body-length and duplicate-description signals, so this second paragraph is nothing but filler padding to keep the overall word count comfortably clear of the substance floor on its own.",
    },
  }, (ctx) => {
    const findings = check(ctx).filter((f) => f.check === "adv4-substance-placeholder-body");
    assert.equal(findings.length, 1);
  });
});

// W6 finding 4: the false positive the pre-merge review found. "not implemented" sits at a word
// boundary inside this sentence, so a plain substring/word-boundary match still fires on it; only
// POSITION (the phrase is never the WHOLE paragraph here, just a clause inside a much longer one) tells
// genuine instructional prose apart from an actual placeholder stub. Committed as a negative fixture,
// the same role tests/fixtures/advisory/ already gives ADV3's "discusses the attack" case.
test("a legitimate skill discussing 'not implemented' in prose is not flagged as a placeholder body", () => {
  withPlugin({
    honest: {
      description: "Walks a user through a troubleshooting checklist one step at a time.",
      body: "This skill walks through a troubleshooting checklist step by step, asking the user clarifying questions whenever a step's outcome is ambiguous. If a feature is not implemented yet, say so plainly instead of guessing, and point the user at the relevant backlog item so they can track it. Continue to the next step only once the current one's result is confirmed, and summarize the outcome in a short report at the end.",
    },
  }, (ctx) => {
    const findings = check(ctx).filter((f) => f.check === "adv4-substance-placeholder-body");
    assert.equal(findings.length, 0, "prose that DISCUSSES non-implementation must not score as a placeholder body");
  });
});

// W6 finding 1: CJK text has no whitespace to split on, so a naive `/\s+/` word count reads an entire
// substantive paragraph as ONE "word" and puts any real CJK skill body at or under BODY_WORD_FLOOR.
// Shown failing first: stash this fix (git checkout -- scripts/advisory/adv4-substance.mjs) and this
// test goes red, because the pre-fix wordCount() returns 1 for the whole Japanese paragraph below.
test("a substantive Chinese/Japanese body is not flagged as under the word-count floor", () => {
  withPlugin({
    ja: {
      description: "日々のタスクを整理し、優先順位をつけて計画を作成します。",
      body:
        "このスキルは、ユーザーから受け取った複数の作業項目を読み取り、締め切りと重要度に基づいて並べ替え、" +
        "一日の計画として提示します。各項目については、想定される所要時間と依存関係も併せて記録し、" +
        "ユーザーが途中で優先順位を変更した場合には、残りの項目を自動的に再計算して順序を更新します。" +
        "最後に、完了した項目と残っている項目を分けて要約し、次に取り組むべき作業を一つ提案します。",
    },
  }, (ctx) => {
    const m = measure(ctx);
    assert.equal(m.underFloorCount, 0, "a real CJK body must clear the word-count floor, not read as one giant 'word'");
    const findings = check(ctx).filter((f) => f.check === "adv4-substance-body-length");
    assert.equal(findings.length, 0);
  });
});

// ADR 0063 sec 4's own falsifiable-test constraint, proven directly against the module's source text
// rather than only against one fixture's behaviour: no catalogue entry may be the literal potemkin-gold
// phrase, so this guard cannot be satisfied by special-casing that one fixture's words.
test("the placeholder catalogue contains none of the potemkin-gold fixture's literal words", () => {
  const potemkinBody = readFileSync(
    path.join(REPO, "tests/fixtures/audit-corpus/potemkin-gold/skills/pg-skill-one/SKILL.md"),
    "utf8"
  );
  for (const phrase of PLACEHOLDER_PHRASES) {
    assert.ok(!potemkinBody.toLowerCase().includes(phrase), `catalogue entry "${phrase}" must not be lifted from the potemkin-gold fixture`);
  }
});

test("measure() returns null when there is no parseable skill (not-applicable upstream)", () => {
  withPlugin({}, (ctx) => {
    assert.equal(measure(ctx), null);
  });
});

test("measure() is RAW: identical regardless of profile, since it reads ctx directly rather than resolved findings", () => {
  withPlugin({
    only: { description: "Converts a spreadsheet into a weekly summary for the finance team to review.", body: "Do the thing." },
  }, (ctx) => {
    const m1 = measure(ctx);
    const underLibrary = computeAdvisoryLayer(ctx, { profile: "askit-library" });
    const underPlain = computeAdvisoryLayer(ctx, { profile: "plain-plugin" });
    // The advisory LAYER is turned off entirely for ADV4 under plain-plugin (house-provenance off-set),
    // but the RAW measurement this test calls directly is unaffected by any profile - it is not even
    // given one.
    assert.deepEqual(measure(ctx), m1);
    assert.ok(underLibrary.advisoryFindings.some((f) => f.advisoryId === "ADV4"), "ADV4 runs under the full ladder");
    assert.ok(!underPlain.advisoryFindings.some((f) => f.advisoryId === "ADV4"), "ADV4 is house-provenance-exempt under plain-plugin");
  });
});

// W6 finding 13: measure() used to group by the skill's declared `name` (a Set of names), so two
// distinct skills sharing one name - two different roots, as a marketplace grade can produce - silently
// collapsed into a single flagged entry. Grouping by file path (relPath(ctx.root, skillMdPath)) keeps
// them apart. Built by hand, with no SKILL.md on disk: only the fields measure()/wordCount() touch.
test("measure() counts two same-named skills at different paths as two components, not one", () => {
  const shortBody = "one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty";
  const ctx = {
    root: "/plugin",
    skills: [
      { name: "dup", skillMdPath: "/plugin/skills/dup/SKILL.md", body: shortBody, frontmatter: { description: "Converts a list of tasks into a prioritized plan to follow each day." } },
      { name: "dup", skillMdPath: "/plugin/vendor/other/skills/dup/SKILL.md", body: shortBody, frontmatter: { description: "Schedules a recurring reminder for a weekly team meeting on Fridays." } },
    ],
  };
  const m = measure(ctx);
  assert.equal(m.componentCount, 2, "two skills on disk, regardless of shared name");
  assert.equal(m.underFloorCount, 2, "both short bodies must be counted - a name-keyed Set would collapse these into 1");
  const files = m.details.underFloor.map((d) => d.skill.skillMdPath).sort();
  assert.deepEqual(files, ["/plugin/skills/dup/SKILL.md", "/plugin/vendor/other/skills/dup/SKILL.md"]);
});

test("every finding carries reqId: null and no advisoryId (the registry stamps advisoryId, not the module)", () => {
  withPlugin({ a: { description: "Converts a list of tasks into a prioritized plan to follow each day.", body: "x" } }, (ctx) => {
    for (const f of check(ctx)) {
      assert.equal(f.reqId, null, "finding() itself defaults reqId to null; the registry's own stamp is this same null, not a reqId leak");
      assert.equal(f.advisoryId, undefined, "the module itself does not set advisoryId; runAdvisoryModules() in the registry stamps it");
    }
  });
});
