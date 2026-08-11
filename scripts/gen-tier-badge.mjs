// what-it-is:   the tier badge generator
// what-it-does: computes the tier a plugin earns right now (via tier-report.mjs's computeTierReport,
//               the same data check.mjs already grades against), then serializes it plus the graded
//               commit sha, the plugin's pinned Standard, and today's date into a shields.io
//               "endpoint badge" JSON document (https://shields.io/badges/endpoint-badge)
// why:          a hand-maintained README badge goes stale the moment the tier changes and nobody
//               remembers to edit it - this repository's own README badge did exactly that, twice,
//               across two releases (v1.10.0's index-drift migration and its remediation). A badge
//               COMPUTED IN CI AT A KNOWN SHA cannot go stale the same way: it is regenerated every
//               time the graded sha changes, and the payload names the sha and date it was computed
//               at so a reader can tell whether it is current rather than trusting it blindly
// used-by:      .github/workflows/deploy-pages.yml (writes the JSON into the published Pages site so
//               README's tier badge can point `https://img.shields.io/endpoint?url=...` at it)
import { spawnSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { computeTierReport } from "./tier-report.mjs";
import { loadPlugin } from "./lib/load-plugin.mjs";
import { TIER_NAME, TIER_SUB } from "./lib/tier.mjs";
import { normalizeArgPath } from "./lib/fs-utils.mjs";

/** Badge color per earned tier, matching the Bronze/Silver/Gold palette already established in
 *  README's tier-ladder mermaid diagram (bronze #a97142, silver #7c8a93, gold #caa12a). "none" (no
 *  tier satisfied, or nothing declared) reads as red - a claim this generator refuses to soften. */
export const TIER_COLOR = { universal: "a97142", convergent: "7c8a93", advanced: "caa12a", none: "e05d44" };

/**
 * Pure serialization: takes the ALREADY-COMPUTED earned tier plus three facts the caller supplies
 * (sha, Standard pin, date) and returns a shields.io endpoint-badge object. This function does not
 * call computeTierReport itself and makes no grading decision of its own - the governing invariant
 * of v1.11.0 ("every output added in this release is a pure serialization of data the gate already
 * computes") - so a test can pin every input and assert the exact payload.
 *
 * Fields beyond schemaVersion/label/message/color are extraneous to the shields.io contract (safely
 * ignored by its renderer) but let a consumer reading the JSON directly, without going through
 * shields.io, tell what was graded and when without parsing the message string.
 */
export function buildBadgePayload({ tier, standard, sha, gradedAt }) {
  const name = TIER_NAME[tier] ?? "None";
  const sub = TIER_SUB[tier] ?? "none";
  const standardText = standard ? `Standard ${standard}` : "no Standard pin";
  return {
    schemaVersion: 1,
    label: "tier",
    message: `${sub} (${name}) @ ${sha} - ${standardText} - ${gradedAt}`,
    color: TIER_COLOR[tier] ?? TIER_COLOR.none,
    tier,
    sha,
    standard: standard ?? null,
    gradedAt,
  };
}

/**
 * The short (7-char) commit sha the badge is graded at. Prefers `GITHUB_SHA` (the exact commit the
 * workflow checked out - authoritative, and needs no subprocess), falling back to
 * `git rev-parse --short=7 HEAD` for a local run outside CI, and the literal string "unknown" when
 * neither is available (e.g. a shallow tree with no `.git`). Never throws: a badge generator that
 * crashes because it cannot determine a sha is a worse failure than one that honestly says so.
 */
export function resolveGradedSha(root, env = process.env) {
  if (env.GITHUB_SHA) return String(env.GITHUB_SHA).slice(0, 7);
  const r = spawnSync("git", ["rev-parse", "--short=7", "HEAD"], { cwd: root, encoding: "utf8" });
  if (r.status === 0 && r.stdout && r.stdout.trim()) return r.stdout.trim();
  return "unknown";
}

/** Parse the CLI: the first non-flag token is the root; `--out <path>` (or `--out=<path>`) writes the
 *  payload to a file instead of stdout. Root is normalized through normalizeArgPath, the same
 *  Windows-backslash guard every other CLI entry point in this repo applies. */
export function parseArgs(argv) {
  let root, out;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--out") out = argv[++i];
    else if (a.startsWith("--out=")) out = a.slice("--out=".length);
    else if (!a.startsWith("--") && root === undefined) root = normalizeArgPath(a);
  }
  return { root: root ?? process.cwd(), out };
}

if (process.argv[1]?.endsWith("gen-tier-badge.mjs")) {
  const { root, out } = parseArgs(process.argv.slice(2));
  const ctx = loadPlugin(root);
  const report = computeTierReport(root, ctx);
  const sha = resolveGradedSha(root);
  const gradedAt = new Date().toISOString().slice(0, 10);
  const payload = buildBadgePayload({ tier: report.tier, standard: ctx.library?.data?.standard ?? null, sha, gradedAt });
  const json = JSON.stringify(payload, null, 2);
  if (out) {
    const resolved = path.resolve(out);
    // The output's parent directory is not assumed to exist (deploy-pages.yml writes into
    // site/dist/badges/, a subdirectory `astro build` never creates on its own), so it is created
    // here the same way this repository's other generators (gen-index.mjs, gen-manifest.mjs) do.
    mkdirSync(path.dirname(resolved), { recursive: true });
    writeFileSync(resolved, json + "\n", "utf8");
    console.log(`gen-tier-badge: wrote ${out} (tier ${report.tier} @ ${sha})`);
  } else {
    console.log(json);
  }
}
