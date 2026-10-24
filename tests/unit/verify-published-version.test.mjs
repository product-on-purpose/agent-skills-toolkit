import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import {
  stripTag,
  packumentUrl,
  assessPackument,
  verifyPublishedVersion,
  parseArgs,
  readPackageName,
  DEFAULT_REGISTRY,
  ATTEMPTS,
  RETRY_DELAY_MS,
  FETCH_TIMEOUT_MS,
} from "../../scripts/verify-published-version.mjs";

// The post-publish registry assertion. Everything else in publish-npm.yml certifies what is ABOUT to be
// published; the only evidence that a release actually LANDED was `npm publish` exiting 0, which comes
// from inside the thing it certifies.
//
// Tested without a network: `assessPackument` is pure, and `verifyPublishedVersion` takes its fetch and
// its sleep as parameters, so the retry loop is exercised in microseconds rather than half a minute.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/** A minimal abbreviated packument, the shape the registry returns for the install-v1 accept header. */
function packument(versions, latest) {
  return {
    name: "agent-skills-toolkit",
    "dist-tags": latest ? { latest } : {},
    versions: Object.fromEntries(versions.map((v) => [v, { version: v }])),
  };
}

/** A fetch double: hands back one queued response per call, so a retry sequence is scripted exactly. */
function fetchQueue(responses) {
  const calls = [];
  const impl = async (url) => {
    calls.push(url);
    const next = responses.shift();
    if (!next) throw new Error("fetch called more times than the test scripted");
    if (next instanceof Error) throw next;
    return next;
  };
  impl.calls = calls;
  return impl;
}

function okResponse(doc) {
  return { ok: true, status: 200, json: async () => doc };
}

const noSleep = async () => {};

// ---------------------------------------------------------------------------
// The pure half.
// ---------------------------------------------------------------------------

test("stripTag accepts a tag with or without the leading v, matching verify-tag-matches-manifests", () => {
  assert.equal(stripTag("v1.19.0"), "1.19.0");
  assert.equal(stripTag("1.19.0"), "1.19.0");
  assert.equal(stripTag(undefined), "");
});

test("packumentUrl percent-encodes a scoped name, so the request addresses the package and not the scope", () => {
  assert.equal(packumentUrl(DEFAULT_REGISTRY, "agent-skills-toolkit"), "https://registry.npmjs.org/agent-skills-toolkit");
  assert.equal(packumentUrl("https://registry.npmjs.org/", "@acme/thing"), "https://registry.npmjs.org/@acme%2fthing");

  // THE REGRESSION. The first version of packumentUrl used the STRING form, .replace("/", "%2f"), which
  // replaces only the FIRST occurrence. CodeQL caught it as a high-severity "incomplete string escaping
  // or encoding" finding on the pull request; no test did, and no honest input could have - a conforming
  // scoped name carries exactly one slash, so every real call produced the right URL. That is precisely
  // what made it worth a linter and a pinned case rather than a reading.
  assert.equal(
    packumentUrl("https://registry.npmjs.org/", "@a/b/c"),
    "https://registry.npmjs.org/@a%2fb%2fc",
    "every slash is encoded, not only the first; reverting to the string-form replace fails here"
  );
});

test("a packument that serves the version passes, and reports latest without asserting it", () => {
  const v = assessPackument(packument(["1.18.0", "1.19.0"], "1.19.0"), "1.19.0");
  assert.equal(v.ok, true);
  assert.equal(v.code, 0);
  assert.equal(v.latest, "1.19.0");
});

test("latest is REPORTED, never gated: a version present under a non-latest dist-tag still passes", () => {
  // `npm publish` with no --tag always moves latest, so asserting latest === version here would restate
  // what npm just did - and on the one release where it would say something (a fix published to an older
  // line) it would say the wrong thing, reddening a correct release after an irreversible act.
  const v = assessPackument(packument(["1.18.1", "1.19.0"], "1.19.0"), "1.18.1");
  assert.equal(v.ok, true, "the question is whether the version IS THERE, not which tag points at it");
  assert.equal(v.latest, "1.19.0");
});

test("THE DEFECT THIS EXISTS FOR: the registry answers and does not have the version - exit 1, not a pass", () => {
  const v = assessPackument(packument(["1.16.0", "1.16.1"], "1.16.1"), "1.16.2");
  assert.equal(v.ok, false);
  assert.equal(v.code, 1, "a version that is genuinely absent is a fact about THIS release");
  assert.match(v.detail, /does NOT have 1\.16\.2/);
  assert.match(v.detail, /latest is 1\.16\.1/);
});

