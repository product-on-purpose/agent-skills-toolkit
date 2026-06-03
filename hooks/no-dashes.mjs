#!/usr/bin/env node
// what-it-is:   a PreToolUse hook that guards Write/Edit/NotebookEdit payloads against em-dash and en-dash characters.
// what-it-does: reads the tool call on stdin, scans new_string/content/new_source, and denies the call with an actionable message when a banned dash is present.
// why:          the Standard's no-dash rule (U10) is a check on files at rest; this hook enforces it at author-time, and is the demonstrative Gold hook that makes G1 (hook-documentation) non-vacuous.
// used-by:      hooks/hooks.json (PreToolUse, matcher Write|Edit|NotebookEdit); documented in hooks/README.md; covered by evals/no-dashes-hook.eval.json (G3).
//
// The banned characters are written as backslash-u escape sequences so this
// file itself stays dash-free (U10-clean) and decodes them to the real
// characters at runtime. Do not paste the literal glyphs into this file.

// Em-dash and en-dash as escape sequences (ASCII in source, real chars at runtime).
const EM = String.fromCharCode(0x2014);
const EN = String.fromCharCode(0x2013);

async function readStdin() {
  const chunks = [];
  // Read raw bytes and decode UTF-8 explicitly so a multibyte glyph is never
  // mis-decoded under a non-UTF-8 default encoding.
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

async function main() {
  let payload;
  try {
    payload = JSON.parse(await readStdin());
  } catch {
    // Malformed payload: allow the call rather than block on a hook bug. The
    // model itself remains under the house rule.
    return 0;
  }

  const ti = (payload && payload.tool_input) || {};
  const text = [ti.new_string, ti.content, ti.new_source]
    .filter((s) => typeof s === "string")
    .join("");

  const found = [];
  if (text.includes(EM)) found.push("em-dash (U+2014)");
  if (text.includes(EN)) found.push("en-dash (U+2013)");

  if (found.length) {
    const reason =
      "Blocked: this tool call would write " +
      found.join(" and ") +
      " to disk. Replace with an ASCII hyphen with spaces (' - ') or restructure " +
      "with a comma, colon, or sentence break (the Standard's U10 no-dash rule).";
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: reason,
        },
      })
    );
  }
  return 0;
}

main().then(
  (code) => process.exit(code),
  // A hook crash must never wedge the session: allow on error.
  () => process.exit(0)
);
