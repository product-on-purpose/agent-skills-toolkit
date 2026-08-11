// what-it-is:   the findings library
// what-it-does: provides finding() and the SEVERITY enum that every check uses to report an error or warning
// why:          one finding shape keeps the gate aggregation and tier bucketing uniform across all checks
// used-by:      imported by every check module and by the aggregate gate
export const SEVERITY = Object.freeze({ ERROR: "error", WARN: "warn" });

// Provenance classifies WHY a check exists, so the report can split portable, defensible failures
// (objective + vendor-cited) from askit-house conventions (F3, ADR 0028). `objective` = a defect true
// regardless of any standard (a dead link, manifest drift, malformed JSON); `vendor-cited` = backed by
// an external authority (Claude Code / Codex / agentskills.io) cited in the check's docblock; `house` =
// an askit-Standard convention with no external mandate. A consumer may freely tune `house` rules; the
// published-verdict clamp protects `objective`/`vendor-cited` truth.
export const PROVENANCE = Object.freeze({ OBJECTIVE: "objective", VENDOR: "vendor-cited", HOUSE: "house" });

/**
 * Build a normalized Finding. `migration`, when present, declares a warn-first Standard-version
 * migration this specific finding is riding out: `{ capAt, until, reason }`, where `capAt` is the
 * highest severity resolve-config.mjs's migration cap will ever let this finding reach (a ceiling,
 * never a floor - see resolveFindings), `until` names the Standard version the cap graduates at, and
 * `reason` is a short human sentence a consumer sees when their own override was overruled by it.
 * Only a check that itself needs this (e.g. S4's string-shaped chain declarations, ADR 0041) sets it;
 * every other finding carries `migration: null` and is untouched by the cap.
 * @returns {{check:string,severity:"error"|"warn",message:string,file:string|null,reqId:string|null,migration:{capAt:string,until:string,reason:string}|null}}
 */
export function finding(check, severity, message, opts = {}) {
  if (severity !== SEVERITY.ERROR && severity !== SEVERITY.WARN) {
    throw new Error(`invalid severity: ${severity}`);
  }
  return {
    check,
    severity,
    message,
    file: opts.file ?? null,
    reqId: opts.reqId ?? null,
    migration: opts.migration ?? null,
  };
}
