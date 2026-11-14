---
type: llm
weight: 1
---

The response identifies that changing integer to bigint rewrites the entire 120M-row `payments` table while holding an ACCESS EXCLUSIVE lock that blocks all reads and writes for the duration.
