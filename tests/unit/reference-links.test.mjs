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

// Adversarial-review catch (ADR 0032): inline code can be delimited by a run of N backticks (used when
// the content itself contains a backtick), closed by the same-length run. A link-shaped example inside a
// double/triple-backtick span must be treated as code too, not scanned as a live reference.
test("a link inside a double-backtick inline code span is ignored (U6)", () => {
  const ctx = skillCtx("Use ``[text](path)`` to show a link literally.");
  assert.equal(check(ctx).filter((f) => f.severity === "error").length, 0);
});

test("a link inside a triple-backtick inline span is ignored (U6)", () => {
  const ctx = skillCtx("Like ```[a](b.md)``` shown inline.");
  assert.equal(check(ctx).filter((f) => f.severity === "error").length, 0);
});

// PSR-3 (ADR 0036): a link whose TARGET contains a substitution token is a template slot, not a live
// reference - the generator fills it in later, so there is nothing on disk for U6 to resolve and the
// error is a false positive on well-built template files. The token syntax at the point of use is what
// marks template intent (no filename convention, no frontmatter flag, nothing the target must adopt),
// because a brace is not a character any real relative repo path carries.
test("a link target with a {{double-brace}} substitution token is not a live reference (U6)", () => {
  const ctx = skillCtx("see [the guide]({{docs_path}}/guide.md)");
  assert.equal(check(ctx).filter((f) => f.severity === "error").length, 0);
});

test("a link target with a {single-brace} substitution token is not a live reference (U6)", () => {
  const ctx = skillCtx("download the [release]({release-url})");
  assert.equal(check(ctx).filter((f) => f.severity === "error").length, 0);
});

test("a real broken link in the same file as a template slot is still flagged (U6)", () => {
  const ctx = skillCtx("slot [a]({{path}}/x.md) and real [b](references/missing.md)");
  const errs = check(ctx).filter((f) => f.severity === "error");
  assert.equal(errs.length, 1, "only the real dangling link is flagged");
  assert.ok(/missing\.md/.test(errs[0].message));
});

// H1.11 (v1.7.0): the U6 finding message must say WHAT a relative link resolves against. Recorded as
// eval-run sensor reading 8: a Sonnet/high advisory read the links as resolving from the repo root,
// declared 11 real defects false positives, and recommended weakening U6. CommonMark resolves against
// the CONTAINING FILE, so the message now says so. Asserted here because no golden report snapshot
// exercises a U6 failure path (every render fixture is a clean plugin), which left the wording untested.
test("the U6 finding message states the resolution base (H1.11)", () => {
  const ctx = skillCtx("see [ref](references/missing.md)");
  const f = check(ctx).find((x) => x.reqId === "U6");
  assert.ok(f, "expected a U6 finding");
  assert.match(f.message, /resolves relative to the containing file/, "the message must name the resolution base");
  assert.match(f.message, /does not resolve/, "and must still state the defect");
});
