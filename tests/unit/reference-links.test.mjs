import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { check } from "../../scripts/checks/reference-links.mjs";

function skillCtx(body) {
  const root = mkdtempSync(path.join(tmpdir(), "rl-"));
  const dir = path.join(root, "skills", "s");
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, "SKILL.md"), "x");
  return { root, skills: [{ name: "s", dir, skillMdPath: path.join(dir, "SKILL.md"), body, frontmatter: { name: "s" }, parseError: null }] };
}

test("resolving relative link - no error", () => {
  const ctx = skillCtx("see [ref](references/a.md)");
  mkdirSync(path.join(ctx.skills[0].dir, "references"), { recursive: true });
  writeFileSync(path.join(ctx.skills[0].dir, "references", "a.md"), "hi");
  assert.equal(check(ctx).filter((f) => f.severity === "error").length, 0);
});

test("broken relative link is a U6 error", () => {
  const ctx = skillCtx("see [ref](references/missing.md)");
  const findings = check(ctx);
  assert.ok(findings.some((f) => f.reqId === "U6" && f.severity === "error"));
});

test("http links are ignored", () => {
  const ctx = skillCtx("see [x](https://example.com)");
  assert.equal(check(ctx).length, 0);
});

test("link inside a fenced code block is ignored (U6)", () => {
  const ctx = skillCtx("Example skill:\n\n```yaml\nUse [the template](openapi-template.yaml) as the structure.\n```\n");
  assert.equal(check(ctx).filter((f) => f.severity === "error").length, 0);
});

test("non-http schemes (computer://, file://) are ignored (U6)", () => {
  const ctx = skillCtx("save to [here](computer:///path/to/file.html) or [there](file:///tmp/x.html)");
  assert.equal(check(ctx).filter((f) => f.severity === "error").length, 0);
});

test("a broken link outside a fence is still flagged when fences are present (U6)", () => {
  const ctx = skillCtx("```\n[ignored](inside-fence.md)\n```\n\nsee [real](references/missing.md)");
  const errs = check(ctx).filter((f) => f.severity === "error");
  assert.equal(errs.length, 1);
  assert.ok(/missing\.md/.test(errs[0].message));
});

// Finding 5 (batch-2 C1 triage): a markdown link or a regex written as `inline code` is an authored
// example of syntax, not a live reference. stripFences handled ``` fences; this is the inline-code case
// the C1 plugins are full of (`[text](path)`, `[file.md](link)`, regexes like `[^'"]+`).
test("a link inside an inline code span is ignored (U6)", () => {
  const ctx = skillCtx("Extract markdown links with the pattern `[text](path)` as shown.");
  assert.equal(check(ctx).filter((f) => f.severity === "error").length, 0);
});

test("a regex written as inline code is not parsed as a link (U6)", () => {
  const ctx = skillCtx("Match imports with `import\\s+.*from\\s+['\"]([^'\"]+)['\"]` and capture the path.");
  assert.equal(check(ctx).filter((f) => f.severity === "error").length, 0);
});

test("a broken link OUTSIDE inline code is still flagged when inline code is present (U6)", () => {
  const ctx = skillCtx("The syntax `[example](demo.md)` is illustrative, but see [real](references/missing.md).");
  const errs = check(ctx).filter((f) => f.severity === "error");
  assert.equal(errs.length, 1, "only the real out-of-code link is flagged");
  assert.ok(/missing\.md/.test(errs[0].message));
});

test("an unbalanced stray backtick does not swallow a following line's real broken link (U6)", () => {
  const ctx = skillCtx("Inline `code` and a stray ` tick here\nthen [real](references/missing.md) on the next line");
  assert.ok(check(ctx).some((f) => f.reqId === "U6" && /missing\.md/.test(f.message)), "the real link on the next line is still caught");
});
