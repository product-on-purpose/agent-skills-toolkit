import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

import { check as g1 } from "../../scripts/checks/hook-documentation.mjs";
import {
  codexSkipsHandler,
  targetsCodex,
  CODEX_HANDLER_SUPPORT,
  CODEX_HANDLER_SENTENCE,
} from "../../scripts/lib/vendor-hook-handlers.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "../..");

/** A throwaway plugin root carrying one hooks.json and one library.json. */
function plugin({ types, agentTargets, codexManifest = false }) {
  const root = mkdtempSync(path.join(tmpdir(), "askit-g1-"));
  mkdirSync(path.join(root, "hooks"), { recursive: true });
  writeFileSync(
    path.join(root, "hooks", "hooks.json"),
    JSON.stringify({
      hooks: {
        PreToolUse: [{ matcher: "Bash", hooks: types.map((t) => ({ type: t, command: "echo hi" })) }],
      },
    })
  );
  const ctx = {
    root,
    library: { data: agentTargets === null ? {} : { "agent-targets": agentTargets } },
    codexManifest: codexManifest ? { name: "x" } : null,
  };
  return ctx;
}

const codexFindings = (out) => out.filter((f) => /parses and then SKIPS/.test(f.message));

// ---------------------------------------------------------------------------------------------
// RS-C2. The failure this exists to catch is SILENT on the vendor's side: Codex parses a `prompt`
// handler, skips it, and reports nothing. So the gate is the only place an author can learn it.
// ---------------------------------------------------------------------------------------------

test("RS-C2: a prompt-type hook on a Codex-targeting plugin is reported", () => {
  const out = g1(plugin({ types: ["prompt"], agentTargets: ["claude", "codex"] }));
  const hits = codexFindings(out);
  assert.equal(hits.length, 1, `expected one Codex handler finding; got ${hits.length}`);
  assert.match(hits[0].message, /"prompt"/);
  assert.match(hits[0].message, /silently never runs/);
});

test("RS-C2: an agent-type hook on a Codex-targeting plugin is reported", () => {
  const hits = codexFindings(g1(plugin({ types: ["agent"], agentTargets: ["codex"] })));
  assert.equal(hits.length, 1);
  assert.match(hits[0].message, /"agent"/);
});

test("RS-C2: the finding quotes the vendor sentence and names the pinned claim", () => {
  // A finding about somebody else's runtime has to show its authority, or the author has no way to
  // check it. The sentence is pinned as cx-hook-handler-support and re-verified by vendor-watch.
  const hits = codexFindings(g1(plugin({ types: ["prompt"], agentTargets: ["codex"] })));
  assert.ok(hits[0].message.includes(CODEX_HANDLER_SENTENCE), "the vendor's own words must appear");
  assert.match(hits[0].message, /cx-hook-handler-support/);
  assert.match(hits[0].message, /learn\.chatgpt\.com/);
});

// ---------------------------------------------------------------------------------------------
// The passing cases. A check demonstrated only on its failing input has been shown to say no, not to
// DISCRIMINATE - and this one has three distinct ways to be wrong in the quiet direction.
// ---------------------------------------------------------------------------------------------

test("RS-C2: a Claude-only plugin is NOT reported, however many prompt hooks it ships", () => {
  // The whole point of the agent-targets gate. `prompt` is perfectly valid on Claude; firing here
  // would be a false accusation against a correct plugin, and would fire on most of the ecosystem.
  const out = g1(plugin({ types: ["prompt", "agent"], agentTargets: ["claude"] }));
  assert.equal(codexFindings(out).length, 0);
});

test("RS-C2: a plugin declaring no agent-targets at all is NOT reported", () => {
  assert.equal(codexFindings(g1(plugin({ types: ["prompt"], agentTargets: null }))).length, 0);
});

test("RS-C2: command and mcp_tool never fire, on any target", () => {
  // These are the two Codex actually executes. If this ever fires, the support table has been inverted.
  for (const targets of [["codex"], ["claude", "codex"], ["claude"]]) {
    const out = g1(plugin({ types: ["command", "mcp_tool"], agentTargets: targets }));
    assert.equal(codexFindings(out).length, 0, `fired for targets ${targets.join("+")}`);
  }
});

