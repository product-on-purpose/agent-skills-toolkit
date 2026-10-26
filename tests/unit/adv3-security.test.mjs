import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { check, meta, loadCatalogue, listScanTargets } from "../../scripts/advisory/adv3-security.mjs";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { runGate } from "../../scripts/check.mjs";

// RS-E4 / ADV3 (ADR 0063). This file carries the three acceptance criteria verbatim from
// docs/internal/roadmap.md's RS-E4 heading, reused unchanged by the ADR: (1) seeded-malicious fixtures,
// one per pattern class, each fire, with the false-positive rate measured as a number against a
// pre-registered ceiling (scripts/advisory/README.md); (2) proven able to fail - a pattern removed from
// the catalogue stops its own seeded fixture firing, for EVERY pattern; (3) the documentation-discusses-
// the-attack case is a committed negative fixture, shown failing under a scope-widening mutant.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const FIXTURES = path.join(ROOT, "tests/fixtures/advisory");

const CLASS_DIR = {
  "pipe-to-shell": "adv3-pipe-to-shell",
  "dangerous-command": "adv3-dangerous-command",
  "prompt-injection": "adv3-prompt-injection",
};

const ctxCache = new Map();
function ctxFor(dirName) {
  if (!ctxCache.has(dirName)) ctxCache.set(dirName, loadPlugin(path.join(FIXTURES, dirName)));
  return ctxCache.get(dirName);
}

// --- meta / catalogue schema ---

test("meta declares advisoryId ADV3, never a reqId", () => {
  assert.equal(meta.advisoryId, "ADV3");
  assert.equal(meta.reqId, undefined, "a module never self-reports a reqId; advisory-registry.mjs stamps reqId: null itself");
});

test("catalogue schema: every pattern has a unique id, an allowed class, a non-empty cited source and known-limits note, and a non-stateful matcher", () => {
  const cat = loadCatalogue();
  assert.ok(Array.isArray(cat.patterns) && cat.patterns.length > 0);
  const ids = new Set();
  const allowedClasses = new Set(cat.classes);
  assert.deepEqual([...allowedClasses].sort(), ["dangerous-command", "pipe-to-shell", "prompt-injection"].sort());
  for (const p of cat.patterns) {
    assert.ok(p.id && typeof p.id === "string", "pattern must carry a string id");
    assert.ok(!ids.has(p.id), `duplicate pattern id ${p.id}`);
    ids.add(p.id);
    assert.ok(allowedClasses.has(p.class), `pattern ${p.id} declares an unlisted class "${p.class}"`);
    assert.ok(typeof p.source === "string" && p.source.trim().length > 20, `pattern ${p.id} must cite a real source`);
    assert.ok(typeof p.knownLimits === "string" && p.knownLimits.trim().length > 20, `pattern ${p.id} must carry a known-limits note`);
    assert.ok(p.matcher && typeof p.matcher.source === "string" && p.matcher.source.length > 0);
    const flags = p.matcher.flags ?? "";
    assert.ok(!flags.includes("g") && !flags.includes("y"), `pattern ${p.id} must not use a stateful regex flag`);
    assert.doesNotThrow(() => new RegExp(p.matcher.source, flags), `pattern ${p.id}'s matcher must compile`);
  }
  // Every class named in the catalogue has at least one pattern - an empty class would be undetectable.
  for (const cls of allowedClasses) {
    assert.ok(cat.patterns.some((p) => p.class === cls), `class "${cls}" has no pattern`);
  }
});

