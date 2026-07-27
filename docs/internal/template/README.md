# docs/internal/template

Frozen historical design references for the E1 report renderer (`scripts/lib/report-render.mjs`). These files are not live templates and are not used at runtime; they document the design variants the renderer was built to target.

## Files

- `evaluation-report--plugin.html` - the original single-panel plugin report template.
- `evaluation-report--plugin--dashboard.html` - the **maintainer's favorite** variant: a command-dashboard layout with a solid weight hierarchy and wider matrix cells. This was the primary design reference for the renderer.
- `evaluation-report--plugin--dashboard-v2.html` - a refined dashboard variant with additional weight and wrapping improvements (supersedes the original dashboard for the renderer's default style).
- `evaluation-report--plugin--dark.html` - a dark-mode, engineer/PR-review-facing variant.
- `evaluation-report--plugin--editorial.html` - a wide editorial layout variant.
- `evaluation-report--plugin--editorial.md` - the Markdown twin of the editorial variant; demonstrates the Markdown surface the renderer emits for PR review and agent consumption.
- `evaluation-report--migration.html` - a migration-assessment report template.
- `evaluation-report--skill.html` - a single-skill evaluation template.

All files carry a `SAMPLE TEMPLATE` comment at the top with a note that the subject is hypothetical and exists only to exercise the information architecture.
