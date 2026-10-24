#!/usr/bin/env node
// what-it-is:   the post-publish registry assertion (WS-B, release identity)
// what-it-does: asks the npm registry whether the version this tag names is actually THERE, after the
//               publish step claims to have put it there, and fails the run when it is not
// why:          `npm publish` exiting 0 was the only evidence this repository had that a release
//               reached the registry, and that evidence comes from INSIDE the thing it certifies -
//               nothing here ever asked the registry. publish-npm.yml's own docblock names a forgotten
//               publish as a SILENT failure and trades it for a visible one; this closes the other
//               half, a publish that was not forgotten and still did not land
// used-by:      .github/workflows/publish-npm.yml, the "Verify the registry actually has this version"
//               step in the `publish` job; covered by tests/unit/verify-published-version.test.mjs
//
// PURE SPLIT FROM IMPURE, the same shape scripts/lib/release-ready.mjs and scripts/lib/vendor-watch.mjs
// use: `assessPackument` decides, and takes an already-parsed document plus the expected version.
// Nothing in it touches the network, the clock or the filesystem, so every verdict below - present,
// absent, unreadable - is tested without a registry.
//
// EXIT CODES, deliberately the same 1-versus-2 split vendor-watch and action-pin-watch use:
//   0  the registry serves this exact version. The publish landed.
//   1  the registry answered, and this version is NOT there. The publish did not land, or landed under
//      a different number. This is a fact about THIS release.
//   2  the registry could not be READ at all. Nothing is proven either way.
// Both non-zero codes fail the workflow step, and that is correct even though the publish above it is
// irreversible: red here means UNVERIFIED, not "rolled back". Nothing is undone by this script, and a
// run that could not confirm the release must not read as one that did. There is no override flag,
// unlike release-ready's `--allow-vendor-unreachable`: an override exists to let a release proceed
// despite somebody else's outage, and by the time this runs there is no release left to let proceed.
import { readFileSync } from "node:fs";
import path from "node:path";

/** The public registry. Overridable with `--registry` for a proxy, a mirror, or a test double. */
export const DEFAULT_REGISTRY = "https://registry.npmjs.org";

/**
 * A version is not visible to every registry reader the instant `npm publish` returns: the write and
 * the CDN that serves reads are not the same system, and a delay of seconds to minutes is normal rather
 * than a defect. So a single miss is not a verdict, and these three numbers are what turn a race into a
 * fact.
 *
 * BOUNDED, for the reason review finding F10 (nothing bounded how long anything could take) gave for
 * every other long-running thing here. A retry loop with no ceiling would turn a registry outage into a
 * hung job, and `cancel-in-progress: false` means a hung job blocks every later publish dispatch until a
 * human cancels it by hand.
 *
 * E82 (the publish verify step gives up before the registry finishes processing) widened this window.
 * The original window, six attempts five seconds apart, proved too short in practice. Two measurements
 * set the new bound. Publish run 35289925723 shipped 1.19.0, and the verify step passed on its first
 * attempt. Publish run 37270742085 shipped 1.20.0, and the verify step still had not seen the version
 * after six attempts five seconds apart. The registry served it as `latest` a few minutes later,
 * confirmed by running this same script by hand. Registry propagation can take minutes, not seconds, so
 * this window gives it minutes to finish.
 *
 * 24 attempts ten seconds apart is about four minutes of waiting. Add 24 request ceilings of 15 seconds
 * each, for a worst case of about ten minutes if every attempt times out. The publish job that runs this
 * script carries a 20-minute `timeout-minutes` cap. On run 37270742085 the steps before this one -
 * checkout, Node setup, `npm ci`, `npm publish` - measured about 30 seconds. The worst case still fits,
 * with minutes of margin.
 */
export const ATTEMPTS = 24;
export const RETRY_DELAY_MS = 10_000;
export const FETCH_TIMEOUT_MS = 15_000;

/** Strip a leading "v" so "v1.19.0" and "1.19.0" are the same input, matching verify-tag-matches-manifests.mjs. */
export function stripTag(tag) {
  return String(tag ?? "").replace(/^v/, "");
}

