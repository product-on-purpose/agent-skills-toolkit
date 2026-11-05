---
type: llm
weight: 1
---

The response identifies that code still writing `full_name` between the backfill and the cutover will leave `first_name` and `last_name` stale, so the plan needs dual writes or a trigger to keep them in sync.
