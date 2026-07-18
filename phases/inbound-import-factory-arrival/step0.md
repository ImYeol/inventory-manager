# Step 0: canonical-arrival-schema-and-legacy-migration

Implement child issue #12 of parent issue #11. Read the complete repository contracts required by `seleccase-harness`, ADR-011/029/031, existing sourcing/inbound schema and migrations, `src/lib/data.ts`, and focused tests before editing. This step owns the canonical persistence boundary only; later steps own supplier mapping actions, file review actions, receipt operations, and UI.

Tests must be written first.

## Required model

- Record a new ADR: `InboundImport -> FactoryArrival -> Inventory/Transaction`.
- `InboundImport` owns logical import identity, immutable source revisions and source rows only. It never contributes to `incoming` and never posts stock.
- `FactoryArrival` is the only expected-receipt aggregate. Add ProductVariant-backed items and warehouse allocations. Allocation remainder is `allocated_quantity - normally_received_quantity - shortage_closed_quantity`.
- Preserve one import source row as one arrival item even when external SKU repeats.
- Persist only these arrival lifecycle values: `DRAFT`, `READY`, `PARTIAL`, `RECEIVED`, `VARIANCE_CLOSED`, `CANCELLED`. Mapping/allocation/invalid blockers are derived, not lifecycle values.
- Manual planned arrivals use the same FactoryArrival aggregate with no import revision.
- Keep expected date, supplier, external shipment/reference, source type, import revision and optional follow-up parent on FactoryArrival.
- Add immutable receipt-event/line persistence sufficient to link migrated historical transactions without applying inventory again. Full operational receipt behavior belongs to step 3.
- Add display snapshots needed to preserve seller SKU, product/option, supplier and warehouse history.

## Migration contract

- Use `supabase migration new` to create the forward migration; keep `supabase/schema.sql` and `prisma/schema.prisma` consistent.
- Enable RLS and owner-scoped policies on every new public table and index `user_id`/foreign-key policy columns.
- Backfill ProductVariant references from the unique user/model/size/color tuple.
- Migrate legacy `inbound_drafts` and rows into import/revision/source rows and linked canonical FactoryArrivals. Do not call a receipt RPC and do not insert new stock transactions.
- For already received legacy rows, link existing `transactions` evidence to generated migrated receipt events/lines. Preserve ambiguous legacy evidence through an explicit migration exception/report record instead of guessing.
- Do not change inventory/onHand or replay stock. Do not delete source rows or posted transactions.
- During rollout and after migration, `incoming` must come only from canonical FactoryArrival allocations; remove the `inbound_draft_rows` addition from application data loading.
- Replace destructive cascade behavior for historically referenced arrival/import/receipt records with restriction. Do not broadly change unrelated deletion behavior in this step.
- Keep legacy receipt RPCs temporarily for compatibility, but mark/revoke the inbound-draft path only when the migrated canonical path is verified; later receipt step performs final convergence.

## Test contract

- Add focused domain tests for lifecycle values, derived readiness, allocation remainder and canonical incoming semantics.
- Add loader regression tests proving raw import/draft rows are never added to incoming and warehouse/ProductVariant allocation remainder is the only source.
- Add migration/RLS contract tests for every new table, ownership policy, index, FK and legacy no-replay statements.
- Add a local Supabase behavioral migration test or pgTAP fixture covering untouched, partial and received drafts: inventory totals and transaction counts are unchanged; source rows survive; receipt evidence is linked; incoming is not duplicated; two users remain isolated.
- Static SQL string assertions may supplement but must not replace behavioral verification. If the existing migration chain prevents a fresh local reset, fix the smallest baseline gap required for this schema slice and record it; do not fake a passing integration test.

## Acceptance commands

```bash
supabase --version
supabase db reset --local
supabase test db
npm run test -- --run tests/inbound-canonical-domain.test.ts tests/data.test.ts tests/schema-contract.test.ts
npx prisma validate
npm run test
npm run lint
npm run build
```

## Mandatory audit corrections before completion

The first attempt produced commit `f692b7d` and must be corrected, not treated as a clean implementation. Verify all of these against executable PostgreSQL and regressions:

- Add every composite UNIQUE/primary key required by new composite foreign keys, especially `factory_arrival_items(id,user_id)` and `transactions(id,user_id)`, before creating dependent FKs.
- Update existing manual/CSV FactoryArrival creation and the legacy receive code in the same migration-compatible deployment so `source_type` and canonical lifecycle constraints never break runtime writes. Do not leave Korean persisted statuses writing into an English-only check.
- Backfill allocations and receipt evidence for existing `factory_arrivals` as well as `inbound_drafts`; preserve existing canonical incoming and do not replay inventory.
- Prevent the legacy inbound receipt path from making canonical allocation/receipt data stale. Either make it update the canonical aggregate atomically during the compatibility window or retire/revoke it together with an application action change that leaves no callable dead path.
- Promote wholly-unreceived valid/mapped/balanced migrated drafts to READY; keep invalid/unmapped work DRAFT with explicit exception evidence.
- Enforce same-owner and aggregate consistency for supplier/import/revision/source-row/item/allocation references. One source row cannot silently promote to multiple items.
- Raw revision/source rows and receipt evidence must be immutable at the database policy/trigger boundary; broad owner `FOR ALL` policies are insufficient.
- Make Prisma relation delete behavior/nullability and checked-in `supabase/schema.sql` match the forward migration.
- Treat canonical arrival/allocation query errors as failures rather than silently returning incoming zero.
- Include existing factory-arrival fixtures, legacy inbound fixtures, actual FK creation, RLS isolation, no-replay inventory/transaction counts, and incoming preservation in behavioral tests.

