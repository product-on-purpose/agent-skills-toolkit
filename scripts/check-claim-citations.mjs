#!/usr/bin/env node
// what-it-is:   the guard for a CITATION claim: prose in this repository asserting that a vendor
//               claim id is pinned in the ledger
// what-it-does: in foundation/** and the backlog, treats every backticked kebab-case token on a
//               line that talks about claims or pins as a claim citation, and requires it to
//               resolve to an id in foundation/claims/vendor-claims.json
// why:          four tracked surfaces asserted that `codex-sessionend-hook-exists` was a pinned
//               claim. `git log -S` shows that id has never existed in the ledger at ANY commit.
//               Nothing policed the citation, so it stood for six days across four files, and the
//               ledger's cross-references stopped being trustworthy. The class is invisible by
//               construction: a citation reads exactly like a correct one, and the ledger it
//               points at is a different file nobody opens while reading the prose.
// used-by:      npm test, tests/unit/claim-citations.test.mjs
// scoop-design: an earlier draft defined a citation as "the word `claim` or `pinned by`
//               immediately preceding a backticked id". Measured against the four real phantom
//               lines, that convention matched exactly ONE: the other three read
//               "pinned in prose** (`id`)" or put the id before the verb. A guard that catches a
//               quarter of the defect it was built for is not a guard. The opposite extreme was
//               measured too - ANY backticked kebab token in the governed files is 80 distinct
//               tokens, only 8 of which are claim ids, because skill names, check names, source
//               ids, script names and GitHub Action names all share the shape. So the scoop is
//               line-context PLUS subtraction of the vocabularies this repository can enumerate
//               from its own tree, PLUS a short committed list of names that are none of those.
//               The mechanical vocabularies are the point: they cannot drift from the tree, so
//               the committed list stays small and every entry in it is a deliberate statement.
// known-limits: a claim id cited without backticks is invisible here; a citation on a line that
//               never says "claim" or "pin" is invisible here; and a genuinely new kind of
//               kebab-case name reds once until it is either recognized mechanically or added to
//               KNOWN_NON_CLAIM with a reason. That last is the intended failure direction for a
//               records guard: a false positive costs one line of vocabulary, a false negative
//               costs another six days of a false record.
// not-a-check:  report-only over documents, exits 1 on an unresolvable citation. Deliberately NOT
//               a Standard spine check - it polices THIS repository's records rather than a
//               graded plugin's shape, so it lives beside check-doc-enumerations.

import fs from "node:fs";
import path from "node:path";

const GOVERNED_GLOBS = [
  { dir: "foundation", recursive: true, ext: ".md" },
  { file: "docs/internal/backlog/enhancements.md" },
];

/**
 * Names that are kebab-case, appear near the words "claim" or "pin", and are NOT claim ids. Each entry
 * says what it actually is, so a future reader can tell a deliberate exemption from an accumulated one.
 */
const KNOWN_NON_CLAIM = new Map([
  ["agent-plugins", "the marketplace repository"],
  ["pm-skills", "a family member repository"],
  ["critique-skills", "a family member repository"],
  ["codeql-action", "a GitHub Action used in a workflow"],
  ["setup-node", "a GitHub Action used in a workflow"],
  ["validate-windows", "a CI job name"],
  ["skills-ref", "the first-party skills reference validator"],
  ["plain-plugin", "a grading profile name (scripts/lib/profiles.mjs)"],
  ["no-pin", "a collection-report pin state"],
  ["pin-skew", "a parity-report finding name"],
  ["published-verdict", "a roadmap capability name"],
  ["metadata-parity", "a parity-harness dimension"],
  ["vendor-cited", "a check provenance class (objective / vendor-cited / house), per ADR 0029"],
  ["user-invocable", "a skill frontmatter field"],
  ["disable-model-invocation", "a skill frontmatter field"],
]);

