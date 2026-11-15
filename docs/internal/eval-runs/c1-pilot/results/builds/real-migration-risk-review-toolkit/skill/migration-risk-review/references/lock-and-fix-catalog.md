# Lock and fix catalog (PostgreSQL)

| Statement | Lock | Notes | Safer fix |
|---|---|---|---|
| ADD COLUMN nullable, no default | ACCESS EXCLUSIVE (brief) | Metadata only; risk is queueing behind long queries | `SET lock_timeout = '3s'`, retry |
| ADD COLUMN with constant default (PG11+) | ACCESS EXCLUSIVE (brief) | No rewrite on 11+; volatile default (e.g. random(), clock_timestamp()) rewrites | Add nullable, backfill in batches |
| ADD COLUMN NOT NULL without default | fails if rows exist | | Expand: add nullable, backfill, then constraint |
| SET NOT NULL | ACCESS EXCLUSIVE + full scan | Blocks all access during scan | Add `CHECK (col IS NOT NULL) NOT VALID`, `VALIDATE CONSTRAINT` (SHARE UPDATE EXCLUSIVE), then SET NOT NULL (PG12+ skips scan), drop check |
| ALTER COLUMN TYPE | ACCESS EXCLUSIVE + rewrite (unless binary-coercible, e.g. varchar widening) | Rewrites table and indexes | Expand/contract: new column, dual-write, backfill, switch, drop |
| RENAME COLUMN / TABLE | ACCESS EXCLUSIVE (brief) | Breaks running app versions instantly | Expand/contract: add new, dual-write, migrate readers, drop old |
| DROP COLUMN | ACCESS EXCLUSIVE (brief) | Irreversible data loss; breaks old app code | Stop reads/writes in code first (deploy), drop in later deploy |
| DROP TABLE | ACCESS EXCLUSIVE | Irreversible | Rename-to-deprecated, wait, back up, drop later |
| CREATE INDEX | SHARE (blocks writes) | | `CREATE INDEX CONCURRENTLY` (not in a transaction; check for INVALID index on failure) |
| DROP INDEX | ACCESS EXCLUSIVE | | `DROP INDEX CONCURRENTLY` |
| ADD FOREIGN KEY | SHARE ROW EXCLUSIVE on both tables + scan | | `ADD CONSTRAINT ... NOT VALID`, then `VALIDATE CONSTRAINT` |
| ADD CHECK | ACCESS EXCLUSIVE + scan | | `NOT VALID` then `VALIDATE` |
| ADD UNIQUE / PRIMARY KEY | ACCESS EXCLUSIVE + index build | | Build unique index CONCURRENTLY, then `ADD CONSTRAINT ... USING INDEX` |
| UPDATE backfill in one statement | row locks, WAL, bloat | Long transaction | Batch by key range, commit per batch |
| Enum ADD VALUE | brief; cannot be used in same transaction pre-PG12 | | Run outside transaction |
| TRUNCATE | ACCESS EXCLUSIVE | Data loss | Confirm intent |

Always: set `lock_timeout` (and `statement_timeout` where sensible) so a queued ACCESS EXCLUSIVE does not stall all traffic behind it; avoid wrapping DDL and slow backfills in one transaction.
