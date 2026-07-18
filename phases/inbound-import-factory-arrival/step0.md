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