// Pinned, so that deleting a pattern from the catalogue (rather than just removing it for a single
// mutation-test run) fails this file directly instead of only shrinking a finding count that criterion
// 1/2's own loops happily iterate over whatever is left. A review of P2's first round found that
// deleting pipe-to-shell-curl-sudo and prompt-injection-role-hijack from the real catalogue made no
// criterion-1/2 assertion fail - only an incidental stale-entry check in the timing section caught it.
const EXPECTED_PATTERN_IDS = [
  "pipe-to-shell-curl",
  "pipe-to-shell-wget",
  "pipe-to-shell-curl-sudo",
  "pipe-to-shell-bash-process-substitution",
  "pipe-to-shell-sh-process-substitution",
  "dangerous-command-rm-recursive-force",
  "dangerous-command-rm-rf-root-or-home",
  "dangerous-command-chmod-777",
  "dangerous-command-chmod-666",
  "dangerous-command-mkfs",
  "dangerous-command-dd-to-device",
  "dangerous-command-curl-download-execute",
  "dangerous-command-wget-download-execute",
  "prompt-injection-ignore-prior-instructions",
  "prompt-injection-disregard-prior-instructions",
  "prompt-injection-role-hijack",
  "prompt-injection-forget-constraints",
  "prompt-injection-do-not-follow-prior",
];

test("catalogue pattern-id set is pinned: adding or removing a pattern must update this list deliberately", () => {
  const cat = loadCatalogue();
  const actual = cat.patterns.map((p) => p.id).sort();
  assert.deepEqual(actual, [...EXPECTED_PATTERN_IDS].sort());
});

// --- criterion 1: one seeded-malicious fixture per pattern class, each fires ---

for (const [cls, dirName] of Object.entries(CLASS_DIR)) {
  test(`criterion 1: the ${cls} seeded fixture fires (at least one ADV3 finding)`, () => {
    const ctx = ctxFor(dirName);
    const findings = check(ctx);
    assert.ok(findings.length > 0, `${dirName} must produce at least one finding`);
    for (const f of findings) {
      assert.equal(f.severity, "warn");
      assert.match(f.message, /screen, not a safety review/);
    }
  });

  test(`criterion 1: every ${cls} pattern's own seed fires in the ${dirName} fixture`, () => {
    const ctx = ctxFor(dirName);
    const findings = check(ctx);
    const keys = new Set(findings.map((f) => f.key));
    const cat = loadCatalogue();
    for (const p of cat.patterns.filter((p) => p.class === cls)) {
      assert.ok(keys.has(p.id), `pattern ${p.id} (class ${cls}) never fires in ${dirName} - it has no seed`);
    }
  });
}

// --- criterion 2: proven able to fail - for EVERY pattern, removing it stops ITS OWN seed firing ---

test("criterion 2: for every pattern, removing it from the catalogue stops its own seeded fixture firing, and shrinks the total finding count", () => {
  const cat = loadCatalogue();
  for (const pattern of cat.patterns) {
    const dirName = CLASS_DIR[pattern.class];
    const ctx = ctxFor(dirName);

    const withPattern = check(ctx, { catalogue: cat });
    assert.ok(
      withPattern.some((f) => f.key === pattern.id),
      `pattern ${pattern.id} must fire in ${dirName} with the full catalogue (otherwise this test checks nothing for it)`
    );

    const withoutCatalogue = { ...cat, patterns: cat.patterns.filter((p) => p.id !== pattern.id) };
    const withoutPattern = check(ctx, { catalogue: withoutCatalogue });
    assert.ok(
      !withoutPattern.some((f) => f.key === pattern.id),
      `pattern ${pattern.id} still fires after being removed from the catalogue - it is not load-bearing`
    );
    assert.ok(
      withoutPattern.length < withPattern.length,
      `removing pattern ${pattern.id} must shrink the total finding count on ${dirName} (proves the removed pattern, not some other pattern on the same line, accounted for the seed)`
    );
  }
});

// --- criterion 3: the documentation-discusses-the-attack case is a committed negative fixture,
// shown failing under a scope-widening mutant ---

test("criterion 3: the negative-docs fixture produces zero findings under the real (narrow) scope", () => {
  const ctx = ctxFor("adv3-negative-docs");
  assert.deepEqual(check(ctx), []);
});

