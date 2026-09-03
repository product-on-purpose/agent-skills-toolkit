#!/usr/bin/env node
// what-it-is:   the deploy-time report publisher (RS-D3, cut 2)
// what-it-does: writes this repository's full verdict into the Pages artifact - tier-report.json, the
//               rendered HTML report, and an index page that carries the sha, the date and the tier-scope
//               sentence and links to both
// why:          the only machine-readable thing this project published was the 8-field badge JSON. A
//               consumer could learn the tier and nothing else: not which checks ran, not which findings
//               were behind the verdict, not what the tier does and does not certify. The full reports
//               existed and were local files. This publishes them, at the same moment and from the same
//               sha as the badge, so the two can never disagree.
// used-by:      .github/workflows/deploy-pages.yml; .github/workflows/ci.yml (build-site, so a pull
//               request proves the generator runs); covered by tests/unit/gen-site-reports.test.mjs
//
// IT SPAWNS THE SHIPPED CLIs RATHER THAN REIMPLEMENTING THEM. `tier-report.mjs --json` and
// `evaluate.mjs --format html` are the commands a consumer runs and the ones the docs tell them to run;
// calling anything else here would publish a verdict computed by a code path nobody else exercises. The
// badge generator sets the same precedent for the same reason.
//
// IT NEVER FAILS THE SITE BUILD ON ITS OWN CONTENT. A gate failure is a normal, expected verdict -
// `evaluate` and `tier-report` exit non-zero when the grade is failing, and publishing a failing grade is
// the entire point of publishing the grade. What DOES fail this script is being unable to write the
// artifacts at all, because a Pages deploy that silently serves nothing is the stale-front-door defect
// the badge exists to retire.
import { mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveGradedSha } from "./gen-tier-badge.mjs";
import { readJsonSafe } from "./lib/fs-utils.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));

/**
 * The tier-scope sentence (RS-E3). ONE canonical wording, exported so every surface that presents a tier
 * inherits the same words rather than paraphrasing them. `docs/explanation/limitations.md` and
 * `conformance-and-tiers.md` have always said this; nothing that PRESENTED a tier ever linked them, so
 * the concession did not travel with the claim.
 */
export const TIER_SCOPE_SENTENCE =
  "This tier reports structural conformance to a written Standard - deterministic and reproducible; " +
  "it is not a content review, a safety audit, or a statement that the skills work.";

export const LIMITATIONS_URL = "https://product-on-purpose.github.io/agent-skills-toolkit/explanation/limitations/";

/**
 * Run one report CLI and return its stdout.
 *
 * A NON-ZERO EXIT IS NOT AN ERROR HERE, and conflating the two is the trap this function exists to avoid:
 * `tier-report` and `evaluate` exit non-zero to report a failing grade, so treating that as a failure
 * would publish reports only while the repository was green - exactly backwards, since a failing grade is
 * the one a reader most needs to see. Only an empty result or a process that could not start is a
 * failure, and both are distinguishable from a grade.
 */
