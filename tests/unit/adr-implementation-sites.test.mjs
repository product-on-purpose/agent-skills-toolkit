import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { walkFiles } from "../../scripts/lib/fs-utils.mjs";

const SELF = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(SELF), "../..");
const DECISIONS = path.join(REPO_ROOT, "docs", "internal", "decisions");

// The directories that hold executable source. An identifier named as a grep anchor must resolve
// to one of these; matching inside docs/ would let a symbol resolve to its own mention in the ADR
// that names it, which is how the first version of this audit reported a clean sweep over an
// invented function.
const SOURCE_DIRS = ["scripts", "tests", "hooks", path.join("site", "scripts")];

const HEADING = "## Implementation sites";

/** The `## Implementation sites` section body, or null when the ADR has none. */
function implementationSites(text) {
  const start = text.indexOf(HEADING);
  if (start === -1) return null;
  const rest = text.slice(start + HEADING.length);
  const end = rest.indexOf("\n## ");
  return end === -1 ? rest : rest.slice(0, end);
}

/**
 * Backticked tokens that look like code identifiers: camelCase, PascalCase, or UPPER_SNAKE, with an
 * optional call signature stripped. Deliberately excludes anything containing `.` or `/` - those are
 * file paths and property references, which are ambiguous to resolve and produced only false
 * positives when this audit was first run (a glob, and a file ADR 0028 names precisely because it
 * deleted it). Symbols are where the real defects were.
 *
 * There is no exemption for a symbol an ADR names in order to say it was removed. Write such a name
 * WITHOUT backticks: prose about something that was never written, or no longer exists, is not a code
 * reference, and the correction notes in ADRs 0027, 0032, and 0033 follow exactly that convention. An
 * earlier draft exempted any bullet containing "removed" / "retired" / "deleted", which turned out to
 * exempt no line in the corpus while silently waiving every correct symbol on any bullet that happened
 * to use one of those words.
 */
function namedSymbols(section) {
  const out = new Set();
  for (const m of section.matchAll(/`([^`\n]+)`/g)) {
    const name = m[1].replace(/\(.*$/, "").trim();
    if (!/^[A-Za-z_$][A-Za-z0-9_$]{3,}$/.test(name)) continue;
    out.add(name);
  }
  return [...out];
}

/**
 * Every byte of executable source, read once, so symbol lookup is a substring scan.
 *
 * This file is excluded from its own corpus. Without that, the comment below naming the three
 * absent symbols makes each of them resolve, and the test passes against exactly the defect it
 * was written to catch. That is not hypothetical: the first version did precisely this, as did
 * the throwaway script that found the defect in the first place. A scanner that reads the
 * document describing the bug is the second-oldest mistake in this repo.
 *
 * `.mjs` and `.js` only. `walkFiles` applies no `SKIP_DIRS` filter of its own (callers do that), so
 * every extension added here is extra surface in which a symbol can resolve by coincidence. `.json`
 * pulled in 65 test fixtures whose arbitrary string content proves nothing about whether a function
 * exists, and the only `.py` in range is a fixture. Neither changed a single verdict when included.
 * If a real Python or JSON implementation site ever lands, this test fails loudly and names it,
 * which is the correct way to learn about a new case.
 */
function sourceCorpus() {
  let all = "";
  for (const d of SOURCE_DIRS) {
    const abs = path.join(REPO_ROOT, d);
    if (!fs.existsSync(abs)) continue;
    for (const f of walkFiles(abs)) {
      if (!/\.(mjs|js)$/.test(f)) continue;
      if (path.resolve(f) === SELF) continue;
      all += fs.readFileSync(f, "utf8");
    }
  }
  return all;
}

// v1.9.0 added `## Implementation sites` to every ADR so a decision names what carries it, found by
// grep rather than recall. The retrofit was itself written from recall, and three sections named
// symbols that were never written: ADR 0027's `standardGate`, ADR 0032's `stripInlineCode`, ADR
// 0033's `ACTION_VERBS` / `WHEN_PATTERNS`. A section that points at nothing is worse than no section,
// because it reads as verified.
//
// This asserts only that a named symbol EXISTS. It cannot assert the list is complete - that is the
// judgment call the previous session correctly declined to automate, since a completeness check
// rewards placeholder bullets. Existence is mechanical, and it is what actually broke.
//
// The lookup is a deliberately permissive substring match, not a definition-site parse: `check` is
// satisfied by `checks`. That direction is the safe one. A too-strict matcher fails PRs over
// correct-but-unusually-written references and gets deleted; a permissive one still catches the
// defect that exists here, which is a name that appears nowhere at all.
test("every symbol named in an ADR's Implementation sites resolves to real source", () => {
  const corpus = sourceCorpus();
  const unresolved = [];

  for (const file of fs.readdirSync(DECISIONS).filter((f) => /^\d{4}-.*\.md$/.test(f)).sort()) {
    const section = implementationSites(fs.readFileSync(path.join(DECISIONS, file), "utf8"));
    if (section === null) continue;
    for (const sym of namedSymbols(section)) {
      if (!corpus.includes(sym)) unresolved.push(`${file}: ${sym}`);
    }
  }

  assert.deepEqual(
    unresolved,
    [],
    "An Implementation sites section names a symbol that exists nowhere under " +
      SOURCE_DIRS.join(", ") +
      ". Correct the ADR to the real symbol (the section is a grep anchor; a wrong anchor sends the " +
      "next reader looking for something that was never written):\n  " +
      unresolved.join("\n  ")
  );
});
