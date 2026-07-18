# Step 4: supplier-mapping-migration-and-receipt-hardening

Correct the audited P0/P1 defects in child issue #13. Tests first. Keep scope limited to exact supplier mapping persistence, receipt compatibility and schema parity.

## Required corrections

- In `20260719053000_supplier_sku_mapping_and_audit.sql`, collapse/deactivate legacy template-scoped duplicates before creating the partial unique active supplier/SKU index. Add executable migration fixtures for same-target duplicates and conflicting-target duplicates; migration must complete, retain one active same-target mapping, deactivate every conflict, and append audit evidence for every migration-driven state change.
- Drop the actual legacy template unique constraint (its PostgreSQL-generated name is truncated in the current schema). Confirm→deactivate→confirm and reassign must not fail because a stale `(user,supplier,template,external_sku)` unique remains.
- Replace or retire the installed legacy `receive_inbound_draft_rows` function from `20260717153604_inbound_drafts_and_supplier_sku_links.sql`. The live application compatibility path must remain atomic and mapping-free: no insert/upsert/update to `supplier_sku_links`, no normalized NOT NULL or revoked-privilege rollback. Test the real migration-chain RPC, not a string search in the canonical migration only.
- Harden `confirm_supplier_sku_mapping(p_source_row_ids)`: lock and validate every distinct ID; require exact owner, import supplier, normalized external SKU, existing ProductVariant null/same, and no receipt evidence/received quantity. Reject missing, duplicate, mismatched, already-received or already-differently-mapped IDs and roll back link+audit atomically. Assert affected cardinality.
- Revoke public/anon execute on all public mapping write RPCs and require authentication consistently. Change active/historical supplier/ProductVariant FK delete behavior from cascade where necessary so mapping/audit history survives; update Prisma.
- Make `supabase/schema.sql` operationally equivalent to the forward migration, not a throwing stub: normalization/backfill constraints, legacy collapse order, policies/grants/triggers, private audit helper, and all confirm/reassign/deactivate functions.

## Acceptance

- Add focused static/unit tests and an executable disposable DB fixture covering legacy duplicate collapse, conflicting collapse, confirm/deactivate/reconfirm, source-row mismatch rollback, receipt RPC with no mapping write, two-user isolation and immutable audit.
- Run focused/full tests, behavioral DB proof when Docker is available, Prisma validation, lint and build.
