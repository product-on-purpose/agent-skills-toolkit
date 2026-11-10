---
type: llm
weight: 1
---
The response identifies that a plain `CREATE INDEX` on `invoices` blocks inserts, updates and deletes for the whole build and recommends `CREATE INDEX CONCURRENTLY`, noting that it cannot run inside a transaction block.