test("an unreadable answer is exit 2 and never a pass: nothing was proven either way", () => {
  for (const bad of [null, undefined, "a string", 42, {}, { versions: "not a map" }]) {
    const v = assessPackument(bad, "1.19.0");
    assert.equal(v.ok, false, `${JSON.stringify(bad)} must not read as a pass`);
    assert.equal(v.code, 2, `${JSON.stringify(bad)} must be "could not be read", not "is not there"`);
  }
});

// ---------------------------------------------------------------------------
// The IO half: the retry loop, and what each failure shape maps to.
// ---------------------------------------------------------------------------

test("propagation delay is a race, not a verdict: absent then present resolves to a pass", async () => {
  const fetchImpl = fetchQueue([
    okResponse(packument(["1.18.0"], "1.18.0")),
    okResponse(packument(["1.18.0"], "1.18.0")),
    okResponse(packument(["1.18.0", "1.19.0"], "1.19.0")),
  ]);
  const r = await verifyPublishedVersion({ tag: "v1.19.0", name: "agent-skills-toolkit", fetchImpl, sleep: noSleep });
  assert.equal(r.ok, true);
  assert.equal(fetchImpl.calls.length, 3, "must have retried rather than judging on the first miss");
});

test("a pass stops the loop immediately: no further requests once the version is seen", async () => {
  const fetchImpl = fetchQueue([okResponse(packument(["1.19.0"], "1.19.0"))]);
  const r = await verifyPublishedVersion({ tag: "1.19.0", name: "agent-skills-toolkit", fetchImpl, sleep: noSleep });
  assert.equal(r.ok, true);
  assert.equal(fetchImpl.calls.length, 1);
});

test("still absent after every attempt: exit 1, and the attempt count is bounded", async () => {
  const fetchImpl = fetchQueue(Array.from({ length: 4 }, () => okResponse(packument(["1.18.0"], "1.18.0"))));
  const r = await verifyPublishedVersion({
    tag: "v1.19.0", name: "agent-skills-toolkit", fetchImpl, sleep: noSleep, attempts: 4,
  });
  assert.equal(r.ok, false);
  assert.equal(r.code, 1);
  assert.equal(fetchImpl.calls.length, 4, "bounded: the loop must not run forever (review finding F10's rule)");
});

test("a 404 on the packument is an ANSWER, not an outage: the package name is unknown, exit 1", async () => {
  const fetchImpl = fetchQueue([{ ok: false, status: 404 }]);
  const r = await verifyPublishedVersion({
    tag: "v1.19.0", name: "agent-skills-toolkit", fetchImpl, sleep: noSleep, attempts: 1,
  });
  assert.equal(r.code, 1);
  assert.match(r.detail, /no package by this name/);
});

test("a network failure is exit 2, never a pass: a post-publish step that cannot check must not read green", async () => {
  const fetchImpl = fetchQueue([new Error("ECONNRESET"), new Error("ECONNRESET")]);
  const r = await verifyPublishedVersion({
    tag: "v1.19.0", name: "agent-skills-toolkit", fetchImpl, sleep: noSleep, attempts: 2,
  });
  assert.equal(r.ok, false);
  assert.equal(r.code, 2);
  assert.match(r.detail, /could not be reached/);
});

test("a 5xx is exit 2: the registry spoke but said nothing about this version", async () => {
  const fetchImpl = fetchQueue([{ ok: false, status: 503 }]);
  const r = await verifyPublishedVersion({
    tag: "v1.19.0", name: "agent-skills-toolkit", fetchImpl, sleep: noSleep, attempts: 1,
  });
  assert.equal(r.code, 2);
  assert.match(r.detail, /HTTP 503/);
});

test("a body that is not parseable JSON is exit 2, not a crash", async () => {
  const fetchImpl = fetchQueue([{ ok: true, status: 200, json: async () => { throw new Error("Unexpected token <"); } }]);
  const r = await verifyPublishedVersion({
    tag: "v1.19.0", name: "agent-skills-toolkit", fetchImpl, sleep: noSleep, attempts: 1,
  });
  assert.equal(r.code, 2);
  assert.match(r.detail, /not parseable JSON/);
});

