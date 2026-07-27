---
description: Review a published privacy notice against the seven-point checklist and return a redline.
argument-hint: <path-to-notice>
---

# /review-privacy-notice

Runs `skills/privacy-notice-review` over the notice at `$1` and returns the redline.

## The seven-point notice checklist

Report a verdict for each of the seven items, in this order.

1. **Categories of personal data collected**, stated by category rather than by field name.
2. **A cookie banner** on every page that sets a non-essential cookie.
3. **A reading level** at or below grade 10, measured over the whole notice.
4. **Sale and sharing disclosure** with a working opt-out link in the same section.
5. **Consumer rights and how to exercise them**, with a working request route.
6. **A named data protection officer** with a direct contact route.
7. **A review date** inside the last twelve months.

## Per-state deadlines

Use [the state law matrix](../skills/privacy-notice-review/references/state-law-matrix.md) for the
response deadline that applies to the requester's state.

## Output

The verdict table, then the evidence, then the recommended wording. Paste the whole result into the
assessment file.
