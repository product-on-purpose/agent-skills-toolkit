---
type: llm
weight: 1
---

The response identifies that CREATE INDEX without CONCURRENTLY blocks writes to `orders` for the whole index build and recommends CREATE INDEX CONCURRENTLY.
