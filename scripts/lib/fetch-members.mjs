// what-it-is:   the marketplace member fetcher (RS-D3, cut 2)
// what-it-does: given catalogue entries, checks each member out at the sha the catalogue PINS, into one
//               directory the marketplace scope can then resolve; reports per-member what it could not do
// why:          the registry page was a hand-run, committed snapshot and it went twenty days stale
//               carrying two wrong claims. Automating it needs the one thing this repository had no code
//               for: getting the members. `scripts/lib/marketplace/resolve.mjs` maps entries to LOCAL
//               directories and fetches nothing, deliberately - so a deploy that wants to grade the
//               family has to put the checkouts there first. This is that step and only that step; every
//               grading decision stays where it already lives.
// used-by:      scripts/gen-family-registry.mjs; covered by tests/unit/fetch-members.test.mjs
//
// A FAILED FETCH IS A RESULT, NOT AN ERROR. Nothing here throws on a member that could not be reached:
// somebody else's outage, rename or private repository is not a fact about this repository, and a deploy
// that fails because a third party moved a branch would take the whole docs site down with it. The caller
// gets a list of what succeeded and a list of what did not, and the marketplace scope already reports an
// absent member as not-graded rather than red (resolve.mjs's "environment gap" split). So a member this
// cannot fetch degrades exactly one row and leaves the other five measured.
import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";

/** How long any single git invocation may take. A hung clone must not hold a deploy open indefinitely. */
export const GIT_TIMEOUT_MS = 120_000;

function git(args, cwd) {
  const r = spawnSync("git", args, { cwd, encoding: "utf8", timeout: GIT_TIMEOUT_MS });
  if (r.error) return { ok: false, why: r.error.message };
  if (r.status !== 0) {
    const msg = `${r.stderr ?? ""}${r.stdout ?? ""}`.trim().split("\n").slice(-3).join("; ");
    return { ok: false, why: `git ${args[0]} exited ${r.status}${msg ? `: ${msg.slice(0, 300)}` : ""}` };
  }
  return { ok: true, out: (r.stdout ?? "").trim() };
}

/**
 * Check one repository out at ONE commit, with no history.
 *
 * Deliberately `init` + `fetch --depth 1 <sha>` rather than `clone`: a clone brings a branch tip, and the
 * branch tip is not what the catalogue pins - grading it is precisely the defect the 2026-09-01
 * regeneration fixed, where three of six rows read `diverged` because the machine had drifted checkouts.
 * Fetching the sha itself makes "graded at the pin" true by construction rather than by discipline.
 *
 * The `.git` directory is left in place on purpose: `resolve.mjs` reads the graded sha straight out of it.
 */
export function fetchAtSha({ url, sha, dir }) {
  mkdirSync(dir, { recursive: true });
  for (const args of [["init", "--quiet"], ["remote", "add", "origin", url]]) {
    const r = git(args, dir);
    if (!r.ok) return { ok: false, why: r.why };
  }
  const fetched = git(["fetch", "--quiet", "--depth", "1", "origin", sha], dir);
  if (!fetched.ok) return { ok: false, why: fetched.why };
  const checked = git(["checkout", "--quiet", "FETCH_HEAD"], dir);
  if (!checked.ok) return { ok: false, why: checked.why };
  return { ok: true };
}

/**
 * Pure: the (name, url, sha) triples a catalogue's entries pin, skipping entries that name no sha.
 *
 * An entry without a sha is not a fetch failure and is not silently dropped either - it is returned in
 * `unpinned`, because "the catalogue does not pin this member" is a fact about the CATALOGUE that a
 * registry page should say out loud rather than quietly grade at whatever HEAD happened to be.
 */
export function pinnedTargets(entries) {
  const targets = [];
  const unpinned = [];
  for (const e of entries ?? []) {
    const src = e?.source ?? {};
    if (typeof src.url === "string" && typeof src.sha === "string" && src.sha.length > 0) {
      targets.push({ name: e.name, url: src.url, sha: src.sha, version: e.version ?? null });
    } else {
      unpinned.push({ name: e?.name ?? "(unnamed entry)", why: "the catalogue entry names no url+sha to pin" });
    }
  }
  return { targets, unpinned };
}

/**
 * Fetch every pinned member into `<membersDir>/<name>`. Never throws, never rejects; returns what it got.
 */
export function fetchMembers(entries, membersDir, fetchOne = fetchAtSha) {
  const { targets, unpinned } = pinnedTargets(entries);
  const fetched = [];
  const failed = [...unpinned];
  for (const t of targets) {
    const dir = path.join(membersDir, t.name);
    const r = fetchOne({ url: t.url, sha: t.sha, dir });
    if (r.ok) fetched.push({ ...t, dir });
    else failed.push({ name: t.name, why: r.why });
  }
  return { fetched, failed };
}
