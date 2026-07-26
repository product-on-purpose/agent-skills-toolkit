// what-it-is:   the deterministic half of the eval-run pipeline (backlog E11 / F2)
// what-it-does: resolves a pinned corpus target, refuses a drifted or empty tree, runs the free gate and the
//               conformance render through the npm script seam, and writes the outputs plus a record skeleton
// why:          an eval run used to be a hand procedure with a silent-empty-directory trap (a backslash path
//               once graded nothing and printed a clean pass); a run has to be a command whose refusals are
//               loud, whose deterministic output is reproducible from the pin, and which makes no model call
// used-by:      scripts/eval-run.mjs (the CLI); covered by tests/unit/eval-run.test.mjs
import path from "node:path";
import { existsSync, statSync, readdirSync, mkdirSync, writeFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { listSkillDirs, readJsonSafe, relPath } from "./fs-utils.mjs";

/** The tracked pinned-sha corpus manifest (R-PIPE-1), relative to the repo root. */
export const CORPUS_REL = "docs/internal/eval-runs/corpus.json";
/** Where raw run artifacts land. Gitignored: the tracked surfaces are the record and the dossier. */
export const RUNS_DIR_REL = "_local/audit/eval-runs";
/** The advisory dispatch templates a recorded run points at (R-PIPE-3). */
export const DISPATCH_TEMPLATES = {
  review: "docs/internal/eval-runs/dispatch-reviewer.md",
  behavioral: "docs/internal/eval-runs/dispatch-grader.md",
};

/** A refusal, never a silent skip: every unverifiable precondition throws this. */
export class EvalRunError extends Error {
  constructor(message, code = "refused") {
    super(`eval-run REFUSED: ${message}`);
    this.name = "EvalRunError";
    this.code = code;
  }
}

const refuse = (message, code) => { throw new EvalRunError(message, code); };

/**
 * Forward-slash normalization, applied to every path before it reaches a seam. This is the recorded
 * Windows trap: a backslash path handed through a shell was mangled into a directory that did not exist,
 * the gate graded an empty tree, and it printed a clean pass. Unconditional (not win32-only) so the
 * behavior is identical on every platform and testable in CI; a literal backslash inside a corpus clone
 * path is out of scope by construction.
 */
export function toPosix(p) {
  return String(p).split(path.sep).join("/").replace(/\\/g, "/");
}

/** The markers that make a directory gradeable at all. A tree with none of them cannot be graded. */
const GRADEABLE_MARKERS = ["library.json", "SKILL.md", "AGENTS.md", "skills", ".claude-plugin"];

/**
 * The second half of the empty-directory guard: the tree must actually look like something the evaluator
 * can grade. Pin verification proves the bytes are the intended ones; this proves they are a subject.
 * Without it, a wrong --subpath still grades an existing-but-irrelevant directory to a vacuous pass.
 */
export function assertGradeable(target) {
  const found = GRADEABLE_MARKERS.filter((m) => existsSync(path.join(target, m)));
  if (found.length === 0) {
    refuse(
      `nothing gradeable at ${toPosix(target)}: expected at least one of ${GRADEABLE_MARKERS.join(", ")}. ` +
      `A directory with no subject grades to a vacuous pass, which is exactly the failure this pipeline exists to prevent.`,
      "not-gradeable"
    );
  }
  return found;
}

const runGit = (args, cwd) => execFileSync("git", args, { cwd, encoding: "utf8" }).trim();

/**
 * R-PIPE-2's precondition: the clone exists, is non-empty, is a git repository, sits exactly at the pinned
 * sha (a short pin matches as a prefix), and carries no uncommitted change. Anything else is a REFUSAL, so
 * a drifted or empty tree can never be graded and recorded as if it were the pin.
 */
export function verifyPin(entry, deps = {}) {
  const git = deps.git ?? runGit;
  const clone = toPosix(path.resolve(entry.clonePath ?? ""));
  if (!entry.clonePath) refuse(`target "${entry.id}" has no clonePath`, "no-clone-path");
  if (!existsSync(clone)) refuse(`clone path does not exist: ${clone} (clone the repo and check out ${entry.sha})`, "missing-clone");
  if (!statSync(clone).isDirectory()) refuse(`clone path is not a directory: ${clone}`, "not-a-directory");
  const children = readdirSync(clone).filter((n) => n !== ".git");
  if (children.length === 0) refuse(`clone path is empty: ${clone} (an empty tree grades to a vacuous pass)`, "empty-clone");
  if (!existsSync(path.join(clone, ".git"))) refuse(`clone path is not a git repository, so the pin cannot be verified: ${clone}`, "not-a-repo");

  let head;
  try {
    head = git(["rev-parse", "HEAD"], clone);
  } catch (e) {
    refuse(`could not read HEAD in ${clone}: ${e.message}`, "git-failed");
  }
  const pin = String(entry.sha ?? "").trim();
  if (!pin) refuse(`target "${entry.id}" has no pinned sha; a run with no pin is not reproducible`, "no-pin");
  if (!head.startsWith(pin)) {
    refuse(
      `${clone} is not at the pinned sha: manifest pins ${pin}, on disk is ${head.slice(0, 7)} (${head}). ` +
      `Check out the pin (git -C "${clone}" checkout ${pin}) or update the corpus manifest deliberately.`,
      "sha-mismatch"
    );
  }
  let dirty = "";
  try {
    dirty = git(["status", "--porcelain"], clone);
  } catch (e) {
    refuse(`could not read the working-tree status in ${clone}: ${e.message}`, "git-failed");
  }
  if (dirty) {
    const first = dirty.split(/\r?\n/).slice(0, 3).join("; ");
    refuse(`${clone} has uncommitted changes, so it is not the pinned bytes: ${first}`, "dirty-tree");
  }
  return { clone, head, children: children.length };
}

/** Load and shallow-validate the tracked corpus manifest. */
export function loadCorpus(repoRoot, manifestPath) {
  const file = manifestPath ? path.resolve(manifestPath) : path.join(repoRoot, CORPUS_REL);
  const { data, parseError } = readJsonSafe(file);
  if (parseError) refuse(`corpus manifest is not valid JSON (${toPosix(file)}): ${parseError}`, "bad-manifest");
  if (!data) refuse(`corpus manifest not found: ${toPosix(file)}`, "missing-manifest");
  if (!Array.isArray(data.targets)) refuse(`corpus manifest has no "targets" array: ${toPosix(file)}`, "bad-manifest");
  for (const t of data.targets) {
    for (const field of ["id", "repo", "sha", "scope", "clonePath"]) {
      if (!t?.[field]) refuse(`corpus target ${JSON.stringify(t?.id ?? t)} is missing "${field}"`, "bad-manifest");
    }
  }
  return { ...data, file: toPosix(file) };
}

const looksLikePath = (s) => /[\\/]/.test(s) || s === "." || s === ".." || existsSync(s);

/**
 * Resolve a CLI token to a corpus entry. A manifest id is the reproducible path; an ad hoc filesystem
 * path is allowed only with an explicit --sha, because the pin - not the path - is what makes a reading
 * re-derivable. An unknown bare token is a refusal rather than a guess.
 */
export function resolveTarget(corpus, idOrPath, over = {}) {
  const hit = (corpus.targets ?? []).find((t) => t.id === idOrPath);
  const overrides = Object.fromEntries(Object.entries(over).filter(([, v]) => v !== undefined && v !== null));
  if (hit) return { ...hit, ...overrides };
  if (!looksLikePath(idOrPath)) {
    refuse(
      `"${idOrPath}" is not in the corpus manifest (known ids: ${(corpus.targets ?? []).map((t) => t.id).join(", ")}). ` +
      `Add it to ${CORPUS_REL}, or pass a path plus --sha for a one-off.`,
      "unknown-target"
    );
  }
  if (!overrides.sha) {
    refuse(
      `an ad hoc target path needs an explicit pin: pass --sha <sha> (a run with no verified pin is not reproducible, ` +
      `and unpinned targets do not belong in the record)`,
      "no-pin"
    );
  }
  return {
    id: path.basename(idOrPath.replace(/[\\/]+$/, "")) || "ad-hoc",
    repo: overrides.repo ?? "(ad hoc; not in the corpus manifest)",
    sha: overrides.sha,
    scope: overrides.scope ?? "plugin",
    clonePath: idOrPath,
    subpath: overrides.subpath ?? null,
    profile: overrides.profile ?? null,
    notes: "ad hoc target, not in the corpus manifest",
    adHoc: true,
    ...overrides,
  };
}

/** owner/name from a GitHub URL, for the record's target label. */
function repoSlug(repo) {
  const m = String(repo).match(/github\.com[/:]([^/]+\/[^/.]+)/);
  return m ? m[1] : String(repo);
}

/** The record's "Target (pinned)" cell, built once by the runner so the aggregator never re-derives it. */
export function entryLabel(entry) {
  const parts = ["`" + repoSlug(entry.repo) + "`"];
  if (entry.subpath) parts.push("`" + entry.subpath + "`");
  parts.push("@ `" + String(entry.sha).slice(0, 7) + "`");
  return parts.join(" ");
}

/**
 * R-PIPE-5: a bound is stated, never silent. Selecting the first N of a batch names both what ran and what
 * was dropped, and the statement travels into the run outputs and the appended record rows.
 */
export function planBatch(entries, limit) {
  const n = Number(limit);
  if (!Number.isFinite(n) || n <= 0 || n >= entries.length) return { selected: [...entries], dropped: [], bounds: [] };
  const selected = entries.slice(0, n);
  const dropped = entries.slice(n);
  return {
    selected,
    dropped,
    bounds: [{
      kind: "target-limit",
      stated: `coverage bound: graded ${n} of ${entries.length} requested targets (--limit ${n}). ` +
        `Dropped: ${dropped.map((e) => e.id).join(", ")}. This batch is NOT full corpus coverage.`,
    }],
  };
}

/**
 * The one seam to the gate and the renderer: an npm script, never a script path. If the standards program
 * relocates the checker, the npm script definition is the single place that repoints and this pipeline is
 * unchanged (the R1 relocation ruling; see docs/internal/execution/relocation-addendum.md).
 */
export function npmSeam({ script, args = [], cwd }) {
  const quoted = args.map((a) => (/[\s"]/.test(a) ? `"${a}"` : a)).join(" ");
  const command = `npm run ${script} --silent -- ${quoted}`.trim();
  const r = spawnSync(command, { cwd, shell: true, encoding: "utf8" });
  if (r.error) refuse(`could not run the "${script}" npm script: ${r.error.message}`, "seam-failed");
  return { status: r.status, stdout: r.stdout ?? "", stderr: r.stderr ?? "", command };
}

/** The gate's own summary line is the verdict of record; an unparseable one means the gate did not grade. */
export function parseGateSummary(stdout) {
  const m = [...String(stdout).matchAll(/(\d+)\s+error\(s\),\s+(\d+)\s+warning\(s\)\./g)].pop();
  return m ? { errors: Number(m[1]), warns: Number(m[2]) } : null;
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const stampOf = (now) => now.toISOString().slice(11, 19).replace(/:/g, "");
const dateOf = (now) => now.toISOString().slice(0, 10);

/**
 * Run one target end to end, deterministically and with no model call: verify the pin, normalize the path,
 * grade through the `check` npm script seam, render the conformance HTML + Markdown + JSON through the
 * `evaluate` seam, then write the gate log and the record skeleton the aggregator turns into a row.
 *
 * The returned exit status of the gate is DATA, not the runner's own outcome: a subject with errors is a
 * successful run of the pipeline. Only an unverifiable precondition or a seam that could not grade refuses.
 */
export function runOne(entry, opts = {}, deps = {}) {
  const seam = deps.seam ?? npmSeam;
  const git = deps.git ?? runGit;
  const now = (deps.now ?? (() => new Date()))();
  const repoRoot = opts.repoRoot ?? process.cwd();
  const date = opts.date ?? dateOf(now);
  const profile = opts.profile ?? entry.profile ?? null;
  const reportType = opts.reportType ?? "review";

  const { clone, head } = verifyPin(entry, deps);
  const target = toPosix(entry.subpath ? path.join(clone, entry.subpath) : clone);
  if (!existsSync(target)) refuse(`subpath does not exist in the clone: ${target}`, "missing-subpath");
  assertGradeable(target);

  const outDir = opts.outDir ?? path.join(repoRoot, RUNS_DIR_REL, date);
  mkdirSync(outDir, { recursive: true });
  const runKey = `${entry.id}${entry.subpath ? "-" + entry.subpath.replace(/[\\/]+/g, "-") : ""}-${stampOf(now)}`;
  const out = (suffix) => path.join(outDir, `${runKey}-${suffix}`);
  const outputs = { html: out("conformance.html"), md: out("conformance.md"), json: out("conformance.json"), gateLog: out("gate.txt") };
  const profileArgs = profile ? ["--profile", profile] : [];
  const seamCommands = [];

  // 1. the gate: the verdict of record, reached only through the npm script seam.
  const gate = seam({ script: "check", args: [target, ...profileArgs], cwd: repoRoot });
  seamCommands.push(gate.command);
  if (gate.status !== 0 && gate.status !== 1) {
    refuse(`the gate seam exited ${gate.status} (expected 0 or 1)\n${gate.command}\n${gate.stdout}\n${gate.stderr}`, "gate-error");
  }
  const summary = parseGateSummary(gate.stdout);
  if (!summary) {
    refuse(
      `the gate produced no parseable verdict for ${target}, so nothing was graded:\n${gate.command}\n${gate.stdout || "(no output)"}\n${gate.stderr}`,
      "no-verdict"
    );
  }

  // 2. the report: HTML + Markdown for a human, JSON for the record's structured fields.
  for (const [fmt, file] of [["html", outputs.html], ["md", outputs.md], ["json", outputs.json]]) {
    const r = seam({ script: "evaluate", args: [target, "--report=conformance", `--format=${fmt}`, "--out", file, ...profileArgs], cwd: repoRoot });
    seamCommands.push(r.command);
    if (r.status !== 0 && r.status !== 1) refuse(`the render seam exited ${r.status} for --format=${fmt}\n${r.command}\n${r.stderr}`, "render-error");
    if (!existsSync(file)) refuse(`the render seam wrote no ${fmt} output at ${toPosix(file)}\n${r.command}\n${r.stderr}`, "render-missing");
  }
  const report = readJsonSafe(outputs.json).data ?? {};

  // 3. the run log and the coverage bounds (R-PIPE-5), then the record skeleton.
  const skillCount = listSkillDirs(target).length;
  const bounds = [
    ...(opts.bounds ?? []),
    {
      kind: "deterministic-coverage",
      stated: `the free gate graded the whole target at the pin (${plural(skillCount, "skill directory", "skill directories")} under skills/); ` +
        `this run made no model call, so every advisory field is pending dispatch`,
    },
  ];
  if (skillCount >= 50) {
    bounds.push({
      kind: "advisory-sampling",
      stated: `collection scale: ${skillCount} skills on disk. The deterministic gate read all ${skillCount}; the advisory dispatch ` +
        `template instructs stratified sampling, so an advisory pass on this target is a SAMPLE, not full coverage.`,
    });
  }

  let toolkitCommit = null;
  try { toolkitCommit = git(["rev-parse", "--short", "HEAD"], repoRoot); } catch { toolkitCommit = null; }
  const lib = readJsonSafe(path.join(repoRoot, "library.json")).data ?? {};
  const pointerDir = toPosix(outDir).startsWith(toPosix(repoRoot)) ? relPath(repoRoot, outDir) : toPosix(outDir);

  const skeleton = {
    schema: "askit-eval-run-skeleton/1",
    runKey,
    runId: null, // assigned by the aggregator, so ids stay sequential in the tracked record
    date,
    scope: report.scope ?? entry.scope,
    reportType,
    profile,
    target: {
      id: entry.id,
      repo: entry.repo,
      sha: head,
      shortSha: head.slice(0, 7),
      pin: entry.sha,
      structuralScope: entry.scope,
      path: target,
      subpath: entry.subpath ?? null,
      label: entryLabel({ ...entry, sha: head }),
      skillsOnDisk: skillCount,
    },
    gate: {
      errors: summary.errors,
      warns: summary.warns,
      exitCode: gate.status,
      tier: report.tier ?? null,
      reportErrors: report.summary?.errors ?? null,
      reportWarns: report.summary?.warns ?? null,
      verdict: `${summary.errors}E / ${summary.warns}W${report.tier ? `, Tier ${report.tier}` : ""}${profile ? ` (${profile})` : ""}`,
    },
    advisory: {
      model: null,
      effort: null,
      tokens: null,
      wallClockSeconds: null,
      toolUses: null,
      result: null,
      dispatchTemplate: DISPATCH_TEMPLATES[reportType] ?? null,
    },
    outputs: {
      pointer: `${pointerDir}/${runKey}-*`,
      html: toPosix(outputs.html),
      md: toPosix(outputs.md),
      json: toPosix(outputs.json),
      gateLog: toPosix(outputs.gateLog),
    },
    bounds,
    toolkit: { version: lib.version ?? null, standard: lib.standard ?? null, commit: toolkitCommit },
    seamCommands,
  };

  writeFileSync(outputs.gateLog, [
    `# eval-run gate log`,
    `run: ${runKey}`,
    `target: ${target}`,
    `pin: ${entry.sha} (HEAD ${head})`,
    `profile: ${profile ?? "(default)"}`,
    ...seamCommands.map((c) => `seam: ${c}`),
    `exit: ${gate.status}`,
    "",
    gate.stdout.trimEnd(),
    "",
    ...bounds.map((b) => `bound (${b.kind}): ${b.stated}`),
    "",
  ].join("\n"), "utf8");

  const skeletonPath = out("record.json");
  writeFileSync(skeletonPath, JSON.stringify(skeleton, null, 2) + "\n", "utf8");

  return { runKey, date, outDir, skeletonPath, skeleton, outputs, gate: skeleton.gate, bounds, seamCommands };
}
