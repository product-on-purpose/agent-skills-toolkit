---
name: probe-readme-should-not-be-an-agent
description: A folder guide that happens to be a .md file in agents/. If this registers as a subagent, the recorded behaviour holds - the runtime scans for *.md and does not special-case README.
---

This file exists to be counted, not to be useful. Its presence in `agents/` is the whole experiment:
a plugin author writing an ordinary folder guide here creates a phantom subagent.
