---
title: "skills/askit-onboard/evals - folder guide"
---

# skills/askit-onboard/evals

The skill triggering eval set for askit-onboard. Declares what it covers per the G3 format.

## Inventory

- `askit-onboard-triggering.eval.json` - the askit-onboard triggering eval set (>= 20 query/should_trigger
  cases, Standard sec 8.3). Covers all three modes (`assess`, `plan`, `next`) in the true cases, and
  covers the refusal boundary in the false cases: a request to FIX or BUILD a specific component
  (for example "fix the description quality of this skill", "build me a new command for this plugin
  right now") stays silent here because `askit-onboard` routes to the builder or `askit-migrate`
  rather than doing the fix itself.
