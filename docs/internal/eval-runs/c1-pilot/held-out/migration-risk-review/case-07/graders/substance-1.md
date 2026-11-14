---
type: llm
weight: 1
---

The response identifies that the new enum value 'refunded' cannot be used in the same transaction that added it, so the UPDATE will fail, and recommends committing the ALTER TYPE in a separate transaction before the UPDATE.