test("criterion 3 GUARD CAN FAIL: widening scope to include docs/ makes the SAME fixture fire on the SAME unmutated catalogue", () => {
  const ctx = ctxFor("adv3-negative-docs");
  const widened = check(ctx, { scopeRoots: ["docs"] });
  assert.ok(widened.length > 0, "widening the scan scope to docs/ must surface the quoted construct - proving the clean run above is the SCOPE RULE at work, not a pattern that fails to match");
  assert.ok(widened.some((f) => f.file === "docs/install.md"));
});

// --- scope: listScanTargets covers skills/**, agents/*.md, commands/*.md, hooks/**, and nothing under
// docs/ or a bare README.md by default ---

test("listScanTargets: the default scope never includes docs/ or a root README.md", () => {
  const ctx = ctxFor("adv3-negative-docs");
  const targets = listScanTargets(ctx);
  assert.ok(targets.every((t) => !t.rel.startsWith("docs/")), "docs/ must not be a default scan target");
  assert.ok(!targets.some((t) => t.rel === "README.md"), "a root README.md must not be a default scan target");
});

test("listScanTargets: covers all four scope roots on the pipe-to-shell fixture (skills/**, agents/*.md, commands/*.md)", () => {
  const ctx = ctxFor("adv3-pipe-to-shell");
  const rels = listScanTargets(ctx).map((t) => t.rel);
  assert.ok(rels.some((r) => r.startsWith("skills/installer/") && r.endsWith("SKILL.md")));
  assert.ok(rels.some((r) => r.startsWith("skills/installer/scripts/")), "a bundled file under the skill directory must be scanned, not only SKILL.md");
  assert.ok(rels.some((r) => r.startsWith("agents/")));
  assert.ok(rels.some((r) => r.startsWith("commands/")));
});

test("listScanTargets: covers hooks/** on the dangerous-command fixture", () => {
  const ctx = ctxFor("adv3-dangerous-command");
  const rels = listScanTargets(ctx).map((t) => t.rel);
  assert.ok(rels.some((r) => r.startsWith("hooks/")));
});

