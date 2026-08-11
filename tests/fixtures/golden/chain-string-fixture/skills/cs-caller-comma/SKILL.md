---
name: cs-caller-comma
description: Calls both worker subagents using a comma-separated metadata.chain string. Use when delegating work to cs-worker-a and cs-worker-b.
metadata:
  version: 0.1.0
  chain: cs-worker-a, cs-worker-b
---
# cs-caller-comma
Delegates to cs-worker-a and cs-worker-b. `metadata.chain` is declared as a comma-separated
string (the recommended shape), not a YAML list.
