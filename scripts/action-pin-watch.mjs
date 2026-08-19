#!/usr/bin/env node
// what-it-is:   the action-pin watch CLI (E45, ADR 0053)
// what-it-does: reads every workflow file plus action.yml, resolves each pinned action against the GitHub
//               registry, and hands both to the deterministic checker; prints the report and exits 0/1/2
// why:          the machine-readable half of a SHA pin and the human-readable half drift apart on every
//               Dependabot bump, and only the human-readable half is read. See scripts/lib/action-pin-watch.mjs
// used-by:      package.json (`npm run action-pin-watch`), scripts/release-ready.mjs, the monthly
//               .github/workflows/vendor-watch.yml job; covered by tests/unit/action-pin-watch.test.mjs
//
// WRITE-INCAPABLE BY CONSTRUCTION, and a test enforces it: only `readFileSync` and `readdirSync` are
// imported from `node:fs`, `node:child_process` is never imported, and everything goes to stdout. This
// watch REPORTS a disagreement; a human decides whether the comment or the pin is the thing that is wrong.
// That is not a stylistic choice - a watcher that "fixed" a label by rewriting it could just as easily
// paper over a SHA that was moved to the wrong place.
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parsePins, buildReport, exitCodeFor, renderReport } from "./lib/action-pin-watch.mjs";

const API = "https://api.github.com";

/** Workflow YAML plus the published composite action, which pins actions of its own. */
export function pinSourceFiles(root) {
  const wfDir = path.join(root, ".github", "workflows");
  const files = [];
  try {
    for (const name of readdirSync(wfDir)) {
      if (name.endsWith(".yml") || name.endsWith(".yaml")) files.push(path.join(wfDir, name));
    }
  } catch {
    /* no workflows directory is not an error; a plugin need not ship CI */
  }
  const action = path.join(root, "action.yml");
  try {
    readFileSync(action, "utf8");
    files.push(action);
  } catch {
    /* no published action */
  }
  return files.sort();
}

/**
 * Resolve one action: what its tags say the pinned SHAs are, and what its current release is.
 *
 * A token is used when the environment offers one. Unauthenticated GitHub allows 60 requests an hour per
 * IP, which is enough locally and not enough in CI, and **a rate limit is not a verdict** - it surfaces as
 * an error string, becomes UNRESOLVED, and exits 2. That is the correct outcome: on 2026-08-17 a CodeQL run
 * "failed" purely on codeload 429s during a GitHub partial outage and passed on retry.
 */
async function resolveAction(action, wantedShas) {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
  const headers = {
    accept: "application/vnd.github+json",
    "user-agent": "agent-skills-toolkit-action-pin-watch",
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  };
  const get = async (url) => {
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
  };

  const out = { resolvedVersion: null, latestVersion: null, error: null };
  try {
    // Current release first: it is one call and it answers the currency half for every pin of this action.
    try {
      const rel = await get(`${API}/repos/${action}/releases/latest`);
      out.latestVersion = typeof rel?.tag_name === "string" ? rel.tag_name : null;
    } catch (err) {
      // A repository with no GitHub "release" still has tags. Not fatal on its own.
      out.latestVersion = null;
      if (!wantedShas.size) out.error = `releases/latest: ${err.message}`;
    }

    if (wantedShas.size) {
      // Walk tag pages until every wanted SHA is found or the tags run out. Bounded, because an unbounded
      // walk over a busy action is a rate limit waiting to happen.
      const found = new Map();
      for (let page = 1; page <= 4 && found.size < wantedShas.size; page++) {
        const tags = await get(`${API}/repos/${action}/tags?per_page=100&page=${page}`);
        if (!Array.isArray(tags) || tags.length === 0) break;
        for (const t of tags) {
          const sha = t?.commit?.sha;
          if (sha && wantedShas.has(sha) && !found.has(sha)) found.set(sha, t.name);
        }
      }
      out.resolvedBySha = Object.fromEntries(found);
    }
  } catch (err) {
    out.error = err.message;
  }
  return out;
}

async function main() {
  const argv = process.argv.slice(2);
  const json = argv.includes("--json");
  const root = argv.find((a) => !a.startsWith("--")) ?? process.cwd();

  const files = pinSourceFiles(root);
  const pins = files.flatMap((f) => parsePins(readFileSync(f, "utf8"), path.relative(root, f).replace(/\\/g, "/")));

  // One lookup per distinct action, carrying every SHA that action is pinned at.
  const shasByAction = new Map();
  for (const p of pins) {
    if (!shasByAction.has(p.action)) shasByAction.set(p.action, new Set());
    if (p.refKind === "sha") shasByAction.get(p.action).add(p.ref);
  }
  const resolutionsByAction = {};
  for (const [action, shas] of shasByAction) {
    resolutionsByAction[action] = await resolveAction(action, shas);
  }

  // The seam: currency is per ACTION, a SHA resolves per REF. One function expresses both, so the
  // deterministic half never learns how the lookups were batched.
  const resolveFor = (pin) => {
    const r = resolutionsByAction[pin.action] ?? { error: "no lookup was performed for this action" };
    return {
      error: r.error ?? null,
      latestVersion: r.latestVersion ?? null,
      resolvedVersion: pin.refKind === "sha" ? (r.resolvedBySha?.[pin.ref] ?? null) : null,
    };
  };

  const report = buildReport(pins, resolveFor);
  const exit = exitCodeFor(report);
  process.stdout.write(json ? `${JSON.stringify({ ...report, exit }, null, 2)}\n` : `${renderReport(report)}\n`);
  process.exit(exit);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((err) => {
    process.stdout.write(`action-pin-watch REFUSED: ${err.message}\n`);
    process.exit(2);
  });
}
