---
max_turns: 10
allowed_tools: [Read, Glob, Grep, Skill]
---
hey, we're shipping the billing cleanup on thursday and I wrote these three statements to go out with it. we're on postgres 14. is this fine to ship or is there something I'm missing?

```sql
ALTER TABLE invoices
  ADD CONSTRAINT invoices_customer_fk
  FOREIGN KEY (customer_id) REFERENCES customers (id);

CREATE INDEX idx_invoices_status_created
  ON invoices (status, created_at);

ALTER TABLE invoices ALTER COLUMN currency SET DEFAULT 'USD';
```

invoices is our main billing table, finance and the customer portal both hit it all day.
