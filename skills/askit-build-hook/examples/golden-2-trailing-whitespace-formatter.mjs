#!/usr/bin/env node
// what-it-is:   a PostToolUse hook that normalizes trailing whitespace in written files
// what-it-does: after Write or Edit lands, reads the file at tool_input.file_path, strips trailing
//               whitespace from each line, and ensures exactly one trailing newline; rewrites the
//               file only if the content changed; skips binary files; idempotent - a second run on
//               an already-normalized file produces no change and no output.
// why:          trailing whitespace in source files is noise in diffs and fails many linters;
//               normalizing at write-time keeps the working tree clean without requiring vigilance.
// used-by:      hooks/hooks.json (PostToolUse, matcher Write|Edit); documented in hooks/README.md.

import { readFileSync, writeFileSync, existsSync } from "node:fs";

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

/**
 * Normalize a text file's trailing whitespace:
 * - Strip trailing spaces and tabs from every line.
 * - Ensure exactly one trailing newline.
 * This function is idempotent: normalize(normalize(x)) === normalize(x) for any string x.
 */
function normalize(content) {
  const lines = content.split("\n").map((l) => l.replace(/[ \t]+$/, ""));
  // Remove any run of trailing blank lines, then add back exactly one.
  while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  lines.push("");
  return lines.join("\n");
}

async function main() {
  let payload;
  try {
    payload = JSON.parse(await readStdin());
  } catch {
    return 0;
  }

  const filePath =
    (payload && payload.tool_input && payload.tool_input.file_path) || "";
  if (!filePath || !existsSync(filePath)) return 0;

  let original;
  try {
    original = readFileSync(filePath, "utf8");
  } catch {
    return 0;
  }

  // Skip binary files: a null byte indicates non-text content.
  if (original.includes("\0")) return 0;

  const normalized = normalize(original);
  if (normalized === original) return 0; // already clean - true no-op

  try {
    writeFileSync(filePath, normalized, "utf8");
  } catch {
    return 0;
  }

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: `Normalized trailing whitespace in ${filePath}.`,
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
