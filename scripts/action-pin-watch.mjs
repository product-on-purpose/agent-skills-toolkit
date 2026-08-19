#!/usr/bin/env node
// what-it-is:   the action-pin watch CLI (E45, ADR 0053)
// what-it-does: reads every workflow file plus action.yml, resolves each pinned action against the GitHub
//               registry, and hands both to the deterministic checker; prints the report and exits 0/1/2/3
//               (0 clean, 1 a label defect here, 2 a lookup that could not be performed, 3 pointed at the
//               wrong tree - and 3 is deliberately outside the outage override, see EXIT_MISCONFIGURED)
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
 * How long a single registry request may take, and how many times a transient failure is retried.
 *
 * Review finding F10: nothing bounded either. `fetch` has no default timeout, so one hung connection held
 * the whole gate open with no upper bound; and any single throw from up to 20 sequential calls cascaded to
 * UNRESOLVED - exit 2, a release refusal - for every pin of that action. That is not hypothetical: the
 * comment on `resolveAction` records a run that failed purely on codeload 429s during a GitHub partial
 * outage on 2026-08-17 and passed on retry.
 *
 * **Exactly ONE retry.** More is new failure surface rather than more robustness: it multiplies the
 * rate-limit spend the retry exists to survive, and lengthens the run the timeout exists to bound.
 */
export const FETCH_TIMEOUT_MS = 20_000;
export const FETCH_RETRIES = 1;
export const FETCH_RETRY_DELAY_MS = 750;

/**
 * How long the whole run may spend on the registry before it stops asking and reports what it has.
 *
 * **This exists because bounding each REQUEST does not bound the RUN, and the third review round showed the
 * gap is not academic.** Per action this watch may make 1 releases/latest call plus `TAG_PAGE_CAP` tag
 * pages; at `FETCH_TIMEOUT_MS` times two attempts each, that is about 4.8 minutes per action, and this
 * repository pins 8 distinct actions sequentially - **a 38-minute worst case** against a `GATE_TIMEOUT_MS`
 * of five.
 *
 * **The composition that made it serious.** Being killed by the harness sets `status` to null, which
 * `release-ready` maps to `SPAWN_FAILED`, and `SPAWN_FAILED` is deliberately NOT in `overridableCodes`. So
 * a slow third party - precisely what `--allow-vendor-unreachable` exists for - arrived as a
 * non-overridable block, while the operator was told the process "never started, or was killed". Two
 * individually correct decisions (F10's harness timeout, F2's non-overridable spawn failure) composed into
 * a wrong one.
 *
 * **A tool that runs out of ITS OWN time reports a refusal; a harness kill should mean the process is
 * wedged.** The harness timeout stays above this as the backstop it was meant to be, with room for the one
 * in-flight request this deadline can overrun by; a test asserts that inequality.
 *
 * **What "reports a refusal" means, precisely, because the first version of this sentence overclaimed
 * (fourth round, T5).** Past the deadline:
 *
 * - **SHA pins** of unreached actions report `UNRESOLVED`, and the run exits **2** - overridable.
 * - **Tag pins** report OK with `currencyUnknown`, and contribute **nothing** to the exit code. That is not
 *   an oversight: `F6` and `F7` decided that a lookup failure on a self-describing ref changes no verdict,
 *   because the ref itself answers the label question. A deadline is just another lookup failure arriving
 *   at that path, and reverting it would reopen `F6`.
 *
 * So a deadline that expires after this repository's two SHA-pinned actions resolve leaves a run that exits
 * **0** having skipped the remaining currency lookups. The `Currency was NOT checked for N pin(s)` line is
 * what surfaces that, and it is the reason the renderer refuses to call such a run a clean bill of health.
 */
export const RUN_DEADLINE_MS = 3 * 60 * 1000;

/** Retry only what a second attempt could plausibly change. */
export function isRetryableStatus(status) {
  return status === 429 || (typeof status === "number" && status >= 500);
}

/**
 * One GET returning parsed JSON, bounded in time and retried once on a transient failure.
 *
 * `fetchImpl` and `delayMs` are injectable so the retry policy can be demonstrated offline and instantly.
 * A guard that has only ever been seen passing is not evidence, and a retry nobody has watched retry is
 * the same thing.
 *
 * A 404 or a 403 is NOT retried: it is a definitive answer, a second attempt cannot change it, and the
 * attempt spends exactly the rate-limit budget this function exists to protect.
 */
export async function getJson(url, opts = {}) {
  const {
    headers = {},
    fetchImpl = fetch,
    timeoutMs = FETCH_TIMEOUT_MS,
    retries = FETCH_RETRIES,
    delayMs = FETCH_RETRY_DELAY_MS,
  } = opts;
  let last = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    let retryable;
    try {
      const res = await fetchImpl(url, { headers, signal: AbortSignal.timeout(timeoutMs) });
      if (res.ok) return await res.json();
      last = new Error(`${res.status} ${res.statusText}`);
      retryable = isRetryableStatus(res.status);
    } catch (err) {
      // A network fault, or the timeout firing. Both are transient by nature, so both earn the one retry.
      last = err;
      retryable = true;
    }
    if (!retryable) break;
    if (attempt < retries && delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
  }
  throw last;
}

/**
 * A run that was pointed at the wrong tree, as distinct from one that could not reach a third party.
 *
 * Fix-code review, 2026-08-19. `F11`'s new refusal exited 2 like every other throw, and `action-pins`
 * declares `overridableCodes: [2]` - so `--allow-vendor-unreachable "GitHub API 503"` would have waved
 * through a run pointed at a directory with no workflows in it, while the summary printed "It covers
 * UNREACHABILITY only ... and nothing else". Rewording that sentence to cover misconfiguration would have
 * legitimised the override; giving misconfiguration its own code removes it instead.
 *
 * **Exit 3 is non-overridable by construction, with no change to the gate list**: `gateBlocks` blocks on
 * any non-zero (F2), and `overridableCodes` is an allowlist that 3 is simply not in.
 */
