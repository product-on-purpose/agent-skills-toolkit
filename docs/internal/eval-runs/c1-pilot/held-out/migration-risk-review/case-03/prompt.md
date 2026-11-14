---
max_turns: 10
allowed_tools: [Read, Glob, Grep, Skill]
---

can you look at this before we run it on prod?

ALTER TABLE invoices
  ADD CONSTRAINT fk_invoices_customer
  FOREIGN KEY (customer_id) REFERENCES customers (id);

it's postgres. thanks
