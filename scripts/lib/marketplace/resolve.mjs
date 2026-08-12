// what-it-is:   the marketplace member resolver (ADR 0039, marketplace scope)
// what-it-does: maps every catalogue entry to a local member directory when one can be found, and
//               classifies every entry that cannot be into the TWO different failures that both wear the
//               word "unresolved": a broken catalogue entry (a defect, reds the collection) and a member
//               simply absent from this machine (an environment gap, reported not-graded). Also reads
//               each resolved member's graded sha straight out of .git, with no subprocess.
// why:          ADR 0039 question 1 grades the LOCAL CHECKOUT and question 2 reds an unresolved member,
//               which together would red a collection merely because the operator had not cloned every
//               member. The split between "the artifact is broken" and "this workstation is incomplete"
//               is the derived decision that reconciles them, and this module is where it lives.
// used-by:      scripts/lib/marketplace/evaluate-marketplace.mjs
import path from "node:path";
import { existsSync, readFileSync, statSync } from "node:fs";
import { readJsonSafe, normalizeArgPath } from "../fs-utils.mjs";
import { looksLikePlugin } from "../load-plugin.mjs";
import { SOURCE_KINDS } from "./manifest.mjs";

/** The optional sidecar that supplies explicit local paths for members this scope cannot guess. */
export const MEMBER_MAP_FILENAME = "askit.marketplace.json";

/**
 * The repository name a git source ends in, or null. `https://host/owner/name.git`, `git@host:owner/name`
 * and a trailing slash all reduce to `name`. This is a pure string operation on a value the catalogue
 * already holds; nothing is fetched.
 */
