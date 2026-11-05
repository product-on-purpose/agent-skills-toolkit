---
type: llm
weight: 1
---

The response notes that `invoices.customer_id` needs its own index (built concurrently), because Postgres does not create one automatically and deletes or key updates on `customers` would otherwise scan `invoices`.
