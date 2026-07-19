# Step 12: inbound-domain-contract-gap-closure

Implement and prove the remaining mismatches listed in `docs/product/inbound-receiving.md`. Tests first. Keep source evidence immutable and use server actions/trusted RPCs only.

Completion requires all of the following, with forward migration and `supabase/schema.sql` parity:

1. Persist invalid/incomplete import reviews with raw cells, quantities, issues, and ordered rows; reload/resume them while promotion stays blocked until valid.
2. Add reachable supplier-SKU mapping maintenance in Product Management: active mapping visibility, confirm/reassign/deactivate, and audit/history.
3. Model closure-linked late receipts as child follow-up evidence while keeping original expected quantity and closure immutable. Actual receipt/incoming aggregates must include follow-ups and corrections, including repeated source rows.
4. Persist an editable local receipt business date for normal and follow-up receipts. Validate it in the trusted RPC, include it in canonical/idempotency payloads, write it to receipt evidence and inventory transactions, backfill before `NOT NULL`, and prove same request ID/different date conflicts.
5. Require a nonblank allocation-change reason in the trusted RPC. Atomically record owner-safe before/after snapshots only for real mutations, with useful warehouse/fixed/remainder values, immutable audit storage, FKs, indexes, RLS, and revoked direct DML.
6. Implement the default-warehouse `move all remaining` operation atomically. Preserve received/closed fixed quantities, delete zero-fixed non-target allocations, put only the movable remainder on the target, lock deterministically, and assert allocation totals still equal ordered quantity.
7. Show pre-submit reconciliation grouped by ProductVariant and warehouse: normal receipt, overage, and resulting incoming quantity.
8. Return structured operation errors scoped to item/allocation/closure/receipt-line. Render them adjacent with accessible live feedback and preserve editor drafts after failure.

Also fix UI state correctness: use a Korea-local date default rather than UTC slicing, key receipt date/drafts per selected editor rather than globally, and make the move-all action reachable. Loaders/types must expose the new receipt date, mapping/audit, and aggregate evidence required by the UI.

Acceptance must exercise behavior, not merely search SQL text: trusted receipt date persistence/idempotency, allocation replacement and move-all invariants, cross-owner rejection, immutable audit, follow-up/correction aggregate parity, incomplete-review reload/promotion blocking, and fresh-schema equivalence. Keep privileged implementations outside the exposed API schema where practical, use a fixed `search_path`, and grant only the minimal authenticated wrapper surface.

Do not start Step 13 in this step. The outer Harness owns acceptance commands; do not mark the step blocked solely because the inner child sandbox cannot run a command that the outer orchestrator can run.