test("RS-C2: an emitted Codex manifest is sufficient even without the declaration", () => {
  // The artifact is as good a signal as the declaration - a plugin that has already emitted a Codex
  // manifest ships to Codex whatever library.json currently says.
  const out = g1(plugin({ types: ["prompt"], agentTargets: ["claude"], codexManifest: true }));
  assert.equal(codexFindings(out).length, 1);
});

test("RS-C2: an invalid type is reported ONCE, as invalid, not twice", () => {
  // Ordering matters: the unsupported branch sits after the invalid branch deliberately, so a garbage
  // type is one defect rather than two findings about the same string.
  const out = g1(plugin({ types: ["webhook"], agentTargets: ["codex"] }));
  assert.equal(codexFindings(out).length, 0);
  assert.equal(out.filter((f) => /invalid "type"/.test(f.message)).length, 1);
});

// ---------------------------------------------------------------------------------------------
// The migration contract, and the blast radius.
// ---------------------------------------------------------------------------------------------

test("RS-C2: the finding carries a tightening cap, and G1's own since is NOT bumped", () => {
  // Raising meta.since to 0.16 would cap every OTHER G1 finding for plugins pinned below 0.16 -
  // undocumented hooks would quietly stop being errors. The cap must be finding-level only.
  const hits = codexFindings(g1(plugin({ types: ["prompt"], agentTargets: ["codex"] })));
  assert.equal(hits[0].migration?.capAt, "warn");
  assert.equal(hits[0].migration?.until, "0.17");

  const src = readFileSync(path.join(REPO, "scripts/checks/hook-documentation.mjs"), "utf8");
  assert.match(src, /reqId: "G1", since: "0\.x"/, "G1's meta.since must stay at its original value");
});

test("RS-C2: the cap reason is activation-neutral", () => {
  // Under --strict nothing binds and the finding is a live error while this static text is visible in
  // --json, so a reason asserting a cap is currently in force would be false on screen.
  const hits = codexFindings(g1(plugin({ types: ["prompt"], agentTargets: ["codex"] })));
  assert.doesNotMatch(hits[0].migration.reason, /\b(is|currently|now) capped\b/i);
  assert.match(hits[0].migration.reason, /0\.16/);
});

test("RS-C2: this repository ships no hook Codex would skip", () => {
  // Blast radius on the subject closest to hand, measured rather than assumed. askit targets codex, so
  // if it shipped a prompt- or agent-type hook this check would newly fire on its own tree.
  const hooksPath = path.join(REPO, "hooks", "hooks.json");
  let data = null;
  try {
    data = JSON.parse(readFileSync(hooksPath, "utf8"));
  } catch {
    data = null; // no hooks file is a pass: nothing to skip
  }
  const skipped = [];
  for (const entries of Object.values(data?.hooks ?? {})) {
    for (const entry of Array.isArray(entries) ? entries : []) {
      for (const leaf of entry?.hooks ?? []) {
        if (codexSkipsHandler(leaf?.type)) skipped.push(leaf.type);
      }
    }
  }
  assert.deepEqual(skipped, [], `this repo ships hook types Codex skips: ${skipped.join(", ")}`);
});

test("RS-C2: the support table partitions the Claude vocabulary without overlap", () => {
  const { supported, skipped } = CODEX_HANDLER_SUPPORT;
  assert.deepEqual(supported.filter((t) => skipped.includes(t)), [], "a type cannot be both");
  assert.ok(supported.every((t) => !codexSkipsHandler(t)));
  assert.ok(skipped.every((t) => codexSkipsHandler(t)));
});

test("RS-C2: targetsCodex reads both the declaration and the artifact", () => {
  assert.equal(targetsCodex({ library: { data: { "agent-targets": ["codex"] } } }), true);
  assert.equal(targetsCodex({ library: { data: { "agent-targets": ["claude"] } } }), false);
  assert.equal(targetsCodex({ library: { data: {} }, codexManifest: { name: "x" } }), true);
  assert.equal(targetsCodex({}), false, "an empty context must not be read as targeting Codex");
});