/**
 * Registry path for a package name. A scoped name carries a slash, which must be percent-encoded or the
 * request addresses a sub-resource of the scope instead of the package.
 */
export function packumentUrl(registry, name) {
  return `${String(registry).replace(/\/+$/, "")}/${String(name).replace(/\//g, "%2f")}`;
}

/**
 * THE DECIDING HALF. Given a parsed packument and the version the tag names, say whether the registry
 * serves it. Pure: no network, no clock, no filesystem.
 *
 * `latest` is REPORTED and never gated on, and the distinction is load-bearing rather than timid. This
 * workflow publishes with a bare `npm publish --access public`, which always moves the `latest` tag, so
 * asserting `latest === version` here would restate what npm just did rather than check it - and on the
 * one release where it would say something (a fix published to an older line) it would say the wrong
 * thing, reddening a correct release after an irreversible act. The question this script exists to
 * answer is whether the version IS THERE, and that is what it answers.
 *
 * @param {unknown} doc a parsed packument, or anything at all - a malformed body is a code 2, not a throw
 * @param {string} stripped the expected version, with no leading "v"
 * @returns {{ok: boolean, code: 0|1|2, detail: string, latest: string|null}}
 */
export function assessPackument(doc, stripped) {
  if (!doc || typeof doc !== "object") {
    return { ok: false, code: 2, detail: "the registry response was not a JSON object, so it proves nothing", latest: null };
  }
  const versions = doc.versions;
  if (!versions || typeof versions !== "object") {
    return { ok: false, code: 2, detail: 'the registry response carried no "versions" map, so it proves nothing', latest: null };
  }
  const latest = typeof doc["dist-tags"]?.latest === "string" ? doc["dist-tags"].latest : null;
  if (Object.prototype.hasOwnProperty.call(versions, stripped)) {
    return { ok: true, code: 0, detail: `the registry serves ${stripped}`, latest };
  }
  const known = Object.keys(versions).length;
  return {
    ok: false,
    code: 1,
    detail:
      `the registry answered and does NOT have ${stripped} (it serves ${known} version(s); ` +
      `dist-tag latest is ${latest ?? "unset"}). The publish did not land, or landed under a different number`,
    latest,
  };
}

/** Injectable so the retry loop is testable without waiting for real seconds. */
const realSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * THE IO HALF. Fetch the packument and hand it to `assessPackument`, retrying while the answer is still
 * "no" or "could not read" - both are legitimately transient in the seconds to minutes after a publish.
 *
 * Every dependency is injected (`fetchImpl`, `sleep`, the three bounds) for the same reason
 * verifyTagMatchesManifests takes `root`: the parameter already has to exist for the workflow, so
 * testing costs nothing extra.
 */
export async function verifyPublishedVersion({
  tag,
  name,
  registry = DEFAULT_REGISTRY,
  fetchImpl = globalThis.fetch,
  sleep = realSleep,
  attempts = ATTEMPTS,
  delayMs = RETRY_DELAY_MS,
  timeoutMs = FETCH_TIMEOUT_MS,
  onAttempt = () => {},
} = {}) {
  const stripped = stripTag(tag);
  const url = packumentUrl(registry, name);
  let verdict = { ok: false, code: 2, detail: "no attempt was made", latest: null };
  for (let i = 1; i <= attempts; i += 1) {
    verdict = await attemptOnce({ url, stripped, fetchImpl, timeoutMs });
    onAttempt(i, verdict);
    if (verdict.ok) break;
    if (i < attempts) await sleep(delayMs);
  }
  return { ...verdict, stripped, name, url, attempts };
}

