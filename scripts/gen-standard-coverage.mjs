// what-it-is:   the Standard-to-check coverage generator and its drift guard (ADR 0059)
// what-it-does: extracts every RFC-2119 MUST clause from STANDARD.md, joins it against an authored
//               disposition map validated against the live check registry, and renders
//               docs/reference/standard-coverage.md; with no --write it fails when the committed page,
//               the Standard or the registry have drifted apart
// why:          a MUST nothing enforces is invisible from every surface - the gate passes, the badge is
//               green, and the clause reads as binding. ADR 0059 makes the mapping a test so a new MUST
//               written without a disposition fails CI instead of joining the gap quietly
// used-by:      npm test (via tests/unit/standard-coverage.test.mjs); run by hand with
//               `node scripts/gen-standard-coverage.mjs . --write`
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { REQ_IDS } from "./lib/registry.mjs";
import { normalizeArgPath } from "./lib/fs-utils.mjs";

export const PAGE = "docs/reference/standard-coverage.md";

const RFC2119_LINE = "The key words MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY are used as defined in RFC 2119.";
const MUST_TOKEN = /\bMUST\b/g;
const countMusts = (s) => (s.match(MUST_TOKEN) || []).length;

/** Strip markdown emphasis, code spans and link syntax, so re-bolding a clause is not a reword. */
function normalize(s) {
  return s
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\*\*|\*|_/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/** The clause's first 8 words, lowercased. Part of the key, so a reworded clause reads as UNMAPPED. */
function fingerprint(s) {
  return normalize(s).toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter(Boolean).slice(0, 8).join("-");
}

/**
 * Every MUST / MUST NOT token in STANDARD.md, split into clauses, with the tokens NOT made into a
 * clause accounted for by a stated reason. The token count reconciles exactly:
 *   sum(clause.tokens) + excluded.total === the raw count of \bMUST\b in the file.
 * That identity is what stops the parser silently declaring a clause covered by skipping it - the
 * failure ADR 0059 names as the risk of its own fix.
 */
export function extractMusts(standardPath) {
  const raw = readFileSync(standardPath, "utf8");
  const lines = raw.split(/\r?\n/);
  const clauses = [];
  const excluded = { total: 0, byReason: {} };
  const drop = (reason, n) => { excluded.total += n; excluded.byReason[reason] = (excluded.byReason[reason] ?? 0) + n; };

  let section = "0";
  let inFence = false;
  const perSection = new Map();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*```/.test(line)) { inFence = !inFence; continue; }
    const h = line.match(/^#{1,4}\s+(?:Appendix\s+([A-Z])|([0-9]+(?:\.[0-9]+)*))[.:)]?\s/);
    if (h) section = h[1] ? `Appendix ${h[1]}` : h[2];

    const n = countMusts(line);
    if (n === 0) continue;
    if (inFence) { drop("fenced example", n); continue; }
    if (/^\s*>/.test(line)) { drop("version-history note (the front-matter blockquote)", n); continue; }
    if (line.trim() === RFC2119_LINE) { drop("the RFC 2119 key-words definition", n); continue; }
    if (section.startsWith("Appendix")) { drop("Appendix A decision log (each entry restates a clause that lives in its own section)", n); continue; }

    const parts = line
      .replace(/^\s*[-*]\s+/, "")
      .replace(/^\s*[0-9]+\.\s+/, "")
      .split(/(?<=[.;])\s+(?=[A-Z`*"(\[]|a |an |the |every |each |its |where )/);
    let accounted = 0;
    for (const part of parts) {
      const pn = countMusts(part);
      if (pn === 0) continue;
      accounted += pn;
      const idx = (perSection.get(section) ?? 0) + 1;
      perSection.set(section, idx);
      clauses.push({ key: `sec ${section} #${idx} ${fingerprint(part)}`, section, line: i + 1, tokens: pn, text: normalize(part) });
    }
    // A clause the splitter loses is a MUST the table would silently declare covered. It is never
    // dropped quietly: it lands in the reconciliation as a named bug and fails the guard.
    if (accounted !== n) drop("SPLITTER BUG - a MUST token no clause claimed", n - accounted);
  }
  return { clauses, excluded, rawTokens: countMusts(raw) };
}

// --- mechanical classes -------------------------------------------------------------------------
// Derived from the clause's own grammar, never from a judgement about whether it deserves a check.
// Each one is a disposition in its own right and needs no authored entry.

const LIST_STEM = /\bMUST\b[^:]*:\s*$/;
const TABLE_ROW = /^\|/;
const GRADER_SUBJECT = /^(?:Tooling|Checks|Every check|All checks|The CI configuration|The aggregate gate|A grader|Report format\. Tooling)\b/;

function mechanicalClass(clause) {
  if (TABLE_ROW.test(clause.text)) {
    return { disposition: "table-header", note: "A table header or schema cell, not a requirement clause." };
  }
  if (LIST_STEM.test(clause.text)) {
    return { disposition: "list-stem", note: "Introduces the bullets that carry the requirement; each bullet has its own row." };
  }
  if (GRADER_SUBJECT.test(clause.text)) {
    return { disposition: "grader-facing", note: "The subject is the tooling, not a graded plugin. The conformance spine grades plugins, so no reqId can enforce it; this repository's own implementation is what satisfies it." };
  }
  return null;
}