function runReport(argv, cwd) {
  const r = spawnSync(process.execPath, argv, { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (r.error) return { ok: false, why: `could not run ${path.basename(argv[0])}: ${r.error.message}` };
  const out = r.stdout ?? "";
  if (out.trim().length === 0) {
    return { ok: false, why: `${path.basename(argv[0])} produced no output (exit ${r.status})${r.stderr ? `: ${r.stderr.trim().slice(0, 400)}` : ""}` };
  }
  return { ok: true, text: out, exitCode: r.status };
}

/**
 * Pure. The index page that is the badge's click-through target and RS-E3's report-page placement.
 *
 * Deliberately plain, self-contained HTML with no external stylesheet: it is served from the Pages
 * artifact alongside the Astro site but is not an Astro page, so it cannot inherit the site's CSS, and a
 * page whose fallback rendering is unreadable is worse than a page with no design at all.
 */
export function renderIndex({ tier, sha, gradedAt, standard, registryAvailable }) {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const rows = [
    ["report.html", "The full evaluation report", "Every check, its status, and the findings behind the verdict."],
    ["tier-report.json", "The machine-readable tier report", "What the gate computed: the tier, what it satisfies, and what blocks the next one."],
    ["../badges/tier.json", "The badge endpoint", "The 8-field shields.io payload, same sha and date as this page."],
  ];
  if (registryAvailable) {
    rows.push(["registry.html", "The family registry", "The whole marketplace graded at the shas its catalogue pins, measured at this deploy."]);
  }
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>agent-skills-toolkit - published verdict</title>
<style>
  :root { color-scheme: light dark; --fg:#1a1a1a; --bg:#fdfdfc; --mut:#5a5a56; --line:#dedcd6; --accent:#6b4fa8; }
  @media (prefers-color-scheme: dark) { :root { --fg:#ecebe7; --bg:#16161a; --mut:#a3a29c; --line:#33333a; --accent:#b9a3e8; } }
  body { margin:0; padding:2.5rem 1.25rem; background:var(--bg); color:var(--fg);
         font:16px/1.6 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif; }
  main { max-width:52rem; margin:0 auto; }
  h1 { font-size:1.6rem; margin:0 0 .25rem; letter-spacing:-.01em; }
  .meta { color:var(--mut); font-size:.9rem; margin:0 0 1.5rem; }
  .scope { border-left:3px solid var(--accent); padding:.75rem 1rem; margin:0 0 2rem;
           background:color-mix(in srgb, var(--accent) 7%, transparent); font-size:.95rem; }
  ul { list-style:none; padding:0; margin:0; }
  li { padding:1rem 0; border-top:1px solid var(--line); }
  a { color:var(--accent); }
  .d { color:var(--mut); font-size:.9rem; margin-top:.15rem; }
  code { font:0.9em ui-monospace,SFMono-Regular,Menlo,monospace; }
</style>
</head>
<body><main>
<h1>Published verdict</h1>
<p class="meta">Tier <strong>${esc(tier)}</strong> &middot; graded at <code>${esc(sha)}</code> &middot; ${esc(gradedAt)}${standard ? ` &middot; Standard ${esc(standard)}` : ""}</p>
<p class="scope">${esc(TIER_SCOPE_SENTENCE)} <a href="${LIMITATIONS_URL}">What a tier does not certify</a>.</p>
<ul>
${rows.map(([href, title, desc]) => `  <li><a href="${esc(href)}">${esc(title)}</a><div class="d">${esc(desc)}</div></li>`).join("\n")}
</ul>
</main></body>
</html>
`;
}

export function parseArgs(argv) {
  const opts = { root: null, outDir: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "-h" || a === "--help") return { help: true };
    else if (a === "--out-dir") opts.outDir = argv[++i] ?? null;
    else if (!a.startsWith("--") && opts.root === null) opts.root = a;
    else return { error: `unrecognized argument: ${a}` };
  }
  if (!opts.outDir) return { error: "--out-dir <dir> is required" };
  return opts;
}

const USAGE = `Usage: node scripts/gen-site-reports.mjs <root> --out-dir <dir>

  <root>          the plugin to grade (the repository root)
  --out-dir <dir> where to write report.html, tier-report.json and index.html

Exit: 0 the artifacts were written | 1 they could not be | 2 the arguments were unusable`;

export function main(argv = process.argv.slice(2)) {
  const opts = parseArgs(argv);
  if (opts.help) { console.log(USAGE); return 0; }
  if (opts.error) { console.error(`gen-site-reports: ${opts.error}`); return 2; }

  const root = path.resolve(opts.root ?? ".");
  const outDir = path.resolve(opts.outDir);
  const repo = path.resolve(HERE, "..");

  const json = runReport([path.join(repo, "scripts/tier-report.mjs"), root, "--json"], repo);
  if (!json.ok) { console.error(`gen-site-reports: ${json.why}`); return 1; }
  const html = runReport([path.join(repo, "scripts/evaluate.mjs"), root, "--format", "html"], repo);
  if (!html.ok) { console.error(`gen-site-reports: ${html.why}`); return 1; }

  let report;
  try {
    report = JSON.parse(json.text);
  } catch (e) {
    // FAIL CLOSED. Unparseable output means the contract with tier-report.mjs has drifted, and publishing
    // a page that names a tier this script guessed at would be worse than publishing nothing.
    console.error(`gen-site-reports: tier-report.mjs --json did not produce parseable JSON: ${e.message}`);
    return 1;
  }

  // Provenance is ADDED here rather than expected from tier-report.mjs, whose output is a consumer-facing
  // contract this site-generation need has no business changing. Same sha resolver the badge uses, so the
  // two artifacts published by one deploy cannot name different commits.
  const sha = resolveGradedSha(root);
  const gradedAt = new Date().toISOString().slice(0, 10);
  const standard = readJsonSafe(path.join(root, "library.json")).data?.standard ?? null;

  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, "tier-report.json"), `${JSON.stringify({ ...report, sha, gradedAt, standard }, null, 2)}\n`);
  writeFileSync(path.join(outDir, "report.html"), html.text);
  writeFileSync(
    path.join(outDir, "index.html"),
    renderIndex({ tier: report.tier, sha, gradedAt, standard, registryAvailable: false }),
  );

  console.log(`gen-site-reports: wrote tier-report.json, report.html and index.html to ${opts.outDir} (tier ${report.tier} @ ${sha})`);
  return 0;
}

if (process.argv[1]?.endsWith("gen-site-reports.mjs")) process.exit(main());
