# Step 9: allocation-partial-receipt-variance-and-correction

Implement child issue #15 of parent #11 on top of the behavior-proven import/promotion flow. Read Issue #15, ADR-032, canonical migrations/RPCs, incoming loader, inventory transaction/outbox contracts, and relevant sourcing UI. Tests first. This step owns allocation, receipt, variance closure, late follow-up, and correction domain/API behavior. Keep the final combined workspace polish for issue #16, but expose minimal reachable controls needed to exercise these operations.

## Allocation contract

- Each imported source row remains one FactoryArrivalItem even when the same SKU repeats. Its ordered quantity may be allocated across one or more owned warehouses; e.g. row quantity 30 → Ogum 20 + Daeja 10.
- Allocation balance must equal the item ordered quantity while the arrival is ready/open. The promotion default allocation is editable as an initial plan, not evidence.
- Bulk “move all to default warehouse” and per-row split allocation are explicit trusted operations. Preserve warehouse snapshots.
- After any receipt exists for an allocation, its normally received portion is immovable. Reallocation may move only the unreceived, non-shortage-closed remainder. Never rewrite receipt evidence or historical transaction warehouse.
- Reject negative/zero split quantities, duplicate warehouse entries, cross-owner variants/warehouses/items, sums above/below the required remainder, and mutation of terminal arrivals.

## Receipt and lifecycle contract

- A receipt request has a client-generated `receiptRequestId` unique per owner. Retry with identical immutable payload returns the original result without posting stock twice; retry with a different payload is a conflict.
- One request may partially receive multiple allocations/rows. It is all-or-nothing: validate every row first, then atomically create one event, receipt lines, inbound transactions, inventory increments, allocation/item counters, lifecycle recalculation, and outbox requests.
- Normal received quantity is capped by allocation remaining. Actual excess is recorded as overage evidence linked to the same FactoryArrival/item/source revision and increments stock in the selected owned warehouse, but never inflates ordered/allocated/incoming quantities.
- A partial receipt immediately increases on-hand inventory and creates transaction/history evidence. Remaining expected quantities continue contributing to `incoming` as `allocated - normally received - shortage closed`.
- Lifecycle is derived: DRAFT until valid allocations/mappings; READY when fully allocatable; PARTIAL after any receipt while expected remainder exists; RECEIVED when expected allocations are fully normally received with no unresolved variance; VARIANCE_CLOSED when shortage/overage variance is explicitly closed; CANCELLED only before received evidence.
- An operator may explicitly close an expected remainder as shortage with actor/time/reason evidence. This removes only that remainder from incoming and does not alter on-hand.
- If goods later arrive after shortage closure/arrival termination, record a manual follow-up receipt linked to the original arrival/item and closure. It increments stock as late/overage evidence without reopening or inflating the original expected allocation.

## Correction contract

- Corrections never edit/delete immutable receipt events/lines or transactions. A dedicated RPC reverses an entire receipt line only; partial arbitrary reversal is out of scope.
- Reversal requires a unique correction request id and non-empty reason, appends immutable correction evidence, creates a compensating inventory transaction, decrements inventory atomically, restores the appropriate normal/overage counters, recalculates lifecycle/incoming, and enqueues latest absolute channel availability.
- Reject reversal when that exact line was already reversed, inventory is insufficient, owner/warehouse/variant linkage differs, or later committed/reserved stock makes the correction unsafe. Retry with identical correction request is idempotent; changed payload conflicts.

## Persistence and security

- Add forward migration(s); update `supabase/schema.sql` and Prisma equivalently. Do not rewrite source/receipt evidence.
- Model receipt/correction request identity and payload hash/snapshot, overage lines, shortage closures, and correction linkage explicitly. Add owner composite FKs, unique/idempotency constraints, check constraints, and indexes.
- All writes use fixed-search-path private helpers plus authenticated public RPCs. Revoke direct Data API mutations for allocation/receipt/variance/correction evidence. Owner RLS and explicit grants are mandatory.
- Serialize concurrent allocation/receipt/correction attempts with row locks and database constraints. Avoid application-only read-then-write guards.
- Every stock mutation enqueues/upserts each mapped channel product with the latest absolute available quantity (`onHand - active reservations`, floored at zero), never a delta. Preserve existing required/unsupported-provider semantics.

## Application behavior

- Add server actions for replace/split allocation, receipt request, shortage close, late follow-up, and full-line reversal with clear structured row/allocation errors.
- Reuse existing arrival detail/table/action rail. Minimal controls must support default-allocation editing, one row split across warehouses, selecting multiple partial receipt quantities, overage quantity/reason, shortage close reason, late follow-up, and reversal reason. Do not introduce a competing workspace or duplicate status summaries.
- Product/inventory loaders must show open incoming by allocation and must reflect partial received stock immediately in inventory/history.

## Acceptance

- Disposable PostgreSQL behavioral tests prove 30→20+10 balance, repeated row separation, unreceived-only reallocation after partial receipt, invalid/cross-owner/terminal rejection, and concurrency safety.
- Prove multi-row partial receipt atomicity, rollback on one bad row, immediate inventory/transaction update, remaining incoming, identical retry idempotency, changed retry conflict, and concurrent request uniqueness.
- Prove overage linked to source arrival without expected inflation, shortage closure removes incoming, late follow-up records stock/evidence without rewriting closure, and lifecycle transitions.
- Prove full-line reversal, double-reversal/idempotent retry behavior, insufficient/committed inventory rejection, compensating transaction/evidence, counter/lifecycle restoration, and latest absolute outbox values.
- Run focused/full tests, the dedicated Docker behavioral proof, fresh `supabase/schema.sql` execution, Prisma validation, lint, build, and `git diff --check`.

