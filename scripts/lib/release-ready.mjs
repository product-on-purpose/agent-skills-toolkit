// what-it-is:   the deterministic half of release-ready (review wave 2, H2)
// what-it-does: declares the gates a tag and a publish must pass, and decides the verdict from their exit codes
// why:          the release-blocking preconditions were CHECKLIST PROSE. `docs/internal/RELEASE.md` asked a human
//               to confirm "npm run vendor-watch green, and its run is under 30 days old" - a line whose whole
//               subject is that people forget to re-read things. Nothing in release.yml or publish-npm.yml ran it,
//               so a tag could be cut, a GitHub release published and an npm version shipped while a claim this
//               repository asserts as fact had been gone from the vendor's page for a year
// used-by:      scripts/release-ready.mjs; covered by tests/unit/release-ready.test.mjs
//
// PURE BY CONSTRUCTION, the same split scripts/lib/vendor-watch.mjs uses: nothing here spawns a process, reads a
// file, or looks at the clock. The caller runs the gates and hands back exit codes; this decides what they mean.
// That is what lets the whole decision table - including the override - be tested without a network or a tag.

/**
 * The exit code the CLI reports for a gate that could not be SPAWNED - the process never started, or died
 * on a signal. `spawnSync` returns a null status for both, and `Number(null)` is 0, so without a sentinel
 * a gate that never ran would report the code meaning "clean".
 *
 * Named here rather than written as a literal in the CLI because it is a CONTRACT between the two halves:
 * the CLI decides when a gate could not be run, and this half decides what that means. Review finding F2
 * was that the second half had no opinion at all.
 */
export const SPAWN_FAILED = 127;

/**
 * How long one gate may run before the CLI kills it (review finding F10).
 *
 * Nothing bounded this. `spawnSync` had no timeout, no workflow job declared `timeout-minutes`, and
 * `publish-npm.yml` sets `cancel-in-progress: false` deliberately - so a stuck gate blocked every later
 * publish dispatch until a human noticed and cancelled it by hand.
 *
 * **The number is generous, and it is also bounded from ABOVE by the job it runs inside.** The slowest gate
 * observed is `action-pins` at a few seconds of live registry calls, so five minutes is still two orders of
 * magnitude of headroom - a timeout tight enough to fire on a slow-but-working run would convert somebody
 * else's bad afternoon into a blocked release, which is the trap the override exists to avoid.
 *
 * The upper bound is what the fix-code review caught. At ten minutes under a twenty-minute job, ONE hung
 * gate worked as designed but TWO did not: a network blackhole hangs both network-bound gates, and the job
 * is cancelled at its own limit before `renderSummary` ever runs. The operator then gets a bare job
 * cancellation instead of "this gate could not be RUN" - **the diagnostic disappears in exactly the
 * correlated failure it was built for.** A test now asserts the arithmetic (`jobs > GATES.length * this`)
 * against both workflows, so the two numbers cannot drift apart again by hand.
 *
 * **What a timeout composes with is the point.** `spawnSync` kills the child, `status` comes back null,
 * the CLI maps null to SPAWN_FAILED, and SPAWN_FAILED blocks. A gate that ran out of time therefore cannot
 * certify a release, for exactly the same reason a gate that never started cannot.
 */
export const GATE_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * The gates, in the order a human would want to see them fail.
 *
 * ANY non-zero exit blocks. There is no per-gate list of blocking codes, and there was one until review
 * finding F2: `blocksOn: [1, 2]` on the two network-bound gates read as a filter but was really just an
 * enumeration of the codes those gates were known to produce, so every OTHER non-zero code - including the
 * SPAWN_FAILED sentinel - fell through it as a pass. A gate killed by an OOM or evicted with the runner
 * certified a release nothing had checked.
 *
 * The rule that replaced it is the one ADR 0053 already decided for `action-pins`: an outcome that must
 * not block is expressed as EXIT 0 by the gate itself, never filtered out here. That is why a pin merely
 * BEHIND its action's current release exits 0 rather than being excluded downstream. `overridableCodes`
 * is untouched and still carries the whole 1-versus-2 distinction, which is what `blocksOn` only appeared
 * to carry.
 */
