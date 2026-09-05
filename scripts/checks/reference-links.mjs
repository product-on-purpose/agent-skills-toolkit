// what-it-is:   the reference-links check (U6)
// what-it-does: asserts every relative link in a component resolves on disk (the no-dangling-reference discipline)
// why:          enforces the Standard requirement U6 deterministically, one module per reqId, so the gate stays model-free
// scope-note:  skills only, and that is E18's open question rather than a ratified decision - link rot in a
//               command or subagent is invisible here. ADR 0048 deliberately did NOT extend U6 to commands
//               (a command is a SKILL whose invocation is user-controlled, per ADR 0048 as amended - not a
//               different kind of artifact); whether link resolution should apply to every markdown component
//               the plugin ships is a different question with a different answer
// used-by:      registered in scripts/lib/registry.mjs; run by scripts/check.mjs and tier-report.mjs
import { finding, SEVERITY } from "../lib/findings.mjs";
import { statSync, existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { relPath } from "../lib/fs-utils.mjs";

export const meta = { id: "reference-links", tier: "universal", reqId: "U6", since: "0.x", provenance: "objective" };

const LINK = /\[[^\]]*\]\(([^)]+)\)/g;

// External or non-filesystem schemes (and pure #anchors) are never relative repo paths, so U6 does not
// try to resolve them. Mirrors gen-docs-site.mjs SKIP_SCHEME, plus the Cowork `computer:` local-artifact
// scheme and `file:`; both appear in real, well-built official plugins.
//
// A LEADING SLASH is skipped, and that covers protocol-relative `//host/path` as the narrower case it
// always was. U6's own message says a link "resolves relative to the containing file", and a target
// beginning `/` is by definition NOT a relative link - it is either a web route (`/features/analytics`,
// the case that produced a false error against a third-party repository on 2026-09-04) or a
// repo-root-relative path, and resolving it against the containing file serves neither reading. The
// alternative considered was resolving a leading `/` from the plugin root, which was refused: it makes
// U6 guess which of two vocabularies a repository is speaking, and guessing wrong publishes a false
// finding about somebody else's tree. Cost accepted and stated: a genuinely dangling root-relative repo
// path is no longer reported. Like every other strip in this check, this can only REMOVE findings.
const SKIP_SCHEME = /^(https?:|mailto:|tel:|ftp:|ws:|wss:|data:|javascript:|computer:|file:|#|\/)/i;

// A link target carrying a substitution token - `{{docs_path}}/guide.md`, `{release-url}` - is a
// TEMPLATE SLOT the generator fills in later, not a live reference, so there is nothing on disk for U6
// to resolve and the error is a false positive on well-built template files (PSR-3, ADR 0036). The token
// at the point of use is what marks template intent: no filename convention and no frontmatter flag that
// a graded third-party plugin would have to adopt, just a brace, which no real relative repo path
// carries. This is the U6 half of the same rule ADR 0032 gave U12 for pure `{{...}}` diagram bodies, and
// like every strip in this check it can only REMOVE findings, never add them.
const TEMPLATE_TOKEN = /[{}]/;

// Strip code before scanning for links: a markdown link (or a regex) written inside a fenced ``` / ~~~
// block OR inside a single-backtick `inline code` span is an illustration of syntax, not a live
// reference (skill docs routinely show `[text](path)` examples and capture regexes like `[^'"]+` as
// inline code). Fences first (they span lines); then inline spans, restricted to a single line so an
// unbalanced stray backtick cannot swallow a following line's real link. Mirrors the fence handling
// gen-docs-site.mjs / folder-readme.mjs use in-repo, extended to inline code (Finding 5 / ADR 0032).
// Stripping code can only REMOVE link matches, never add them, so it strictly reduces false positives.
function stripCode(text) {
  return (text || "")
    .replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, "")
    // inline code: a run of N backticks closed by the next run of the same length N (CommonMark), so a
    // link in a double/triple-backtick example (`` `[x](y)` ``) is stripped too; `.` excludes line
    // terminators, keeping the single-line restriction so a stray backtick cannot cross a newline.
    .replace(/(`+)(.+?)\1/g, "");
}

/** Flag every relative markdown link in `text` that does not resolve from `baseDir`. */
function scanLinks(text, baseDir, fileRel, out) {
  let m;
  LINK.lastIndex = 0;
  const scanText = stripCode(text);
  while ((m = LINK.exec(scanText))) {
    let target = m[1].trim();
    if (SKIP_SCHEME.test(target)) continue;
    if (TEMPLATE_TOKEN.test(target)) continue;
    target = target.split("#")[0];
    if (!target) continue;
    const resolved = path.resolve(baseDir, target);
    let ok = false;
    try {
      const st = statSync(resolved);
      ok = st.isFile() || st.isDirectory();
    } catch {
      ok = false;
    }
    if (!ok) out.push(finding(meta.id, SEVERITY.ERROR, `reference link "${m[1]}" does not resolve (resolves relative to the containing file).`, { file: fileRel, reqId: "U6" }));
  }
}

export function check(ctx) {
  const out = [];
  for (const s of ctx.skills) {
    // The SKILL.md body (links resolved relative to the skill directory).
    scanLinks(s.body || "", s.dir, relPath(ctx.root, s.skillMdPath), out);
    // The skill's references/*.md (links resolved relative to each file's own directory), so link
    // rot in progressive-disclosure docs fails the gate too, not only in the SKILL.md body. A
    // references/ file sits one directory deeper than SKILL.md, which is exactly where a copied
    // "../../" prefix silently breaks; this closes that class.
    const refDir = path.join(s.dir, "references");
    if (existsSync(refDir)) {
      let entries = [];
      try { entries = readdirSync(refDir); } catch { entries = []; }
      for (const name of entries) {
        if (!name.endsWith(".md")) continue;
        const file = path.join(refDir, name);
        let text;
        try {
          if (!statSync(file).isFile()) continue;
          text = readFileSync(file, "utf8");
        } catch {
          continue;
        }
        scanLinks(text, refDir, relPath(ctx.root, file), out);
      }
    }
  }
  return out;
}
