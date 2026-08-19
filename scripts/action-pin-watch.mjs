#!/usr/bin/env node
// what-it-is:   the action-pin watch CLI (E45, ADR 0053)
// what-it-does: reads every workflow file plus action.yml, resolves each pinned action against the GitHub
//               registry, and hands both to the deterministic checker; prints the report and exits 0/1/2
// why:          the machine-readable half of a SHA pin and the human-readable half drift apart on every
//               Dependabot bump, and only the human-readable half is read. See scripts/lib/action-pin-watch.mjs
// used-by:      package.json (`npm run action-pin-watch`), scripts/release-ready.mjs; covered by
//               tests/unit/action-pin-watch.test.mjs
//
// WRITE-INCAPABLE BY CONSTRUCTION, and a test enforces it: only `readFileSync`, `readdirSync` and
// `existsSync` are imported from `node:fs`, `node:child_process` is never imported, and everything goes to
// stdout. This watch REPORTS a disagreement; a human decides whether the comment or the pin is the thing
// that is wrong. That is not a stylistic choice - a watcher that "fixed" a label by rewriting it could just
// as easily paper over a SHA that was moved to the wrong place.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parsePins, buildReport, exitCodeFor, renderReport } from "./lib/action-pin-watch.mjs";

const API = "https://api.github.com";

/** How many pages of 100 tags to walk looking for a pinned commit. Bounded, or a busy action is a rate
 *  limit waiting to happen. When the cap is reached without finding a sha, the report says so explicitly
 *  rather than claiming the registry does not report the tag. */
export const TAG_PAGE_CAP = 6;

/**
 * Workflow YAML plus the published composite action, which pins actions of its own.
 *
 * THROWS on a root that does not exist. The first version swallowed every exception from both reads, so a
 * typo'd or unreadable path produced `0 pins, exit 0` - a clean bill of health for a tree nothing had
 * looked at. A missing `.github/workflows` or a missing `action.yml` is genuinely fine (a plugin need not
 * ship CI); a missing ROOT is not, and the two are now distinguished instead of collapsed.
 */
export function pinSourceFiles(root) {
  if (!existsSync(root)) throw new Error(`root does not exist: ${root}`);
  const files = [];
  const wfDir = path.join(root, ".github", "workflows");
  if (existsSync(wfDir)) {
    for (const name of readdirSync(wfDir)) {
      if (name.endsWith(".yml") || name.endsWith(".yaml")) files.push(path.join(wfDir, name));
    }
  }
  const action = path.join(root, "action.yml");
  if (existsSync(action)) files.push(action);
  return files.sort();
}

/**
 * Resolve one action: EVERY tag name pointing at each pinned sha, and the action's current release.
 *
 * `resolvedBySha` maps a sha to an ARRAY of tag names, not one name. A single commit routinely carries
 * more than one tag - measured live, `softprops/action-gh-release` carries `v3.0.2` and `v3` on the same
 * commit - and taking the first name the registry happened to list turned a correct label into a
 * release-blocking false finding on response ordering nobody controls.
 *
 * A token is used when the environment offers one. Unauthenticated GitHub allows 60 requests an hour per
 * IP, which is enough locally and not enough in CI, and **a rate limit is not a verdict** - it surfaces as
 * an error string, becomes UNRESOLVED, and exits 2. On 2026-08-17 a CodeQL run "failed" purely on codeload
 * 429s during a GitHub partial outage and passed on retry.
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

  const out = { resolvedBySha: {}, latestVersion: null, error: null, pagesExhausted: false };
  try {
    // Current release first: one call, and it answers the currency half for every pin of this action.
    try {
      const rel = await get(`${API}/repos/${action}/releases/latest`);
      out.latestVersion = typeof rel?.tag_name === "string" ? rel.tag_name : null;
    } catch (err) {
      // A repository with no GitHub "release" still has tags. Not fatal on its own, and for a tag-ref pin
      // it changes no verdict - it only means currency is reported as NOT CHECKED.
      out.latestVersion = null;
      if (!wantedShas.size) out.error = `releases/latest: ${err.message}`;
    }

    if (wantedShas.size) {
      const wanted = new Set([...wantedShas].map((s) => s.toLowerCase()));
      const found = new Map();
      let page = 1;
      for (; page <= TAG_PAGE_CAP; page++) {
        const tags = await get(`${API}/repos/${action}/tags?per_page=100&page=${page}`);
        if (!Array.isArray(tags) || tags.length === 0) break;
        for (const t of tags) {
          const sha = typeof t?.commit?.sha === "string" ? t.commit.sha.toLowerCase() : null;
          if (sha && wanted.has(sha)) {
            if (!found.has(sha)) found.set(sha, []);
            found.get(sha).push(t.name);
          }
        }
        // Stop early only when every wanted sha has been seen; a sha may carry several tags on one page.
        if ([...wanted].every((s) => found.has(s))) break;
      }
      out.pagesExhausted = page > TAG_PAGE_CAP && ![...wanted].every((s) => found.has(s));
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
    const key = pin.refKind === "sha" ? pin.ref.toLowerCase() : null;
    return {
      // A sha that was never found because the page cap was reached is reported as such, rather than as
      // "the registry does not report this tag" - which would be a false statement about the registry.
      error:
        r.error ??
        (key && r.pagesExhausted && !(r.resolvedBySha ?? {})[key]
          ? `searched ${TAG_PAGE_CAP} pages of tags without reaching this commit; raise the page cap or resolve it by hand`
          : null),
      latestVersion: r.latestVersion ?? null,
      resolvedVersions: key ? ((r.resolvedBySha ?? {})[key] ?? []) : [],
    };
  };

  const report = buildReport(pins, resolveFor);
  const exit = exitCodeFor(report);
  process.stdout.write(json ? `${JSON.stringify({ ...report, exit }, null, 2)}\n` : `${renderReport(report)}\n`);
  process.exit(exit);
}

// The path comparison alone is NOT sufficient, and assuming it was is review finding F1. Node's loader
// canonicalises `import.meta.url` through symlinks, while `argv[1]` stays exactly the string that was
// typed, so through a junction or a symlinked checkout the two never matched: `main()` did not run, the
// process printed nothing and exited 0, and `release-ready` recorded `ok action-pins (exit 0)` over zero
// pins. A watch that never ran is indistinguishable from one that found nothing wrong, which is the exact
// failure this repository grades other libraries on. The suffix fallback is the form both siblings already
// use - `scripts/release-ready.mjs` and `scripts/vendor-watch.mjs` - and it cannot fire for the test file
// (`...action-pin-watch.test.mjs` does not end with `action-pin-watch.mjs`) nor for the deterministic half,
// which never loads this module when it is run directly.
const invokedDirectly =
  Boolean(process.argv[1]) &&
  (fileURLToPath(import.meta.url) === path.resolve(process.argv[1]) ||
    process.argv[1].endsWith("action-pin-watch.mjs"));

if (invokedDirectly) {
  main().catch((err) => {
    // A refusal, not a crash and never a pass: the run proved nothing about any pin.
    process.stdout.write(`action-pin-watch REFUSED: ${err.message}\n`);
    process.exit(2);
  });
}
