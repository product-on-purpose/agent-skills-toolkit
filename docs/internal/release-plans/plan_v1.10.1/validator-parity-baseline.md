# First-party validator parity baseline at v1.10.1

The recorded result of running the **first parties' own validators** against this repository, rather
than only running our own. Measured 2026-08-11 on branch `release/v1.10.1`.

## Why this file exists

`STANDARD.md` sec 6 claims the Universal tier tracks agentskills.io, and the README claims a Bronze
plugin "is installable and behaves the same on Claude Code, Codex, and the broader agentskills.io
ecosystem." Until 2026-08-10 the evidence for both claims was that our own gate said so.

Running the other side's validator is what turned an abstract portability claim into two concrete
conflicts, one of which was live and shipped a fix the same day (PR #204, the `chain` frontmatter
migration). This file makes that evidence a dated record instead of a one-off audit run, and it is
the manual precursor to the automated parity harness targeted at v1.11.0. When that harness lands in
CI, this file becomes its baseline rather than its replacement.

The invariant it serves, stated so the harness can be built against it:

> **Parity invariant.** Nothing the first-party validators reject grades clean at the tier that
> claims the corresponding portability.

## Environment

| Tool | Version |
|---|---|
| Claude Code CLI (`claude plugin validate`) | 2.1.227 |
| `skills-ref` (`agentskills validate`), from PyPI via `uvx` | 0.1.1 |
| Codex CLI | 0.144.5 |
| Node | v22.12.0 |
| Platform | Windows |

Version pinning matters here: a parity result is only reproducible against a named validator build.
The upstream pin at `docs/internal/standards-watch/upstream-pin.json` tracks the `skills-ref` **source
blobs**, which is a different identity from the **PyPI release** run here. The two can diverge, and
the harness that automates this should pin and report both.

## Results

### `claude plugin validate` (Anthropic, first party)

| Target | Mode | Result |
|---|---|---|
| repository root | default | **PASS** |
| repository root | `--strict` | **PASS** |
| `templates/seed-plugin` | `--strict` | **FAIL** |

The seed-plugin failure, verbatim:

```
✘ Found 1 error:

  ❯ directory: No manifest found in directory. Expected .claude-plugin/marketplace.json or .claude-plugin/plugin.json

✘ Validation failed
```

**This is a known, recorded tension and it is deliberately not fixed in this patch.** The Standard's
tier design places native manifests at Silver, via `S6` (per-target emission), so a Bronze scaffold
carrying only `library.json` is correct by the Standard and not a plugin by the vendor's definition.
The README's Bronze payoff claims installability. One of those two has to move, and choosing which is
a Standard question rather than a patch. It is scoped to v1.11.0, where the cheapest resolution is
already identified: since Codex 0.146.0 reads `.claude-plugin/*` directly, a single minimal
`.claude-plugin/plugin.json` (only `name` is required) buys install recognition on **both** vendors.

Scope note worth carrying forward: `claude plugin validate` validates the **manifest**, not the
component tree. A pass here is not a statement about skill contents.

### `skills-ref` (agentskills.io reference implementation)

All 24 skills, `uvx --from skills-ref agentskills validate skills/<name>`:

**24 of 24 PASS.**

| Skill | Result | | Skill | Result |
|---|---|---|---|---|
| askit-backlog | PASS | | askit-capability-advisor | PASS |
| askit-build-agents-md | PASS | | askit-decision | PASS |
| askit-build-chain-contract | PASS | | askit-deprecate | PASS |
| askit-build-command | PASS | | askit-evaluate | PASS |
| askit-build-docs | PASS | | askit-init-marketplace | PASS |
| askit-build-hook | PASS | | askit-init-plugin | PASS |
| askit-build-mcp | PASS | | askit-migrate | PASS |
| askit-build-output-style | PASS | | askit-release | PASS |
| askit-build-samples | PASS | | askit-standards-watch | PASS |
| askit-build-settings | PASS | | askit-template-manager | PASS |
| askit-build-skill | PASS | | askit-build-statusline | PASS |
| askit-build-subagent | PASS | | askit-build-workflow | PASS |

**Prior baseline, for the delta:** on 2026-08-10, before PR #204, this sweep returned **22 PASS, 2
FAIL**. `askit-build-skill` and `askit-evaluate` were rejected with:

```
Unexpected fields in frontmatter: chain. Only ['allowed-tools', 'compatibility',
'description', 'license', 'metadata', 'name'] are allowed.
```

Both now carry the field at `metadata.chain`. That is the change this baseline exists to prove
landed.

### Our own gate, for comparison

| Run | Result |
|---|---|
| `node scripts/check.mjs .` | Tier: Advanced, 0 errors, 0 warnings |
| `npm test` | all passing |

## What "24 of 24 PASS" does not mean, and why this section exists

> **Rewritten 2026-08-11 against HEAD.** The first draft of this section recorded the nested-list form
> as an open question routed to a later release. Investigating it during this cut turned it into a
> fixed defect, and round 4 of the adversarial review caught that this file still described the old
> state.

**A `skills-ref` pass is weaker evidence than it reads as.** The validator checks that top-level
frontmatter keys are in `ALLOWED_FIELDS` and format-checks `name`, `description` and `compatibility`.
It **never inspects the contents of `metadata` at all.** Meanwhile the parser coerces the whole
namespace:

```python
# skills_ref/parser.py, parse_frontmatter
if "metadata" in metadata and isinstance(metadata["metadata"], dict):
    metadata["metadata"] = {str(k): str(v) for k, v in metadata["metadata"].items()}
```

So a non-string value under `metadata` is **silently rewritten at parse time** and the validator
reports success, because nothing looked.

PR #204 had moved `chain` under `metadata` as a YAML list. Measured on the shipped file before this
release:

```
chain value : "['askit-skill-author', 'askit-reviewer']"
chain type  : str
```

The declaration a consumer reads through the reference implementation was a string containing a Python
list repr, while `agentskills validate` reported "Valid skill" for all 24 skills. **The 22-to-24
improvement recorded above was real and also insufficient**, which is exactly the trap this file exists
to document.

**Fixed in this release.** The declaration is now a comma-separated string that round-trips through the
reference parser unchanged, and `S4` (chain contracts) reads the string, array and legacy top-level
shapes, with the newly-readable string form shipping warn-first under ADR 0041 (warn-first
string-shaped chain declarations).

**The instruction this leaves for the parity harness scoped to v1.11.0:** assert on **parsed values**,
not only on exit codes. A harness that runs `agentskills validate` and checks the status code would
have reported this repository green throughout, and would reproduce the same blind spot in CI while
calling it coverage.

**What would still change the verdict:** a `skills-ref` release whose `models.py` or `validator.py`
blob moves to enforce or reject rather than coerce. `askit-standards-watch` watches exactly those
blobs, which is why such an answer arrives as a watch finding rather than as a consumer bug report.

## Reproducing this

```bash
claude plugin validate . --strict
claude plugin validate templates/seed-plugin --strict

for d in skills/*/; do
  uvx --from skills-ref agentskills validate "$d"
done

node scripts/check.mjs .
```

The plugin root is a **positional** argument, not a flag. As of v1.10.1 a Windows backslash path is
normalized rather than silently resolving elsewhere.
