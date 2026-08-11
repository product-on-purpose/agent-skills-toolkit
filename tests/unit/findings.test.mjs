import { test } from "node:test";
import assert from "node:assert/strict";
import { finding, SEVERITY } from "../../scripts/lib/findings.mjs";

test("finding() builds a normalized Finding with defaults", () => {
  const f = finding("my-check", SEVERITY.ERROR, "boom");
  assert.deepEqual(f, {
    check: "my-check",
    severity: "error",
    message: "boom",
    file: null,
    reqId: null,
    migration: null,
  });
});

test("finding() accepts file and reqId", () => {
  const f = finding("c", SEVERITY.WARN, "msg", { file: "skills/x/SKILL.md", reqId: "U5" });
  assert.equal(f.severity, "warn");
  assert.equal(f.file, "skills/x/SKILL.md");
  assert.equal(f.reqId, "U5");
});

test("finding() accepts migration metadata (the round-2 ADR 0041 severity-cap ceiling), defaulting to null", () => {
  const migration = { capAt: "warn", until: "0.13", reason: "warn-first until Standard 0.13" };
  const f = finding("c", SEVERITY.WARN, "msg", { migration });
  assert.deepEqual(f.migration, migration);
});

test("finding() rejects an unknown severity", () => {
  assert.throws(() => finding("c", "fatal", "msg"), /severity/);
});
