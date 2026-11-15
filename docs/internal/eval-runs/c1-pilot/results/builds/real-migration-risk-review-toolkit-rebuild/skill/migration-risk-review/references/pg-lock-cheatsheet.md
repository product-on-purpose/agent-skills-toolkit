# PostgreSQL lock cheatsheet

| Statement | Lock | Notes / safe rewrite |
|---|---|---|
| `ADD COLUMN` nullable, no default | ACCESS EXCLUSIVE (brief) | Safe; metadata only. Set `lock_timeout`. |
| `ADD COLUMN ... DEFAULT <constant>` | ACCESS EXCLUSIVE (brief) | PG11+: no rewrite. PG10 or older: full rewrite. Volatile default (`random()`, `clock_timestamp()`) rewrites in any version. |
| `ADD COLUMN ... NOT NULL` without default | fails if rows exist | Add nullable, backfill in batches, add CHECK ... NOT VALID, VALIDATE, then SET NOT NULL (PG12+ uses the validated CHECK to skip the scan). |
| `ALTER COLUMN SET NOT NULL` | ACCESS EXCLUSIVE + full scan | Use validated CHECK (col IS NOT NULL) first (PG12+). |
| `ALTER COLUMN TYPE` | ACCESS EXCLUSIVE, usually full rewrite | Exceptions: varchar(n) widening, varchar to text. Otherwise expand-and-contract with a new column. |
| `DROP COLUMN` | ACCESS EXCLUSIVE (brief), irreversible | Breaks old app code still selecting it; stop reads/writes first, drop in a later deploy. |
| `RENAME COLUMN` / `RENAME TABLE` | ACCESS EXCLUSIVE (brief) | Breaks running code instantly. Expand-and-contract (new column, dual write, backfill, switch reads, drop) or a view. |
| `CREATE INDEX` | SHARE (blocks writes) for the whole build | Use `CREATE INDEX CONCURRENTLY` (cannot run in a transaction block; a failed build leaves an INVALID index to drop). |
| `CREATE UNIQUE INDEX CONCURRENTLY` then `ADD CONSTRAINT ... USING INDEX` | brief | Safe way to add unique/PK constraints. |
| `DROP INDEX` | ACCESS EXCLUSIVE | Use `DROP INDEX CONCURRENTLY`. |
| `ADD FOREIGN KEY` | SHARE ROW EXCLUSIVE on both tables, validation scan | Use `NOT VALID`, then `VALIDATE CONSTRAINT` (SHARE UPDATE EXCLUSIVE). |
| `ADD CHECK` | ACCESS EXCLUSIVE + scan | Use `NOT VALID`, then `VALIDATE CONSTRAINT`. |
| `ADD PRIMARY KEY` / `ADD UNIQUE` (plain) | ACCESS EXCLUSIVE + index build | Build the index concurrently first. |
| `UPDATE` / backfill whole table | ROW EXCLUSIVE, long transaction, bloat, replication lag | Batch (e.g. 5-10k rows), commit between batches, throttle. |
| `ALTER TYPE ... ADD VALUE` (enum) | brief | Cannot be used in the same transaction in older versions; removing enum values is not supported. |
| `DROP TABLE` / `TRUNCATE` | ACCESS EXCLUSIVE, irreversible | No rollback without backup. |
| `SET DEFAULT` / `DROP DEFAULT` | ACCESS EXCLUSIVE (brief) | Metadata only. |

## Always
- `SET lock_timeout = '3s'` (and retry) on any statement taking ACCESS EXCLUSIVE, so it cannot queue behind a long transaction and stall all traffic.
- Run multiple DDL statements in separate transactions when holding locks across them is avoidable.
- Small table (rows in the thousands) and low traffic make most brief rewrites tolerable, but still state it as an assumption if not given.