export const GATES = Object.freeze([
  Object.freeze({
    id: "conformance",
    argv: ["scripts/check.mjs"],
    why: "the Standard this plugin declares must hold for the plugin itself, at the commit being tagged",
  }),
  Object.freeze({
    id: "readme-drift",
    argv: ["scripts/check-readme-version.mjs", "."],
    why: "the README and action.yml are the front door; a stale version, tier, count, Standard pin or advertised tag ships in the npm tarball",
  }),
  Object.freeze({
    id: "release-counts",
    argv: ["scripts/check-release-counts.mjs", "."],
    why: "the counts quoted in CHANGELOG and RELEASE-NOTES must be the counts the repository actually has",
  }),
  Object.freeze({
    id: "vendor-watch",
    argv: ["scripts/vendor-watch.mjs", "."],
    why: "every vendor sentence this repository asserts as fact must still be on the vendor's page today",
    // 1 = a claim is GONE or STALE. 2 = a page could not be READ, so the run proved nothing about it.
    overridableCodes: [2],
  }),
  Object.freeze({
    id: "action-pins",
    argv: ["scripts/action-pin-watch.mjs", "."],
    why: "a SHA pin's comment is the only half a reviewer reads; shipping one that names the wrong version is a false claim about this repository's own supply chain",
    // 1 = a LABEL disagrees with what its ref resolves to, which is a defect in this repository's own file.
    // 2 = a lookup could not be performed, so the run proved nothing.
    //
    // A pin merely BEHIND its action's current release does NOT reach this gate at all: the watch reports
    // it and exits 0, because that is news about somebody else's release cadence rather than a defect here,
    // and blocking on it would let an upstream release stop a tag for a fact that is only worth knowing.
    // That split is ADR 0053's central decision and it is why this gate is not a copy of `vendor-watch`.
    // The SAME `--allow-vendor-unreachable <reason>` excuses this refusal, deliberately and not by
    // accident: a GitHub API outage is the same category of fact as a documentation-host outage - somebody
    // else's downtime, for which a release with no remedy is a trap. It excuses code 2 ONLY, so no reason
    // string can ever wave through a label that disagrees. The summary names which gate an override
    // actually applied to, so reusing one flag cannot hide which refusal was excused.
    overridableCodes: [2],
  }),
  Object.freeze({
    id: "release-notes-section",
    argv: ["scripts/check-release-notes-section.mjs"],
    why: "the version being cut must already have its own section in RELEASE-NOTES.md, or release.yml refuses to publish - correctly, but on the PUSHED TAG, after npm has already published (E57)",
    // NOT overridable at any exit code, unlike vendor-watch and action-pins. Nothing this gate reads lives
    // on somebody else's server - it reads two files in this repository - so there is no outage that can
    // make it refuse, and therefore nothing for an outage override to excuse. The remedy is also always
    // available, because writing the missing heading IS the fix.
  }),
]);

/**
 * What an exit code means for one gate: anything non-zero blocks, for every gate.
 *
 * The `gate` parameter is kept because the question is per-gate even where today's answer is uniform, and
 * because `overrideApplies` next door genuinely does differ by gate. What it must NOT do again is consult
 * a per-gate list of blocking codes: a code absent from such a list is not a pass, it is a code nobody
 * anticipated, and the only safe reading of an unanticipated exit from a release gate is that the release
 * is not proven. See SPAWN_FAILED and review finding F2.
 */
export function gateBlocks(gate, code) {
  return code !== 0;
}

/**
 * Whether an override may excuse this failure.
 *
 * Only exit 2 is overridable, on the gates that declare it (`vendor-watch` and `action-pins`), and only
 * with a stated reason. The asymmetry is the point:
 *
 * - exit 2 says the RUNNER could not reach a third party. That is an outage, not a fact about this repository,
 *   and a release with no documented remedy for someone else's downtime is an operational trap.
 * - exit 1 says a sentence this repository publishes as fact is gone from the page, or has aged past the window
 *   without anyone re-reading it. Overriding that would ship the false claim, which is the exact failure the
 *   watcher exists to prevent. There is no reason string that makes it acceptable, so none is accepted.
 */
export function overrideApplies(gate, code, reason) {
  if (!Array.isArray(gate.overridableCodes) || !gate.overridableCodes.includes(code)) return false;
  return typeof reason === "string" && reason.trim().length > 0;
}

/**
 * `results` is [{ id, code }] in GATES order. Returns the verdict plus a per-gate disposition, so the caller
 * renders one table and never has to re-derive why a passing run had a warning in it.
 */
