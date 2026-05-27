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
