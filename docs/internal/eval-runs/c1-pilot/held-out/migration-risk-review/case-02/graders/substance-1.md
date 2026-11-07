---
type: llm
weight: 1
---

The response identifies that during the rolling deploy, app instances still running the old code that reference `users.email` will start failing as soon as the rename commits.
