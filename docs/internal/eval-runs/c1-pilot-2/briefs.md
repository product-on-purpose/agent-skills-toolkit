# Experiment B2 briefs

### Brief A: `lease-clause-review`

> Build a skill named `lease-clause-review`. It reviews commercial lease clauses that a tenant pastes in and tells the tenant what to push back on before signing.
>
> House conventions the output must follow. The first line is exactly "Lease review: N clauses, X high-risk" with the real counts. Each clause gets its own section headed "Clause <number>: <short title>", in the order given in the input. Each section starts with a line "Risk: High", "Risk: Medium" or "Risk: Low", and no other risk words. After that line, write "Ask:" followed by one concrete replacement wording or numeric limit, never a general suggestion. If a clause depends on a fact the input does not give (for example the rent base or the term), write "Unknown: <fact>" and do not guess a figure. A clause rated Low gets only its Risk line, its Ask line and at most one sentence of explanation. The last section is "Walk-away items", listing only High clauses by number, or the single word "None".
>
> People ask for this in many ways, such as "can you check these lease terms before I sign?" or "what in this landlord's draft should worry a small shop owner?"

### Brief B: `shift-handover-note` (smaller model)

> Build a skill named `shift-handover-note`. It turns a supervisor's rough notes about a manufacturing line shift into a handover note for the next shift. The skill will be used by a smaller model and the inputs are usually thin, so templates and rules for missing facts matter.
>
> House conventions the output must follow. The first line is "HANDOVER <line name> | <date> | <outgoing shift> to <incoming shift>", with "unstated" for any missing part. Use exactly these headings in this order: "Stopped or degraded", "Open work orders", "Safety", "Quality holds", "Next shift must do first". Every heading appears even when empty, and an empty one reads "Nothing reported". Each item under "Stopped or degraded" ends with a status word from this list only: DOWN, SLOW, WATCH. Never invent work order numbers; write "WO number not given" when absent. "Next shift must do first" holds at most three numbered items, each starting with a verb. The note ends with "Source: supervisor notes only".
>
> People ask for this in many ways, such as "write up the handover for nights" or "tidy my scribbles so the next crew knows where we left Line 4."

### Brief C: `customer-release-notes`

> Build a skill named `customer-release-notes`. It turns a pasted list of internal commit messages and ticket titles into release notes for customers of a software product.
>
> House conventions the output must follow. The first line is "# <Product> <version> - <date>", using "version not given" or "date not given" when missing. Sections appear in this order with these exact headings: "New", "Improved", "Fixed", "Action required". Omit "New", "Improved" and "Fixed" when empty, but always include "Action required", reading "None" when empty. Each bullet is one sentence, starts with a past-tense verb, and states what the customer can now do or no longer suffers. Never include ticket IDs, developer names, file names or internal codenames. Anything that removes or changes existing behaviour goes under "Action required" with a "By <date>:" prefix, or "By: date not given". Skip refactors and test-only changes silently, but end with "Not customer-facing: N items omitted."
>
> People ask for this in many ways, such as "draft the changelog for this sprint's merges" or "what do we tell users about these commits?"

### Dry-run brief: `catering-recipe-scaler`

> Build a skill named `catering-recipe-scaler`. It scales a pasted home recipe up or down for a stated number of servings and returns a kitchen-ready prep card.
>
> House conventions the output must follow. The first line is "SCALE <original servings> -> <target servings> (x<factor>)", with the factor to two decimals. Ingredients appear in a table with exactly the columns "Ingredient | Original | Scaled | Weight (g)". Quantities use grams or millilitres for anything over 100 units, and spoons only below that. Salt, spices and leavening are scaled at 75 percent of the linear factor and marked with an asterisk. Cooking times are never scaled; instead write a line "Time: unchanged, check doneness by <cue from the recipe>". If the original servings are not stated, write "Original servings: not given" and ask for them instead of guessing. End with "Pan check:" naming the vessel size needed, or "Pan check: not determinable".
>
> People ask for this in many ways, such as "make this lasagne for 40 people" or "halve my grandmother's stew for two."

## Edits after authoring

The brief author wrote this file on 2026-11-22 on the Sonnet model, from [`brief-author-prompt.md`](brief-author-prompt.md). One sentence was then changed by the pre-registration's author, before any case or build existed. Brief A said "Clauses rated Low get one sentence only", which contradicts the rule that every clause section starts with a Risk line and an Ask line. It now reads "A clause rated Low gets only its Risk line, its Ask line and at most one sentence of explanation." Nothing else was changed.
