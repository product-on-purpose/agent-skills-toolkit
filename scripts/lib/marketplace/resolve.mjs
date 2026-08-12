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
 * Resolve every entry to one of three states. The distinction between the two failure states is the
 * whole point of this function, so it is stated once here rather than inferred at each call site:
 *
 * - `resolved`      - a directory exists, looks like a plugin, and will be graded.
 * - `unresolvable`  - the CATALOGUE ENTRY is broken: no source, a malformed source, a local path naming
 *                     a directory that does not exist, or a directory that exists but is not a plugin.
 *                     An installer following this entry receives nothing, so it REDS the collection.
 * - `not-graded`    - the entry is well-formed and names a real member, but this machine has no checkout
 *                     of it, or its source kind is remote-only and this release does not fetch. An
 *                     environment gap, NOT a conformance fact: it never reds, and the collection verdict
 *                     carries a coverage count so the gap is stated rather than inferred.
 *
 * @returns {Array<{entry: object, status: string, dir: string|null, gradedSha: string|null, reason: string|null, tried: string[]}>}
 */
export function resolveMembers(entries, { root, searchRoots, map = {} }) {
  return entries.map((entry) => {
    const base = { entry, dir: null, gradedSha: null, tried: [] };
    if (entry.source.kind === null) {
      return { ...base, status: "unresolvable", reason: entry.source.reason };
    }
    // An explicit mapping outranks discovery. It is also the only way a remote-only kind (npm, archive)
    // ever gets graded, which is exactly why it exists.
    const mapped = entry.name != null && Object.prototype.hasOwnProperty.call(map, entry.name)
      ? path.resolve(root, normalizeArgPath(map[entry.name]))
      : null;
    const tried = mapped ? [mapped] : candidateDirs(entry, { root, searchRoots });
    for (const dir of tried) {
      if (!existsSync(dir) || !statSync(dir).isDirectory()) continue;
      if (!looksLikePlugin(dir)) {
        return {
          ...base, tried, status: "unresolvable", dir,
          reason: `resolves to ${dir}, which exists but is not a plugin (no library.json, AGENTS.md, or skills/ directory)`,
        };
      }
      return { ...base, tried, status: "resolved", dir, gradedSha: readGitHead(dir), reason: null };
    }
    // Nothing on disk. Which failure this is depends entirely on whether the entry ITSELF is at fault.
    if (entry.source.kind === "local-path") {
      return {
        ...base, tried, status: "unresolvable",
        reason: `local source "${entry.source.path}" does not exist under ${root}; an installer following this entry gets nothing`,
      };
    }
    const kind = SOURCE_KINDS[entry.source.kind];
    return {
      ...base, tried, status: "not-graded",
      reason: kind?.locallyDiscoverable
        ? `no local checkout found for this member (looked in: ${tried.map((d) => path.basename(d)).join(", ") || "nowhere"}); the entry is well-formed, so this is a gap in this machine, not in the catalogue`
        : `source kind "${entry.source.kind}" is not locally resolvable and remote fetch is deferred (ADR 0039 question 1); supply a path in ${MEMBER_MAP_FILENAME} to grade it`,
    };
  });
}