export function repoNameFromUrl(url) {
  if (typeof url !== "string" || url.trim() === "") return null;
  const withoutQuery = url.split(/[?#]/)[0];
  const trimmed = withoutQuery.replace(/\/+$/, "");
  const lastSegment = trimmed.split(/[/:]/).pop();
  if (!lastSegment) return null;
  const name = lastSegment.replace(/\.git$/i, "");
  return name === "" ? null : name;
}

/** The repository name a `github` source's `owner/name` ends in, or null. */
export function repoNameFromGithub(repo) {
  if (typeof repo !== "string" || repo.trim() === "") return null;
  const name = repo.split("/").filter(Boolean).pop();
  return name && name !== "" ? name : null;
}

/**
 * Read a checkout's current commit sha from the filesystem alone: `.git/HEAD`, following one symbolic
 * ref into `.git/refs/...`, then falling back to `.git/packed-refs`. Also follows a `.git` FILE
 * (`gitdir: ...`), which is what a worktree or a submodule has instead of a directory.
 *
 * Deliberately NOT `spawnSync("git", ...)`. The gate's standing contract is that it is deterministic,
 * synchronous and model-free, and it has never depended on an external binary being installed; a scope
 * that shelled out to git would make a member's graded sha unavailable on a machine without git and
 * would report that as if it were a property of the member. Pure fs keeps the answer the same
 * everywhere, and null when it genuinely cannot be known.
 *
 * @returns {string|null} the 40-character sha, or null when this directory is not a git checkout
 */
/**
 * The nearest `.git` at or above `dir`, or null. Bounded to a few levels so this can never walk out to
 * the filesystem root scanning directories.
 *
 * Needed because a `git-subdir` member's plugin directory is BELOW its repository root, so asking for
 * `<member>/.git` finds nothing and identity would be unverifiable for exactly the source kind whose
 * whole point is that the plugin is not at the root. The same applies to any plugin vendored inside a
 * larger repository.
 */
export function findGitRoot(dir, maxDepth = 6) {
  let current = path.resolve(dir);
  for (let i = 0; i <= maxDepth; i++) {
    if (existsSync(path.join(current, ".git"))) return current;
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
  return null;
}

export function readGitHead(dir) {
  let gitPath = path.join(dir, ".git");
  if (!existsSync(gitPath)) return null;
  try {
    if (statSync(gitPath).isFile()) {
      const pointer = readFileSync(gitPath, "utf8").trim();
      const match = /^gitdir:\s*(.+)$/.exec(pointer);
      if (!match) return null;
      gitPath = path.isAbsolute(match[1]) ? match[1] : path.resolve(dir, match[1]);
      if (!existsSync(gitPath)) return null;
    }
    const head = readFileSync(path.join(gitPath, "HEAD"), "utf8").trim();
    const symbolic = /^ref:\s*(.+)$/.exec(head);
    if (!symbolic) return /^[0-9a-f]{40}$/i.test(head) ? head : null;
    const ref = symbolic[1].trim();
    const looseRef = path.join(gitPath, ...ref.split("/"));
    if (existsSync(looseRef)) {
      const sha = readFileSync(looseRef, "utf8").trim();
      return /^[0-9a-f]{40}$/i.test(sha) ? sha : null;
    }
    // Packed refs: a checkout whose branch head has been packed has no loose ref file at all.
    const packedPath = path.join(gitPath, "packed-refs");
    if (!existsSync(packedPath)) return null;
    for (const raw of readFileSync(packedPath, "utf8").split(/\r?\n/)) {
      const lineMatch = /^([0-9a-f]{40})\s+(.+)$/i.exec(raw.trim());
      if (lineMatch && lineMatch[2].trim() === ref) return lineMatch[1];
    }
    return null;
  } catch {
    return null; // an unreadable .git is "sha not known", never a crash
  }
}

/**
 * Load the optional local-path mapping sidecar at <root>/askit.marketplace.json. Shape:
 * `{ "members": { "<entry name>": "<path, absolute or relative to root>" } }`.
 * Absent or malformed yields an empty map plus a problem, never a throw.
 */
export function loadMemberMap(root) {
  const p = path.join(root, MEMBER_MAP_FILENAME);
  const problems = [];
  if (!existsSync(p)) return { map: {}, problems };
  const { data, parseError } = readJsonSafe(p);
  if (parseError) {
    problems.push({ severity: "warn", message: `${MEMBER_MAP_FILENAME} is present but not valid JSON: ${parseError}; local member mappings ignored` });
    return { map: {}, problems };
  }
  const members = data?.members;
  if (!members || typeof members !== "object" || Array.isArray(members)) {
    problems.push({ severity: "warn", message: `${MEMBER_MAP_FILENAME} must carry a "members" object of entry-name -> local path; ignored` });
    return { map: {}, problems };
  }
  const map = {};
  for (const [name, value] of Object.entries(members)) {
    if (typeof value !== "string" || value.trim() === "") {
      problems.push({ severity: "warn", message: `${MEMBER_MAP_FILENAME} members["${name}"] is not a non-empty path string; ignored` });
      continue;
    }
    map[name] = value;
  }
  return { map, problems };
}

/** The directory candidates for an entry, in the order they are tried. Pure; no filesystem access. */
export function candidateDirs(entry, { root, searchRoots }) {
  const source = entry.source;
  const out = [];
  if (source.kind === "local-path") {
    out.push(path.resolve(root, normalizeArgPath(source.path)));
    return out;
  }
  const repoName =
    source.kind === "github" ? repoNameFromGithub(source.repo)
      : source.kind === "url" || source.kind === "git-subdir" ? repoNameFromUrl(source.url)
        : null;
  // The entry NAME is tried alongside the repository name because a catalogue routinely lists a member
  // under a name that differs from its repository directory, and a maintainer whose checkout is named
  // after the entry should not be told their catalogue is broken.
  const names = [repoName, entry.name].filter((n) => typeof n === "string" && n !== "");
  for (const searchRoot of searchRoots) {
    for (const name of names) {
      const base = path.resolve(searchRoot, name);
      out.push(source.kind === "git-subdir" && source.subdir ? path.resolve(base, normalizeArgPath(source.subdir)) : base);
    }
  }
  return [...new Set(out)];
}

/**
 * The git remote URL a checkout reports, from `.git/config` alone, or null. Pure fs, no subprocess,
 * for the same reason readGitHead is (see its docblock). Only the first `url = ` under any `[remote ...]`
 * section is read, which is `origin` in every ordinary layout.
 */
export function readGitRemote(dir) {
  let gitPath = path.join(dir, ".git");
  if (!existsSync(gitPath)) return null;
  try {
    if (statSync(gitPath).isFile()) {
      const match = /^gitdir:\s*(.+)$/.exec(readFileSync(gitPath, "utf8").trim());
      if (!match) return null;
      gitPath = path.isAbsolute(match[1]) ? match[1] : path.resolve(dir, match[1]);
    }
    const configPath = path.join(gitPath, "config");
    if (!existsSync(configPath)) return null;
    let inRemote = false;
    for (const raw of readFileSync(configPath, "utf8").split(/\r?\n/)) {
      const line = raw.trim();
      if (line.startsWith("[")) { inRemote = /^\[remote\s/.test(line); continue; }
      if (!inRemote) continue;
      const m = /^url\s*=\s*(.+)$/.exec(line);
      if (m) return m[1].trim();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Whether a DISCOVERED candidate is plausibly the member the entry names, judged by comparing its git
 * remote against the source URL. Returns true when they agree, and ALSO when identity cannot be
 * established at all (no `.git`, no remote, or a source kind with no URL) - the check can disprove a
 * match, never prove one, so an unverifiable candidate is accepted rather than discarded.
 *
 * This exists because discovery matches on a directory BASENAME. Pre-release adversarial review noted
 * that an unrelated plugin sharing a member's name would otherwise be graded in its place and could
 * false-green the collection. Comparison is on the repository path, ignoring scheme, credentials, the
 * `.git` suffix and a trailing slash, so `git@host:owner/name.git` and `https://host/owner/name` agree.
 * Only applied to discovered candidates: an explicit mapping is the operator saying "this one", and
 * second-guessing it would make the escape hatch unusable.
 *
 * The comparison is EXACT on host and repository path, not a suffix match. Two rounds of adversarial
 * review pushed it here and both intermediate forms were wrong:
 *   - `a.endsWith(b)` accepted `notgithub.com/owner/name` for `github.com/owner/name`.
 *   - `a.endsWith("/" + b)` closed that but still accepted `evil.example/github.com/owner/name`,
 *     because a hostile path prefix reproduces the declared path at a legitimate-looking boundary.
 * There is no safe prefix allowance, so there is none. A genuine mirror under a path prefix is exactly
 * what the `askit.marketplace.json` mapping is for: the operator asserting identity this code cannot.
 *
 * An explicit port is normalized away rather than compared, so `host:443/o/n` and `host/o/n` agree; a
 * port is a transport detail, not a different repository.
 */
export function normalizeRemote(u) {
  let s = String(u ?? "").trim();
  if (!s) return null;
  s = s.split(/[?#]/)[0];
  s = s.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "");        // scheme
  s = s.replace(/^[^@/]+@/, "");                        // credentials, or the scp-form user
  s = s.replace(/^([^/:]+):(?!\d+(?:\/|$))/, "$1/");    // scp form host:path (but not host:port)
  s = s.replace(/^([^/:]+):\d+/, "$1");                 // explicit port
  s = s.replace(/\.git$/i, "").replace(/\/+$/, "").replace(/\/{2,}/g, "/");
  return s.toLowerCase() || null;
}

export function remoteMatchesSource(candidateRemote, source) {
  const declared = source?.url ?? (source?.repo ? `https://github.com/${source.repo}` : null);
  if (!declared || !candidateRemote) return true; // cannot disprove; the caller decides what to do
  const a = normalizeRemote(candidateRemote);
  const b = normalizeRemote(declared);
  if (!a || !b) return true; // nothing comparable survived normalization
  return a === b;
}

/**
 * Resolve every entry to one of three states. The distinction between the two failure states is the
 * whole point of this function, so it is stated once here rather than inferred at each call site:
 *
 * - `resolved`      - a directory exists, looks like a plugin, and will be graded.
 * - `unresolvable`  - the CATALOGUE ENTRY is broken: no source, a malformed source, or an EXPLICITLY
 *                     named location (a local-path source, or an operator-supplied mapping) that does
 *                     not exist or is not a plugin. An installer following this entry receives nothing,
 *                     so it REDS the collection.
 * - `not-graded`    - the entry is well-formed and names a real member, but this machine has no checkout
 *                     of it, or its source kind is remote-only and this release does not fetch. An
 *                     environment gap, NOT a conformance fact: it never reds, and the collection verdict
 *                     carries a coverage count so the gap is stated rather than inferred.
 *
 * **Explicit locations and guessed ones are treated differently, and that asymmetry is deliberate.**
 * Pre-release adversarial review found the original single rule wrong in both directions: an unrelated
 * directory happening to share a member's name would be reported as a broken catalogue entry (a false
 * red on a catalogue that is fine), and the FIRST such directory short-circuited the search, hiding a
 * valid candidate further down the list. A location the catalogue or the operator NAMED is their claim
 * and its failure is a defect; a location this code GUESSED from a repository basename is a hypothesis,
 * and a failed hypothesis is absence, not evidence of a defect. So every candidate is now exhausted
 * before any conclusion is drawn.
 *
 * @returns {Array<{entry: object, status: string, dir: string|null, gradedSha: string|null, reason: string|null, tried: string[]}>}
 */
export function resolveMembers(entries, { root, searchRoots, map = {} }) {
  return entries.map((entry) => {
    const base = { entry, dir: null, gradedSha: null, tried: [], identityConfirmed: null };
    if (entry.source.kind === null) {
      return { ...base, status: "unresolvable", reason: entry.source.reason };
    }
    // An explicit mapping outranks discovery. It is also the only way a remote-only kind (npm, archive)
    // ever gets graded, which is exactly why it exists.
    const mapped = entry.name != null && Object.prototype.hasOwnProperty.call(map, entry.name)
      ? path.resolve(root, normalizeArgPath(map[entry.name]))
      : null;
    const explicit = mapped != null || entry.source.kind === "local-path";
    const tried = mapped ? [mapped] : candidateDirs(entry, { root, searchRoots });

    // Exhaust every candidate before concluding anything, and rank rather than first-wins. Records why
    // each one was passed over, so a near-miss (right name, wrong remote) is diagnosable rather than
    // reported as a bare "not found".
    //
    // A CONFIRMED candidate always beats an UNCONFIRMED one, whatever order they were tried in. Round 2
    // of the adversarial review found the first-wins loop still false-greens: a same-named plugin with
    // no readable git remote is unverifiable, was therefore accepted, and shadowed the correct checkout
    // sitting in a later search root. Ranking removes the ordering dependence entirely.
    const passedOver = [];
    let unconfirmed = null; // a plausible plugin whose identity could not be established either way
    for (const dir of tried) {
      if (!existsSync(dir) || !statSync(dir).isDirectory()) continue;
      if (!looksLikePlugin(dir)) {
        if (explicit) {
          return {
            ...base, tried, status: "unresolvable", dir,
            reason: `resolves to ${dir}, which exists but is not a plugin (no library.json, AGENTS.md, or skills/ directory)`,
          };
        }
        passedOver.push(`${path.basename(dir)} (exists but is not a plugin)`);
        continue;
      }
      // An explicit location is the operator asserting identity; do not second-guess it.
      if (explicit) {
        return { ...base, tried, status: "resolved", dir, gradedSha: readGitHead(dir), identityConfirmed: null, reason: null };
      }
      // Read the remote from the repository ROOT, which for a git-subdir member (and any plugin
      // vendored inside a larger repo) is above the plugin directory itself.
      const gitRoot = findGitRoot(dir);
      const remote = gitRoot ? readGitRemote(gitRoot) : null;
      if (remote == null) {
        if (!unconfirmed) unconfirmed = dir;
        passedOver.push(`${path.basename(dir)} (a plugin, but no readable git remote to confirm it is this member)`);
        continue;
      }
      if (!remoteMatchesSource(remote, entry.source)) {
        passedOver.push(`${path.basename(dir)} (a plugin, but its git remote "${remote}" is not this member's source)`);
        continue;
      }
      return { ...base, tried, status: "resolved", dir, gradedSha: readGitHead(dir), identityConfirmed: true, reason: null };
    }

    // No candidate's identity could be confirmed. Fall back to a plausible unconfirmed one rather than
    // refusing to grade anything that is not a git clone - a vendored copy or an extracted tarball is a
    // legitimate checkout. It is accepted, flagged `identityConfirmed: false`, and the orchestrator
    // raises a collection WARNING, so a green can never rest silently on an unverified identity.
    if (unconfirmed) {
      return {
        ...base, tried, status: "resolved", dir: unconfirmed, gradedSha: readGitHead(unconfirmed), identityConfirmed: false,
        reason: `identity NOT confirmed: no readable git remote at or above ${path.basename(unconfirmed)} to check against this member's source`,
      };
    }

    // Nothing matched. Which failure this is depends entirely on whether the entry ITSELF is at fault.
    if (explicit) {
      return {
        ...base, tried, status: "unresolvable",
        reason: mapped
          ? `${MEMBER_MAP_FILENAME} maps this member to ${mapped}, which does not exist or is not a plugin`
          : `local source "${entry.source.path}" does not exist under ${root}; an installer following this entry gets nothing`,
      };
    }
    const kind = SOURCE_KINDS[entry.source.kind];
    const nearMiss = passedOver.length ? ` Passed over: ${passedOver.join("; ")}.` : "";
    return {
      ...base, tried, status: "not-graded",
      reason: kind?.locallyDiscoverable
        ? `no local checkout found for this member (looked in: ${tried.map((d) => path.basename(d)).join(", ") || "nowhere"}); the entry is well-formed, so this is a gap in this machine, not in the catalogue.${nearMiss}`
        : `source kind "${entry.source.kind}" is not locally resolvable and remote fetch is deferred (ADR 0039 question 1); supply a path in ${MEMBER_MAP_FILENAME} to grade it`,
    };
  });
}
