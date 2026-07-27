---
name: privacy-notice-review
description: Reviews a published privacy notice against a seven-point disclosure checklist and the US state privacy statutes, and returns a redline with a per-item verdict. Use when a user asks to review, redline, or gap-check a privacy notice or privacy policy before publishing it.
metadata:
  version: 0.4.0
---

# privacy-notice-review

Read a published privacy notice and say, item by item, whether it discloses what the US state
privacy statutes require. The output is a redline for a human reviewer, not a filing.

## The seven-point checklist

This is the canonical list. Every review reports a verdict for each of the seven items, in this
order, and never renumbers them.

1. **Categories of personal data collected**, stated by category rather than by field name.
2. **Purposes of processing**, stated per category, not as one paragraph covering everything.
3. **Third parties and categories of recipients**, including processors and advertising partners.
4. **Retention**, either a period per category or the criteria used to set one.
5. **Consumer rights and how to exercise them**, with a working request route.
6. **The appeal path** for a request the controller denies, with the deadline for the appeal.
7. **Contact details and the effective date**, including the date of the last substantive change.

## Procedure

1. Read the notice end to end before judging any item. A disclosure often lands in a section its
   heading does not advertise.
2. For each checklist item, quote the sentence in the notice that satisfies it, or record the item
   as missing. A paraphrase is not evidence.
3. Check the state-specific requirements in [the state law reference](references/us-state-laws.md)
   for every state the notice names, plus every state the product actually sells into.
4. Return the redline in the shape described in
   [the output contract](references/output-contract.md): the per-item verdict table first, then the
   quoted evidence, then the recommended wording for each gap.

## What this skill does not do

It does not read the product's data flows, so a disclosure that is present but untrue reads as
satisfied here. Say so in the redline when the claim is one the notice cannot support on its face.

## Changelog

- **0.4.0** - added the appeal path as checklist item 6 and renumbered contact details to item 7.
- **0.3.0** - removed the in-place write. The review now returns a report and never edits the
  source notice.
- **0.2.0** - added the state law reference.