export function summarize(results, { overrideReason = null } = {}) {
  const byId = new Map(GATES.map((g) => [g.id, g]));
  const rows = results.map((r) => {
    const gate = byId.get(r.id);
    if (!gate) return { ...r, status: "unknown", why: null };
    if (!gateBlocks(gate, r.code)) return { ...r, status: "pass", why: gate.why };
    if (overrideApplies(gate, r.code, overrideReason)) {
      return { ...r, status: "overridden", why: gate.why };
    }
    return { ...r, status: "BLOCK", why: gate.why };
  });
  const blocked = rows.filter((r) => r.status === "BLOCK" || r.status === "unknown");
  return { rows, blocked, overrideReason: overrideReason ?? null, ok: blocked.length === 0 };
}

/** 0 releasable, 1 blocked. One bit, because the caller is a CI step whose only question is go or no-go. */
export function exitCodeFor(summary) {
  return summary.ok ? 0 : 1;
}

/** The human report. Blocking rows first: the top of the output is what gets read. */
export function renderSummary(summary) {
  const rank = { BLOCK: 0, unknown: 1, overridden: 2, pass: 3 };
  const rows = [...summary.rows].sort((a, b) => rank[a.status] - rank[b.status]);
  const out = ["release-ready", ""];
  for (const r of rows) {
    const icon = { pass: "ok      ", BLOCK: "BLOCK   ", overridden: "override", unknown: "UNKNOWN " }[r.status];
    out.push(`${icon} ${r.id}  (exit ${r.code})`);
    if (r.status === "pass") continue;
    // A gate that could not be RUN gets its own sentence rather than the reason the gate exists. Every
    // `why` above is phrased as the significance of a defect, so printing one under a spawn failure tells
    // the operator a pin label is wrong or a vendor claim is gone. Neither was looked at. This is the same
    // rule the override block below already follows: output that misdescribes its own decision is the
    // defect class this aggregate replaced a checklist line to remove.
    if (r.code === SPAWN_FAILED) {
      out.push(`         this gate could not be RUN: the process never started, or was killed.`);
      out.push(`         Nothing was checked, so nothing is proven. Fix the runner and re-run.`);
    } else if (r.why) {
      out.push(`         ${r.why}`);
    }
  }
  out.push("");
  // Report the override on what it DID, never on what was asked for. Printing "OVERRIDE IN EFFECT" above a
  // blocked run - which the first version did - tells the reader an exception was granted when the whole
  // point of the design is that this one could not be. An output that misdescribes its own decision is the
  // same class of defect as the checklist line this aggregate replaced.
  const overridden = summary.rows.filter((r) => r.status === "overridden");
  if (overridden.length > 0) {
    out.push(`OVERRIDE IN EFFECT: ${summary.overrideReason}`);
    out.push(`It excused: ${overridden.map((r) => `${r.id} (exit ${r.code})`).join(", ")}.`);
    // Review finding F9. ONE flag intentionally serves both network-bound gates - ADR 0053 considered a
    // second near-identical flag and rejected it as proliferation, on the reasoning that a GitHub API
    // outage and a documentation-host outage are the same category of fact. The residual risk it named,
    // and answered with visibility rather than scoping, is that an operator reaching for the flag because
    // of a KNOWN outage silently also waives an unrelated refusal. So when one reason covered more than
    // one refusal, the report says so in as many words instead of leaving it to be inferred from a list.
    if (overridden.length > 1) {
      out.push(
        `NOTE: that one reason excused ${overridden.length} separate refusals. They are unrelated failures -`
      );
      out.push(`confirm the stated reason genuinely accounts for EACH of them before shipping this release.`);
    }
    out.push("Recorded here so the release carries its own exception. It covers UNREACHABILITY only - a vendor");
    out.push("page or an action registry that could not be READ - and nothing else. A claim that is gone or");
    out.push("stale, and a pin label that disagrees with its ref, are not overridable at any level.");
    out.push("");
  } else if (summary.overrideReason) {
    out.push(`Override offered and NOT APPLIED: "${summary.overrideReason}"`);
    out.push("Nothing in this run was overridable. A gone or stale claim is never excused by a reason string.");
    out.push("");
  }
  out.push(
    summary.ok
      ? "Releasable: every release-blocking gate passed."
      : `NOT releasable: ${summary.blocked.length} gate(s) block. Fix them, or re-run when the cause clears.`
  );
  return out.join("\n");
}
