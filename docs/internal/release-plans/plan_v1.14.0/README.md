# v1.14.0 - what actually shipped

> Written **last, from the code**, after every gate passed. [`RELEASE-PLAN.md`](RELEASE-PLAN.md) states
> what this release set out to do and is not edited into a status report. This file is the state.

## Final numbers

| | Baseline (`v1.13.0`) | Shipped (`v1.14.0`) |
| --- | --- | --- |
| Standard | 0.13 | **0.14** |
| Spine | 31 checks | **34 checks** |
| Skills | 24 | 24 |
| Evaluation scopes | 3 | 3 |
| Declared tier | Advanced (Gold) | Advanced (Gold), self-validated 0 errors / 0 warnings |
| Suite | 1102 | **1248**, 0 failures |

Twelve commits on `main` since `v1.13.0`, eleven of them implementation PRs (#214 to #223) plus the
wave-2 fix PR (#229).

## The seven decisions, and what each landed

Every ADR was measured against the whole reference family **before** ratification, and
[three of the seven were overturned by that measurement](../../STATUS.md).

| ADR | Landed as | Windowed? |
| --- | --- | --- |
| [0046 (`agents/` holds only registered subagents)](../../decisions/0046-agents-directory-holds-only-registered-subagents.md) | `U15` `agents-dir-registerable`, vendor-cited | `since: 0.14` |
| [0047 (a workflow is a loaded component)](../../decisions/0047-workflows-are-a-loaded-component.md) | `ctx.workflows` built; `S3` workflow mirror | bug fix unwindowed; mirror to 0.15 |
| [0048 (a command is not a skill and is not graded as one)](../../decisions/0048-a-command-is-not-a-skill-and-is-not-graded-as-one.md) | sec 3.2; **amended in place 2026-08-15** | prose |
| [0049 (`U5` abstains rather than failing what it cannot read)](../../decisions/0049-u5-abstains-rather-than-failing-what-it-cannot-read.md) | `READABLE_FLOOR = 0.10` | green-ward, unwindowed |
| [0050 (the frontmatter vocabulary is open; placement is checked)](../../decisions/0050-frontmatter-vocabulary-is-open-and-placement-is-checked.md) | `U16` `metadata-placement`, house | `since: 0.14` |
| [0051 (no cross-member finding graduates to the spine)](../../decisions/0051-no-cross-member-finding-graduates-to-the-spine.md) | the unilateral-remedy test | governance |
| [0052 (a catalogue manifest no scope can read is a defect)](../../decisions/0052-a-catalogue-manifest-no-scope-can-read-is-a-defect.md) | `U17` `catalogue-manifest-shape`, objective | `since: 0.14` **and** `until: 0.15` |

`U17` is the first check in the spine to carry `since` **and** a finding-level `migration.until` at once,
which is the first live exercise of [ADR 0044](../../decisions/0044-one-ceiling-over-since-and-until.md)'s
rule that the reported `due` is the maximum across both. Verified across pins 0.13 / 0.14 / 0.15.

## Two adversarial review waves, ten findings, all fixed before the tag

| Wave | Pointed at | Found | Theme |
| --- | --- | --- | --- |
| 1 | the three new checks and their libraries | 4 | assumptions the code made that the vendor does not guarantee |
| 2 | records, normative text, and the drift machinery | 6 | **things that read as checked and are not** |

Wave 2 was aimed deliberately **away** from wave 1's target. The v1.13.0 evidence is the reason: rounds 2
through 7 sat flat at about five findings each, and round 8, reframed, found four HIGHs.

Wave 2's six, in one line each:

1. The shipped Standard contradicted itself across secs 3.2, 3.8 and 8.1, so a command could conform to
   and violate the same document.
2. The README claimed Standard 0.13 while five other files said 0.14, because the drift guard covered
   four of five front-door claims. **A partial drift guard is worse than none:** it exists, it passes, so
   nobody re-reads the part it skips.
3. Two pinned vendor claims were bare tokens and could never have failed.
4. The monthly watcher deduplicated on a label nobody had provisioned, so it would have opened a new
   issue every month.
5. The release-blocking preconditions were a checklist, and the one that mattered most had never been run
   by any workflow.
6. The records described a claims pin from two growth steps earlier.

**Every fix is a guard, not a correction**, so none of the six can recur silently.

## What this release added that is not a check

- **`vendor-claims.json` + `npm run vendor-watch`** - eight claims (6 quote, 2 probe) across three vendor
  pages, each naming what depends on it and what to do when it fails. Write-incapable by construction,
  enforced by a test.
- **`npm run release-ready`** - the conformance gate, the README drift guard, the release-count guard and
  `vendor-watch`, in one exit code, invoked by both `release.yml` and `publish-npm.yml`. It **blocked its
  own first real run**, on 7 failing tests and a stale count that had not yet reached CI.
- **`standard-self-consistency.test.mjs`** - the normative text a consumer diffs is now machine-checked
  against itself, which every other number in this repository already was.

## Verification recorded at cut time

- `node scripts/release-ready.mjs` exits **0**: all four gates pass.
- Conformance gate: **Advanced, 0 errors, 0 warnings.**
- Suite: **1248 tests, 0 failures.**
- Codex round-trip (Q-E gate): **passed** against `codex-cli 0.144.5`, skills **ingested**, not merely listed.
- Docs site: **86 pages**, every internal link resolves, route parity holds against the committed baseline.
- Reference family: six members graded before and after every change. **No verdict moved at any step.**

## Not done at cut time, and deliberately

**The tag, the GitHub release and the npm publish are withheld pending maintainer sign-off.** This packet
records a release that is *prepared*, not shipped. Until the tag exists, npm serves 1.13.0 and consumers
are on Standard 0.13.

The `agent-plugins` registry re-pin also waits for the tag.
