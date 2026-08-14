#!/usr/bin/env node
// what-it-is:   the agent-skills-toolkit CLI entry point (npm "bin")
// what-it-does: dispatches to the check (gate), evaluate, or tier-report script by subcommand, or
//               defaults to the gate when the first argument is a plugin path rather than a subcommand
// why:          the package name is the toolkit, not any one tool, so `npx agent-skills-toolkit <path>`
//               (the one-minute experience the v1.11.0 "reach" release is built around) must grade a
//               plugin without requiring a subcommand first, while still giving `evaluate` and
//               `tier-report` a real entry point under the same installed name
// used-by:      the "bin" field in package.json; installed by `npm install -g` or run via `npx`
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync, statSync } from "node:fs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = path.resolve(SCRIPT_DIR, "..");

// Subcommand name -> the script it dispatches to. Spawned as a real child process rather than
// imported, because each target script's own CLI block is guarded by
// `process.argv[1]?.endsWith("<name>.mjs")` - a plain `import()` would run inside THIS file's
// process, so argv[1] would still be this wrapper and every one of those guards would stay false,
// silently running nothing. Spawning also means this wrapper never has to duplicate check.mjs,
// evaluate.mjs, or tier-report.mjs's own argv parsing, flag validation, or exit-code logic - it is a
// thin dispatcher, not a second implementation of any of the three CLIs.
const SUBCOMMANDS = {
  check: path.join(PKG_ROOT, "scripts", "check.mjs"),
  evaluate: path.join(PKG_ROOT, "scripts", "evaluate.mjs"),
  "tier-report": path.join(PKG_ROOT, "scripts", "tier-report.mjs"),
  // Added at v1.13.0 because `G4`'s E35 migration finding has to tell a consumer how to regenerate
  // their INDEX.md, and a consumer who does not vendor this toolkit has no `scripts/` directory to run.
  // The first version of that message named the generator as a HYPHENATED STANDALONE PACKAGE rather than
  // a subcommand of this one. No such package is published by this project - unusable as an instruction,
  // and a package-claim supply-chain risk of exactly the kind the "askit" note below exists to prevent.
  // (The retired spelling is deliberately not written out here: tests/unit/retired-npx-name.test.mjs
  // forbids it repository-wide with no exemptions, and an exemption is a hole rather than a courtesy.)
  // It is also the E35 defect itself, one level down:
  // a remediation naming a command its reader does not have. `scripts/generators/gen-index.mjs` is in
  // the package `files` list, so this subcommand works from the published artifact.
  "gen-index": path.join(PKG_ROOT, "scripts", "generators", "gen-index.mjs"),
};

// Deliberately no "askit" alias here. "askit" is a real, unrelated package already published on the
// npm registry; adding it as a second bin name would mean `npx askit` on a clean machine (nothing of
// ours installed) fetches and executes THEIR code instead, and the resulting failure would look like
// this toolkit's bug. Do not "helpfully" add it back - see docs/how-to/install-and-run-via-npm.md.

function readVersion() {
  const pkg = JSON.parse(readFileSync(path.join(PKG_ROOT, "package.json"), "utf8"));
  return pkg.version;
}

function helpText() {
  return `agent-skills-toolkit ${readVersion()} - the Advanced Skill Library Standard gate

Usage:
  agent-skills-toolkit [path] [flags]              grade a plugin against the Standard (the gate; default)
  agent-skills-toolkit check [path] [flags]         same as above, explicit subcommand
  agent-skills-toolkit evaluate [path] [flags]      the structured evaluator (--format, --report, --mode, --profile, ...)
  agent-skills-toolkit tier-report [path] [--json]  the tier-earned-plus-burndown report
  agent-skills-toolkit gen-index [path] [--write]   regenerate INDEX.md from library.json + frontmatter
  agent-skills-toolkit --help, -h                   show this help
  agent-skills-toolkit --version, -v                print the installed version

[path] defaults to the current directory. Every flag after the subcommand (or after a bare path) is
passed through unchanged to the underlying script - see STANDARD.md and the "Install and run via npm"
how-to page on the published docs site for --strict, --mode, --profile, --format, and --report.

Exit code, PER SUBCOMMAND. For the default, check and evaluate it is the gate's: 0 means no
gate-failing error at the plugin's declared tier, 1 means at least one. **gen-index and tier-report
NEVER GRADE.** gen-index exits 0 when generation succeeded; tier-report PRINTS its result and exits 0
even when the report it just printed names blockers. A CI step that runs either one and trusts the exit
code has checked nothing about conformance, whatever the output says. Run the gate separately. A subcommand name always wins over a directory of the same name, so if your plugin
directory is literally named ${Object.keys(SUBCOMMANDS).map((s) => JSON.stringify(s)).join(", ")},
disambiguate it as a PATH by writing "./<name>" (e.g. "agent-skills-toolkit ./gen-index") or by passing
an explicit subcommand first (e.g. "agent-skills-toolkit check ./gen-index"). This list is generated
from the dispatch table, so it cannot fall out of date when a subcommand is added.

This package does not ship the maintainer-only corpus/eval-run tooling from the agent-skills-toolkit
source repository (eval-run, its aggregator, the advisory scorer, standards-watch); those read paths
relative to that repository's own tree and are not meant to run from inside someone else's install.`;
}

const argv = process.argv.slice(2);
const [first, ...restRaw] = argv;

if (first === "--help" || first === "-h") {
  console.log(helpText());
  process.exit(0);
}
if (first === "--version" || first === "-v") {
  console.log(readVersion());
  process.exit(0);
}

let script;
let rest;
if (first !== undefined && Object.prototype.hasOwnProperty.call(SUBCOMMANDS, first)) {
  // A subcommand name wins over a same-named directory, which is the documented contract and is not
  // changed here. What IS new: say so out loud when both readings exist. Adding `gen-index` created a
  // collision where `agent-skills-toolkit gen-index` beside a plugin directory of that name runs the
  // GENERATOR and exits 0 - a silent false pass for any CI that trusts only the exit code. The warning
  // goes to stderr so it cannot corrupt --json/--sarif/--gha on stdout.
  if (existsSync(first) && statSync(first).isDirectory()) {
    process.stderr.write(
      `agent-skills-toolkit: "${first}" is both a subcommand and a directory here; running the ` +
      `SUBCOMMAND. To grade that directory instead, write "./${first}" or "agent-skills-toolkit check ./${first}".
`
    );
  }
  script = SUBCOMMANDS[first];
  rest = restRaw;
} else {
  // No recognized subcommand: treat every argument (a path, flags, or nothing at all) as arguments
  // to the gate, so `npx agent-skills-toolkit <path-to-plugin>` grades it with no subcommand needed -
  // the one-minute experience this bin exists to make possible.
  script = SUBCOMMANDS.check;
  rest = argv;
}

const result = spawnSync(process.execPath, [script, ...rest], { stdio: "inherit" });
if (result.error) {
  console.error(`agent-skills-toolkit: failed to run ${path.basename(script)}: ${result.error.message}`);
  process.exit(1);
}
if (result.signal) {
  console.error(`agent-skills-toolkit: ${path.basename(script)} was terminated by signal ${result.signal}`);
  process.exit(1);
}
process.exit(result.status ?? 1);
