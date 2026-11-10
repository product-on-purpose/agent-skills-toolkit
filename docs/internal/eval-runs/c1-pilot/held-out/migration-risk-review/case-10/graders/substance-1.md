---
type: llm
weight: 1
---
The response identifies that adding `tracking_token` with the volatile default `gen_random_uuid()` forces a full table rewrite under an exclusive lock on PostgreSQL 15, unlike a constant default which is applied without a rewrite.
