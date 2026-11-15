---
name: migration-risk-review
description: Reviews a PostgreSQL schema migration (pasted DDL or a plain-English description) for locking, downtime and data-loss risk before it runs in production, and returns a verdict, per-statement risk table, rollback plan and expand-and-contract deploy steps. Use whenever the user asks if a schema change is safe to ship, what could go wrong with an ALTER TABLE, CREATE INDEX, DROP COLUMN, rename or type change, or pastes migration SQL, even without saying "migration review".
metadata:
  version: 0.1.0
---

# migration-risk-review

## Purpose
Give a go/no-go read on a PostgreSQL migration before production, in a fixed house format. Lock levels and safe rewrites are in [references/pg-lock-cheatsheet.md](references/pg-lock-cheatsheet.md); consult it for every statement type you are not certain about.

## When to use
The user pastes or describes DDL (ALTER TABLE, CREATE/DROP INDEX, constraints, column add/drop/rename/type change, enum or table changes, backfills) and wants to know if it is safe, risky, or what could go wrong. Do not ask questions; decide and state assumptions.

## Steps
1. List every statement (split a described change into the statements it implies). Note the table size and traffic if given, and the Postgres version if given.
2. For each statement, determine the lock taken, whether it rewrites the table or scans it, and what it blocks (reads, writes, queued behind long transactions). Use the cheatsheet. Remember the lock queue effect: an ACCESS EXCLUSIVE lock waiting behind a long transaction blocks all traffic.
3. Check the whole change for breaking effects on running application code: dropped/renamed columns, new NOT NULL, narrower types. If the change breaks old code during deploy, prefer **expand-and-contract** over the single change, always, and name the separate deploy steps (see below).
4. Choose the verdict:
   - `UNSAFE`: data loss, long ACCESS EXCLUSIVE lock or table rewrite on a large or busy table, or a breaking single-step change.
   - `SAFE WITH CHANGES`: fixable with the Fix column (CONCURRENTLY, NOT VALID then VALIDATE, lock_timeout, batching, expand-and-contract).
   - `SAFE`: every statement is brief and non-blocking as written, with no breaking effect on running code.
   - If table size or traffic was not given, the verdict can never be `SAFE`.
5. Write the output exactly as below.

## Output format (mandatory)
The first line of the response, with nothing before it:

`Verdict: SAFE` or `Verdict: SAFE WITH CHANGES` or `Verdict: UNSAFE`

Then, immediately, with no prose in between, exactly one table, columns `Statement | Lock taken | Risk | Fix`, one row per SQL statement and no other rows: no rows for application code, deploys, or general concerns (fold those into the Risk or Fix cell of the statement they affect, or into Deploy sequence). For a described change, write the implied SQL as the statement. Put each statement in code ticks; write "none needed" in Fix if nothing is required.

Then a section headed `## Rollback`: the rollback statement for each change, or `No rollback` with the reason (e.g. DROP COLUMN or a lossy type change destroys data; say what is needed to restore, such as a backup or the expand step kept in place).

Then, when table size or traffic was not given, a section headed `## Assumptions` stating what you assumed (e.g. "assumed a large, busy table of 50M+ rows and Postgres 14"). Omit it only when both size and traffic were given.

When expand-and-contract applies, add a section `## Deploy sequence` as a numbered list of separate deploys (for example: 1. migrate: add nullable column; 2. deploy app writing both; 3. backfill in batches; 4. deploy app reading new; 5. later migrate: drop old column). Do not put this in a second table. Keep prose beyond these sections minimal: no preamble, no commentary about tools or files, and never end with a question or an offer to re-assess; state assumptions instead. The Rollback section gives one rollback statement for each statement in the table.

## References
- [references/pg-lock-cheatsheet.md](references/pg-lock-cheatsheet.md): lock levels per statement and the safe rewrite for each.
