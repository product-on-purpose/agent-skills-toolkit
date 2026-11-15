---
name: migration-risk-review
description: "Use this skill when a user asks \"is this safe to run?\" about a concrete database change on Postgres. That includes questions like \"will this lock the table?\", \"can I run this during business hours?\", \"what could go wrong in prod?\", or \"any problem running this on a 30M-row table?\". The change can be a SQL statement, an ORM migration file (Rails, Django, Prisma, Alembic, Flyway), a teammate's migration, or a described plan. It covers ALTER TABLE, add or drop or retype or rename column, SET NOT NULL, defaults, unique constraints, foreign keys, indexes, and big UPDATE backfills. Produces a verdict (SAFE, SAFE WITH CHANGES or UNSAFE), a lock table, a rollback plan and a safer rollout. Trigger even when the user just asks a casual risk or locking question about a specific statement and doesn't say \"review\". Don't use it for writing new migrations, abstract lock theory, backups, replication, or converting schemas between databases."
---

# Migration risk review (PostgreSQL)

Production Postgres migrations fail mostly through lock queueing: a statement that needs a strong lock waits behind a long transaction, and every later query then queues behind it. Review each statement for the lock it takes, how long it holds it, and whether running application code survives the new schema. Your output is read by someone about to press deploy, so be concrete and terse.

## Output format (house conventions, follow exactly)

1. **First line**, nothing before it: `Verdict: SAFE`, `Verdict: SAFE WITH CHANGES` or `Verdict: UNSAFE`.
2. **One table**, starting on the line right after the verdict line (a blank line between is fine, but no sentence, summary or "inferred SQL" line in between; put such context in Notes after the Rollback section). Columns: `Statement | Lock taken | Risk | Fix`, one row per statement in the migration (split multi-action ALTERs into the statements as they would run if they differ in lock or risk; otherwise one row per SQL statement). Name the actual lock mode (e.g. ACCESS EXCLUSIVE, SHARE, SHARE UPDATE EXCLUSIVE, SHARE ROW EXCLUSIVE) and say whether it is held briefly or for the duration of a table scan/rewrite. Fix is the concrete safer statement, or "None" if fine. Rows are the statements of the migration being reviewed, not the steps of your proposed replacement plan; put the replacement plan in the Deploy sequence section. Only one table in the whole answer.
3. **`Rollback`** section: the rollback statement for each change, or `No rollback` with the reason (e.g. DROP COLUMN or DROP TABLE loses data; a lossy type change cannot be reversed). Make clear which rows each rollback line corresponds to.
4. **`Assumptions`** section, required whenever table size or traffic was not given. State the assumed size/traffic (assume a large, busy table, since that is the case that hurts). In that case the verdict can never be `SAFE`; use `SAFE WITH CHANGES` or `UNSAFE`. If size and traffic were both given, omit the heading `Assumptions` entirely; put any other assumptions (column type, PG version, existing indexes) under Notes, so the heading `Assumptions` always signals that size or traffic was missing.
5. Optionally, after those, a short **Deploy sequence** section (see below) and brief notes. Keep it short.

Verdict meaning: `SAFE` = runs as written with only brief locks, given known size and traffic. `SAFE WITH CHANGES` = fine once the listed fixes are applied. `UNSAFE` = as written it can block or break production (long ACCESS EXCLUSIVE lock, table rewrite on a large table, breaks running app code) and needs a different approach.

## Expand and contract

Always prefer an expand-and-contract sequence over a single breaking change, and when you recommend one, name the separate deploy steps explicitly ("Deploy 1: ..., Deploy 2: ...") so each can ship and roll back independently. This applies to renames, type changes, dropping columns, splitting/merging columns, adding NOT NULL to existing data, and changing constraints. Typical shape:
- Expand: add the new column/table/index nullable or unconstrained, with no rewrite.
- Deploy app writing to both (dual write) and read from old.
- Backfill in batches (small transactions, throttled), outside the migration transaction.
- Deploy app reading from new.
- Contract: drop the old column only after nothing reads or writes it, as its own deploy.
Even when the single statement is lock-safe (e.g. `DROP COLUMN` is instant), it still breaks old app code that is running during deploy, so sequence it: stop using the column first, drop later.

## Lock checklist

- `CREATE INDEX` blocks writes (SHARE lock). Use `CREATE INDEX CONCURRENTLY` (cannot run inside a transaction block; note invalid-index cleanup on failure). Same for `DROP INDEX CONCURRENTLY`.
- `ADD COLUMN` without default: brief ACCESS EXCLUSIVE. With a constant default: PG11+ is metadata-only; volatile default (e.g. `random()`, `clock_timestamp()`) or PG10 and below rewrites the table. Ask/assume version; say so.
- `ALTER COLUMN TYPE`: usually full rewrite under ACCESS EXCLUSIVE (exceptions: varchar widening/removing limit, some binary-coercible casts). Rebuilds indexes too.
- `SET NOT NULL`: full scan under ACCESS EXCLUSIVE. Safer: add `CHECK (col IS NOT NULL) NOT VALID`, `VALIDATE CONSTRAINT`, then `SET NOT NULL` (PG12+ skips the scan), then drop the check.
- `ADD FOREIGN KEY` / `ADD CHECK`: use `NOT VALID` then `VALIDATE CONSTRAINT` separately (validation takes SHARE UPDATE EXCLUSIVE; FK also locks the referenced table with SHARE ROW EXCLUSIVE briefly).
- `ADD UNIQUE`/`PRIMARY KEY`: build a unique index concurrently, then `ADD CONSTRAINT ... USING INDEX`.
- `RENAME COLUMN/TABLE`: instant but breaks running code; use expand-and-contract (or a view for tables).
- `DROP COLUMN/TABLE`: instant but irreversible data loss and breaks old code.
- `UPDATE` backfill of a whole table in one statement: long transaction, row locks, bloat, replication lag. Batch it.
- Any DDL: set `lock_timeout` (e.g. 3-5s) and retry, so a blocked statement fails fast instead of queueing all traffic. Mention `statement_timeout` for long operations. Flag DDL mixed with long-running statements in one transaction.
- Enum `ADD VALUE`, partition attach/detach, `TRUNCATE`, `VACUUM FULL`, `CLUSTER`, `REINDEX` (non-concurrent): check and flag as relevant.

## Handling the input

- If the migration is described in prose, translate it to the likely SQL statements, one row each, and say what you inferred.
- Missing size, traffic or PG version: do not ask; assume and record it in Assumptions.
- If the request is a general Postgres question rather than a specific migration, answer normally without this format.
- Be honest where the answer depends on facts you don't have (e.g. existing rows violating a new constraint) and make the fix robust to it.
