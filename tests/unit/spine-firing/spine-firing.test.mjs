// what-it-is:   RS-B2's registry-driven meta-test for the check spine
// what-it-does: (1) asserts the union of the three band maps' reqIds equals scripts/lib/registry.mjs's
//               REQ_IDS exactly - no missing, no unknown, no duplicate - so a check added to or removed
//               from the registry without a matching firing case fails CI rather than going silent; (2)
//               replays every mapped case against ONLY that case's own check, built the same way
//               scripts/check.mjs builds ctx (loadPlugin(root), or an inline/temp-tree ctx a case
//               supplies itself), and asserts at least one finding with the expected reqId and severity
// why:          a check with no test that actually makes it FIRE can regress to a no-op and nothing in
//               the suite notices (docs/internal/roadmap.md "## RS-B2", audit F-035: U5's threshold once
//               moved 0.7 -> 0.1 and broke no test). The registry is read, never a pinned count, so the
//               coverage test tracks the real spine as checks are added or removed.
// used-by:      `npm test` via `node --test`; a single band can be run alone with
//               `node --test --test-name-pattern=convergent tests/unit/spine-firing/spine-firing.test.mjs`
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CHECKS, REQ_IDS } from "../../../scripts/lib/registry.mjs";
import { loadPlugin } from "../../../scripts/lib/load-plugin.mjs";
import { cases as universalCases } from "./universal.map.mjs";
import { cases as convergentCases } from "./convergent.map.mjs";
import { cases as advancedCases } from "./advanced.map.mjs";

/**
 * The shape every band map (universal.map.mjs, convergent.map.mjs, advanced.map.mjs) exports an array
 * of. One case per reqId: the runner asserts the union of all three maps' reqIds equals REQ_IDS
 * exactly, so each reqId needs exactly one case, in whichever one map matches its band.
 *
 * @typedef {Object} FiringCase
 * @property {string} reqId - the Standard requirement this case proves fires, e.g. "U7", "S6", "G8".
 *   Must match exactly one check's `meta.reqId` in scripts/lib/registry.mjs's CHECKS.
 * @property {string | (() => object)} fixture - either a path to a plugin directory, relative to
 *   tests/fixtures/ (e.g. "anti/missing-codex-manifest"), loaded through loadPlugin() exactly the way
 *   scripts/check.mjs builds ctx; or a zero-arg function returning a ready-made ctx object directly,
 *   for a check whose firing case needs a hand-built ctx rather than a fixture directory (the "inline
 *   ctx" pattern already used by many of this repo's per-check unit tests).
 * @property {(() => (string | (() => object)))} [setup] - optional. When present, called INSTEAD of
 *   using `fixture`, and must return something shaped like `fixture` (a tests/fixtures-relative path,
 *   or a zero-arg ctx-returning function). Use this only when a check genuinely needs a temp tree built
 *   fresh per run (e.g. a check that mutates or walks a filesystem path outside tests/fixtures/); the
 *   case creates that tree inside `setup` and removes it in `teardown`.
 * @property {(ctx: object) => void} [teardown] - optional. Called with the built ctx after the case's
 *   assertion, pass or fail, so a `setup` that made a temp tree can remove it.
 * @property {Object} expect - what the fired finding must look like.
 * @property {"error"|"warn"} expect.severity - the finding's required severity.
 * @property {RegExp} [expect.message] - when present, the finding's message must match this pattern,
 *   pinning the specific behaviour proven rather than just "something fired".
 */

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../fixtures");

const BANDS = [
  { name: "universal", cases: universalCases },
  { name: "convergent", cases: convergentCases },
  { name: "advanced", cases: advancedCases },
];

/**
 * Resolve a case's `fixture` (or the path/function its `setup` returns) into a ctx object. Unwraps any
 * chain of zero-arg functions (a `setup` that itself returns a function, a `fixture` function, ...)
 * down to either a tests/fixtures-relative string path (loaded through loadPlugin, same as
 * scripts/check.mjs) or a ready-made ctx object.
 */
function buildCtx(spec) {
  let value = spec;
  while (typeof value === "function") value = value();
  if (typeof value === "string") return loadPlugin(path.join(FIXTURES, value));
  if (value && typeof value === "object") return value;
  throw new TypeError(`fixture/setup must resolve to a tests/fixtures-relative path or a ctx object, got ${typeof value}`);
}

function checkFor(reqId) {
  return CHECKS.find((m) => m.meta.reqId === reqId);
}

test("coverage: every spine reqId has exactly one firing case", () => {
  // Not vacuous: a REQ_IDS of size 0 (a broken import, an emptied registry) would make the set-equality
  // below pass trivially on three empty maps. Both must hold for the rest of this test to mean anything.
  assert.ok(REQ_IDS.size > 0, "scripts/lib/registry.mjs's REQ_IDS must be non-empty - the registry failed to load real checks");
  for (const band of BANDS) {
    assert.ok(Array.isArray(band.cases), `${band.name}.map.mjs must export an array named "cases"`);
  }

  const allCases = BANDS.flatMap((b) => b.cases);
  const seen = new Map(); // reqId -> count
  for (const c of allCases) seen.set(c.reqId, (seen.get(c.reqId) ?? 0) + 1);

  const mapped = new Set(seen.keys());
  const missing = [...REQ_IDS].filter((id) => !mapped.has(id)).sort();
  const unknown = [...mapped].filter((id) => !REQ_IDS.has(id)).sort();
  const duplicated = [...seen.entries()].filter(([, n]) => n > 1).map(([id]) => id).sort();

  assert.deepEqual(missing, [], `reqId(s) in the registry with no firing case: ${missing.join(", ")}`);
  assert.deepEqual(unknown, [], `reqId(s) in a band map that the registry does not recognise: ${unknown.join(", ")}`);
  assert.deepEqual(duplicated, [], `reqId(s) with more than one firing case across the band maps: ${duplicated.join(", ")}`);
});

for (const band of BANDS) {
  describe(band.name, () => {
    for (const c of band.cases) {
      test(c.reqId, () => {
        const mod = checkFor(c.reqId);
        assert.ok(mod, `${c.reqId} is not a registered check in scripts/lib/registry.mjs`);
        const ctx = buildCtx(c.setup ?? c.fixture);
        try {
          const findings = mod.check(ctx);
          const hit = findings.find(
            (f) => f.reqId === c.reqId && f.severity === c.expect.severity && (!c.expect.message || c.expect.message.test(f.message))
          );
          assert.ok(
            hit,
            `${c.reqId} (${mod.meta.id}) did not fire a ${c.expect.severity} finding` +
              (c.expect.message ? ` matching ${c.expect.message}` : "") +
              ` for fixture ${typeof c.fixture === "string" ? c.fixture : "<inline>"}. Got: ${JSON.stringify(findings.map((f) => ({ reqId: f.reqId, severity: f.severity, message: f.message })))}`
          );
        } finally {
          c.teardown?.(ctx);
        }
      });
    }
  });
}
