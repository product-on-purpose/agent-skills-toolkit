---
type: llm
weight: 1
---

The response points out that a single UPDATE over every `orders` row with a refund_id holds row locks and creates a large write burst, and recommends running the backfill in batches.
