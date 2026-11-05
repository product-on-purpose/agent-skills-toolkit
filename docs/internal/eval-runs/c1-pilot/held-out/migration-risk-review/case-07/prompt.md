---
max_turns: 10
allowed_tools: [Read, Glob, Grep, Skill]
---

Postgres 14. I'm adding a refunded state to our order_state enum and backfilling existing refunded orders, all in one migration file that Alembic runs in a single transaction:

ALTER TYPE order_state ADD VALUE 'refunded';
UPDATE orders SET state = 'refunded' WHERE refund_id IS NOT NULL;

Does this look okay?