// --- ReDoS / timing: every compiled pattern stays linear-time on a PER-PATTERN adversarial line ---
// Style follows resolve-bash.test.mjs's own timing assertions: a generous, documented bound (this is a
// liveness guard against catastrophic backtracking, not a tight performance budget), checked against
// the RAW regex (never the line-capped scan path), so a quadratic pattern cannot hide behind the
// module's own MAX_LINE cap.
//
// Each line is built to actually ENTER the pattern's own backtracking region - a generic line (all
// spaces, or the pattern's own trigger word with no surrounding construct) is NOT enough: an earlier
// draft of this test used "a ".repeat(100000) and a line built from `p.matcher.source.match(/[A-Za-z]
// {2,}/)` (e.g. "brm brm brm..." for \brm, which never satisfies \brm's own word boundary), and BOTH
// passed in well under a millisecond against every pattern while three patterns were still genuinely
// quadratic - the test was measuring nothing. Caught by re-deriving each adversarial line from the
// pattern's own unbounded sub-expression instead of a generic heuristic.
//
// SHOWN FAILING, round 1 (captured once against the as-shipped-in-the-prior-commit catalogue, then the
// three patterns below were bounded and the catalogue re-measured - see scripts/advisory/README.md's
// ADV3 heading, measurement 2):
//   dangerous-command-rm-recursive-force   (unbounded `/\brm\s+(?:.*\s)?-\w*r\w*f/`):            2339ms
//     against "rm -" + "r".repeat(100000)  ->  bounded: 0ms
//   dangerous-command-curl-download-execute (unbounded `/\bcurl\b.*&&\s*(?:chmod\s.*\+x|...)/`): 1312ms
//     against "curl " + " && chmod x".repeat(20000)  ->  bounded: 0ms
//   dangerous-command-wget-download-execute (same shape as curl's): measured identically quadratic
//     before bounding, by construction (the two matchers differ only in the leading command name).
//
// SHOWN FAILING, round 2 (a review of measurement 2 found that its own per-pattern lines above, built
// from a letter run after the trigger word, never entered the backtracking region of four OTHER
// patterns whose unbounded span is `\s+` followed by `.*` or `.*\|` - a run of plain SPACES, not
// letters, is what lets that span be split many ways. Measured directly against the then-current
// catalogue, 2026-10-25, before these four were bounded - see scripts/advisory/README.md's ADV3
// heading, measurement 3):
//   pipe-to-shell-curl       (unbounded `/\bcurl\s+.*\|\s*(?:bash|sh|zsh)\b/`):     2936ms @ 100,004 chars
//   pipe-to-shell-wget       (unbounded `/\bwget\s+.*\|\s*(?:bash|sh|zsh)\b/`):     2920ms @ 100,004 chars
//   pipe-to-shell-curl-sudo  (unbounded `/\bcurl\s+.*\|\s*sudo\s+(?:bash|sh|zsh)\b/`): 2933ms @ 100,004 chars
//   dangerous-command-dd-to-device (unbounded `/\bdd\s+.*of=\/dev\//`):             2790ms @ 100,002 chars
// all four against a "<trigger>" + " ".repeat(100_000) line, all well over the 2000ms bound. A second
// repeated-token shape ("<trigger> ".repeat(20_000)) also measured quadratic on the same four (337-
// 589ms at ~60-100K characters, scaling the same super-linear way). All four were bounded the same way
// as the round-1 fixes (an unbounded `.*`/`\s+.*` span capped at 300 characters) and re-measured at
// 7-37ms against the same lines - see measurement 3.
//
// Every pattern below is therefore checked against ALL THREE generic adversarial shapes (a trailing
// space run, a trailing repeated-token run built from its own trigger word, and a trailing letter run),
// plus a pattern-specific line where one pattern's own unbounded sub-expression needs a particular
// shape to be entered at all (recorded per-id below). A generic shape alone is not enough, and neither
// is a specific shape alone - round 1 and round 2 each slipped past the other's shape.

const GENERIC_SHAPES = (trigger) => [
  `${trigger} ` + " ".repeat(100_000),
  `${trigger} ` + `${trigger} `.repeat(20_000),
  `${trigger} ` + "a".repeat(100_000),
];

// Pattern-specific lines, kept from measurement 2's own per-pattern derivation, for sub-expressions a
// generic trigger-word shape does not reach (the `-rf`/flag-token shape, and the `&&`-chained shape).
const SPECIFIC_LINES = {
  "dangerous-command-rm-recursive-force": ["rm -" + "r".repeat(100_000)],
  "dangerous-command-rm-rf-root-or-home": ["rm -rf " + "a".repeat(100_000)],
  "dangerous-command-curl-download-execute": ["curl " + " && chmod x".repeat(20_000)],
  "dangerous-command-wget-download-execute": ["wget " + " && chmod x".repeat(20_000)],
};

const TRIGGER_WORD = {
  "pipe-to-shell-curl": "curl",
  "pipe-to-shell-wget": "wget",
  "pipe-to-shell-curl-sudo": "curl",
  "pipe-to-shell-bash-process-substitution": "bash",
  "pipe-to-shell-sh-process-substitution": "sh",
  "dangerous-command-rm-recursive-force": "rm",
  "dangerous-command-rm-rf-root-or-home": "rm",
  "dangerous-command-chmod-777": "chmod",
  "dangerous-command-chmod-666": "chmod",
  "dangerous-command-mkfs": "mkfs",
  "dangerous-command-dd-to-device": "dd",
  "dangerous-command-curl-download-execute": "curl",
  "dangerous-command-wget-download-execute": "wget",
  "prompt-injection-ignore-prior-instructions": "ignore",
  "prompt-injection-disregard-prior-instructions": "disregard",
  "prompt-injection-role-hijack": "you are now",
  "prompt-injection-forget-constraints": "forget",
  "prompt-injection-do-not-follow-prior": "do not follow",
};

