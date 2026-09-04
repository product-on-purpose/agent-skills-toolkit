// what-it-is:   the dependency-audit verdict, as a pure function (#310)
// what-it-does: given what `npm audit --json` actually produced - stdout, stderr, exit status, or a
//               spawn failure - decides whether this repository has a blocking vulnerability (exit 1),
//               whether the registry simply could not be read (exit 2), or whether it is clean (exit 0)
// why:          `npm audit` exits 1 for BOTH "you have a high-severity vulnerability" and "npm was
//               down", so the exit status cannot tell the two apart and the workflow step that trusted
//               it reded a required check three times on 2026-09-03 while the registry was ill. This
//               repository already draws that line twice - ADR 0053 (a pin's label is a claim this
//               repository makes) split exit 1 from exit 2 for `action-pin-watch`, and `vendor-watch`
//               carries the same split - and this brings `npm audit` into line with them.
// used-by:      scripts/audit-deps.mjs; covered by tests/unit/audit-deps.test.mjs

/**
 * npm's severity ladder, ASCENDING. A threshold means "this severity or anything above it", so the
 * comparison is an index `>=` and never an equality - `critical` must block a `high` threshold.
 */
export const SEVERITY_ORDER = Object.freeze(["info", "low", "moderate", "high", "critical"]);

/** The exit codes, named. The numbers are the contract `ci.yml` and any future gate read. */
export const CLEAN = 0;
export const BLOCKING = 1;
export const UNREACHABLE = 2;

/** The shipped threshold, matching the `--audit-level=high` the removed workflow step used. */
export const DEFAULT_LEVEL = "high";

/**
 * A successful audit ALWAYS carries a report body. Every failure shape npm has produced here - a 400
 * on the retiring `/security/audits/quick` endpoint, a 503 on `/security/advisories/bulk`, a refused
 * connection, a plain-text error - lacks `metadata.vulnerabilities`, and their error TEXT differs
 * every time. So the discriminator is the presence of the report, never a string npm happened to
 * print. That is what makes this robust against an outage shape nobody here has seen yet.
 */
function hasReportBody(parsed) {
  return Boolean(parsed && typeof parsed === "object" && parsed.metadata && parsed.metadata.vulnerabilities);
}

/** npm states its problem in one of several places depending on how it failed. Quote whichever it used. */
function npmComplaint(parsed, stdout, stderr) {
  if (parsed && typeof parsed === "object") {
    if (typeof parsed.message === "string" && parsed.message) return parsed.message;
    if (typeof parsed.error === "string" && parsed.error) return parsed.error;
    if (parsed.error && typeof parsed.error === "object") {
      const { summary, detail, code } = parsed.error;
      const said = [code, summary, detail].filter((s) => typeof s === "string" && s).join(" - ");
      if (said) return said;
    }
  }
  const text = `${stderr ?? ""}${stdout ?? ""}`.trim();
  return text ? text.split("\n").slice(0, 3).join("; ").slice(0, 400) : "npm produced no usable output";
}

/**
 * Decide the verdict.
 *
 * @param {{stdout?: string, stderr?: string, status?: number|null, spawnError?: string}} run
 * @param {{level?: string}} [opts]
 * @returns {{code: 0|1|2, reason: string, counts?: Record<string, number>}}
 */
export function classifyAudit(run, opts = {}) {
  const { stdout = "", stderr = "", spawnError = null } = run ?? {};
  const level = opts.level ?? DEFAULT_LEVEL;

  // npm never started, or died on a signal or a timeout. Nothing was measured, so nothing is known.
  if (spawnError) return { code: UNREACHABLE, reason: `npm audit could not be run: ${spawnError}` };

  // A threshold that matches no severity would gate nothing while still reporting success, which is
  // this repository's own definition of a non-guard. Refuse instead of passing.
  const threshold = SEVERITY_ORDER.indexOf(level);
  if (threshold === -1) {
    return {
      code: UNREACHABLE,
      reason: `unusable --level "${level}"; expected one of ${SEVERITY_ORDER.join(", ")}`,
    };
  }

  let parsed = null;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    parsed = null;
  }

  if (!hasReportBody(parsed)) {
    return { code: UNREACHABLE, reason: `npm said: ${npmComplaint(parsed, stdout, stderr)}` };
  }

  const counts = parsed.metadata.vulnerabilities;
  const gating = SEVERITY_ORDER.slice(threshold);
  const blocking = gating.reduce((n, sev) => n + (Number(counts[sev]) || 0), 0);
  const below = SEVERITY_ORDER.slice(0, threshold)
    .filter((sev) => Number(counts[sev]) > 0)
    .map((sev) => `${counts[sev]} ${sev}`);

  if (blocking > 0) {
    const named = gating.filter((sev) => Number(counts[sev]) > 0).map((sev) => `${counts[sev]} ${sev}`);
    return {
      code: BLOCKING,
      reason: `${blocking} advisory${blocking === 1 ? "" : " advisories"} at or above ${level}: ${named.join(", ")}`,
      counts,
    };
  }

  // A finding below the threshold is REPORTED even though it does not gate. Silence here is how a
  // moderate advisory sits in the tree for a release without anyone having seen it.
  return {
    code: CLEAN,
    reason: below.length
      ? `no advisory at or above ${level}; below the threshold: ${below.join(", ")}`
      : `no advisories at any severity`,
    counts,
  };
}

/**
 * The one line a human reads in the log. Each code says what it MEANS, because "exit 2" in a CI log
 * is not a sentence - and the outage line deliberately avoids the word "vulnerability", so a reader
 * skimming a red build never mistakes somebody else's downtime for a finding about this repository.
 */
export function formatVerdict(verdict) {
  if (verdict.code === UNREACHABLE) {
    return `REFUSED: the dependency audit could not be performed. ${verdict.reason}`;
  }
  if (verdict.code === BLOCKING) {
    return `BLOCKED: ${verdict.reason}`;
  }
  return `OK: ${verdict.reason}`;
}
