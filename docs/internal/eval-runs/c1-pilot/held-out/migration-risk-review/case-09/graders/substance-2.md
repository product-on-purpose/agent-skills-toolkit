---
type: llm
weight: 1
---

The response recommends setting a lock_timeout (or checking for long-running transactions) because the ALTER needs an ACCESS EXCLUSIVE lock that can queue behind other transactions and in turn block later queries.