const ADVERSARIAL_LINES = Object.fromEntries(
  Object.entries(TRIGGER_WORD).map(([id, trigger]) => [id, [...GENERIC_SHAPES(trigger), ...(SPECIFIC_LINES[id] ?? [])]])
);

test("timing: every catalogue pattern has an adversarial-line entry (schema coverage for the timing test itself)", () => {
  const cat = loadCatalogue();
  for (const p of cat.patterns) {
    assert.ok(Object.hasOwn(ADVERSARIAL_LINES, p.id), `pattern ${p.id} has no adversarial-line entry in ADVERSARIAL_LINES - the timing test cannot cover it`);
  }
  for (const id of Object.keys(ADVERSARIAL_LINES)) {
    assert.ok(cat.patterns.some((p) => p.id === id), `ADVERSARIAL_LINES names "${id}", which is not in the catalogue - stale entry`);
  }
});

test("timing: every ADV3 pattern stays well under one second against every one of its adversarial lines", () => {
  const cat = loadCatalogue();
  for (const p of cat.patterns) {
    const re = new RegExp(p.matcher.source, p.matcher.flags ?? "");
    for (const line of ADVERSARIAL_LINES[p.id]) {
    const started = Date.now();
    re.test(line);
    const elapsedMs = Date.now() - started;
    // 2000ms is deliberately large (mirrors resolve-bash.test.mjs's own stated reasoning): the point is
    // to catch catastrophic (here: quadratic-or-worse) backtracking, not to assert a tight budget.
    assert.ok(elapsedMs < 2000, `pattern ${p.id} took ${elapsedMs}ms against an adversarial line (length ${line.length}) - possible catastrophic backtracking`);
    }
  }
});

// --- plain-plugin: ADV3 is objective (vendor-cited-adjacent, never house), so it must still run under
// --profile plain-plugin, unlike ADV4 (house). Registration is conditional on measurement (README), so
// this test exercises the module directly via advisoryModules rather than assuming it is registered. ---

test("plain-plugin: ADV3 runs under --profile plain-plugin (objective provenance is never profile-exempt)", () => {
  const adv3Module = { meta, check };
  const target = path.join(FIXTURES, "adv3-pipe-to-shell");
  const underLibrary = runGate(target, undefined, { advisoryModules: [adv3Module] });
  const underPlain = runGate(target, undefined, { profile: "plain-plugin", advisoryModules: [adv3Module] });
  assert.ok(underLibrary.advisoryFindings.length > 0);
  assert.equal(
    underPlain.advisoryFindings.length,
    underLibrary.advisoryFindings.length,
    "ADV3 (objective provenance) must run identically under plain-plugin; only house-provenance ADV ids are profile-exempt"
  );
});

// --- isolation / shape sanity: findings never carry a reqId or leak into findings[] through this
// module alone (the full partition guarantee is tests/unit/advisory-partition.test.mjs's job; this is
// just "this module's own output shape is the one that test partitions correctly") ---

test("check() output shape: every finding carries severity warn, a file, a line, and a key; never a reqId", () => {
  const ctx = ctxFor("adv3-pipe-to-shell");
  const findings = check(ctx);
  assert.ok(findings.length > 0);
  for (const f of findings) {
    assert.equal(f.severity, "warn");
    assert.ok(typeof f.file === "string" && f.file.length > 0);
    assert.ok(typeof f.line === "number" && f.line > 0);
    assert.ok(typeof f.key === "string" && f.key.length > 0);
    assert.equal(f.reqId, null, "finding() defaults reqId to null; the module never sets one itself");
  }
});

// --- this repository's own count (report-only; this file does not assert a value, since this
// repository's own tree is not a fixture and the count is reported in scripts/advisory/README.md) ---

test("sanity: ADV3 runs over this repository's own tree without throwing", () => {
  const ctx = loadPlugin(ROOT);
  assert.doesNotThrow(() => check(ctx));
});
