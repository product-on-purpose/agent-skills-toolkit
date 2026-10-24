---
title: "agent-name-rules - what the 2026-10-23 run observed"
---

# `agent-name-rules` - run log

## 2026-10-23: the extended fixture, five agents, one container run

Instrument: `claude plugin details probe-agent-name-rules`, the house probe instrument, run inside a
`docker.io/library/node:24` Linux container under podman, from `probe.sh` in this folder. `claude
--version` inside the container: **2.1.310**, matching the host's version the same day.

Fixture `probe-agent-name-rules`, `agents/`: `control.md` (`name: control-agent`), `colon:file.md`
(colon in the filename, `name: plain-name-in-colon-file`), `plain-file.md` (no colon in the filename,
`name: "colon:in-name"`), `dash-name.md` (`name: "-dash-prefixed-name"`), `long-name.md` (`name` built
to exactly 257 characters and length-checked by the script before use, which the script's own output
confirmed: `long name length: 257`).

Verbatim `claude plugin details probe-agent-name-rules`:

```
probe-agent-name-rules 0.0.1
  Description: One-time fixture for the agent-name frontmatter rules (E81, E87)
  Source: probe-agent-name-rules@askit-agent-name-rules-fixture

Component inventory
  Skills (0)
  Agents (5)  plain-file, control, long-name, dash-name, colon:file
  Hooks (0)
  MCP servers (0)
  LSP servers (0)

Projected token cost
  Always-on:   ~93 tok   added to every session

Per-component (rounded)
  component   always-on  on-invoke
  plain-file       < 20       < 20
  control          < 20       < 20
  long-name         ~20       < 20
  dash-name        < 20       < 20
  colon:file       < 20       < 20
```

**All five registered.** Neither the leading-dash frontmatter name nor the 257-character frontmatter
name removed its file from the plugin's component inventory, the same result E81 already established
for the colon cases. Every agent is listed by its FILENAME stem (`dash-name`, `long-name`), not by its
frontmatter `name` value, matching the 2026-10-13 `agents-dir-registers-every-md` reading and E81's own
colon-case reading.

**Reading.** For a plugin-shipped subagent, none of the three `agents/` skip-list rules the vendor
documents for a project, user, or managed `agents` directory (colon, leading dash, length over 256
characters) removed a file from the plugin loader's inventory. This is consistent with `sub-agents.md`
scoping that skip list explicitly away from plugin directories, and with its separate statement that a
plugin subagent with unparseable or missing frontmatter "still loads, under its filename." Not measured
here: whether a live, logged-in session would refuse to INVOKE an agent by a disallowed `name`; `details`
reports the loader's inventory, not invocation behaviour.

**Not established by this reading alone, and not generalised past it.** This is a single run, inside one
container image, on one Claude Code version. It is recorded as a one-time measurement per this folder's
README, not as a `probe` claim with its own freshness clock.
