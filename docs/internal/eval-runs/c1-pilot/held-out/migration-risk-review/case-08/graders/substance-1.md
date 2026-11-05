---
type: llm
weight: 1
---

The response identifies that one UPDATE over all 15M `customers` rows holds locks for a long time, bloats the table and produces heavy WAL, and says the backfill must run in batches.
