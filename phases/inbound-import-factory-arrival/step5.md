# Step 5: import-deduplication-revisions-and-promotion

Implement child issue #14 of parent #11 on top of completed canonical arrival and supplier SKU mapping steps. Read Issue #14, ADR-032, the current import/template actions and UI, and the canonical migration proof before editing. Tests first. This step owns file/manual source evidence, duplicate/revision rules, review blockers, and atomic promotion to a FactoryArrival with an initial default-warehouse allocation. Do not implement allocation splitting, receipt/overage/shortage operations, or the final combined workspace; those belong to later child issues.

## Domain contract

- A factory spreadsheet contains an external shipment/reference number that identifies the logical import. Logical identity is `(user_id, supplier_id, external_shipment_number)`; normalize only Unicode whitespace at both ends and otherwise preserve the identifier.
- SHA-256 is a user-wide physical-file identity. An already registered file hash must be rejected even when supplier, template, shipment number, or upload route differs. Enforce this in the database, not only in application code.
- The first accepted upload creates one `InboundImport` and immutable revision 1. A later different file with the same supplier/shipment number is a proposed new immutable revision linked by `supersedes_revision_id`; it must never overwrite prior source rows.
- A different-file revision may supersede only before any canonical receipt evidence exists for the logical import. Once any normally received or overage quantity/evidence exists, reject supersession and require a separate correction/manual receipt workflow later.
- Repeated spreadsheet rows are distinct evidence. Preserve workbook sheet/row order, raw values, raw external SKU, raw quantity and parsed quantity one row at a time; never merge rows merely because external SKU/ProductVariant repeats.
- An exact active supplier SKU mapping may fill a ProductVariant snapshot automatically. Missing/deactivated/conflicting mapping is an explicit review blocker. Do not fuzzy-match, product-name-match, case-fold, or coerce identifiers.
- Import revisions and raw source rows are evidence only: they never contribute to `incoming` and never post stock. Promotion creates the canonical `FactoryArrival`.
- Promotion is explicit and atomic. Every valid source row becomes exactly one arrival item, including repeated SKUs. The user selects one default warehouse for this second-stage allocation; each promoted row initially allocates its full ordered quantity there. Later allocation splitting may move part of it.
- Promotion requires: supplier/shipment identity, current revision, valid positive parsed quantities, all rows mapped to owned ProductVariants, and an owned default warehouse. One revision can create at most one FactoryArrival. Failure leaves no partial arrival/items/allocations.
- Manual planned arrival remains supported by the canonical aggregate without pretending it has a file hash. Manual source revisions, if created through the import-review surface, require an explicit source identifier and still preserve immutable rows.

## Persistence and security

- Add a forward migration rather than rewriting proven migrations. Bring `supabase/schema.sql` and Prisma into parity.
- Add/adjust unique constraints and indexes for user-wide file hash, logical import identity, monotonic revision number, one supersession edge, stable source row ordinal, and one arrival per promoted revision. Handle any existing data conservatively and record ambiguity instead of guessing.
- Store the raw file in the established private storage path/bucket only after the database reservation rules are clear. Implement compensating cleanup or an equivalent idempotent sequence so a DB failure does not present an accepted upload or orphan user-visible draft. Never expose a service-role operation to client code.
- All external/storage/database work stays in server actions or trusted RPCs. Client components must not call external APIs directly.
- New tables/functions need owner-scoped RLS, explicit grants, indexed policy/FK columns, fixed `search_path`, and private-helper/public-RPC boundaries. Evidence rows and accepted revision identity fields are immutable through the Data API.
- Concurrent uploads/promotions must be serialized by database constraints/locks so two requests cannot accept the same hash, create competing current revisions, or promote the same revision twice.

## Application behavior

- Extend the existing template-based Excel parse flow to extract the configured shipment/reference number from a column, fixed cell, or explicit manual input. Show a blocking validation when it is absent.
- Compute SHA-256 from the original uploaded bytes before parsing/mutation. Return clear outcomes for exact-file duplicate, same logical shipment with a proposed revision, post-receipt supersession block, parse errors, and mapping blockers.
- Review lists every original row in order, including repeated SKU rows. Allow the user to select an existing ProductVariant and confirm the exact supplier SKU mapping, or leave and return after creating a product. Reuse the supplier mapping actions from step 3; do not create mappings during receipt or silently remap.
- Keep warehouse assignment as the explicit second stage requested by the user: after row review/mapping is valid, select a default warehouse and promote. Do not infer a warehouse from spreadsheet columns because these files have no destination column.
- Reuse existing toolbar/table/modal primitives under Simple Surface First. Keep product creation and detailed per-row warehouse splitting out of this step.

## Acceptance

- Tests cover original-byte SHA-256, user-wide exact hash block across suppliers/templates, two-user hash isolation, logical shipment identity, first revision, pre-receipt supersession, post-receipt supersession block, immutable old revision/rows, concurrent duplicate protection, and no orphan/accepted state on storage or DB failure.
- Tests cover repeated SKU rows remaining distinct and ordered, exact active mapping auto-application, missing/deactivated/conflicting mapping blockers, invalid/non-positive quantity blockers, and no fuzzy/name/case-fold matching.
- Tests cover atomic promotion, one source row to one arrival item, full default allocation for each row, one arrival per revision, owner checks, and proof that import evidence alone does not change `incoming`, inventory, or transactions.
- Run focused tests, full tests, a disposable migration/RLS behavioral proof for the new constraints/RPCs, Prisma validation, lint and production build.

