#!/usr/bin/env node
// what-it-is:   a PreToolUse hook that blocks writes to generator-managed files
// what-it-does: reads the tool call on stdin, extracts the target file path, and denies the call
//               when the path is under .claude-plugin/ or .codex-plugin/, or is INDEX.md; exits 0
//               on a malformed payload so a hook bug cannot wedge the session.
// why:          .claude-plugin/, .codex-plugin/, and INDEX.md are generator output (gen-manifest.mjs
//               and gen-index.mjs); hand-editing them is a G4 error because the next generate run
//               overwrites the file silently, discarding any manual changes without warning.
// used-by:      hooks/hooks.json (PreToolUse, matcher Write|Edit|NotebookEdit); documented in hooks/README.md.

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

/**
 * Returns { dir, generator } if filePath resolves to a generator-managed path, or null otherwise.
 * Normalizes to forward slashes so matching works on both Unix and Windows.
 */
function generatorFor(filePath) {
  if (!filePath || typeof filePath !== "string") return null;
  const norm = filePath.replace(/\\/g, "/");
  if (
    norm.includes("/.claude-plugin/") ||
    norm.startsWith(".claude-plugin/") ||
    norm === ".claude-plugin"
  ) {
    return {
      dir: ".claude-plugin",
      generator: "node scripts/generators/gen-manifest.mjs .",
    };
  }
  if (
    norm.includes("/.codex-plugin/") ||
    norm.startsWith(".codex-plugin/") ||
    norm === ".codex-plugin"
  ) {
    return {
      dir: ".codex-plugin",
      generator: "node scripts/generators/gen-manifest.mjs .",
    };
  }
  const base = norm.split("/").pop();
  if (base === "INDEX.md") {
    return {
      dir: "INDEX.md",
      generator: "node scripts/generators/gen-index.mjs .",
    };
  }
  return null;
}

async function main() {
  let payload;
  try {
    payload = JSON.parse(await readStdin());
  } catch {
    // Malformed payload: allow the call rather than block on a hook bug. The
    // model itself can still consult the source before writing.
    return 0;
  }

  const ti = (payload && payload.tool_input) || {};
  // Write and Edit use file_path; NotebookEdit uses notebook_path.
  const filePath = ti.file_path || ti.notebook_path || "";

  const gen = generatorFor(filePath);
  if (!gen) return 0;

  const reason =
    `Blocked: '${filePath}' is inside ${gen.dir}, which is generator output. ` +
    `Hand-editing generator-managed files is a G4 error: the next generate run will overwrite ` +
    `your changes silently. To update, edit the source and regenerate: ${gen.generator}`;

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: reason,
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
