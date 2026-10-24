---
title: "agent-name-rules - a one-time fixture, not a third probe"
---

# `agent-name-rules`

**This is a ONE-TIME reading, not a recurring probe.** It has no entry in
[`vendor-claims.json`](../../../../foundation/claims/vendor-claims.json) and never should: E81 (the colon
rule now names the frontmatter `name`, not the filename) ruled 2026-10-14 that the colon question is
settled by a single measurement, and the release-blocking probe budget stays at two
([`agents-dir-registers-every-md`](../../vendor-watch/probes/agents-dir-registers-every-md/) and
[`components-share-one-namespace`](../../vendor-watch/probes/components-share-one-namespace/)). Do not add
a third `kind: "probe"` claim for anything measured here.

## The question

For a plugin-shipped subagent specifically, does Claude Code's runtime apply any of the three
`agents/` skip-list rules the vendor documents for a project, user, or managed `agents` directory: a
frontmatter `name` that contains a colon, that starts with a dash, or that is longer than 256
characters? `sub-agents.md` states the skip list only for those three directory kinds, never for a
plugin's own `agents/`, and separately states that a plugin subagent with no `name` or unparseable
frontmatter "still loads, under its filename." E81 measured the colon case alone on 2026-10-23. This
fixture extends the same method to the other two rules, for
[E87 (plugin-agent loading asymmetries this Standard does not model)](../../../backlog/enhancements.md).

## Why it runs in a container

A colon cannot appear in a filename on NTFS. One of this fixture's agent files (`colon:file.md`) must
carry a colon in its filename, so the whole fixture is built and run inside a Linux container; it is
never checked out on a Windows machine and never committed to this repository. `probe.sh` in this folder
builds the fixture plugin at run time from heredocs, including the colon-named file, so there is nothing
for a Windows checkout (or the `validate-windows` CI job, which checks this repository out on Windows) to
choke on.

## The fixture

A single plugin, `probe-agent-name-rules`, with five files under `agents/`:

| File | Frontmatter `name` | Tests |
| --- | --- | --- |
| `control.md` | `control-agent` | baseline, no rule triggered |
| `colon:file.md` | `plain-name-in-colon-file` | colon in the FILENAME (E81) |
| `plain-file.md` | `"colon:in-name"` | colon in the frontmatter name (E81) |
| `dash-name.md` | `"-dash-prefixed-name"` | leading dash in the frontmatter name (E87) |
| `long-name.md` | 257 characters, built with `printf 'a%.0s' $(seq 1 257)` and length-checked by the script before use | name longer than 256 characters (E87) |

## How to run it

The podman machine must already be started (`podman machine list` shows it running). From this
repository's worktree root, in Git Bash:

```
MSYS_NO_PATHCONV=1 podman run --rm -v "<fixture-dir>:/probe:ro" docker.io/library/node:24 sh /probe/probe.sh
```

`<fixture-dir>` is this folder's absolute path. The script installs `@anthropic-ai/claude-code` inside
the container, builds the fixture plugin under `/work` (the `/probe` mount is read-only), adds it as a
local marketplace, installs it with `--scope local`, and runs `claude plugin details`.

**`claude plugin details` is the instrument**, for the same reason the two recurring probes use it: it
prints the component inventory the runtime actually builds from the plugin, which is a stronger reading
than anything this toolkit's own loader can give, because `scripts/lib/load-plugin.mjs` is this
project's model of the runtime and the runtime's own loader is the thing under question. `details` reports
inventory, not invocation: whether a live session would refuse to invoke an agent by a disallowed `name`
is a separate question this fixture does not answer.

## What NOT to do

Do not turn this into a recurring claim. If a future reading finds a DIFFERENT result, that is grounds
for a new backlog entry and a maintainer decision, not for promoting this folder to a third `probe` in
`vendor-claims.json`.
