---
name: migration-risk-review
description: Reviews a PostgreSQL schema migration (ALTER TABLE, CREATE INDEX, DROP COLUMN, constraints, type changes) for locking and production risk before it runs. Use whenever someone pastes or describes a migration, asks if a schema change is safe to ship or deploy, or asks what could go wrong with an ALTER TABLE, even without saying "migration review".
metadata:
  version: 0.1.0
---

# migration-risk-review

## Purpose
Give a pre-production verdict on a PostgreSQL migration: which lock each statement takes, what can go wrong under traffic, and a safer sequence. Lock and fix details are in [references/lock-and-fix-catalog.md](references/lock-and-fix-catalog.md); a full sample is in [references/example-review.md](references/example-review.md).

## When to use
A pasted or described schema change headed for production PostgreSQL: "is this safe to ship?", "what could go wrong with this ALTER TABLE?", "can I run this on prod?", "review my migration". Do not ask questions; decide and state assumptions.

## Output format (exact, in this order)
1. First line, nothing before it: `Verdict: SAFE`, `Verdict: SAFE WITH CHANGES` or `Verdict: UNSAFE`.
2. One markdown table, columns exactly `Statement | Lock taken | Risk | Fix`, one row per statement (split multi-statement input; each ALTER sub-command that differs in lock gets its own row). Name the lock mode (e.g. ACCESS EXCLUSIVE) and whether it blocks reads, writes, or both, and whether a table rewrite or full scan happens.
3. Section `## Rollback`: a rollback statement per change, or `No rollback` with the reason (e.g. DROP COLUMN or dropped data loses data; a lossy type change cannot be restored).
4. Section `## Assumptions`: required whenever table size or traffic was not given. List what you assumed (e.g. "large table, 50M+ rows, steady write traffic"). In that case the verdict can never be `SAFE`; use `SAFE WITH CHANGES` or `UNSAFE`. If size and traffic were both given, omit this section.
5. Expand-and-contract: always prefer it over a single breaking change (drop, rename, type change, NOT NULL on existing data, constraint tightening). When recommending it, add a section `## Deploy steps` naming each separate deploy (Deploy 1 expand, Deploy 2 backfill/dual-write, Deploy 3 switch reads, Deploy 4 contract) and what ships in each. Never offer a one-shot rename/drop as the fix.

## Strict rules (reviews have failed on these)
- Every table row has exactly four cells in column order. Lock taken holds only the lock mode, what it blocks (reads/writes) and whether a rewrite or scan happens. Risk holds what can go wrong. Fix holds the concrete SQL or step. Never merge Lock and Risk into one cell or leave Fix empty (write "None needed" if so). Keep each cell to a few sentences.
- Rows are only for statements in the input, one per statement. Put side effects, failure modes and follow-ups (invalid indexes, disk, ANALYZE) inside that statement's Risk or Fix cell, never as extra rows.
- Section order is: verdict line, table, `## Rollback`, `## Assumptions` (when needed), `## Deploy steps` (when recommending expand-and-contract). Nothing else: no intro, no closing summary, no "can you ship?" paragraph. Put any extra caveat in a Risk or Fix cell.
- Every assumption, including an unstated PostgreSQL version, goes under `## Assumptions`, not in loose prose. If only the version is missing, the section lists just that.
- Never offer a one-shot breaking change as a fallback ("if the table is small, just rename in one step"). Expand-and-contract is always the recommendation for rename, drop, type change and NOT NULL or other constraint tightening, even on small tables; say small size only makes each step cheap. Name the deploys. For SET NOT NULL use the staged NOT VALID check route as the deploy steps. Do not write that expand-and-contract is unnecessary.
- Purely additive, cheap statements (nullable ADD COLUMN, constant default on PG11+) need no deploy steps, but still list the lock_timeout fix.

## Steps
1. Parse the statements; note the PostgreSQL version if given (assume 14+ and say so if not, which affects fast defaults and similar).
2. Per statement, look up lock and rewrite behavior in the catalog. Check for missing `lock_timeout`, long transactions wrapping DDL, `CREATE INDEX` without `CONCURRENTLY`, `CONCURRENTLY` inside a transaction block, unvalidated constraints, and app code still using a column being removed.
3. Verdict: `UNSAFE` if any statement blocks writes/reads on a table of unknown or large size without a mitigation, or loses data. `SAFE WITH CHANGES` if fixable by listed edits. `SAFE` only with stated size and traffic and every statement cheap.
4. Write the output in the format above. Keep the Fix column concrete (the actual replacement SQL or step).

## References
- [references/lock-and-fix-catalog.md](references/lock-and-fix-catalog.md)
- [references/example-review.md](references/example-review.md)
