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

Do not implement mapping UI, fuzzy/name matching, Excel review UI, receipt allocation editing, overage/shortage actions, or correction UX in this step. Reason: those are ordered dependent slices and broadening this schema step would make migration verification unsafe.
