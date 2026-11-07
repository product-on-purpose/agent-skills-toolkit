---
max_turns: 10
allowed_tools: [Read, Glob, Grep, Skill]
---

Hey, I'm adding order status tracking to our Postgres 14 database and my PR has two statements in it:

ALTER TABLE orders ADD COLUMN status text NOT NULL;
CREATE INDEX idx_orders_status ON orders (status);

orders has about 40 million rows and takes roughly 600 writes a second at peak. Deploy is Thursday afternoon. What could go wrong?