async function attemptOnce({ url, stripped, fetchImpl, timeoutMs }) {
  let res;
  try {
    res = await fetchImpl(url, {
      // The abbreviated packument. The full document carries every version's complete metadata, which
      // for a package with a long history is megabytes of JSON to answer a yes/no question.
      headers: { accept: "application/vnd.npm.install-v1+json" },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    return { ok: false, code: 2, detail: `the registry could not be reached: ${e.message}`, latest: null };
  }
  if (res.status === 404) {
    // The package name itself is unknown to the registry. That is an answer, not an outage, and it is
    // the most severe form of the failure this script exists to catch.
    return { ok: false, code: 1, detail: `the registry has no package by this name (HTTP 404 at ${url})`, latest: null };
  }
  if (!res.ok) {
    return { ok: false, code: 2, detail: `the registry answered HTTP ${res.status}, so it proves nothing`, latest: null };
  }
  let doc;
  try {
    doc = await res.json();
  } catch (e) {
    return { ok: false, code: 2, detail: `the registry response was not parseable JSON: ${e.message}`, latest: null };
  }
  return assessPackument(doc, stripped);
}

const USAGE = `Usage: node scripts/verify-published-version.mjs <tag> [options]

  <tag>                 the release tag, "vX.Y.Z" or "X.Y.Z". The version it names must be on the registry.

  --root <dir>          where to read package.json for the package NAME (default: cwd)
  --registry <url>      registry base URL (default: ${DEFAULT_REGISTRY})
  --attempts <n>        how many times to ask before giving up (default: ${ATTEMPTS})
  -h, --help            this message

Exit: 0 the registry serves this version | 1 it answered and does not have it | 2 it could not be read`;

export function parseArgs(argv) {
  const opts = { tag: null, root: process.cwd(), registry: DEFAULT_REGISTRY, attempts: ATTEMPTS, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "-h" || a === "--help") return { ...opts, help: true };
    else if (a === "--root") opts.root = argv[++i] ?? opts.root;
    else if (a === "--registry") opts.registry = argv[++i] ?? opts.registry;
    else if (a === "--attempts") opts.attempts = Number(argv[++i]);
    else if (opts.tag === null) opts.tag = a;
  }
  return opts;
}

/** Read the package NAME from package.json. Never hardcoded: a rename must not silently verify the old name. */
export function readPackageName(root) {
  const p = path.join(root, "package.json");
  const parsed = JSON.parse(readFileSync(p, "utf8"));
  if (typeof parsed.name !== "string" || parsed.name.length === 0) {
    throw new Error(`${p} has no "name" field; there is nothing to ask the registry about`);
  }
  return parsed.name;
}

export async function main(argv = process.argv.slice(2)) {
  const opts = parseArgs(argv);
  if (opts.help) {
    process.stdout.write(`${USAGE}\n`);
    return 0;
  }
  if (!opts.tag) {
    process.stderr.write(`verify-published-version: no tag given\n\n${USAGE}\n`);
    return 2;
  }
  let name;
  try {
    name = readPackageName(path.resolve(opts.root));
  } catch (e) {
    process.stderr.write(`verify-published-version: ${e.message}\n`);
    return 2;
  }
  const result = await verifyPublishedVersion({
    tag: opts.tag,
    name,
    registry: opts.registry,
    attempts: opts.attempts,
    onAttempt: (i, v) => {
      if (!v.ok) process.stdout.write(`attempt ${i}: ${v.detail}\n`);
    },
  });
  if (result.ok) {
    process.stdout.write(`verify-published-version: OK - ${name}@${result.stripped} is on the registry.\n`);
    // Reported, never gated. See assessPackument.
    process.stdout.write(`  dist-tag latest is ${result.latest ?? "unset"} (reported, not asserted).\n`);
    return 0;
  }
  process.stderr.write(`::error::verify-published-version: ${name}@${result.stripped} - ${result.detail}\n`);
  process.stderr.write(
    result.code === 1
      ? `The tag was published, the GitHub release exists, and the registry does not serve this version. ` +
          `Nothing here undid anything; this run is RED because the release is unverified, not because it was reverted.\n`
      : `The registry could not be read after ${result.attempts} attempt(s). Nothing is proven either way. ` +
          `Re-run this step once the registry is reachable before treating the release as shipped.\n`
  );
  return result.code;
}

// Guarded like every other CLI entry point here: main() runs only when invoked as a script, never on
// import, so the tests exercise assessPackument and verifyPublishedVersion without spawning a process.
if (process.argv[1]?.endsWith("verify-published-version.mjs")) {
  main().then((code) => {
    process.exitCode = code;
  });
}