// --- the authored disposition map ---------------------------------------------------------------
// The ONE hand-maintained input. The generator's job is to make it complete and keep it honest:
// an unmapped clause fails, a stale key fails, an unknown reqId fails.
//
// Dispositions:
//   checked  - a named spine check enforces the clause.
//   partial  - a named spine check enforces PART of it; the note says what is not checked.
//   house    - enforced outside the graded spine by a named guard in this repository.
//   ruled    - ADR 0059 ruled its disposition; the ruling is quoted and is NOT yet applied to
//              STANDARD.md, so the clause below still reads MUST.
//   gap      - no check enforces it and no ADR has ruled it. A gap is NOT a defect list: it is the
//              list of clauses that need a ruling.
export const DISPOSITIONS = Object.freeze({
  // sec 1 - Principles
  "sec 1 #1 composable-over-monolithic-each-component-must-do-one": { disposition: "gap", note: "No check tests whether a component does one thing." },
  "sec 1 #2 every-instruction-must-earn-its-place": { disposition: "checked", reqIds: ["U7"], note: "U7 (instruction-budget) enforces it as a body-line-count proxy and cites sec 1 in its own finding." },
  "sec 1 #3 progressive-disclosure-detail-must-load-on-demand-references": { disposition: "partial", reqIds: ["U7"], note: "U7 caps the SKILL.md body and its remediation is to move deep content into references/. Nothing verifies that the content moved there is actually loaded on demand." },
  "sec 1 #4 agent-native-components-must-be-written-for-an": { disposition: "gap", note: "A judgement about the reader a component is written for; no deterministic check exists." },
  "sec 1 #5 portable-by-default-advanced-by-choice-a-plugin": { disposition: "gap", note: "The Universal tier's checks operationalize portability; no check tests this clause." },
  "sec 1 #6 a-la-carte-adoption-any-single-component-must": { disposition: "gap", note: "Nothing installs a component in isolation to test it." },

  // sec 2 - Conformance tiers
  "sec 2.1 #2 keep-its-authored-markdown-structurally-valid-where-it": { disposition: "checked", reqIds: ["U12"], note: "The clause names U12 (mermaid-valid)." },
  "sec 2.1 #3 register-every-skill-it-ships-where-the-plugin": { disposition: "checked", reqIds: ["U13"], note: "The clause names U13 (skill-registration)." },
  "sec 2.1 #4 ship-no-agent-that-declares-a-field-the": { disposition: "checked", reqIds: ["U14"], note: "The clause names U14 (agent-restricted-fields)." },
  "sec 2.2 #1 concepts-both-cc-and-cx-support-but-in": { disposition: "partial", reqIds: ["S6", "S7"], note: "S6 checks only that each declared target's native manifest exists, plus the mcpServers pointer when .mcp.json is present; S7 checks the command contract. No check verifies that a subagent or a workflow is emitted in each target's format." },
  "sec 2.2 #3 declare-chain-contracts-for-any-skill-or-subagent": { disposition: "checked", reqIds: ["S4"], note: "S4 (chain-contract) is conditional on chaining being used, as the clause requires." },
  // NOT `checked`. A check module exists for each of the ten items, which is what this row used to say,
  // and it is not what the clause asks: "tooling MUST verify EACH". G1, G2, G3 and G4 verify only part of
  // theirs. Three of those four are already recorded by another row of this same table; G2's unenforced
  // half - "CI that passes" - is recorded by this row and by backlog E64. (Row sec 4.1 also mentions G2,
  // but it records a DIFFERENT limit: that nothing checks a CI config for validation logic of its own.
  // An earlier draft of this comment said no other row names G2, which is false; the evidence offered
  // for it was a BACKTICKED grep, which counts reqId citations rather than mentions.) Nothing is claimed here
  // about the remaining items, in either direction. A row that reads `checked` over the four is ADR 0059's
  // stated risk - a MUST the table silently declares covered - reproduced inside the implementation of the
  // table built to prevent it.
  "sec 2.6 #1 a-plugin-claiming-gold-must-satisfy-every-item": { disposition: "partial", reqIds: ["G1", "G2", "G3", "G4", "G5", "G6", "G7", "G8", "G9", "G10"], note: "A check module exists for each of the ten items, so every item is NAMED by the spine. G1, G2, G3 and G4 each enforce only PART of theirs, which is why this is partial and not checked. G1: hook scope and failure behaviour are not read - see the sec 3.5 row; open question [HC-08 (G1's clause requires hook scope and failure behaviour the check never reads)](../internal/backlog/enhancements.md). G3: nothing EXECUTES a case - see the sec 8.3 row; open question [HC-07 (G3's clause promises CI execution the check never looks for)](../internal/backlog/enhancements.md). G4: manifest.generated.json is read by no SPINE check - see the sec 5 package.json-precedent row. G2: self-hosting.mjs reads workflow TEXT offline, so it cannot observe a run, a trigger firing, or whether CI is green (its own docblock); unlike the other three, G2 has no row dedicated to this limit - sec 4.1 mentions G2 but records a different one - so its gap is recorded by this note and by backlog E64 (G2 reads workflow TEXT, so four ways CI can fail while the check passes). Nothing is claimed here about the remaining items, in either direction." },
  "sec 2.6 #3 the-toolkit-targets-gold-at-v1-and-must": { disposition: "house", note: "A clause about this repository rather than a graded plugin. package.json `prepublishOnly` runs `npm test && node scripts/check.mjs`, so a release cannot be published without passing the gate." },

  // sec 3 - Components
  "sec 3.1 #1 name-required-1-64-chars-lowercase-a-z": { disposition: "checked", reqIds: ["U3", "U4"], note: "U3 enforces the character rules and length; U4 enforces equality with the parent directory." },
  "sec 3.1 #2 must-state-what-the-skill-does-and-when": { disposition: "checked", reqIds: ["U5"], note: "U5 (description-score) scores the what-and-when rubric of sec 8.1." },
  "sec 3.1 #3 validation-rules-frontmatter-must-validate": { disposition: "checked", reqIds: ["U3"], note: "U3 (frontmatter-valid) parses and validates the frontmatter." },
  "sec 3.1 #4 skill-md-should-be-500-lines-and-instructions": { disposition: "partial", reqIds: ["U7"], note: "U7 caps the body line count. Nothing verifies that the moved content is one level deep under references/." },
  "sec 3.2 #1 rules-a-command-must-map-to-exactly-one": { disposition: "checked", reqIds: ["S7"], note: "S7 (command-contract) requires a maps-to resolving to exactly one on-disk skill or workflow." },
  "sec 3.2 #2 its-description-must-be-non-empty-and-state": { disposition: "partial", reqIds: ["S7"], note: "S7 checks non-emptiness. The 'state what invoking the command does' half is not scored: ADR 0048 demoted the command description from the sec 8.1 bar after 0 of 14 commands in the reference family satisfied it." },
  "sec 3.2 #3 for-multi-target-plugins-a-command-must-be": { disposition: "gap", note: "No check verifies that a command is emitted in each declared target's format. U18 (command-size-cap) grades a related Codex hazard but not emission." },
  "sec 3.3 #1 rules-a-subagent-must-declare-its-purpose-and": { disposition: "gap", note: "No check reads a subagent's tool set for narrowness." },
  "sec 3.3 #2 a-subagent-that-may-be-invoked-by-skills": { disposition: "checked", reqIds: ["S4"], note: "S4 reports an invocation not covered by the contract (an orphan)." },
  "sec 3.3 #3 every-md-file-under-agents-must-be-a": { disposition: "checked", reqIds: ["U15"], note: "The clause names U15 (agents-dir-registerable)." },
  "sec 3.4 #1 rules-every-skill-referenced-must-exist": { disposition: "checked", reqIds: ["S5"], note: "S5 (workflow-skills) reports a step referencing a skill that is not on disk." },
  "sec 3.4 #2 every-chaining-step-must-be-permitted-by-a": { disposition: "checked", reqIds: ["S4"], note: "S4 owns the permitted-edge rule." },
  "sec 3.4 #3 a-workflow-file-must-be-mirrored-in-the": { disposition: "checked", reqIds: ["S3"], note: "The clause names S3 (components-index); the workflow half of the mirror gates at Standard 0.15 (ADR 0047)." },
  "sec 3.5 #1 rules-each-hook-must-document-its-event-trigger": { disposition: "partial", reqIds: ["G1"], note: "G1 checks a `type` per action and a `matcher` for the tool-matched events. Scope and failure behaviour are NOT checked, and hook-documentation.mjs says so in its own docblock." },
  "sec 3.5 #2 a-blocking-hook-e-g-pretooluse-deny-must": { disposition: "gap", note: "Nothing reads a hook's command for whether it emits an actionable message." },
  "sec 3.5 #3 hooks-must-be-idempotent-where-the-event-can": { disposition: "gap", note: "Idempotence is a runtime property; no static check can observe it." },
  "sec 3.6 #1 rules-chain-contracts-are-a-conditional-must-required": { disposition: "checked", reqIds: ["S4"], note: "S4 fires only when chaining is used." },
  "sec 3.6 #2 any-component-that-invokes-another-must-be-listed": { disposition: "checked", reqIds: ["S4"], note: "The orphan half of S4." },
  "sec 3.7 #1 these-keys-live-under-metadata-and-are-not": { disposition: "checked", reqIds: ["U16"], note: "The clause names U16 (metadata-placement)." },
  "sec 3.8 #1 what-that-description-must-achieve-differs-by-component": { disposition: "checked", reqIds: ["U5"], note: "U5 applies the sec 8.1 bar to skills only (ADR 0049), which is what this clause asks." },
  "sec 3.8 #2 rules-frontmatter-must-be-valid-yaml-required-keys": { disposition: "checked", reqIds: ["U3"], note: "U3 parses the YAML and requires name and description." },
  "sec 3.8 #3 description-must-be-non-empty-and-a-skill": { disposition: "checked", reqIds: ["U3", "U5"], note: "U3 requires a non-empty description; U5 applies the sec 8.1 bar to a skill." },
  "sec 3.9 #1 multi-target-plugins-must-emit-the-mcpservers-pointer": { disposition: "checked", reqIds: ["S6"], note: "per-target-presence.mjs requires `\"mcpServers\": \"./.mcp.json\"` in each declared target's native manifest when the plugin ships .mcp.json." },
  "sec 3.9 #2 validation-rules-the-server-entry-must-be-present": { disposition: "checked", reqIds: ["U11"], note: "U11 (mcp-valid) validates server shape and refuses an inline secret." },
  "sec 3.10 #1 validation-rules-required-at-the-repository-root-at": { disposition: "ruled", adr0059: "sec 3.10 `AGENTS.md` links resolve", reqIds: ["U2"], note: "U2 covers the presence half (AGENTS.md at the root). ADR 0059 rules the link half a CHECK: 'sec 3.10 AGENTS.md links resolve - Check - extend U2'. NOT YET APPLIED: no check resolves AGENTS.md's internal links today." },
  "sec 3.10 #2 its-component-count-references-must-stay-in-sync": { disposition: "ruled", adr0059: "sec 3.10 `AGENTS.md` counts agree", note: "ADR 0059: 'sec 3.10 AGENTS.md counts agree - Demote to SHOULD - Link resolution is objective; a count agreeing with prose is a formatting convention, and enforcing it would fire on legitimate phrasing.' NOT YET APPLIED: the clause below still reads MUST." },

  // sec 4 - Validation and CI
  "sec 4.1 #2 a-validator-generator-has-no-need-for-bleeding": { disposition: "gap", note: "A clause about this Standard's own runtime baseline, not about a graded plugin; nothing verifies it." },
  "sec 4.1 #3 a-ci-configuration-e-g-github-actions-must": { disposition: "gap", note: "G2 checks that a workflow INVOKES the gate. Nothing checks that the CI configuration carries no validation logic of its own." },
  "sec 4.1 #4 the-plugin-must-not-depend-on-a-specific": { disposition: "gap", note: "No check tests a plugin against a second CI provider." },
  "sec 4.3 #1 versioning-must-be-semver": { disposition: "checked", reqIds: ["U1", "U9"], note: "U1 requires library.json `version` to be a semver string; U9 requires package.json to agree with it." },

  // sec 5 - Plugin manifest
  "sec 5 #1 every-conformant-plugin-at-any-tier-must-carry": { disposition: "checked", reqIds: ["U1"], note: "U1 (library-json) requires the file and its required fields at every tier." },
  "sec 5 #3 the-filename-follows-the-package-json-precedent-a": { disposition: "partial", reqIds: ["U8"], note: "'The agent-native manifests MUST be generated from library.json.' U8 compares the `name` and `version` of the two native manifests against library.json and nothing else: a description, license, keyword or component-pointer divergence passes, and manifest.generated.json is read by no SPINE check at all. Both reproduced 2026-09-18, and the manifest half again 2026-09-19. Nothing about a graded plugin changed on 2026-09-19: this repository added a HOUSE guard over its own copy of that file, which carries no reqId and grades nobody else's plugin." },
  "sec 5 #4 all-manifests-must-be-consistent-with-what-is": { disposition: "partial", reqIds: ["U8", "S3", "S8"], note: "S3 and S8 mirror the components index against disk in both directions. U8 covers only `name` and `version` of the native manifests. 'All manifests' therefore excludes manifest.generated.json, which no SPINE check reads." },
  "sec 5.1 #2 library-json-must-not-contain-a-marketplace-listing": { disposition: "gap", note: "library-json.mjs does not look for a marketplace listing inside library.json (zero matches for 'marketplace' in the module). Sec 12's self-listing prohibition is a different clause and is also a gap." },
  // AUTHORED so it beats the grader-facing mechanical class. The clause's subject IS tooling, but ADR
  // 0059 ruled it a CHECK to be written, and letting the grammar swallow it would hide one of the seven.
  "sec 5.1 #3 tooling-must-validate-library-json-against-this-schema": { disposition: "ruled", adr0059: "sec 5.1 entry `path` and `version` agree with disk", reqIds: ["U1", "S3", "S8"], note: "U1 validates library.json against the schema. The path/version-agree-with-disk half is NOT written: S3 matches components entries against disk BY NAME ONLY, and S8 mirrors `status` and `tier` against frontmatter, so declaring a skill at version 99.99.99 whose SKILL.md says 0.1.0 passes the whole gate (reproduced 2026-09-18). ADR 0059: 'Check - extend S3 / S8 - the lowest-cost of the three: components-index and components-mirror already walk both sides, and S3's own docblock already claims this. The check was described and never written.' NOT YET APPLIED." },

  // sec 6 - agentskills.io alignment
  "sec 6 #1 every-universal-tier-skill-is-by-definition-an": { disposition: "house", note: "Not in the portable spine. scripts/check-parity.mjs runs the reference validator (`agentskills validate`) over every skills/* directory in this repository's CI validator-parity job (ADR 0042), and gates on an undocumented disagreement." },
  "sec 6 #2 where-agentskills-io-evolves-the-universal-tier-must": { disposition: "house", note: "A maintenance obligation on this Standard, not a plugin property. scripts/standards-watch.mjs is the tracking instrument." },

  // sec 7 - Governance and lifecycle
  "sec 7.1 #1 each-item-must-record-proposed-name-component-type": { disposition: "gap", note: "No check reads docs/internal/backlog/new-components.md for the required fields." },
  "sec 7.1 #2 each-item-must-reference-the-target-component-and": { disposition: "gap", note: "No check reads docs/internal/backlog/enhancements.md for a target component." },
  "sec 7.1 #3 a-new-component-proposal-should-pass-a-why": { disposition: "gap", note: "The why-gate is a skill's workflow (askit-backlog), not a graded requirement." },
  "sec 7.2 #1 the-count-is-a-should-not-a-must": { disposition: "ruled", adr0059: "sec 7.2 a drifted sample is an error", note: "ADR 0059: 'sec 7.2 a drifted sample is an error - Stated, unchecked - There is no sample reader. Marking it unchecked is honest; writing a reader to satisfy a clause nobody has asked for is not warranted by any observed defect.' NOT YET APPLIED: the clause carries no unchecked marker." },
  "sec 7.3 #1 each-component-must-carry-its-current-version-semver": { disposition: "gap", adr0059: "sec 7.3 `HISTORY.md` at Silver+", note: "Two halves, and NEITHER is checked. The `metadata.version` half: NO check requires a component to carry a version at all. S3 matches index entries against disk by name only (reproduced 2026-09-18); U16 reports a `version` key declared at the top level instead of under `metadata` but never requires its presence; U9 compares package.json against library.json, not any component. That is the whole result of an exhaustive grep for version handling across scripts/checks/. The HISTORY.md half is ADR 0059's first ruling: 'sec 7.3 HISTORY.md at Silver+ - Demote to SHOULD - The requirement was aspirational when written and no adopter has met it, this repository included.' APPLIED at Standard 0.17 (E67): the history half now reads SHOULD. The row is a `gap` rather than `ruled` because what still reads MUST on this line is the `metadata.version` half, which no check enforces and no ADR has ruled." },
  // sec 7.3 #2 (frontmatter version equals the latest HISTORY.md entry) was DEMOTED to SHOULD at
  // Standard 0.17 (E67) in the same change, for the same reason. No longer a MUST, no longer a row.
  // sec 7.3 #3 (frontmatter version / history file / CHANGELOG must not contradict) was DEMOTED to
  // SHOULD at Standard 0.17 (E67), so it is no longer a MUST clause and no longer has a row here. The
  // entry is removed rather than left: a disposition for a clause the extractor cannot find is exactly
  // the STALE mapping this generator refuses to build, and it refused - which is how this was caught.
  "sec 7.4 #1 components-and-the-plugin-must-use-semver": { disposition: "checked", reqIds: ["U1", "U9"], note: "The same enforcement as sec 4.3." },
  "sec 7.4 #2 propagation-deterministic-must-the-plugin-s-version-bump": { disposition: "ruled", adr0059: "sec 7.4 version propagation is verifiable", note: "ADR 0059: 'sec 7.4 version propagation is verifiable - Stated, unchecked - release-ready covers it for this repository, but that is a maintainer-only aggregate and not part of the graded spine, so a third-party plugin gets no such check. The clause stands; the gap is named.' NOT YET APPLIED." },
  "sec 7.4 #3 this-is-a-must-not-a-should-so": { disposition: "ruled", adr0059: "sec 7.4 version propagation is verifiable", note: "The rationale sentence for the propagation clause above, and it carries the same ADR 0059 ruling: stated, unchecked." },
  "sec 7.5 #1 deprecated-components-must-still-validate-and-function-until": { disposition: "gap", note: "Every check grades a deprecated component exactly as an active one, so the clause holds by construction: grepping scripts/checks/ for 'deprecated' outside deprecation.mjs finds only a components-mirror comment about status mirroring and metadata-placement's key list, and no early return that skips one (2026-09-18). Nothing tests it AS a requirement, and nothing would notice a check that started exempting them." },
  "sec 7.5 #2 removal-must-be-a-plugin-major-and-must": { disposition: "partial", reqIds: ["G6"], note: "G6 requires a deprecated entry to declare `remove-in`. Nothing checks that the removal lands in a MAJOR, or that it reaches the CHANGELOG." },
  "sec 7.7 #1 burndown-warn-then-error-must-for-tightenings-a": { disposition: "house", note: "A requirement on how this Standard grows. scripts/lib/standard-ceiling.mjs implements the warn-first ceiling and tests/unit/standard-ceiling.test.mjs covers it; no reqId can enforce it against a plugin." },
  "sec 7.7 #2 pinned-version-grading-must-every-check-declares-the": { disposition: "house", note: "tests/unit/registry-sync.test.mjs asserts every registered check declares a non-empty meta.since (test R-SINCE-1), so a check that forgets it fails CI." },
  "sec 7.7 #4 tightenings-are-pin-driven-too-and-the-ceiling": { disposition: "house", note: "One mechanism, scripts/lib/standard-ceiling.mjs, with its own test file." },
  "sec 7.7 #5 a-tightened-subrule-needs-its-own-migration-must": { disposition: "house", note: "Carried per finding by the `migration` metadata (ADR 0044) rather than by a check; the subrule caps live in the check modules themselves." },
  "sec 7.7 #6 consumer-configuration-cannot-outrank-the-pin-must-the": { disposition: "house", note: "scripts/lib/resolve-config.mjs applies the ceiling after a consumer's profile, overrides and suppressions resolve." },
  "sec 7.7 #8 a-published-conformance-verdict-must-not-let-the": { disposition: "house", note: "The published-verdict clamp in scripts/lib/resolve-config.mjs; surfaced to the reader as clampNotice / trustNotice." },

  // sec 8 - Quality bars
  "sec 8.1 #1 a-description-must-state-what-the-component-does": { disposition: "checked", reqIds: ["U5"], note: "U5 is the scorer for this rubric." },
  "sec 8.1 #2 anti-patterns-e-g-helps-with-x-must": { disposition: "partial", reqIds: ["U5"], note: "U5 scores the description, and the clause's own example was measured rather than assumed: a skill whose description is exactly 'Helps with X' scores 0.00 against the 0.7 bar (`node scripts/check.mjs` on a probe plugin, 2026-09-18). But no rule NAMES the anti-pattern, the finding is a warn rather than an error, and a description can hold the phrase and still clear the bar." },
  "sec 8.1 #3 the-scorer-reads-english-and-declines-rather-than": { disposition: "house", note: "A requirement on the scorer, satisfied by description-score.mjs's DECLINE path (ADR 0049)." },
  "sec 8.2 #1 names-must-be-unique-within-the-plugin": { disposition: "ruled", adr0059: "sec 8.2 name collisions", note: "ADR 0059: 'sec 8.2 name collisions - Check - a new cross-type uniqueness check. The one genuinely new check of the seven. A skill and a command sharing a name is by design; two skills sharing one is a collision.' NOT YET APPLIED: no such check exists, and the spine is still 35." },
  "sec 8.3 #1 advanced-must-provide-regression-coverage-for-chains-and": { disposition: "partial", reqIds: ["G3"], note: "G3 verifies that an eval set under evals/ declares each chain edge and each hook event, plus the stale-edge signal. Nothing EXECUTES a case, in this repository or in a graded plugin, so the sec 2.6 G3 clause's 'CI executes them' half is unchecked. Open question [HC-07 (G3's clause promises CI execution the check never looks for)](../internal/backlog/enhancements.md), unruled: whether the clause weakens or the check strengthens is the maintainer's call." },
  "sec 8.4 #1 every-published-documentation-page-under-docs-excluding-docs": { disposition: "checked", reqIds: ["G7"], note: "G7 (docs-frontmatter) enforces the taxonomy on every docs/** page outside docs/internal/." },

  // sec 9 - Security
  "sec 9 #1 a-component-must-request-the-narrowest-tool-set": { disposition: "gap", note: "No check reads a component's tool set." },
  "sec 9 #2 subagents-and-hooks-must-document-why-each-granted": { disposition: "gap", note: "No check reads a capability rationale." },
  "sec 9 #3 a-hook-that-can-block-e-g-a": { disposition: "gap", note: "The same gap as sec 3.5 #2; nothing reads a hook's behaviour." },
  "sec 9 #4 secrets-must-not-appear-in-frontmatter-samples-or": { disposition: "partial", reqIds: ["U11"], note: "U11 refuses an inline secret in .mcp.json. Nothing scans frontmatter, samples or any other committed file, which the 2026-09-04 audit recorded as F-023." },

  // sec 10 - Anatomy and documentation
  "sec 10.3 #1 every-level-of-the-plugin-has-an-agent": { disposition: "partial", reqIds: ["G4", "S3", "S8"], note: "G4 keeps INDEX.md generated rather than authored, and S3/S8 keep the components index equal to disk. Nothing tests the 'exactly one canonical place' rule in general." },
  "sec 10.4 #1 adrs-are-internal-audience-but-must-be-committed": { disposition: "partial", reqIds: ["G10"], note: "G10 requires every ADR under docs/internal/decisions/ to carry a `## TL;DR`, which presupposes it is committed. Nothing checks that an uncommitted ADR exists to be found." },
  "sec 10.4 #2 gitignored-ephemeral-working-scratch-design-drafts-session-logs": { disposition: "gap", note: "No check verifies that scratch material is gitignored." },
  "sec 10.6 #1 they-are-distinct-artifacts-and-must-not-be": { disposition: "checked", reqIds: ["G5"], note: "G5 reports a RELEASE-NOTES.md that is byte-identical to CHANGELOG.md." },

  // sec 12 - Distribution and marketplaces
  "sec 12 #1 a-plugin-must-not-embed-a-marketplace-that": { disposition: "gap", note: "U17 checks the SHAPE of a marketplace.json. Nothing checks whether its entries list the plugin that ships it: a case-insensitive grep of scripts/ for self-list, 'lists itself' and 'embed a marketplace' returns no hit outside this generator's own notes (2026-09-18). ADR 0051 rules that a catalogue-level finding is never a numbered requirement on an individual plugin, which is why this is stated rather than graded, but no ADR has ruled this clause itself." },
  "sec 12 #2 one-manifest-one-kind-a-claude-plugin-marketplace": { disposition: "checked", reqIds: ["U17"], note: "U17 (catalogue-manifest-shape) covers all four: readable, parses, carries a plugins array, and does not mix kinds." },
  "sec 12 #3 the-separation-rule-applies-to-both-formats-a": { disposition: "gap", note: "The same gap as sec 12 #1, restated for the Codex format." },
});

