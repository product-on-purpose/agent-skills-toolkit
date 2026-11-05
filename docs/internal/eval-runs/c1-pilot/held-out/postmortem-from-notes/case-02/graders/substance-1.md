---
type: llm
weight: 1
---

The response carries the cause chain that the WAL archive to S3 was stuck because a rotated key had not been updated, so WAL filled the primary's disk and writes failed.
