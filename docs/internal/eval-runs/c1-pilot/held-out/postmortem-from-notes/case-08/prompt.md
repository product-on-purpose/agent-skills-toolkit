---
max_turns: 10
allowed_tools: [Read, Glob, Grep, Skill]
---
checkout 500s from the other day, rough notes from the thread, can you make this into a proper write-up

Rahul turned on the new-tax-calc flag for 5% of users but typed 50 instead. The flag UI just takes any number, no confirm step.
Started around 10:20. Sofia (support lead) was first to notice, lots of tickets, and it was only people paying with a saved card.
Aiyana (on-call) rolled the flag back to 0, don't remember when exactly.
Why saved cards: the new tax calc crashes when the card's billing region is null, and old saved cards have null region.
The checkout error rate alert did fire but its threshold was 20% so it didn't page at first.
Good thing: rollback via the flag was fast once somebody looked.
Nobody has counted the failed orders yet.
