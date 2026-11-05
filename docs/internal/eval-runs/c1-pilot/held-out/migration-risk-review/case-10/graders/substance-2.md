---
type: llm
weight: 1
---

The response identifies that SET NOT NULL scans the whole `users` table under an ACCESS EXCLUSIVE lock and fails if any handle is null, and suggests proving it first with a CHECK (handle IS NOT NULL) NOT VALID constraint that is then validated.
