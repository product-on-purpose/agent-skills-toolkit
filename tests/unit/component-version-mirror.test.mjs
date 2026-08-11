import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Backlog E24 (S8 mirrors status and tier but not version). `library.json` records a `version` per
// registered component and `S8` (components-mirror) never compares it against the component's own
// frontmatter, so the field drifts silently in both directions.
//
// Measured 2026-08-11 during the v1.10.1 cut: five of this repository's 33 registered components had
// drifted. It entered the release as a two-component finding because two components were what the
// previous pull request happened to touch. An ungated field does not drift where somebody looked.
//
// This guard is deliberately REPO-LOCAL, in the same family as scripts/check-readme-version.mjs. It
// protects this tree only and carries no Standard implication: no third-party plugin's `S8` verdict
// moves because of it. Whether the Standard should require this of everyone is ADR-gated under
// ADR 0027 (Standard versioning and compatibility policy) and is filed as E24, not decided here.
// Fixing the instances, guarding our own tree, and changing the rule are three different acts, and
// only the third needs a decision record.

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");

const library = JSON.parse(readFileSync(path.join(ROOT, "library.json"), "utf8"));

/**
 * Read a component's declared version out of its own YAML frontmatter.
 * Accepts both the `metadata.version` nesting used by skills and subagents and a bare top-level
 * `version`, so the guard does not quietly pass a component whose shape it failed to parse.
 * Returns null only when there is genuinely no version to compare.
 */
function frontmatterVersion(relPath) {
  const abs = path.join(ROOT, relPath);
  const text = readFileSync(abs, "utf8");
  const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) return null;
  const nested = fm[1].match(/^[ \t]+version:[ \t]*(\S+)[ \t]*$/m);
  if (nested) return nested[1].replace(/^["']|["']$/g, "");
  const bare = fm[1].match(/^version:[ \t]*(\S+)[ \t]*$/m);
  return bare ? bare[1].replace(/^["']|["']$/g, "") : null;
}

const registered = Object.entries(library.components ?? {})
  .filter(([, arr]) => Array.isArray(arr))
  .flatMap(([kind, arr]) => arr.map((c) => ({ kind, ...c })));

test("library.json registers at least one component, so this guard cannot pass vacuously", () => {
  assert.ok(registered.length > 0, "no components registered in library.json");
});

test("every registered component's library.json version equals its own frontmatter version", () => {
  const drift = [];
  const unreadable = [];

  for (const c of registered) {
    const declared = frontmatterVersion(c.path);
    if (declared === null) {
      unreadable.push(`${c.kind}/${c.name} (${c.path})`);
      continue;
    }
    if (String(declared) !== String(c.version)) {
      drift.push(`${c.kind}/${c.name}: library.json=${c.version} frontmatter=${declared} (${c.path})`);
    }
  }

  // A component whose version cannot be read is a failure, not a skip. The whole point of this
  // guard is that silence is what let the drift accumulate, so an unparseable component must be
  // loud rather than quietly excluded from the comparison.
  assert.deepEqual(
    unreadable,
    [],
    `component version unreadable from frontmatter:\n  ${unreadable.join("\n  ")}`
  );

  assert.deepEqual(
    drift,
    [],
    `library.json disagrees with component frontmatter:\n  ${drift.join("\n  ")}\n` +
      `Update library.json to match, or bump the component. See backlog E24.`
  );
});
