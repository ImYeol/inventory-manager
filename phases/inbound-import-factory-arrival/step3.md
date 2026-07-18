# Step 3: supplier-sku-mapping-and-audit

Implement child issue #13 of parent #11 on top of completed canonical persistence steps. Read Issue #13, ADR-032 and relevant product/sourcing domain/UI contracts. Tests first. This step owns exact supplier SKU mapping and its product-management entry point; do not implement file upload review, allocation splitting, receipt variance actions, or the final combined workspace.

## Domain contract

- One external factory SKU identifies one exact stock unit including product, color and size. Repeated rows with the same external SKU mean the same ProductVariant, but each imported source row remains separate.
- Active mapping identity is `(user_id, supplier_id, normalized_external_sku)` and must not depend on template/version.
- Normalization removes Unicode whitespace only from both ends. Preserve case, leading zeros, internal whitespace and punctuation. Do not use product name matching, fuzzy matching, case folding or numeric coercion.
- An exact active mapping may auto-apply. Missing/conflicting mappings remain explicit blockers for later import review.
- Confirm, reassign and deactivate are explicit operations. Reassign/deactivate require a non-empty reason. Every change appends immutable audit evidence containing actor, timestamp, supplier, normalized/raw SKU snapshot, previous/new ProductVariant and reason.
- Confirming a new mapping must atomically persist the supplier link, audit event and any targeted canonical import source-row ProductVariant/display snapshot. Receipt code must never create or update supplier mapping.
- Historical audit/source snapshots survive ProductVariant, supplier or template renames and cannot be changed/deleted through the Data API.

## Migration and security

- Forward-migrate existing template-scoped `supplier_sku_links`. When multiple existing active rows collapse to one supplier/SKU key, keep a mapping active only if all point to the same ProductVariant; otherwise deactivate and record an explicit conflict requiring user resolution. Never guess.
- Add the unique partial/index/constraints needed for one active exact mapping per owner/supplier/normalized SKU. Preserve raw external SKU snapshots separately.
- Every new public table must have owner RLS, explicit grants and indexed policy/FK columns. Trusted write functions must use the established private helper/public RPC boundary. Audit events are insert-only through trusted functions and immutable afterward.
- Update Prisma and `supabase/schema.sql` to match the migration. Use a new forward migration; do not rewrite the already behavior-proven canonical migration unless a direct dependency requires it.

## Application behavior

- Add server actions/data methods for exact lookup, confirm, explicit reassign with reason, deactivate with reason, and audit history. Normalize identically in TypeScript and PostgreSQL with focused tests.
- In 상품 관리, after creating/editing a ProductVariant, provide an optional second step to pre-map supplier + external SKU to that variant. Keep the default product creation surface simple; reuse the current form/modal/action rail and do not make supplier mapping mandatory.
- Existing sourcing/import code that looks up mappings must use supplier identity, not template identity. Remove mapping upsert side effects from receipt paths.
- Return clear conflict/missing-schema/duplicate messages; never silently remap.

## Acceptance

- Tests cover Unicode edge trimming, preserved case/zeros/internal spacing/punctuation, template independence, exact auto-apply, same-target legacy collapse, conflicting legacy collapse, duplicate active conflict, confirm/reassign/deactivate reasons, immutable history, two-user isolation, atomic source-row snapshot update, and absence of fuzzy/name matching or receipt-time mapping writes.
- Run focused tests, full tests, a disposable migration/RLS behavioral check where relevant, Prisma validation, lint and build.
