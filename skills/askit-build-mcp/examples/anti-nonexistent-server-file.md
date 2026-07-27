# Anti-example: a template pointing at a server file that does not exist

**Demonstrates the mistake:** shipping an MCP entry whose launch path is both the wrong path FORM and a target that is not on disk, and which a green gate says nothing about.
**Provenance:** the defect is real. It is what `templates/mcp.json` shipped in this repository for every release it was in; it was found and fixed during the SP2b metered authoring pass on 2026-07-26, and kept here as the worked teaching case. Raw run artifact under the gitignored `_local/audit/eval-runs/2026-07-26/`.

## Input

> "Scaffold an MCP server for my plugin."

The builder's create mode says, at step 2: "Copy `templates/mcp.json` if the file does not exist yet."
So the scaffold is copied to the plugin root, the author renames the server, the gate is run, the gate
is green, and the plugin ships.

## The wrong output

**The block below is WRONG. Do not copy it.** It is quoted verbatim from what
[templates/mcp.json](../../../templates/mcp.json) shipped, preserved here because the fix removed it
from the template.

```json
{
  "mcpServers": {
    "example-server": {
      "command": "node",
      "args": ["./mcp/example-server.mjs"],
      "env": {
        "EXAMPLE_SERVICE_TOKEN": ""
      }
    }
  }
}
```

## Why it is wrong

One line, `"args": ["./mcp/example-server.mjs"]`, carries **two independent defects**.

**Defect 1: the path form.** A bundled server is launched by the agent, on a machine the author has
never seen, from a working directory that is the **user's project**, not the plugin. `./mcp/...`
resolves against that working directory. On the author's own machine, sitting in the plugin repo, it
appears to work; installed anywhere else it names a file that is not there and the server simply never
starts. The correct form is the plugin-root variable, `${CLAUDE_PLUGIN_ROOT}/...`.

**Defect 2: the target.** There is no `mcp/` directory anywhere in this repository and no file called
`example-server.mjs`. So even after fixing the path form by hand, the scaffold pointed at nothing. A
copied-but-unedited scaffold was not obviously unfinished; it was silently broken, which is worse,
because the failure is invisible until a user's server does not come up.

The two defects are worth separating because they have different fixes and only one of them is about
paths. Fixing the form without fixing the target still yields a server that never starts.

Proof that the target is absent, in the tracked tree:

```
$ ls mcp
ls: cannot access 'mcp': No such file or directory

$ git ls-files | grep -c "^mcp/"
0

$ git ls-files | grep "example-server"
```

The last command printed nothing.

## What the builder does instead

The template now carries an unmistakable scaffold slot in the repository's own `REPLACE-` placeholder
convention (the same one [templates/SKILL.md](../../../templates/SKILL.md) uses), so a copied-but-unedited
scaffold is obviously unfinished rather than silently broken:

```json
{
  "mcpServers": {
    "REPLACE-with-kebab-case-server-name": {
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/mcp/REPLACE-with-server-file-name.mjs"],
      "env": {
        "REPLACE_WITH_ENV_VAR_NAME": ""
      }
    }
  }
}
```

Three things changed, and one deliberately did not:

- **changed:** the bare relative path became `${CLAUDE_PLUGIN_ROOT}/...`, the vendor-documented
  expansion that names the plugin's installation directory;
- **changed:** the server name and the path became `REPLACE-` tokens, so an unedited copy announces
  itself instead of pretending to be finished;
- **changed:** the env key became a `REPLACE_WITH_ENV_VAR_NAME` token, since the old
  `EXAMPLE_SERVICE_TOKEN` read like a real variable name someone might keep;
- **unchanged, on purpose:** the env value is still the empty string. Sec 9 env indirection is the rule
  the scaffold has to teach, so a placeholder credential there would be the wrong lesson.

A finished entry looks like [golden-1-stdio-server.md](golden-1-stdio-server.md): a real path under
`${CLAUDE_PLUGIN_ROOT}`, a file that exists at it, and a launch transcript proving the process speaks
MCP.

## How to detect it

**The deterministic gate does not catch this, and it will not start catching it.** Put the broken entry
straight to the check and it returns nothing:

```
$ node --input-type=module -e "
import { check } from './scripts/checks/mcp-valid.mjs';
const def = { command: 'node', args: ['./mcp/example-server.mjs'], env: { EXAMPLE_SERVICE_TOKEN: '' } };
console.log(JSON.stringify(check({ mcpServers: [{ name: 'example-server', def }] })));
"
[]
```

An empty finding list. That is not a bug. `U11`
([scripts/checks/mcp-valid.mjs](../../../scripts/checks/mcp-valid.mjs)) asks whether a stdio server
declares a non-empty `command` **string**:

```js
const isStdio = typeof def.command === "string" && def.command.trim() !== "";
```

`"node"` satisfies that. `args` is never inspected. Standard sec 3.9 does say "a referenced `command`
SHOULD be resolvable", but it is a SHOULD and no check implements it.

**Which check would have to change: `U11` (`mcp-valid`).** It owns the `.mcp.json` entry, so a
resolvability rule would live there. The project has not added one, and the reason is the general case:

- the launch command is arbitrary. `npx`, `uvx`, `docker`, `python -m`, or a bare executable found on
  `PATH` with OS-specific extension and lookup rules. Deciding whether any of those "resolves" means
  reproducing each launcher's own resolution semantics, per platform.
- the expansions are not all knowable at grade time. `${CLAUDE_PLUGIN_ROOT}` is (it is the directory
  being graded), but `${CLAUDE_PROJECT_DIR}` and `${CLAUDE_PLUGIN_DATA}` name directories that belong to
  an install that does not exist yet.
- the only faithful test is starting the process, and a gate must never do that. It would execute
  third-party code on a grader's machine and would not be reproducible across CI runners, which
  violates the local/CI parity requirement in sec 4.4.

A narrower lint is technically reachable - flag an `args` entry beginning `./` or `../`, and stat the
literal remainder when the entry begins `${CLAUDE_PLUGIN_ROOT}/`. It would have caught this exact line.
It is not in the spine today, it covers only the bundled-literal-path subset, and adding a check to the
spine is an ADR-gated decision, not something an example file can assert.

**So the obligation stays with the author, and it is not optional.** What you must carry, every time:

1. Run the exact `command` plus `args` yourself, from a directory that is **not** the plugin root, with
   the plugin-root variable substituted by hand.
2. Confirm the process comes up and answers `initialize`.
3. Keep the transcript. Every golden in this folder has one, which is what makes it golden.

If you cannot run it, you have written a configuration, not a server.

## See also

- [../references/authoring-mcp.md](../references/authoring-mcp.md) - the recorded defect and what `U11`
  does and does not catch.
- [golden-1-stdio-server.md](golden-1-stdio-server.md) - the same wiring done correctly, with the launch
  transcript.
- [../../../STANDARD.md](../../../STANDARD.md) - sec 3.9 (MCP server), sec 4.4 (local / CI parity).
