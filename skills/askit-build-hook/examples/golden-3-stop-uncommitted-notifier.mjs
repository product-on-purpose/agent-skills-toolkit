#!/usr/bin/env node
// what-it-is:   a Stop hook that emits a conformance reminder when skills/ or scripts/ have uncommitted changes
// what-it-does: at the end of a turn, checks git status for uncommitted changes under skills/ and
//               scripts/; if any are found, returns additionalContext reminding the agent to run
//               the conformance gate before the session ends; never blocks - always exits 0.
// why:          skill and script changes without a gate run are a common source of regressions caught
//               only at publish time; a nudge at Stop costs nothing and catches the oversight early.
// used-by:      hooks/hooks.json (Stop, no matcher); documented in hooks/README.md.

import { execSync } from "node:child_process";

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

async function main() {
  // Consume stdin - the Stop payload is not inspected.
  try {
    await readStdin();
  } catch {
    // ignore
  }

  let changed = "";
  try {
    changed = execSync("git status --porcelain -- skills/ scripts/", {
      encoding: "utf8",
      timeout: 5000,
    }).trim();
  } catch {
    // git unavailable or the command failed - do not block.
    return 0;
  }

  if (!changed) return 0;

  const fileCount = changed.split("\n").filter(Boolean).length;
  const label = fileCount === 1 ? "change" : "changes";
  const additionalContext =
    `${fileCount} uncommitted ${label} detected under skills/ or scripts/. ` +
    "Run 'node scripts/check.mjs .' before closing the session to confirm conformance.";

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "Stop",
        additionalContext,
      },
    })
  );
  return 0;
}

main().then(
  (code) => process.exit(code),
  // A hook crash must never wedge the session: allow on error.
  () => process.exit(0)
);
