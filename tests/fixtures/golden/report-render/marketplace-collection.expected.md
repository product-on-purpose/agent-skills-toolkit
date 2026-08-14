# example-catalogue - Collection Evaluation

> Marketplace-scope evaluation of the 5-member catalogue (catalogue v3.4.0). Each member is graded at ITS OWN declared tier and ITS OWN Standard pin; the collection is red if any member fails its own claim, or if the catalogue itself is broken.

## 01 Verdict

**Collection verdict: RED. Graded 3 of 5 member(s), 1 not graded, 1 unresolvable. 2 collection error(s), 1 collection warning(s). Exit code 1.**

Members failing their own declared claim: **beta**. A member fails its own claim when its own gate would fail; no collection-level tier expectation is invented for anybody.

> This run graded the LOCAL CHECKOUT of each member it could resolve, not the tree at the registry pin. Remote fetch-at-sha is deferred (ADR 0039, question 1). The pin, entry version and graded sha below are shown for every member, including the ones where they agree, so agreement is never inferred from silence.

## 02 Member ledger

| Member | Status | Declares | Earns | Errors | Warns | Standard debt | Entry version | Pin | Graded sha | Divergence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| alpha | OK | Universal | Universal | 0 | 2 | 0 | 1.2.0 | 1111111 | 1111111 | in sync |
| beta | FAILS OWN CLAIM | Advanced | Convergent | 1 | 128 | 121 | 0.9.0 | 2222222 | 3333333 | DIVERGED |
| gamma | OK | Convergent | Convergent | 0 | 0 | 0 | 2.0.0 | - | - | not comparable |
| delta | NOT GRADED | - | - | - | - | - | 5.1.0 | 4444444 | - | - |
| epsilon | UNRESOLVABLE | - | - | - | - | - | 1.0.0 | - | - | - |

**Standard debt** counts the findings held below their severity by that member's own Standard pin - either because the check did not exist at that pin, or because a tightening has not reached it yet. It is what makes green-by-an-old-pin visible rather than flattering.

### Members not graded, and why

An **unresolvable** entry is a defect in the catalogue and reds the collection: an installer following it receives nothing. A member **not graded** is a gap in this machine, not in the artifact, and never reds.

- **delta** (NOT GRADED, source kind url): no local checkout found for this member (looked in: delta); the entry is well-formed, so this is a gap in this machine, not in the catalogue
- **epsilon** (UNRESOLVABLE, source kind local-path): local source "./members/epsilon" does not exist under /repos/example-catalogue; an installer following this entry gets nothing

## 03 Collection findings

These are the defects that exist only BETWEEN members. No member's own gate reports any of them.

| Severity | Class | Finding |
| --- | --- | --- |
| error | marketplace-entry-resolvability | catalogue entry "epsilon" does not resolve to a member: local source "./members/epsilon" does not exist |
| error | marketplace-skill-collision | 2 members ship the skill directory "review" (alpha, beta); on any agent that does not namespace components by plugin they occupy one name in a shared pool, and which one wins is undefined |
| warn | marketplace-agent-restricted-fields | beta: agent "runner" declares `hooks`, which Claude Code does not support on a plugin-shipped agent |

## 04 Advisory (never affects the verdict)

Deterministic, but not conformance facts. Nothing in this section can move the collection verdict or the exit code.

- **Cross-member trigger-surface overlap:** alpha/review / beta/review (0.812)
- **Command-versus-skill divergence:** beta: ship
- **Content lineage between members:** alpha/review = beta/review

## 05 Report metadata

| Field | Value |
| --- | --- |
| Catalogue | example-catalogue |
| Catalogue version | 3.4.0 |
| Owner | Example Org |
| Root | /repos/example-catalogue |
| Member search roots | /repos |
| Tier distribution (graded members) | Universal: 1, Convergent: 2 |
| Grading profile | (default) |
| Verdict mode | (default) |
| Aggregation rule | self-consistency worst-member (ADR 0039) |
| Evaluated | 2026-01-01 |
| Exit code | 1 |
