# Quick start

From zero to a graded plugin in a few minutes. Install the toolkit, grade a plugin against the Standard, then start a new plugin or bring an existing skills repo up to the bar.

New here? Read [What it is](README.md#what-it-is) in the README first. For the full normative rules, see [`STANDARD.md`](STANDARD.md).

## 1. Install

The toolkit installs on Claude Code and Codex - it ships both native manifests. You **add** the marketplace by its repo path, then **install** by the marketplace identity (`@product-on-purpose`): the path is the address, the identity is the brand.

```bash
# Add the marketplace once (by repo path)
/plugin marketplace add product-on-purpose/agent-plugins

# Install the toolkit (by marketplace identity)
/plugin install agent-skills-toolkit@product-on-purpose
```

## 2. Grade a plugin

Grading tells you the highest tier a plugin satisfies (Bronze / Silver / Gold) and a burndown of exactly what blocks the next tier. There are three ways to run it, and all three run the same checks.

**From a terminal, with nothing installed.** The gate is published to npm, so this works on any plugin directory right now, including one you have not touched yet:

```bash
npx agent-skills-toolkit .                     # grade the plugin in this directory
npx agent-skills-toolkit /path/to/your-plugin  # or one somewhere else
```

**Ask your agent.** Invoke the `askit-evaluate` skill - run the `/askit-evaluate` command, or just say "grade this plugin against the Standard." It runs the deterministic core and presents the tier, the burndown to the next tier, and per-rule remediation.

**From a clone.** With this repository checked out, the scripts run directly - this is the form CI and pre-commit hooks use. Anywhere Node 22.12+ runs, with one runtime dependency (a YAML parser):

```bash
node scripts/check.mjs              # the tier + what blocks the next one, on a real exit code
node scripts/tier-report.mjs --json # the same result as JSON for tooling
node scripts/evaluate.mjs <target> --format=html  # a self-contained HTML report (written to <target>/evaluation-report.html)
```

A clean Gold plugin reports:

```
Tier: Advanced (no blockers detected)

0 error(s), 0 warning(s).
```

The skill is the door; the script is the engine. Only a deterministic gate with a real exit code can run in CI and let a plugin prove itself.

## 3. Then build

Pick the path that matches where you are.

**Start a new plugin.** Invoke `askit-init-plugin`, or just ask your agent to "start a new plugin." It onboards you by interview, questionnaire, or hybrid mode, then scaffolds a plugin that passes the conformance core immediately:

- a minimal `library.json` carrying the five required fields
- a root `AGENTS.md` entrypoint
- a minimal `.claude-plugin/plugin.json` (`name`, `version`, `description` only), so it installs on Claude Code and Codex from the first commit
- README and CHANGELOG starters

Give it an author in interview mode and `claude plugin validate --strict` passes outright. Decline, and the manifest stays exactly as minimal as the template: still install-recognized, just short of `--strict`-clean.

Then add your first skill with `askit-build-skill` and re-run the grade to confirm Bronze.

**Bring an existing skills repo up to the bar.** Adopt an ad-hoc or foreign skills repo into a conformant plugin. Invoke `askit-migrate`, or ask your agent to "migrate this repo to the Standard." It runs in three modes:

- `assess` - survey the repo, map each piece to a Standard component type, and report the gap (Bronze blockers first, then Silver).
- `plan` - order the gaps into a staged roadmap and name the `askit-build-*` skill or check that closes each one.
- `adopt` - write the minimal canonical `library.json` and a root `AGENTS.md` if absent, so the repo becomes gradeable and the rest of the plan can run through `askit-evaluate` and the builders.

From there, the `askit-build-*` family adds each component to the Standard, and the grade tells you when you have cleared the next rung.

## Where to go next

- **Tutorials** - [`docs/tutorials/`](docs/tutorials/) for guided, start-to-finish lessons: [build your first skill](docs/tutorials/build-your-first-skill.md), [start a plugin and reach Bronze](docs/tutorials/start-a-plugin-and-reach-bronze.md), then [climb to Gold](docs/tutorials/climb-to-gold.md).
- **How-to guides** - [`docs/how-to/`](docs/how-to/) has task-focused walkthroughs: [scaffold a plugin](docs/how-to/scaffold-a-plugin.md), [adopt a foreign repo](docs/how-to/adopt-a-foreign-repo.md), [build and evaluate a skill](docs/how-to/build-and-evaluate-a-skill.md), [climb from Bronze to Silver](docs/how-to/climb-from-bronze-to-silver.md), and more.
- **Live docs site** - [product-on-purpose.github.io/agent-skills-toolkit](https://product-on-purpose.github.io/agent-skills-toolkit/) for the published guides, per-component reference, and explanation.
- **The README** - [`README.md`](README.md) for what the toolkit is, the tier model, and the full catalog.
- **The Standard** - [`STANDARD.md`](STANDARD.md) for the normative rules every tool here enforces.
