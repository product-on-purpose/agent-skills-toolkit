// what-it-is:   the first-party validator parity harness (ADR 0042)
// what-it-does: runs `claude plugin validate --strict` against the repo root and templates/seed-plugin,
//               runs the skills-ref reference validator (`agentskills validate`) across every skills/*
//               directory, and separately round-trips every skill's `metadata:` block through the
//               reference PARSER (not just the validator's exit code) so a value the parser silently
//               rewrites cannot pass as clean. Also pins and reports both validator identities (the
//               installed claude CLI version, and the installed skills-ref PyPI release measured
//               against the upstream-pin.json SOURCE blob it is a different identity from) and flags
//               any skew between them. REPORT-ONLY in this release: always exits 0 - see PARITY_MODE.
// why:          STANDARD.md sec 6 claims the Universal tier tracks agentskills.io and the README claims
//               a Bronze plugin is portable; until this script existed the only evidence for either was
//               this repository's own gate. ADR 0040 found `agentskills validate` reporting "Valid
//               skill" for all 24 skills while `metadata.chain` was being silently mangled by the
//               reference parser, because the reference VALIDATOR never inspects `metadata` contents at
//               all - only the PARSER touches them. A harness that only checks exit codes reproduces
//               that exact blind spot in CI and calls it coverage; this is the harness that does not.
// used-by:      .github/workflows/ci.yml (the validator-parity job); run locally with
//               `node scripts/check-parity.mjs .`; docs/internal/decisions/0042-validator-parity-is-report-only-and-checks-parsed-values.md
import { readFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { parseFrontmatter } from "./lib/frontmatter.mjs";
import { listSkillDirs, normalizeArgPath, relPath } from "./lib/fs-utils.mjs";

// PARITY_MODE: the one-line gating flip named in ADR 0042 ("Why report-only for one release"). Today
// this is "report-only": disagreements are printed but never fail the job (decideExitCode below always
// returns 0). Changing this single string to "gating" is the entire flip; the release that is expected
// to make that change, and the evidence that must exist first, is recorded in ADR 0042.
export const PARITY_MODE = "report-only";

const ADR = "ADR 0042 (validator parity is report-only and checks parsed values)";

/**
 * git blob SHA-1 of raw bytes: sha1("blob " + length + NUL + bytes). Identical to `git hash-object
 * <file>` and to the convention documented in docs/internal/standards-watch/upstream-pin.json - pure,
 * no git binary dependency, so it produces the same answer wherever Node runs (including a runner with
 * no git config quirks, e.g. core.autocrlf, in play).
 */
export function gitBlobSha1(buffer) {
  const header = Buffer.from(`blob ${buffer.length}\0`, "utf8");
  return createHash("sha1").update(Buffer.concat([header, buffer])).digest("hex");
}

/**
 * Compare our own parsed `metadata:` block (native YAML types, from this repo's own frontmatter
 * parser) against the SAME block as read back through skills-ref's reference PARSER, which coerces
 * every metadata value through Python's str() (skills_ref/parser.py, parse_frontmatter). This is the
 * parsed-values half of the parity invariant required by ADR 0040 / ADR 0042: a value only "survives"
 * if it was already a JS string AND the reference parser echoes it back byte-for-byte. Anything else -
 * a non-string YAML value (number, boolean, list, nested map), or a string the parser altered - is
 * reported with the specific reason it failed, never silently dropped or silently passed.
 * @param {object|null} ours the `metadata` object from this repo's own parseFrontmatter
 * @param {object|null} reference the `metadata` object skills-ref's parse_frontmatter produced for the
 *   SAME file (already str()-coerced by the reference implementation, not by this function)
 * @returns {Array<{key: string, reason: "missing-here"|"missing-in-reference"|"coerced-non-string"|"value-changed", ours: *, reference: *}>}
 */
export function diffMetadataParity(ours, reference) {
  const oursObj = ours && typeof ours === "object" && !Array.isArray(ours) ? ours : {};
  const referenceObj = reference && typeof reference === "object" && !Array.isArray(reference) ? reference : {};
  const keys = new Set([...Object.keys(oursObj), ...Object.keys(referenceObj)]);
  const mismatches = [];
  for (const key of [...keys].sort()) {
    const hasOurs = Object.prototype.hasOwnProperty.call(oursObj, key);
    const hasRef = Object.prototype.hasOwnProperty.call(referenceObj, key);
    if (!hasRef) {
      mismatches.push({ key, reason: "missing-in-reference", ours: oursObj[key], reference: undefined });
      continue;
    }
    if (!hasOurs) {
      mismatches.push({ key, reason: "missing-here", ours: undefined, reference: referenceObj[key] });
      continue;
    }
    const ov = oursObj[key];
    const rv = referenceObj[key];
    if (typeof ov !== "string") {
      // The spec defines metadata values as strings; anything else is coerced by str() and cannot
      // round-trip in general (a YAML list becomes a Python list-repr string, a boolean "True"/"False"
      // with a capital letter, a number stringified). This is the metadata.chain incident's shape.
      mismatches.push({ key, reason: "coerced-non-string", ours: ov, reference: rv });
      continue;
    }
    if (ov !== rv) {
      mismatches.push({ key, reason: "value-changed", ours: ov, reference: rv });
    }
  }
  return mismatches;
}

/**
 * Compare the upstream-pin.json blob identities (the skills-ref SOURCE blobs on GitHub, the identity
 * askit-standards-watch tracks) against the blob identities of the skills-ref release this harness
 * ACTUALLY RAN (a PyPI package). These are two different identities by design - a released package is
 * cut at some point in history and does not follow the upstream default branch - so disagreement is
 * expected some of the time, not itself a defect; what matters is that it is measured and reported
 * rather than assumed away. `installedBlobs` is keyed by basename (e.g. "parser.py"), as produced by
 * the version probe in runVersionProbe().
 * @returns {Array<{file: string, pinnedSha: string, installedSha: string|null, match: boolean|null}>}
 */
export function summarizePinSkew(pinnedArtifacts, installedBlobs) {
  return pinnedArtifacts
    .filter((a) => a.role === "reference-implementation")
    .map((a) => {
      const base = path.basename(a.path);
      const installed = installedBlobs[base];
      return {
        file: a.path,
        pinnedSha: a.blobSha,
        installedSha: installed ? installed.blobSha : null,
        match: installed ? installed.blobSha === a.blobSha : null,
      };
    });
}

/**
 * Reduced-fidelity, offline, dependency-free stand-in for `claude plugin validate --strict`, engaged
 * ONLY when the real `claude` CLI is not found on PATH (see resolveClaude below). Checks the one hard
 * requirement the v1.11.0 release plan named as sufficient for install recognition: a
 * .claude-plugin/plugin.json (or marketplace.json) that is valid JSON and carries a non-empty string
 * "name". This is deliberately NOT a reimplementation of the real validator's full rule set (it does
 * not check the author-field warning, keyword shape, or anything --strict additionally tightens) - it
 * exists so a contributor without the claude CLI installed still gets a real, if narrower, answer
 * instead of silence, and the report always says plainly which one ran.
 */
export function vendorValidateManifest(targetDirAbs) {
  const pluginPath = path.join(targetDirAbs, ".claude-plugin", "plugin.json");
  const marketplacePath = path.join(targetDirAbs, ".claude-plugin", "marketplace.json");
  const manifestPath = existsSync(pluginPath) ? pluginPath : existsSync(marketplacePath) ? marketplacePath : null;
  if (!manifestPath) {
    return {
      pass: false,
      reason: "No manifest found in directory. Expected .claude-plugin/marketplace.json or .claude-plugin/plugin.json",
    };
  }
  let data;
  try {
    data = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch (e) {
    return { pass: false, reason: `${path.basename(manifestPath)} is not valid JSON: ${e.message}` };
  }
  if (typeof data.name !== "string" || data.name.trim() === "") {
    return { pass: false, reason: `${path.basename(manifestPath)} is missing a non-empty "name" field` };
  }
  return { pass: true, reason: `${path.basename(manifestPath)} present, valid JSON, carries "name"` };
}

/** The gating flip, isolated to one pure function so the day PARITY_MODE moves to "gating" the exit
 *  behavior is already tested, not discovered. Report-only: always 0. Gating: 1 iff a first-party
 *  validator actually ran and disagreed (never for a section that did not run - see anyDisagreement). */
export function decideExitCode(mode, hasDisagreement) {
  return mode === "gating" && hasDisagreement ? 1 : 0;
}

/** True iff any vendor-validate result actually ran, did not pass, and carries NO documented exception
 *  (see PARITY_EXCEPTIONS / applyExceptions below), OR any exception-list entry itself failed integrity
 *  validation (see validateExceptions). A result that never ran (tool unavailable, fallback engaged or
 *  not) is never counted - "we could not check" is not "it failed", and conflating the two is exactly
 *  the false-green failure mode this harness exists to avoid. A DOCUMENTED disagreement is also never
 *  counted: it is a decision this project made on the record (ADR 0042, following the ADR 0029
 *  reclassification precedent), not a defect, and must not gate once PARITY_MODE flips - that is the
 *  entire reason the exception path exists rather than every disagreement being treated alike. A
 *  BROKEN exception (its ADR does not resolve to a real file) is the opposite case: an authorization
 *  nobody can check is worse than no authorization, so it counts as if undocumented. Only
 *  "vendor-validate" and "exception-integrity" kind results count toward disagreement; the
 *  metadata-parity and pin-skew sections are evidence, not first-party verdicts, and are never gating
 *  even after PARITY_MODE flips (see ADR 0042). */
export function anyDisagreement(results) {
  return results.some(
    (r) =>
      (r.kind === "vendor-validate" && r.ran && r.pass === false && !r.exception) ||
      (r.kind === "exception-integrity" && r.pass === false)
  );
}

// ---------------------------------------------------------------------------------------------------
// The documented-exception path (ADR 0042, "The documented-exception path"). Deliberately minimal - a
// fixed, hand-maintained array, not a general suppression engine - sized to the exceptions that
// actually exist. A legitimate disagreement is never silently dropped: it is ANNOTATED with the ADR
// that authorizes it, still reported as a failure, and still counted (separately, as "documented"
// rather than "undocumented") in the summary. Silence is exactly how the metadata.chain incident
// (ADR 0040) survived; this path exists so the same thing cannot happen to a parity finding.
// ---------------------------------------------------------------------------------------------------

/**
 * Every known, deliberate first-party disagreement, recorded so it renders as an explained decision
 * rather than a bare failure. Each entry: `target` (the relative path this harness reports, exactly as
 * printed), `tool` ("claude" or "skills-ref" - the vendor whose validator disagrees), `adr` (the ADR
 * number that authorizes treating this as intentional; validateExceptions() below asserts it resolves
 * to a real file), and `reason` (a short, human-readable summary, not just the ADR number - the whole
 * point is that a reader does not have to go open the ADR to know THAT this was a decision).
 *
 * The one entry that exists today: templates/seed-plugin has no author to declare, on purpose. ADR
 * 0043 (Bronze scaffold defaults a minimal native manifest) considered shipping a placeholder author to
 * make `--strict` pass unconditionally and rejected it outright, because `U5` (description-score, ADR
 * 0033) already penalizes exactly this shape of defect - fabricated content dressed as real content -
 * for descriptions, and a fabricated `author.name` is the same move applied to a new field. A plugin
 * scaffolded through `askit-init-plugin`'s interview mode supplies a real author and passes `--strict`
 * outright; the raw, unfilled template does not and, per ADR 0043, should not.
 */
export const PARITY_EXCEPTIONS = [
  {
    target: "templates/seed-plugin",
    tool: "claude",
    adr: "0043",
    reason:
      'The raw scaffold genuinely has no author to declare. ADR 0043 considered a placeholder ' +
      '(e.g. {"name": "REPLACE - your name"}) and rejected it: U5 (description-score, ADR 0033) already ' +
      "penalizes fabricated content dressed as real content, and a placeholder author is the same " +
      "defect applied to a new field. A plugin scaffolded through askit-init-plugin's interview mode " +
      "supplies a real author and passes --strict outright; the unfilled template correctly keeps " +
      "warning, permanently, not pending a future fix.",
  },
];

/**
 * Find the documented exception (if any) authorizing a vendor-validate result's disagreement. Match is
 * EXACT on target and tool - no glob or prefix matching - so an exception can never silently widen to
 * cover a target nobody reviewed for it. "claude-fallback" (the vendored local-only stand-in engaged
 * when the real CLI is not on PATH) matches a "claude" exception: it is still the same vendor rule,
 * just checked through the reduced-fidelity path.
 */
export function findException(exceptions, result) {
  const tool = result.tool === "claude-fallback" ? "claude" : result.tool;
  return exceptions.find((e) => e.target === result.target && e.tool === tool) ?? null;
}

/**
 * Attach the matching documented exception (if any) to each FAILING vendor-validate result. Never
 * hides a failure: `.exception` is metadata alongside the unchanged `.pass`/`.ran`/`.detail`, not a
 * replacement for them - a documented disagreement is still reported as `pass: false`, only annotated.
 * A passing result is left alone even if an exception entry exists for its target (nothing to explain
 * when there is no disagreement), and a non-"vendor-validate" result passes through untouched.
 */
export function applyExceptions(results, exceptions) {
  return results.map((r) => {
    if (r.kind !== "vendor-validate" || r.pass !== false) return r;
    const exception = findException(exceptions, r);
    return exception ? { ...r, exception } : r;
  });
}

/** The relative path of the ADR file whose filename starts with the given 4-digit number under
 *  docs/internal/decisions/, or null when none exists. Matches by prefix (`NNNN-`) rather than an
 *  exact filename, since ADR filenames carry a descriptive slug this harness should not have to
 *  hand-maintain a second copy of. */
export function resolveAdrFile(root, adrNumber) {
  const dir = path.join(root, "docs", "internal", "decisions");
  if (!existsSync(dir)) return null;
  const prefix = `${String(adrNumber).padStart(4, "0")}-`;
  const match = readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .find((f) => f.startsWith(prefix));
  return match ? path.join(dir, match) : null;
}

/**
 * Integrity check on the exception list ITSELF: every entry's `adr` must resolve to a real file under
 * docs/internal/decisions/, via resolveAdrFile(). An exception justified by a decision record that does
 * not exist is worse than no exception at all - it reads as authorized when nobody can actually check
 * it - so an unresolved reference is reported as its own finding (`kind: "exception-integrity"`) rather
 * than trusted at face value. Returns [] when every exception's ADR is real.
 */
export function validateExceptions(exceptions, root) {
  const findings = [];
  for (const e of exceptions) {
    if (!resolveAdrFile(root, e.adr)) {
      findings.push({
        kind: "exception-integrity",
        target: e.target,
        ran: true,
        pass: false,
        detail: `documented exception for "${e.target}" (tool: ${e.tool}) cites ADR ${e.adr}, which does not resolve to a file under docs/internal/decisions/. A broken citation authorizes nothing - fix the ADR number or remove the exception.`,
      });
    }
  }
  return findings;
}

/**
 * Count vendor-validate disagreements (ran, did not pass) split into documented (carries a matching
 * exception, per applyExceptions) and undocumented. Only the undocumented count is meant to ever gate
 * (see anyDisagreement), but both are surfaced in the report - a documented exception is still worth a
 * human seeing at a glance, and "every disagreement here is documented" is a materially different, and
 * better, state than "there happen to be zero disagreements today."
 */
export function summarizeDisagreements(results) {
  const vendorFails = results.filter((r) => r.kind === "vendor-validate" && r.ran && r.pass === false);
  const documented = vendorFails.filter((r) => r.exception).length;
  return { total: vendorFails.length, documented, undocumented: vendorFails.length - documented };
}

/**
 * The human-readable status line for one vendor-validate result, including its documented-exception
 * annotation when present. Pure formatting, split out from main() so the annotation contract - never
 * silently dropping a failure, always naming the authorizing ADR right on the failing line rather than
 * only in a separate summary - is unit-testable without spawning a real validator.
 */
export function formatResultLine(result) {
  if (result.pass) return `  [PASS] ${result.target}`;
  if (result.exception) return `  [FAIL, documented exception: ADR ${result.exception.adr}] ${result.target}`;
  return `  [FAIL] ${result.target}`;
}

// ---------------------------------------------------------------------------------------------------
// I/O: process spawning, tool detection, and the repo-specific orchestration. Everything above this
// line is pure and exercised directly by tests/unit/check-parity.test.mjs; everything below is a thin
// shell around it.
// ---------------------------------------------------------------------------------------------------

// Deliberately shell:false (Node's default) everywhere, including on Windows. An earlier draft set
// shell:true there defensively (for a hypothetical npm .cmd shim), and it was wrong: cmd.exe's own
// argument requoting corrupts the multi-line `python -c <script>` argument this module passes to
// uvx (verified locally - the identical script argument parses fine with shell:false and fails with
// "SyntaxError: invalid syntax" on line 1 with shell:true, because cmd.exe collapses the embedded
// newlines). Node resolves a real .exe target (what `claude`/`uvx` actually are on every platform this
// was tested on, including this maintainer's Windows machine) without a shell either way, so shell:true
// bought no real portability and broke a real invocation.
const SPAWN_OPTS = { encoding: "utf8" };

function commandExists(cmd) {
  const r = spawnSync(cmd, ["--version"], SPAWN_OPTS);
  return !r.error;
}

function runClaudeValidate(targetAbs) {
  return spawnSync("claude", ["plugin", "validate", targetAbs, "--strict"], SPAWN_OPTS);
}

function runClaudeVersion() {
  const r = spawnSync("claude", ["--version"], SPAWN_OPTS);
  return r.error ? null : String(r.stdout || "").trim();
}

function runSkillsRefValidate(skillDirAbs) {
  return spawnSync("uvx", ["--from", "skills-ref", "agentskills", "validate", skillDirAbs], SPAWN_OPTS);
}

// Reads one SKILL.md through the REFERENCE implementation's own parser (not a JS reimplementation of
// it) and prints its post-coercion `metadata` block as JSON, so diffMetadataParity compares against
// what skills-ref actually produced rather than a guess at what str() would do to it.
const REFERENCE_PARSE_SCRIPT = [
  "import sys, json",
  "from skills_ref.parser import parse_frontmatter",
  "try:",
  '    text = open(sys.argv[1], encoding="utf-8").read()',
  "    fm, _ = parse_frontmatter(text)",
  '    print(json.dumps({"ok": True, "metadata": fm.get("metadata")}))',
  "except Exception as e:",
  '    print(json.dumps({"ok": False, "error": str(e)}))',
].join("\n");

function runReferenceParse(skillMdAbs) {
  return spawnSync("uvx", ["--from", "skills-ref", "python", "-c", REFERENCE_PARSE_SCRIPT, skillMdAbs], SPAWN_OPTS);
}

// The version + pin-identity probe: the installed skills-ref PyPI version, plus the git-blob-sha1 (see
// gitBlobSha1 above - same formula, computed independently in Python here since this reads the
// INSTALLED package's own files) of the three reference-implementation source files the upstream pin
// tracks. Run once per harness invocation, not per skill.
const VERSION_PROBE_SCRIPT = [
  "import json, hashlib",
  "import importlib.metadata as im",
  "out = {}",
  "try:",
  '    out["version"] = im.version("skills-ref")',
  "except Exception:",
  '    out["version"] = None',
  "import skills_ref.parser as parser_mod",
  "import skills_ref.validator as validator_mod",
  "import skills_ref.models as models_mod",
  "blobs = {}",
  'for name, mod in (("parser.py", parser_mod), ("validator.py", validator_mod), ("models.py", models_mod)):',
  '    data = open(mod.__file__, "rb").read()',
  '    header = ("blob %d\\x00" % len(data)).encode()',
  '    blobs[name] = {"blobSha": hashlib.sha1(header + data).hexdigest(), "bytes": len(data)}',
  'out["files"] = blobs',
  "print(json.dumps(out))",
].join("\n");

function runVersionProbe() {
  return spawnSync("uvx", ["--from", "skills-ref", "python", "-c", VERSION_PROBE_SCRIPT], SPAWN_OPTS);
}

function readOurMetadata(skillMdAbs) {
  const text = readFileSync(skillMdAbs, "utf8");
  const { frontmatter } = parseFrontmatter(text);
  const md = frontmatter?.metadata;
  return md && typeof md === "object" && !Array.isArray(md) ? md : null;
}

function readPin(root) {
  const p = path.join(root, "docs", "internal", "standards-watch", "upstream-pin.json");
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function line(s = "") {
  process.stdout.write(s + "\n");
}

function main() {
  const argv = process.argv.slice(2);
  const root = path.resolve(argv[0] ? normalizeArgPath(argv[0]) : process.cwd());
  const results = []; // { kind, tool, target, ran, fallback, pass, detail }

  line("=".repeat(78));
  line(`check-parity: first-party validator parity harness (${ADR})`);
  line(`>>> REPORT-ONLY (PARITY_MODE = "${PARITY_MODE}"): findings below never fail this job. <<<`);
  line(`>>> Flip to gating: change PARITY_MODE in scripts/check-parity.mjs to "gating" (one line). <<<`);
  line("=".repeat(78));
  line("");

  // --- Section A: claude plugin validate (or the vendored fallback) ---
  const hasClaude = commandExists("claude");
  line(`-- claude plugin validate --strict ${hasClaude ? "(real CLI, version " + (runClaudeVersion() ?? "unknown") + ")" : "(claude CLI NOT FOUND on PATH - vendored fallback engaged)"} --`);
  for (const target of [root, path.join(root, "templates", "seed-plugin")]) {
    const rel = relPath(root, target) || ".";
    let result;
    if (hasClaude) {
      const r = runClaudeValidate(target);
      const pass = r.status === 0;
      result = { kind: "vendor-validate", tool: "claude", target: rel, ran: true, fallback: false, pass, detail: (r.stdout || "") + (r.stderr || "") };
    } else {
      const r = vendorValidateManifest(target);
      result = { kind: "vendor-validate", tool: "claude-fallback", target: rel, ran: true, fallback: true, pass: r.pass, detail: r.reason };
    }
    // applyExceptions() over a single-item array so this loop reuses the exact same matching logic
    // tests/unit/check-parity.test.mjs exercises directly - never a second, divergent copy of it here.
    [result] = applyExceptions([result], PARITY_EXCEPTIONS);
    results.push(result);
    line(formatResultLine(result) + (result.fallback ? "  (REDUCED-FIDELITY FALLBACK)" : ""));
    // A documented exception is ANNOTATED, never hidden: the ADR is already on the status line
    // (formatResultLine), and the human-readable reason prints right below it so a reader never has to
    // leave this report to know why a first-party FAIL is expected.
    if (result.exception) line(`    documented reason: ${result.exception.reason}`);
    if (result.fallback) line(`    fallback detail: ${result.detail}`);
    else if (!result.pass) line(String(result.detail || "").trim().split("\n").map((l) => "    " + l).join("\n"));
  }
  line("");

  // --- Section B: skills-ref agentskills validate, per skill ---
  const hasUvx = commandExists("uvx");
  const skillDirs = listSkillDirs(root);
  line(`-- skills-ref (agentskills validate), ${skillDirs.length} skill(s) ${hasUvx ? "" : "- uvx NOT FOUND on PATH: THIS SECTION DID NOT RUN"} --`);
  if (hasUvx) {
    for (const dir of skillDirs) {
      const rel = relPath(root, dir);
      const r = runSkillsRefValidate(dir);
      const pass = r.status === 0;
      let result = { kind: "vendor-validate", tool: "skills-ref", target: rel, ran: true, fallback: false, pass, detail: (r.stdout || "") + (r.stderr || "") };
      [result] = applyExceptions([result], PARITY_EXCEPTIONS);
      results.push(result);
      line(formatResultLine(result));
      if (result.exception) line(`    documented reason: ${result.exception.reason}`);
      if (!result.pass) line(String(result.detail || "").trim().split("\n").map((l) => "    " + l).join("\n"));
    }
  } else {
    for (const dir of skillDirs) {
      results.push({ kind: "vendor-validate", tool: "skills-ref", target: relPath(root, dir), ran: false, fallback: false, pass: null, detail: "uvx not found" });
    }
    line("  NOT VERIFIED. Install uv (`pip install uv`) or run locally: uvx --from skills-ref agentskills validate skills/<name>");
  }
  line("");

  // --- Section C: parsed-values metadata round-trip (the requirement ADR 0040 / ADR 0042 exist for) ---
  line(`-- metadata.* parsed-values round-trip through the reference PARSER (not the validator's exit code) ${hasUvx ? "" : "- uvx NOT FOUND on PATH: THIS SECTION DID NOT RUN"} --`);
  if (hasUvx) {
    let anyMetadataMismatch = false;
    for (const dir of skillDirs) {
      const rel = relPath(root, dir);
      const skillMd = path.join(dir, "SKILL.md");
      const ours = readOurMetadata(skillMd);
      const r = runReferenceParse(skillMd);
      let parsed;
      try {
        parsed = JSON.parse(r.stdout || "{}");
      } catch {
        parsed = { ok: false, error: `unparseable probe output: ${r.stdout || r.stderr}` };
      }
      if (!parsed.ok) {
        results.push({ kind: "metadata-parity", tool: "skills-ref", target: rel, ran: true, fallback: false, pass: false, detail: `reference parser could not parse: ${parsed.error}` });
        line(`  [ERROR] ${rel}: reference parser could not parse this file: ${parsed.error}`);
        anyMetadataMismatch = true;
        continue;
      }
      const mismatches = diffMetadataParity(ours, parsed.metadata);
      const pass = mismatches.length === 0;
      results.push({ kind: "metadata-parity", tool: "skills-ref", target: rel, ran: true, fallback: false, pass, detail: mismatches });
      if (!pass) {
        anyMetadataMismatch = true;
        line(`  [MISMATCH] ${rel}`);
        for (const m of mismatches) {
          line(`    metadata.${m.key}: ${m.reason} - ours=${JSON.stringify(m.ours)} reference=${JSON.stringify(m.reference)}`);
        }
      }
    }
    if (!anyMetadataMismatch) line(`  OK: all ${skillDirs.length} skill(s)' metadata.* values round-trip unchanged through the reference parser.`);
  } else {
    line("  NOT VERIFIED (same uvx dependency as skills-ref validate above).");
  }
  line("");

  // --- Section D: validator identity + pin skew ---
  line("-- validator versions and pin identity --");
  line(`  claude CLI: ${hasClaude ? (runClaudeVersion() ?? "found, version unknown") : "NOT INSTALLED"}`);
  const pin = readPin(root);
  if (hasUvx) {
    const probe = runVersionProbe();
    let probeData = null;
    try {
      probeData = JSON.parse(probe.stdout || "{}");
    } catch {
      /* leave null; reported below */
    }
    if (probeData) {
      line(`  skills-ref (PyPI): ${probeData.version ?? "unknown"}`);
      if (pin) {
        const skew = summarizePinSkew(pin.artifacts ?? [], probeData.files ?? {});
        line(`  upstream-pin.json (source blobs, verified ${pin.verified?.date ?? "unknown"}) vs the installed PyPI release - two DIFFERENT identities by design:`);
        for (const row of skew) {
          const status = row.match === null ? "NOT MEASURED" : row.match ? "MATCH" : "SKEW";
          line(`    ${row.file}: ${status}  (pinned ${row.pinnedSha}${row.installedSha ? `, installed ${row.installedSha}` : ""})`);
        }
      } else {
        line("  upstream-pin.json not found or unparseable; pin-skew comparison skipped.");
      }
    } else {
      line("  skills-ref (PyPI): could not read version/pin probe output.");
    }
  } else {
    line("  skills-ref (PyPI): NOT VERIFIED (uvx not found).");
  }
  line("");

  // --- Section E: documented-exception list integrity (ADR 0042 - "An entry whose ADR reference
  // does not resolve to a real file should itself be a finding"). Checked unconditionally, no tool
  // dependency: this is a fact about this repository's own files, not about a vendor's behavior. ---
  const integrityFindings = validateExceptions(PARITY_EXCEPTIONS, root);
  results.push(...integrityFindings);
  line("-- documented-exception list integrity --");
  if (integrityFindings.length === 0) {
    line(`  OK: all ${PARITY_EXCEPTIONS.length} documented exception(s) cite a real ADR under docs/internal/decisions/.`);
  } else {
    for (const f of integrityFindings) line(`  [BROKEN] ${f.detail}`);
  }
  line("");

  // --- Summary ---
  const disagreement = anyDisagreement(results);
  const { total, documented, undocumented } = summarizeDisagreements(results);
  const notRun = results.filter((r) => r.kind === "vendor-validate" && !r.ran);
  line("-- summary --");
  if (total === 0) {
    line("  vendor-validate disagreements: none found.");
  } else if (undocumented === 0) {
    line(`  vendor-validate disagreements: ${total} found, ALL ${documented} documented as exception(s) (ADR-authorized - see the annotated lines above). Nothing here would block once gating starts.`);
  } else {
    line(`  vendor-validate disagreements: ${total} found - ${documented} documented, ${undocumented} UNDOCUMENTED. The undocumented ${undocumented === 1 ? "one" : "ones"} WOULD block once gating starts.`);
  }
  if (integrityFindings.length) {
    line(`  exception-list integrity: ${integrityFindings.length} BROKEN reference(s) (see above) - counted as undocumented, since a citation nobody can check authorizes nothing.`);
  }
  if (notRun.length) line(`  sections that DID NOT RUN (tool unavailable): ${notRun.length} target(s) - see NOT VERIFIED lines above.`);
  line(`  PARITY_MODE: ${PARITY_MODE} -> exit code ${decideExitCode(PARITY_MODE, disagreement)} regardless of the findings above.`);
  line("");

  process.exitCode = decideExitCode(PARITY_MODE, disagreement);
}

// Guarded like every other CLI entry point in this repo (check.mjs, check-release-counts.mjs,
// standards-watch.mjs, ...): main() runs only when invoked as a script, never on import, so tests can
// import the pure functions above without spawning anything.
if (process.argv[1]?.endsWith("check-parity.mjs")) {
  main();
}
