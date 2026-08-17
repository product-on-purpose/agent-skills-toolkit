# Release plan - v1.14.0 "four things the gate was telling you were not true"

- **Type:** MINOR. **Standard 0.13 to 0.14.** Seven decisions ratified as a pack, three new universal checks, four false-report bugs closed, and the first vendor-claim watch this repository has ever had.
- **Baseline:** `main` @ `ba33860` (tag `v1.13.0`), gate Advanced 0/0, spine 31, Standard 0.13, 24 skills, 3 evaluation scopes. npm serves 1.13.0.
- **Branch:** `release/v1.14.0`, cut from `main` after all eleven implementation PRs merged.
- **Thesis:** a grading tool's worst failure is not missing a defect. It is **reporting one that is not there**, because the author who trusts it changes correct code, and the author who does not trust it stops reading. This release closes four of those, and then closes the reason they were not caught.

> **How this document is written.** This file states **intent and acceptance criteria**. It is not a
> status report and will not be edited into one. State belongs in `README.md` in this folder, written
> **last, from the code**.

## Where this release's intent actually lives

Unlike v1.13.0, this release's pre-work is **not** in this file. It is in seven ADRs, written and
**measured against the whole reference family before any of them were ratified**:

| ADR | Decides | Ships |
| --- | --- | --- |
| [0046 (`agents/` holds only registered subagents)](../../decisions/0046-agents-directory-holds-only-registered-subagents.md) | a file the runtime registers as a subagent is graded as one | `U15`, plus the `S3` false-absence fix |
| [0047 (a workflow is a loaded component)](../../decisions/0047-workflows-are-a-loaded-component.md) | `ctx.workflows` is built, and the components mirror covers workflows | bug fix (no window) + `S3` mirror (windowed to 0.15) |
| [0048 (a command is not a skill and is not graded as one)](../../decisions/0048-a-command-is-not-a-skill-and-is-not-graded-as-one.md) | a command's description is a caller-facing label, not a trigger surface | sec 3.2, **amended in place 2026-08-15** |
| [0049 (`U5` abstains rather than failing what it cannot read)](../../decisions/0049-u5-abstains-rather-than-failing-what-it-cannot-read.md) | the description scorer declines on text it cannot score | `READABLE_FLOOR` |
| [0050 (the frontmatter vocabulary is open; placement is checked)](../../decisions/0050-frontmatter-vocabulary-is-open-and-placement-is-checked.md) | keys beyond the Standard's are permitted; where they sit is not | `U16` |
| [0051 (no cross-member finding graduates to the spine)](../../decisions/0051-no-cross-member-finding-graduates-to-the-spine.md) | a defect no single plugin can remedy is never a plugin requirement | the unilateral-remedy test |
| [0052 (a catalogue manifest no scope can read is a defect)](../../decisions/0052-a-catalogue-manifest-no-scope-can-read-is-a-defect.md) | a manifest routed to nobody is reported | `U17`, warn-first at 0.14 |

**Three of the seven were overturned by their own measurement** before ratification. That is the
mechanism working: [the discipline this repository runs on](../../STATUS.md) is *measure blast radius,
do not reason about it*, and a decision that survives its measurement unchanged has usually not been
measured hard enough.

## The governing invariant

**Nothing moves red-ward without a pin change.** Every check introduced here carries `since: "0.14"`,
so a plugin pinned at or below 0.13 sees no new gate failure. `U17` carries `since` **and** a
finding-level `until: "0.15"` migration - the first check in the spine to hold both, and the first live
exercise of [ADR 0044](../../decisions/0044-one-ceiling-over-since-and-until.md)'s rule that the
reported `due` is the maximum across them.

The four bug fixes move **green-ward only**: each removes a finding that was never true.

## Acceptance criteria

1. **No family member's verdict moves.** Measured per member, before and after, on every PR - not argued.
2. **Every new check's `since` verified across pins 0.13 / 0.14 / 0.15**, not just at HEAD's pin.
3. **Every fix mutation-proved:** revert the fix, watch its test go red, restore byte-identically. A
   mutation that leaves the test green proves nothing and does not count, however plausible it looks.
4. **Two adversarial review waves, the second pointed away from the first.** v1.13.0's evidence: rounds
   2 through 7 sat flat at about five findings each; round 8, reframed, found four HIGHs. A second look
   aimed where the first one looked finds the same things.
5. **Every review finding fixed before the tag**, not after. v1.12.0 merged on one round; round 2 then
   found four findings, three high, all inside round 1's fix code, and shipped as v1.12.1.
6. **`node scripts/release-ready.mjs` exits 0** - which by the end of this release means the conformance
   gate, the README drift guard, the release-count guard and `vendor-watch` all pass.

## What this release adds that is not a check

**A vendor-claim watch.** `STANDARD.md` and four checks cite Claude Code behaviour as **fact**, and every
one of those citations was a page somebody read once and a date they wrote down. On 2026-08-15 that cost
a ratified ADR: 0048 was accepted on a premise the vendor's own documentation contradicts, five days
after an internal audit had already found it. The evidence existed; nothing was re-reading it.

`vendor-claims.json` pins the sentences, `npm run vendor-watch` re-checks them, a monthly workflow opens
an issue rather than editing anything, and the release gate blocks on a stale one. The watcher is
**write-incapable by construction** and a test enforces it: deciding what a vendor change *means* is an
ADR, not a pin bump a robot performs at 3am.

## Out of scope, deliberately

- **Restricting the frontmatter vocabulary.** Measured first: 44.9 percent of 2342 skills across thirteen
  corpora carry at least one key beyond the Standard's. ADR 0050 records the decision and its evidence.
- **Graduating a cross-member finding to the spine.** ADR 0051 forbids it as a class, with a stated
  reopening condition rather than a permanent bar.
- **Any change to a family member repository** other than the `agent-plugins` registry pin.
