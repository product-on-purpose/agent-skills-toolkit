---
name: cs-caller-space
description: Calls both worker subagents using a whitespace-only-separated metadata.chain string. Use when delegating work to cs-worker-a and cs-worker-b without commas.
metadata:
  version: 0.1.0
  chain: cs-worker-a cs-worker-b
---
# cs-caller-space
Delegates to cs-worker-a and cs-worker-b. `metadata.chain` is declared as a
whitespace-only-separated string (no commas), proving S4 tolerates that separator too.