/** A line is about claims or pins if it says so. */
const CITATION_CONTEXT = /\bclaim|\bpin(?:s|ned|ning)?\b/i;
/** Two or more lowercase-alphanumeric segments joined by hyphens, inside backticks. */
const BACKTICKED_KEBAB = /`([a-z0-9]+(?:-[a-z0-9]+)+)`/g;

const read = (p) => fs.readFileSync(p, "utf8");
const exists = (p) => fs.existsSync(p);

function walk(dir, ext, out = []) {
  if (!exists(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, ext, out);
    else if (e.name.endsWith(ext)) out.push(full);
  }
  return out;
}

function governedFiles(root) {
  const files = [];
  for (const g of GOVERNED_GLOBS) {
    if (g.file) {
      const p = path.join(root, g.file);
      if (exists(p)) files.push(p);
    } else {
      files.push(...walk(path.join(root, g.dir), g.ext));
    }
  }
  return files.sort();
}

/** Every kebab-case name this repository can enumerate from the tree itself. */
function mechanicalVocabulary(root, ledger) {
  const vocab = new Set();
  for (const s of ledger.sources ?? []) if (s?.id) vocab.add(s.id);

  const skillsDir = path.join(root, "skills");
  if (exists(skillsDir)) {
    for (const e of fs.readdirSync(skillsDir, { withFileTypes: true })) {
      if (e.isDirectory()) vocab.add(e.name);
    }
  }
  for (const dir of ["scripts", "scripts/lib", "scripts/checks", "scripts/generators", "scripts/lib/marketplace"]) {
    const d = path.join(root, dir);
    if (!exists(d)) continue;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.isFile() && e.name.endsWith(".mjs")) vocab.add(e.name.slice(0, -4));
    }
  }
  return vocab;
}

export function findUnresolvedCitations(root = ".") {
  const ledgerPath = path.join(root, "foundation/claims/vendor-claims.json");
  if (!exists(ledgerPath)) {
    return { error: `no ledger at ${ledgerPath}; cannot check citations`, findings: [], checked: 0 };
  }
  const ledger = JSON.parse(read(ledgerPath));
  const claimIds = new Set((ledger.claims ?? []).map((c) => c.id).filter(Boolean));
  const vocab = mechanicalVocabulary(root, ledger);

  const findings = [];
  const files = governedFiles(root);
  for (const file of files) {
    const lines = read(file).split(/\r?\n/);
    lines.forEach((line, i) => {
      if (!CITATION_CONTEXT.test(line)) return;
      for (const m of line.matchAll(BACKTICKED_KEBAB)) {
        const token = m[1];
        if (claimIds.has(token)) continue;
        if (vocab.has(token)) continue;
        if (KNOWN_NON_CLAIM.has(token)) continue;
        findings.push({
          file: path.relative(root, file).replace(/\\/g, "/"),
          line: i + 1,
          id: token,
        });
      }
    });
  }
  return { error: null, findings, checked: files.length, claimIds: [...claimIds] };
}

function main() {
  const root = process.argv[2] ?? ".";
  const { error, findings, checked, claimIds } = findUnresolvedCitations(root);
  if (error) {
    console.error(`check-claim-citations: ${error}`);
    process.exit(1);
  }
  if (findings.length === 0) {
    console.log(
      `OK check-claim-citations: ${checked} governed file(s); every backticked claim citation resolves to one of ${claimIds.length} ledger claim id(s).`,
    );
    return;
  }
  console.error(`check-claim-citations: ${findings.length} citation(s) name a claim id that is not in the ledger.\n`);
  for (const f of findings) {
    console.error(`  ${f.file}:${f.line}  cites \`${f.id}\`, which is not a claim in foundation/claims/vendor-claims.json`);
  }
  console.error(
    `\nEither the claim was never landed (repair the record and say what was actually done), or the id is a\n` +
      `name of some other kind, in which case add it to KNOWN_NON_CLAIM in this file with what it is.`,
  );
  process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("check-claim-citations.mjs")) {
  main();
}
