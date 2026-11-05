---
type: llm
weight: 1
---

The response identifies that adding the foreign key validates every existing row of `invoices` while holding a SHARE ROW EXCLUSIVE lock on the tables, and recommends adding it NOT VALID and then running VALIDATE CONSTRAINT as a separate step.
