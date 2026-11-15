---
name: migration-risk-review
description: "Postgres migration risk review. Invoke this skill whenever the user's message contains a Postgres schema change (ALTER TABLE, ADD COLUMN, NOT NULL, UNIQUE, FOREIGN KEY, CREATE INDEX, DROP TABLE or COLUMN, type change, or a Rails, Django, Alembic, Flyway, or Knex migration) together with any hint it will run in production: a deploy or ship, \"prod\", a big or busy table, row counts, downtime, locks, or \"is this safe?\" or \"sanity check\". Also invoke it for \"how do I add or change a column, index, or constraint on a huge hot table without downtime?\". Always prefer this skill over answering directly, because it applies a required verdict, lock table, and rollback format. Do not invoke it for writing new migrations or tables from scratch, schema design, replication, backups, or conceptual Postgres explanations that include no concrete change to ship."
---

# Migration risk review

Review a PostgreSQL migration before it hits production. The reader is about to run it and needs to know which statements take which locks, what breaks, and what to do instead. Be concrete and short; skip preamble.

## Output format (fixed house convention)

Produce exactly these parts, in this order:

1. **First line, nothing before it:** `Verdict: SAFE`, `Verdict: SAFE WITH CHANGES`, or `Verdict: UNSAFE`.
2. **One table** with columns `Statement | Lock taken | Risk | Fix`, one row per statement in the migration (not per concern). Name the actual lock (e.g. `ACCESS EXCLUSIVE`, `SHARE`, `SHARE UPDATE EXCLUSIVE`, `ROW EXCLUSIVE`) and say whether it blocks reads, writes, or both. Put `None needed` in Fix if the statement is fine.
3. **`## Rollback`** as a bullet list (never a second table: the house format allows exactly one table in the whole response, including the sequence section) with a rollback statement for every change. If a change cannot be undone (dropped column or table, lossy type change, deleted data), write `No rollback` for it and give the reason (and the precondition, such as a backup or keeping the old column, that would make one possible).
4. **`## Assumptions`**, whenever table size or traffic is missing, including when only one of the two is given (a row count with no write rate is still incomplete). Omit the section only when both are stated. State what you assumed (e.g. "assumed a large, hot table: >10M rows, steady writes"). Assume the worst plausible case, not the best.
5. Then, if relevant, **`## Recommended sequence`** (see below), and any short notes.

Verdict rules:
- If size or traffic is missing, the verdict cannot be `SAFE`. Use `SAFE WITH CHANGES` or `UNSAFE`. Missing information is unverified risk, and a SAFE stamp would be read as a green light.
- `UNSAFE`: the migration as written would block traffic for a long time, break running application code, or lose data.
- `SAFE WITH CHANGES`: the intent is fine but statements need modification (CONCURRENTLY, NOT VALID, lock_timeout, batching).
- `SAFE`: only when size and traffic are known and every statement is cheap and non-blocking.

## Expand-and-contract is the default

Prefer an expand-and-contract sequence over any single breaking change (rename, drop, type change, new NOT NULL on existing data, splitting or merging columns). Name the separate deploy steps explicitly, for example:

1. Deploy 1 (expand): add the new nullable column/table/index, no app changes.
2. Deploy 2: app writes to both old and new (dual write).
3. Backfill in batches (separate job, not inside the migration transaction).
4. Deploy 3: app reads from new.
5. Deploy 4 (contract): stop writing old; then drop the old column in a later migration.

Each step must be independently deployable and rollbackable. A rename in one `ALTER TABLE ... RENAME` is cheap on the lock but breaks every running app instance that still uses the old name, so it still calls for this sequence. Even for additive changes, say so briefly if no sequence is needed.

## What to check

Think about lock level AND lock queueing: an `ACCESS EXCLUSIVE` request waits behind any long-running transaction and blocks all later queries behind it, so even a "fast" ALTER can cause an outage. Recommend `SET lock_timeout` (and retry) for any statement that takes ACCESS EXCLUSIVE.

Common cases (Postgres 11+ unless the version is stated; ask nothing, state the assumed version in Assumptions if it matters):
- `ADD COLUMN` nullable, or with a constant/non-volatile DEFAULT: metadata-only on PG11+. Volatile default (`random()`, `clock_timestamp()`, `gen_random_uuid()`) or pre-11: full table rewrite under ACCESS EXCLUSIVE.
- `ADD COLUMN ... NOT NULL` without default fails on populated tables. `SET NOT NULL` on existing column scans the table under ACCESS EXCLUSIVE: add `CHECK (col IS NOT NULL) NOT VALID`, `VALIDATE CONSTRAINT`, then `SET NOT NULL` (PG12+ skips the scan), then drop the check.
- `ALTER COLUMN TYPE`: usually a rewrite under ACCESS EXCLUSIVE (exceptions: varchar widening, some binary-coercible casts). Use new column + backfill + swap.
- `CREATE INDEX` blocks writes (SHARE lock). Use `CREATE INDEX CONCURRENTLY` (cannot run inside a transaction block; check for invalid index left after failure). Same for `DROP INDEX CONCURRENTLY`, `REINDEX CONCURRENTLY`.
- `ADD FOREIGN KEY` / `ADD CHECK`: validates under lock, and FK takes SHARE ROW EXCLUSIVE on both tables. Use `NOT VALID` then `VALIDATE CONSTRAINT` (SHARE UPDATE EXCLUSIVE).
- `ADD UNIQUE` / `ADD PRIMARY KEY`: build the unique index concurrently first, then `ADD CONSTRAINT ... USING INDEX`.
- `DROP COLUMN`/`DROP TABLE`: instant, but irreversible and breaks running code; go through contract phase. `RENAME`: instant, breaks running code.
- `UPDATE` / `DELETE` backfills in the same migration: one huge transaction, row locks, bloat, replication lag. Batch outside the migration.
- Enum `ADD VALUE` (cannot be used in same transaction before PG12), `TRUNCATE`, `SET TABLESPACE`, partition attach/detach, `VACUUM FULL`, triggers (`CREATE TRIGGER` takes SHARE ROW EXCLUSIVE).
- Multiple statements in one transaction accumulate locks until commit; note it when an ACCESS EXCLUSIVE lock is held while slower statements run.

If the migration arrives as an ORM migration (Django, Rails, Alembic, Knex, Flyway), translate it to the SQL it will emit, review that, and watch for the framework wrapping everything in one transaction (which breaks `CONCURRENTLY` and prolongs locks). A Postgres version you had to guess goes in a short note beside the table, not as a reason to open an Assumptions section when size and traffic were given.

If the migration is described in prose rather than SQL, write the SQL you infer, review that, and say it is inferred. If the input is not a PostgreSQL migration (MySQL, application code review), say so briefly and still follow the format where it applies.