test("the abbreviated packument is requested: the full document is megabytes to answer a yes/no question", async () => {
  let seen = null;
  const fetchImpl = async (_url, init) => { seen = init; return okResponse(packument(["1.19.0"], "1.19.0")); };
  await verifyPublishedVersion({ tag: "v1.19.0", name: "agent-skills-toolkit", fetchImpl, sleep: noSleep });
  assert.equal(seen.headers.accept, "application/vnd.npm.install-v1+json");
  assert.ok(seen.signal, "the request must be bounded by a timeout signal");
});

// ---------------------------------------------------------------------------
// E82 (the publish verify step gives up before the registry finishes processing): bounding the window
// without hanging the job it runs in.
// ---------------------------------------------------------------------------

test("E82: the retry loop's worst case fits inside the publish job's timeout-minutes, measured steps included", () => {
  const wf = parseYaml(readFileSync(path.join(ROOT, ".github/workflows/publish-npm.yml"), "utf8"));
  const jobTimeoutMs = wf.jobs.publish["timeout-minutes"] * 60_000;
  const retryWorstCaseMs = ATTEMPTS * FETCH_TIMEOUT_MS + (ATTEMPTS - 1) * RETRY_DELAY_MS;
  // Run 37270742085 measured checkout, Node setup, `npm ci`, and `npm publish` at about 30 seconds; see
  // the docblock above ATTEMPTS for the full measurement.
  const measuredPreVerifyStepsMs = 30_000;
  assert.ok(
    jobTimeoutMs > retryWorstCaseMs + measuredPreVerifyStepsMs,
    `the publish job's timeout (${jobTimeoutMs}ms) must outlast the retry loop's worst case ` +
      `(${retryWorstCaseMs}ms) plus the measured steps ahead of it (${measuredPreVerifyStepsMs}ms), or a ` +
      `slow registry gets killed by the harness instead of reported as unverified`
  );
});

// ---------------------------------------------------------------------------
// The CLI surface.
// ---------------------------------------------------------------------------

test("the package NAME comes from package.json and is never hardcoded", () => {
  assert.equal(readPackageName(ROOT), "agent-skills-toolkit");
});

test("parseArgs takes the tag positionally and defaults the registry", () => {
  const o = parseArgs(["v1.19.0"]);
  assert.equal(o.tag, "v1.19.0");
  assert.equal(o.registry, DEFAULT_REGISTRY);
  assert.equal(parseArgs(["v1.19.0", "--registry", "https://example.test"]).registry, "https://example.test");
  assert.equal(parseArgs(["--help"]).help, true);
});

// ---------------------------------------------------------------------------
// The wiring. A script nothing calls proves nothing.
// ---------------------------------------------------------------------------

test("publish-npm.yml runs the assertion AFTER the publish, in the publish job", () => {
  const wf = parseYaml(readFileSync(path.join(ROOT, ".github/workflows/publish-npm.yml"), "utf8"));
  const steps = wf.jobs.publish.steps;
  const publishIdx = steps.findIndex((s) => typeof s.run === "string" && /npm publish/.test(s.run));
  const verifyIdx = steps.findIndex((s) => typeof s.run === "string" && /verify-published-version\.mjs/.test(s.run));
  assert.notEqual(publishIdx, -1, "the publish step must exist");
  assert.notEqual(verifyIdx, -1, "the post-publish assertion must be wired in, or it proves nothing");
  assert.ok(verifyIdx > publishIdx, "the assertion must run AFTER the publish; before it, it asserts the previous release");
});

test("the assertion compares against the TAG, carried as a job-level env read from prepare's output", () => {
  // Not `${{ inputs.tag }}` or the ref name again: those are interpolated exactly ONCE in this file, and
  // publish-npm-yml.test.mjs asserts that count because a second interpolation re-opens the round-1
  // injection finding. The tag reaches this job as a job output, already proven to match `vX.Y.Z` by
  // verify-release-tag.mjs, and is referenced below only as the shell variable "$TAG".
  const wf = parseYaml(readFileSync(path.join(ROOT, ".github/workflows/publish-npm.yml"), "utf8"));
  assert.equal(wf.jobs.prepare.outputs.tag, "${{ steps.resolve-tag.outputs.tag }}");
  assert.equal(wf.jobs.publish.env.TAG, "${{ needs.prepare.outputs.tag }}");
  const step = wf.jobs.publish.steps.find((s) => typeof s.run === "string" && /verify-published-version\.mjs/.test(s.run));
  assert.match(step.run, /"\$TAG"/, 'the tag must be passed as the shell variable "$TAG", never re-interpolated');
});
