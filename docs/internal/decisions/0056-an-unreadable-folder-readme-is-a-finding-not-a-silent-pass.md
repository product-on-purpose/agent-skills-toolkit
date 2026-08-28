# 0056 - A folder README that cannot be read is a finding, not a silent pass

## TL;DR

- **Decision: `G8` (`folder-readme`) now emits a finding when a folder's `README.md` exists but cannot be read**, instead of catching the read failure and continuing with no output. This resolves [E51 (`G8` silently passes an unreadable README)](../backlog/enhancements.md), filed by the v1.16.0 adversarial wave 1 and deferred there because it is ADR-gated.
- **The defect was the SILENCE, not the severity.** The read failure disabled both the folder-guide check and the inventory check for that folder **while the run reported success**. That is the "a check that reports success while checking nothing" class this repository grades other tools on, and it was sitting in the spine.
- **The argument is an asymmetry inside the check itself.** Eight lines above the swallow, a **missing** README is an `error`. The check already knows the folder requires a readable README. The only way to make `G8` pass a folder it never examined was to give it a README it could not read.
- **Capped at `warn` until Standard 0.17, then `error`.** The finding ships live now, so the silence ends immediately; only the consequence is scheduled. Migration metadata is finding-level, following [ADR 0044 (one post-resolution Standard ceiling)](0044-one-post-resolution-standard-ceiling-and-config-provenance.md) and the reference implementation in `catalogue-manifest-shape.mjs` (`U17`).
- **The window costs nothing, and that is MEASURED rather than assumed.** A census on 2026-08-28 across the six reference-family members found **213 `README.md` files, zero directories, zero symlinks, zero members affected**. The backlog entry predicted "very likely zero and should be counted rather than assumed"; it is now counted.
- **Two Standard minors of warning rather than one**, which is deliberate generosity. The census can only see the six members it can read. A longer window removes any argument that a third party was rushed, and costs nothing given the measurement.
- **The finding says the dependent checks DID NOT RUN.** It does not claim a content failure it never observed. Reporting "your inventory is wrong" for a file that was never parsed would be a second false claim replacing the first.
- **Status:** **Accepted (2026-08-28).** Implemented in the same change; graduation to `error` is scheduled, not taken.

- **Date:** 2026-08-28
- **Deciders:** maintainer (jprisant), with Claude (Opus 5)

## Builds on

- **[ADR 0044 (one post-resolution Standard ceiling, and config provenance)](0044-one-post-resolution-standard-ceiling-and-config-provenance.md)** - the mechanism this uses. A finding-level `migration` cap resolves against the subject's own pinned Standard, which is what lets the finding ship live while its consequence is dated.
- **[ADR 0024 (documentation depth and discoverability)](0024-documentation-depth-and-discoverability.md)** - D1.1 is why a meaningful folder carries a README with a frontmatter title at all, and therefore why an unreadable one is a gap rather than a non-event.
- **`scripts/checks/catalogue-manifest-shape.mjs` (`U17`)** - the first check to carry `since` and a finding-level `migration` together, and the activation-neutral wording convention this reuses.

## Context and problem statement

`scripts/checks/folder-readme.mjs` resolved each meaningful folder, then read its README:

```js
if (!existsSync(readmePath)) {
  out.push(finding(meta.id, SEVERITY.ERROR, `meaningful folder has no README.md ...`));
  continue;
}
let text;
try { text = readFileSync(readmePath, "utf8"); } catch { continue; }
```

The second `continue` returns to the folder loop having emitted nothing. Everything downstream of it, the frontmatter-title check and the inventory set-comparison, is skipped for that folder. The run exits reporting success.

**The reproduction is the backlog entry's own**, and it is representable in git rather than only on a broken filesystem: make a folder's `README.md` a directory. `existsSync` returns true, `readFileSync` throws `EISDIR`, and `check({ root })` returns zero findings for that folder. Permissions failures and malformed checkout objects reach the same branch.

**Why this mattered more than its size.** This repository's stated product is a verdict that can be believed. `v1.15.0` spent eight blocking findings on exactly this shape, and [E54 (a claim naming an undeclared source id is UNCHECKABLE and the run exits 0)](../backlog/enhancements.md) records the same class in `vendor-watch`, where the file carries an explicit rule that *"a run that verified NOTHING must never exit 0"*. `G8` was routing around the same principle inside the spine.