export const EXIT_MISCONFIGURED = 3;

function misconfigured(message) {
  const err = new Error(message);
  err.exitCode = EXIT_MISCONFIGURED;
  return err;
}

/**
 * Workflow YAML plus the published composite action, which pins actions of its own.
 *
 * THROWS on a root that does not exist. The first version swallowed every exception from both reads, so a
 * typo'd or unreadable path produced `0 pins, exit 0` - a clean bill of health for a tree nothing had
 * looked at.
 *
 * AND THROWS ON A ROOT THAT YIELDS NO SOURCES AT ALL (review finding F11). Refusing only a nonexistent
 * root caught a typo and nothing else: a monorepo subpackage, a mis-set `working-directory`, or a typo
 * that happens to name a REAL directory each produced `0 pins ... Every label is accurate` at exit 0,
 * indistinguishable from a genuine clean pass.
 *
 * The distinction is precise, and the earlier sentence here said only half of it. A missing
 * `.github/workflows` is genuinely fine, and so is a missing action manifest, because a plugin need not
 * ship CI and need not be an action. **BOTH absent** means this tool was pointed somewhere it cannot
 * answer a question about, and that is a refusal rather than a pass.
 *
 * The manifest is looked up under BOTH spellings, because GitHub Actions treats `action.yml` and
 * `action.yaml` as equally valid - the workflow scan just above already accepted both extensions, and
 * this lookup did not, so a repository using the second spelling had that file silently excluded.
 */
export function pinSourceFiles(root) {
  if (!existsSync(root)) throw misconfigured(`root does not exist: ${root}`);
  const files = [];
  const wfDir = path.join(root, ".github", "workflows");
  if (existsSync(wfDir)) {
    for (const name of readdirSync(wfDir)) {
      if (name.endsWith(".yml") || name.endsWith(".yaml")) files.push(path.join(wfDir, name));
    }
  }
  for (const name of ["action.yml", "action.yaml"]) {
    const action = path.join(root, name);
    if (existsSync(action)) files.push(action);
  }
  if (files.length === 0) {
    throw misconfigured(
      `no workflow files and no action manifest under ${root}; nothing here could be checked, so this run proves nothing. ` +
        `Point the watch at a repository root that has .github/workflows or an action.yml`
    );
  }
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
export async function resolveAction(action, wantedShas, deadlineAt = Infinity, { fetchImpl } = {}) {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
  const headers = {
    accept: "application/vnd.github+json",
    "user-agent": "agent-skills-toolkit-action-pin-watch",
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  };
  // The deadline is checked before EVERY request, not merely between actions. Checking only between them
  // left the run bounded by `RUN_DEADLINE_MS` plus one whole action - up to another 4.8 minutes - which is
  // enough to be killed by the harness anyway and so would have left the S2 fix not actually fixing it.
  // Per-request, the overrun is at most one request.
  const get = (url) => {
    if (Date.now() >= deadlineAt) throw new Error(`the run passed its ${RUN_DEADLINE_MS / 1000}s budget`);
    return getJson(url, fetchImpl ? { headers, fetchImpl, delayMs: 0 } : { headers });
  };

  const out = { resolvedBySha: {}, latestVersion: null, error: null, pagesExhausted: false };
  // Hoisted so the `finally` below can still publish whatever was matched before a throw. See T4.
  const found = new Map();
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
    }
  } catch (err) {
    out.error = err.message;
  } finally {
    // KEEP WHAT WAS ALREADY FOUND, even when the loop threw (fourth round, T4). This assignment used to sit
    // inside the `try` after the loop, so a deadline expiring on page 3 discarded a sha matched on page 1 -
    // and the pin was then reported UNRESOLVED, a refusal about a question that had already been answered.
    // The `RUN_DEADLINE_MS` docblock promises the run "reports what it has"; for the in-flight action it
    // reported nothing.
    out.resolvedBySha = Object.fromEntries(found);
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
  // The run's own deadline. Each request is already bounded by `FETCH_TIMEOUT_MS`; what was unbounded is
  // their SUM. Past the deadline the remaining actions are not attempted and report an error, which makes
  // their SHA pins UNRESOLVED and the run exit 2 - a refusal an operator can override with a stated reason,
  // which is what a slow registry deserves. Tag pins take the F6/F7 path instead and report
  // currency-not-checked, contributing nothing to the exit code; see RUN_DEADLINE_MS for why that is
  // deliberate rather than a gap. Without any of this the harness killed the process, and a kill is not
  // overridable.
  const deadlineAt = Date.now() + RUN_DEADLINE_MS;
  const resolutionsByAction = {};
  for (const [action, shas] of shasByAction) {
    if (Date.now() >= deadlineAt) {
      resolutionsByAction[action] = {
        resolvedBySha: {},
        latestVersion: null,
        pagesExhausted: false,
        error: `the run passed its ${RUN_DEADLINE_MS / 1000}s budget before reaching this action; nothing was asked about it`,
      };
      continue;
    }
    resolutionsByAction[action] = await resolveAction(action, shas, deadlineAt);
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

  const report = buildReport(pins, resolveFor, { sources: files.length });
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
    // A run pointed at the wrong tree exits 3, so the outage override cannot excuse a misconfiguration.
    process.exit(err?.exitCode ?? 2);
  });
}