// --- join, validate, render ---------------------------------------------------------------------

const ORDER = ["checked", "partial", "house", "ruled", "gap", "grader-facing", "list-stem", "table-header"];

// ADR 0059's seven dispositions, its "Clause" column verbatim. Every `ruled` row names the one it
// carries, and the guard fails unless ALL SEVEN are carried. This is the acceptance test the task
// asks for: a generated table that disagrees with ADR 0059 is a defect in the generator. It caught
// one - sec 5.1's path/version clause has "Tooling MUST" as its subject, so the grader-facing
// mechanical class swallowed a clause the ADR had ruled a check, and the ADR row went uncarried.
export const ADR_0059_CLAUSES = Object.freeze([
  "sec 7.3 `HISTORY.md` at Silver+",
  "sec 5.1 entry `path` and `version` agree with disk",
  "sec 3.10 `AGENTS.md` links resolve",
  "sec 3.10 `AGENTS.md` counts agree",
  "sec 7.2 a drifted sample is an error",
  "sec 7.4 version propagation is verifiable",
  "sec 8.2 name collisions",
]);

export function buildRows(root) {
  const { clauses, excluded, rawTokens } = extractMusts(path.join(root, "STANDARD.md"));
  const problems = [];
  const rows = [];
  const seen = new Set();

  for (const c of clauses) {
    const mech = mechanicalClass(c);
    const authored = DISPOSITIONS[c.key];
    // An authored disposition WINS over a mechanical class. The mechanical classes are the fallback
    // for clauses nobody has had to think about; an authored entry is the more specific statement,
    // and sec 7.4's propagation clause is a real requirement that happens to end in a colon.
    const d = authored ?? mech;
    if (!d) { problems.push(`UNMAPPED MUST - no disposition for: ${c.key}\n      ${c.text.slice(0, 160)}`); continue; }
    if (authored) seen.add(c.key);
    for (const r of d.reqIds ?? []) {
      if (!REQ_IDS.has(r)) problems.push(`disposition names reqId "${r}", which is not in the live registry: ${c.key}`);
    }
    if (!ORDER.includes(d.disposition)) problems.push(`unknown disposition "${d.disposition}": ${c.key}`);
    if (!d.note) problems.push(`disposition carries no note: ${c.key}`);
    rows.push({ ...c, ...d, reqIds: d.reqIds ?? [] });
  }

  for (const key of Object.keys(DISPOSITIONS)) {
    if (!seen.has(key)) problems.push(`STALE mapping - no clause in STANDARD.md matches: ${key}`);
  }

  // Agreement with ADR 0059, both directions.
  const carried = new Set();
  for (const r of rows) {
    if (r.disposition === "ruled" && !r.adr0059) problems.push(`a "ruled" row names no ADR 0059 clause: ${r.key}`);
    if (r.adr0059) {
      if (!ADR_0059_CLAUSES.includes(r.adr0059)) problems.push(`row names an ADR 0059 clause that is not one of the seven ("${r.adr0059}"): ${r.key}`);
      else carried.add(r.adr0059);
    }
  }
  for (const c of ADR_0059_CLAUSES) {
    if (!carried.has(c)) problems.push(`ADR 0059 ruled "${c}" and no row in this table carries it`);
  }

  const claimed = clauses.reduce((s, c) => s + c.tokens, 0);
  if (claimed + excluded.total !== rawTokens) {
    problems.push(`token reconciliation failed: ${claimed} claimed + ${excluded.total} excluded != ${rawTokens} MUST tokens in STANDARD.md`);
  }
  for (const reason of Object.keys(excluded.byReason)) {
    if (reason.startsWith("SPLITTER BUG")) problems.push(`${reason}: ${excluded.byReason[reason]} token(s)`);
  }
  return { rows, excluded, rawTokens, claimed, problems };
}

