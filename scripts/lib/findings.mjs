// what-it-is:   the findings library
// what-it-does: provides finding() and the SEVERITY enum that every check uses to report an error or warning
// why:          one finding shape keeps the gate aggregation and tier bucketing uniform across all checks
// used-by:      imported by every check module and by the aggregate gate
export const SEVERITY = Object.freeze({ ERROR: "error", WARN: "warn" });

/**
 * Build a normalized Finding.
 * @returns {{check:string,severity:"error"|"warn",message:string,file:string|null,reqId:string|null}}
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
  };
}
