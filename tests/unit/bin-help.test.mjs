import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

// The bin's --help usage block is hand-written, and it drifted: gen-manifest was added to the dispatch
// table at v1.13.0 (U8 and S6 print remediations naming it) but never to the usage block, so a reader
// of --help had no way to learn the subcommand two findings told them to run. This pairs the usage
// block with the dispatch table itself, so the next subcommand cannot be added to one and not the other.
//
// SUBCOMMANDS is read out of the bin's SOURCE rather than imported: the bin dispatches at module top
// level and exports nothing, so importing it would run a gate against this test's cwd.

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const BIN = path.join(REPO, "bin", "agent-skills-toolkit.mjs");

function subcommandKeys() {
  const src = readFileSync(BIN, "utf8");
  const start = src.indexOf("const SUBCOMMANDS = {");
  assert.ok(start >= 0, "the bin must still declare its dispatch table as `const SUBCOMMANDS = {`");
  const end = src.indexOf("\n};", start);
  const block = src.slice(start, end);
  // One entry per line: `  check: path.join(...)` or `  "tier-report": path.join(...)`.
  const keys = [...block.matchAll(/^\s+"?([\w-]+)"?:\s*path\.join\(/gm)].map((m) => m[1]);
  assert.ok(keys.includes("check") && keys.includes("gen-manifest"), `the parser must see the real table, got: ${keys.join(", ")}`);
  return keys;
}

test("--help lists a usage line for every subcommand in the dispatch table", () => {
  const r = spawnSync(process.execPath, [BIN, "--help"], { encoding: "utf8" });
  assert.equal(r.status, 0, `--help must exit 0, stderr: ${r.stderr}`);
  const keys = subcommandKeys();
  assert.ok(keys.length >= 5, `expected the full dispatch table, got ${keys.length} keys`);
  for (const key of keys) {
    assert.match(r.stdout, new RegExp(`^  agent-skills-toolkit ${key} `, "m"), `--help has no usage line for the "${key}" subcommand`);
  }
});

test("the gen-manifest usage line names the flags the generator actually accepts", () => {
  const r = spawnSync(process.execPath, [BIN, "--help"], { encoding: "utf8" });
  assert.match(r.stdout, /^  agent-skills-toolkit gen-manifest \[path\] \[--write\] \[--target=<resolved\|claude\|codex\|all>\]  /m);
});