const esc = (s) => String(s).replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");

export function render(root) {
  const { rows, excluded, rawTokens, claimed, problems } = buildRows(root);
  if (problems.length) {
    const e = new Error(`standard-coverage: ${problems.length} problem(s)\n  - ${problems.join("\n  - ")}`);
    e.problems = problems;
    throw e;
  }
  const standardVersion = (readFileSync(path.join(root, "STANDARD.md"), "utf8").match(/Standard version ([0-9.]+)/) || [, "?"])[1];
  const count = (d) => rows.filter((r) => r.disposition === d).length;

  const out = [];
  out.push("---");
  out.push('title: "Standard-to-check coverage"');
  out.push('description: "Every RFC-2119 MUST in STANDARD.md with the check that enforces it, the ruling that dispositions it, or the stated gap - generated, never hand-written."');
  out.push("audience: engineer");
  out.push("level: advanced");
  out.push("---");
  out.push("");
  out.push("# Reference: Standard-to-check coverage");
  out.push("");
  out.push("**Generated by `scripts/gen-standard-coverage.mjs`. Do not edit this page.** A drift guard in `npm test` fails when this file, `STANDARD.md` and the check registry disagree, which is what stops the mapping going stale (ADR 0059, every MUST maps to a check, a SHOULD or a stated gap).");
  out.push("");
  out.push(`Standard version **${standardVersion}**. **${rawTokens}** \`MUST\` / \`MUST NOT\` tokens in \`STANDARD.md\`, of which **${claimed}** become the **${rows.length}** clause rows below and **${excluded.total}** are excluded for a stated reason. The two numbers reconcile exactly, on every run: a clause the parser loses would otherwise be a \`MUST\` this page silently declares covered, which is the failure ADR 0059 names as the risk of its own fix.`);
  out.push("");
  out.push("## What a disposition means");
  out.push("");
  out.push("| Disposition | Count | Meaning |");
  out.push("| --- | --- | --- |");
  out.push(`| \`checked\` | ${count("checked")} | A named spine check enforces the clause. |`);
  out.push(`| \`partial\` | ${count("partial")} | A named spine check enforces PART of it. The note says what is not checked. |`);
  out.push(`| \`house\` | ${count("house")} | Enforced outside the graded spine, by a named guard in this repository. A third-party plugin gets no such check. |`);
  out.push(`| \`ruled\` | ${count("ruled")} | [ADR 0059 (every MUST maps to a check, a SHOULD or a stated gap)](../internal/decisions/0059-every-must-maps-to-a-check-a-should-or-a-stated-gap.md) ruled its disposition. The ruling is quoted in the note and is **not yet applied**, so the clause still reads \`MUST\`. |`);
  out.push(`| \`gap\` | ${count("gap")} | No check enforces it and no ADR has ruled it. **A gap is not a defect list.** It is the list of clauses that need a ruling. |`);
  out.push(`| \`grader-facing\` | ${count("grader-facing")} | The clause's own subject is the tooling, not a graded plugin, so no \`reqId\` can enforce it. Classified from the clause's grammar, not by judgement. |`);
  out.push(`| \`list-stem\` | ${count("list-stem")} | Introduces the bullets that carry the requirement; each bullet has its own row. |`);
  out.push(`| \`table-header\` | ${count("table-header")} | A table header or schema cell, not a requirement clause. |`);
  out.push("");
  out.push("## Agreement with ADR 0059");
  out.push("");
  out.push("ADR 0059 ruled seven clauses. Each is carried by a row below, and generation FAILS if any is not, so this page cannot quietly drift away from the decision it implements. **One of the seven has been applied to `STANDARD.md`:** the sec 7.3 `HISTORY.md` demotion, at Standard 0.17. Its row reads `gap`, because the MUST left on that line is the `metadata.version` half, which nothing checks and no ADR has ruled. The other six still read `MUST` in the Standard, which is why each appears as `ruled` rather than as `checked` or as a `SHOULD`.");
  out.push("");
  out.push("| ADR 0059 clause | Carried by |");
  out.push("| --- | --- |");
  for (const c of ADR_0059_CLAUSES) {
    const carriers = rows.filter((r) => r.adr0059 === c).map((r) => `sec ${r.section} line ${r.line}`);
    out.push(`| ${esc(c)} | ${carriers.join("; ")} |`);
  }
  out.push("");
  out.push("## Excluded tokens");
  out.push("");
  out.push("| Reason | Tokens |");
  out.push("| --- | --- |");
  for (const [reason, n] of Object.entries(excluded.byReason).sort()) out.push(`| ${esc(reason)} | ${n} |`);
  out.push("");
  out.push("## Every MUST");
  out.push("");
  out.push("Ordered by section. `Line` is the line in `STANDARD.md` at the time of generation.");
  out.push("");
  out.push("| Clause | Line | Disposition | Checks | Note |");
  out.push("| --- | --- | --- | --- | --- |");
  for (const r of rows) {
    out.push(`| sec ${esc(r.section)} - ${esc(r.text.length > 200 ? r.text.slice(0, 197) + "..." : r.text)} | ${r.line} | \`${r.disposition}\` | ${r.reqIds.length ? r.reqIds.map((x) => `\`${x}\``).join(", ") : "-"} | ${esc(r.note)} |`);
  }
  out.push("");
  return out.join("\n") + "\n";
}

export function readCommitted(root) {
  const p = path.join(root, PAGE);
  return existsSync(p) ? readFileSync(p, "utf8") : null;
}

if (process.argv[1]?.endsWith("gen-standard-coverage.mjs")) {
  const rawRoot = process.argv.find((a, i) => i >= 2 && !a.startsWith("--"));
  const root = rawRoot ? normalizeArgPath(rawRoot) : process.cwd();
  let page;
  try {
    page = render(root);
  } catch (e) {
    process.stderr.write(`${e.message}\n`);
    process.exit(1);
  }
  if (process.argv.includes("--write")) {
    writeFileSync(path.join(root, PAGE), page);
    process.stdout.write(`wrote ${PAGE}\n`);
  } else {
    const committed = readCommitted(root);
    const norm = (s) => String(s).replace(/\r\n/g, "\n");
    if (committed == null) { process.stderr.write(`${PAGE} is missing; regenerate with --write\n`); process.exit(1); }
    if (norm(committed) !== norm(page)) {
      process.stderr.write(`${PAGE} is out of date with STANDARD.md + the check registry; regenerate with:\n  node scripts/gen-standard-coverage.mjs . --write\n`);
      process.exit(1);
    }
    process.stdout.write(`gen-standard-coverage: OK (${PAGE} matches STANDARD.md + the registry)\n`);
  }
}