**Why it was not fixed when it was found.** Turning a silent pass into a finding moves verdicts for anything currently benefiting from the silence, and the v1.16.0 plan stated `no new spine check` and `no verdict movement for any plugin`. Fixing it inside a review pass would have been precisely the migration this repository tells other people not to perform. That deferral was correct and is not being second-guessed here; what changed is that the census now exists.

## Decision drivers

- **A gate that reports success while examining nothing is the worst failure this project can ship**, because it is invisible. A false failure gets reported by an annoyed author; a false pass gets trusted.
- **Verdict movement must be measured before it is caused**, not argued about. This is the recorded lesson of the v1.15.0 catalogue-manifest graduation, which shipped against a census that still found zero instances and said so.
- **A migration window must be a promise with a date**, per `STANDARD.md` sec 7.7 and the v1.15.0 narrative. A window whose evidence is re-examined at the boundary and always extended was never a window.
- **The check must not replace one false claim with another.** It cannot report an inventory mismatch for a file it never parsed.

## Considered options

1. **Emit at `error` immediately.** Justified by the census reading zero and by the condition being a broken checkout rather than a style opinion. **Rejected**: the census can only see six repositories, and "the measurement was zero so the rule does not apply to me" is the reasoning that erodes sec 7.7 for everyone else. This project's credibility on migrations is worth more than two Standard minors.
2. **Emit at `warn` permanently.** **Rejected**: a permanent warning is a permanent exemption paid in instalments, which is the v1.15.0 finding verbatim. If an unexamined folder is acceptable forever, the check should be deleted instead.
3. **Emit at `warn`, graduating to `error` at a dated Standard version.** **Chosen.** The silence ends on the day this ships; the consequence is dated and evidence-backed.
4. **Fail the dependent checks as well, treating unreadable as maximally bad.** **Rejected**: it would report an inventory failure nobody observed. The honest statement is that the checks did not run.

## Decision

`G8` emits one `error`-severity finding, capped at `warn` until Standard **0.17**, when a resolved folder's `README.md` exists and cannot be read. The message names the path, carries the underlying error code, and states that the folder-guide and inventory checks for that folder did not run.

The migration constant is activation-neutral by construction, following `catalogue-manifest-shape.mjs`: it states what the migration is about and never asserts that a cap is currently in force, because under `--strict` no pin binds and the finding is a live error while the static metadata is still visible in `--json`.

## Consequences

**Positive.** The spine no longer contains a path that reports success without examining its subject. `G8`'s two halves become symmetric: a missing README and an unreadable one are both reported, which is what a reader already assumes.

**Costs, stated plainly.** A third party whose checkout contains an unreadable README now sees a warning they did not see before, and will see an error from Standard 0.17. The census says this set is empty across everything measurable, and it is not provably empty everywhere.

**What this does NOT do.** It does not add a spine check, move any tier boundary, or change any other check's behaviour. `G8`'s `since` stays `0.10`.

## Evidence

**Census, 2026-08-28**, over the six members of the `agent-plugins` reference family, reading each repository's full git tree and counting entries named `README.md` that are trees (directories) or symlinks:

| Member | `README.md` files | directories | symlinks |
| --- | --- | --- | --- |
| `pm-skills` | 33 | 0 | 0 |
| `thinking-framework-skills` | 15 | 0 | 0 |
| `writing-style-catalog` | 26 | 0 | 0 |
| `agent-skills-toolkit` | 91 | 0 | 0 |
| `critique-skills` | 33 | 0 | 0 |
| `product-lifecycle-templates` | 15 | 0 | 0 |
| **Total** | **213** | **0** | **0** |

**Members that would newly fail at `error`: zero.**

**The guard was proven able to fail before it was trusted.** Restoring the original `catch { continue; }` fails two of the three new tests; the file was restored byte-identical afterwards. The three tests are the unreadable case, the migration cap, and the readable twin that must emit nothing.

## Follow-ups

- **Graduate to `error` at Standard 0.17** by removing the cap. Re-run the census at that boundary rather than adding to a date, per the v1.15.0 rule that a window closes on re-examined evidence.
- **`vendor-watch`'s sibling of this defect, [E54](../backlog/enhancements.md), is already resolved** (2026-08-23). With this ADR, the two known "reports success while checking nothing" paths in release-blocking code are both closed.