Do not implement mapping UI, fuzzy/name matching, Excel review UI, receipt allocation editing, overage/shortage actions, or correction UX in this step. Reason: those are ordered dependent slices and broadening this schema step would make migration verification unsafe.

## Mandatory second audit corrections before completion

The second attempt produced commit `e824714`. Correct all remaining P0/P1 findings below in this same step. These are persistence compatibility defects, not later receipt-UX scope:

- Make `receive_factory_arrival` atomically update canonical allocation received counters and append immutable receipt event/line evidence linked to the stock transaction. Partial receipts must immediately reduce canonical `incoming` by the received amount; completing an arrival must not rely on a status filter to hide a stale remainder.
- Make existing manual/CSV FactoryArrival creation resolve the ProductVariant-backed item and create a canonical warehouse allocation. A READY aggregate with zero allocations is invalid. Retain current UI/action compatibility while using canonical persistence.
- Backfill existing FactoryArrival allocations for users with multiple warehouses without guessing: use warehouse evidence from linked legacy transactions where available and write explicit migration exceptions for genuinely ambiguous unresolved remainder. Preserve computable incoming. Handle historical `received_quantity > ordered_quantity` without aborting migration, preserving the discrepancy as explicit exception/evidence.
- Link legacy `factory-arrival` transactions to migrated receipt events/lines without replaying stock. During inbound-draft compatibility, ensure every successful legacy receipt also creates canonical receipt evidence, or retire that RPC plus its application call atomically. Lifecycle calculation must not mark an arrival received while unresolved/unallocated sibling items exist.
- Remove direct Data API mutation rights for canonical allocation receipt/shortage counters and receipt evidence. Writes must go through trusted RPC/server paths. Add aggregate-consistency validation across receipt event, allocation, item, warehouse, and transaction so immutable evidence cannot be fabricated across unrelated records.
- Add same-owner composite integrity for `inbound_imports.supplier_id`; ensure one import revision can promote to at most one FactoryArrival. Add only the required RESTRICT protections for historically referenced warehouse/catalog records identified by this slice.
- Bring checked-in `supabase/schema.sql` and `prisma/schema.prisma` into exact agreement with migration output for source type/nullability, FKs, triggers, policies, and delete behavior.
- Update dashboard and sourcing reads so canonical English lifecycle values do not regress counts or labels.
- Add executable database behavioral coverage (pgTAP or a repository test script invoked by the test suite) for legacy factory arrivals and untouched/partial/received inbound drafts, including a multi-warehouse owner, overage data, immutable evidence, owner isolation, no inventory/transaction replay, source preservation, receipt linkage, and canonical incoming. Static SQL assertions alone do not satisfy this step.

## Mandatory third audit corrections before completion

The third attempt produced commit `578e1eb`. Do not mark this step complete until these executable defects are fixed and tested:

- The legacy inbound-row sync trigger currently runs as invoker after authenticated allocation UPDATE was revoked, so `receive_inbound_draft_rows` can roll back with permission denied. Retire that callable path together with its app call or move compatibility synchronization and evidence into a trusted atomic boundary. Add a DB test that invokes the authenticated legacy path and proves it succeeds or is deliberately unavailable without a live application caller.
- The arrivals UI must pass an explicit warehouse to manual/CSV canonical creation for multi-warehouse users. Add the smallest existing-form warehouse selector needed for current compatibility; this is not the later allocation-split UI.
- Rework legacy FactoryArrival backfill so repeated same-variant rows never reuse the same transaction evidence, multi-warehouse transaction evidence produces warehouse-specific allocations when deterministically possible, and overage never inflates expected allocation. A transaction must link to at most one receipt line. Ambiguity must remain an exception without creating duplicated or dangling evidence.
- Strengthen receipt-line consistency to require a non-null allocation for transaction-backed lines and validate transaction warehouse, model/size/color ProductVariant tuple, reference type/id, quantity, owner, and arrival against the allocation/event.
- Preserve existing inventory-sync outbox behavior in the new receive RPC. Create one receipt event per submission with lines per item, not one event per item. Keep later variance/idempotency UX out of this step.
- Move trusted SECURITY DEFINER helpers to a private/unexposed schema where practical, or document and enforce the exact revoke/search_path boundary. Parent/item canonical lifecycle and received counters must not remain directly mutable through broad authenticated FOR ALL policies.
- Make `supabase/schema.sql` truly equivalent to the forward migration: include the canonical create/receive functions, compatibility transaction evidence, allocation consistency, immutable evidence, source_type backfill/NOT NULL, and import/follow-up FKs. Make Prisma delete behavior match the actual migration, and add the narrowly required historical RESTRICT FK changes.
- Add and run an executable local PostgreSQL behavioral test script in the repository. It must build a legacy fixture, apply the migration, assert no inventory/transaction replay, repeated-row/nonduplicate transaction linkage, multi-warehouse/overage semantics, source preservation, authenticated compatibility behavior, RLS isolation and immutability. Static source assertions and mocked Supabase clients are insufficient.
