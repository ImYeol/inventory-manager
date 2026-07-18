# Step 1: canonical-persistence-hardening-and-behavioral-fixture

Complete child issue #12 by correcting the audited defects left by step 0. Read the completed step summary, `step0.md`, Issue #12 contracts, current migration/schema/actions/UI, and relevant tests. Tests first. Do not implement later supplier-mapping, import-review, variance-operation, or broad UI slices.

## Required corrections

1. Fix legacy inbound compatibility. The current `sync_legacy_inbound_draft_receipt` invoker trigger updates `factory_arrival_allocations` after authenticated UPDATE was revoked, so the old `receive_inbound_draft_rows` path can roll back. Either retire that RPC and all live application callers atomically, or place counter synchronization and receipt evidence in a narrowly granted trusted/private atomic function. Test the chosen live path under an authenticated role.
2. In the existing arrivals form, pass an explicit warehouse ID to `createFactoryArrivalBatch`. Reuse the existing control vocabulary and keep this a single destination selector; later steps own per-row split allocation. Multi-warehouse users must be able to create manual/CSV arrivals.
3. Rewrite legacy FactoryArrival backfill so repeated identical ProductVariant rows never reuse one transaction, each transaction links to at most one receipt line, deterministic multi-warehouse transaction evidence creates warehouse-specific allocations, and overage remains evidence/exception rather than inflating expected allocated quantity. Ambiguous evidence must be reported without duplicate or dangling receipt events.
4. Receipt consistency must require allocation for transaction-backed lines and validate owner, event arrival, allocation item/variant/warehouse, transaction model/size/color/warehouse/reference type/reference id/quantity. New receive must preserve inventory-sync outbox behavior and create one receipt event per submission with multiple lines.
5. Remove broad authenticated mutation of canonical arrival/item lifecycle, ProductVariant association, expected/received counters, and deletion after evidence exists. Mutations must use trusted RPCs. Put SECURITY DEFINER helpers in `private` where possible; otherwise revoke public/anon and document exact safe boundary and search path.
6. Make `supabase/schema.sql`, the forward migration, and `prisma/schema.prisma` materially equivalent: canonical create/receive functions, compatibility evidence, consistency and immutability triggers, source_type backfill/NOT NULL, import/follow-up FKs, and actual delete behavior. Add only historically required RESTRICT changes.

## Executable behavioral test

Add a committed local PostgreSQL/Supabase behavioral fixture and an npm script that runs it against an explicitly supplied disposable database URL. The script must refuse an absent/unsafe target. It must construct representative legacy rows before applying the canonical migration and assert afterward:

- inventory totals and transaction count did not change during migration;
- raw source rows remain and incoming comes only from allocations;
- untouched, partial, received, overage, repeated-variant and deterministic multi-warehouse cases preserve correct expected/received/remainder meaning;
- every historical transaction is linked at most once and no receipt event is dangling;
- the chosen authenticated compatibility path works atomically (or is revoked with no application caller);
- a second user cannot read or mutate the first user's canonical records;
- raw revisions/source rows and receipt evidence cannot be updated/deleted directly.

Static SQL string assertions and mocked Supabase calls may supplement but cannot replace this executable fixture. Run it if Docker is accessible; if sandbox Docker is unavailable, ensure the outer orchestrator can invoke it without editing source files.

## Acceptance

```bash
npm run test -- --run tests/inbound-canonical-domain.test.ts tests/data.test.ts tests/schema-contract.test.ts tests/sourcing-actions.test.ts
npm run test
npx prisma validate
npm run lint
npm run build
```
