# Example

Input: `ALTER TABLE orders RENAME COLUMN total TO amount_cents;` (size and traffic not given)

Verdict: UNSAFE

| Statement | Lock taken | Risk | Fix |
|---|---|---|---|
| `ALTER TABLE orders RENAME COLUMN total TO amount_cents;` | ACCESS EXCLUSIVE (brief, blocks reads and writes while it waits and runs) | Running app instances still query `total` and fail immediately; queued lock can stall traffic | Do not rename in place; use expand-and-contract (Deploy steps below), with `SET lock_timeout = '3s'` |

## Rollback
`ALTER TABLE orders RENAME COLUMN amount_cents TO total;` (only valid before code depends on the new name).

## Assumptions
Table size and traffic not given; assumed a large, write-heavy production table on PostgreSQL 14+. The verdict cannot be SAFE under these assumptions.

## Deploy steps
1. Deploy 1 (expand): `ADD COLUMN amount_cents bigint;` app writes both columns.
2. Deploy 2 (backfill): batched `UPDATE` of old rows, then validate parity.
3. Deploy 3 (switch): app reads `amount_cents` only.
4. Deploy 4 (contract): stop writing `total`, later `DROP COLUMN total` (rollback: none after this, data in `total` is lost, so keep a backup).
