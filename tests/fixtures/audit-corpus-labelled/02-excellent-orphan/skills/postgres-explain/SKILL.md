---
name: "postgres-explain"
description: "Reads a PostgreSQL EXPLAIN ANALYZE plan, identifies where the time and rows go, and proposes index or query rewrites with the expected effect. Use when the user pastes a query plan, asks why a query is slow, or mentions sequential scans, nested loops, or missing indexes."
metadata:
  version: "0.1.0"
  tier: universal
  status: active
---

# postgres-explain

## Purpose

Explain a PostgreSQL `EXPLAIN (ANALYZE, BUFFERS)` plan in terms of where time goes, then propose the smallest change that removes the dominant cost.

## Procedure

1. If the user gave a query but no plan, ask them to run `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)` and paste it. Warn that ANALYZE executes the query.
2. Find the node with the largest exclusive time (actual total time minus children). That is the target; ignore everything else until it is addressed.
3. Read the estimate-versus-actual rows on that node. A gap over 10x means stale statistics or a correlation the planner cannot see: propose `ANALYZE <table>` first, or extended statistics for correlated columns.
4. Match the node type to a remedy:
   - Seq Scan with a selective filter: an index on the filter columns, in filter order, with the most selective first.
   - Nested Loop with a large outer side: usually a missing index on the inner join key, or a bad row estimate on the outer side.
   - Hash Join spilling (Batches > 1): raise `work_mem` for the session, or reduce the hashed side.
   - Sort with external merge: an index matching the ORDER BY, or a smaller working set.
5. State the expected effect in the plan's own units ("this removes the 480 ms seq scan; expect under 5 ms with the index").

## Report

Lead with the one change to make. Then the evidence: the node, its time, its row estimate versus actual. Then the second-order options. Never propose more than three changes at once.

