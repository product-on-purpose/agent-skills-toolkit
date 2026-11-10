---
type: llm
weight: 1
---
The response identifies that adding the foreign key to `invoices` without `NOT VALID` scans the whole table to validate it while holding a lock that blocks writes, and recommends adding it as `NOT VALID` and then running `VALIDATE CONSTRAINT` separately.
