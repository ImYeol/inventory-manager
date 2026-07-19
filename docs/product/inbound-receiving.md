# Inbound receiving

This document is the acceptance source of truth for supplier files, expected arrivals, warehouse allocation, and actual receipt. `CONTEXT.md` owns vocabulary; ADR-032 and ADR-033 own the persistence boundaries.

## Ownership and entry points

- `/products` owns internal `ProductVariant` creation and supplier external-SKU mapping maintenance: view, confirm, reassign, deactivate, and audit.
- `/sourcing/arrivals` is the single owner of supplier Excel review, promotion, allocation, partial receipt, overage, shortage closure, follow-up, and correction.
- `/inventory` shows `onHand`, `committed`, `available`, and warehouse-specific `incoming`. Its `수동 입고` is a direct non-sourcing stock transaction; it must not open the supplier import flow.
- The primary navigation exposes both `/sourcing/factories` and `/sourcing/arrivals`; `/sourcing` defaults to arrivals.

## Import and mapping

1. A supplier external SKU is one exact color-and-size stock unit. Multiple rows may repeat the same SKU or resolve to the same internal variant and must remain separate source evidence.
2. The original file bytes produce a per-user SHA-256 identity. An identical hash is blocked. The supplier shipment number is a separate normalized business identity and supports immutable revisions.
3. Product names, Chinese descriptions, and other free text are evidence only. Mapping uses supplier + normalized external SKU → one internal `ProductVariant`; fuzzy or name-based automatic linking is forbidden.
4. Mapping may exist before upload in product management. On first upload, known mappings resolve automatically; unknown rows remain in a review state where the user creates/selects an internal variant and confirms the mapping. Product creation preserves supplier, external SKU, upload revision, and return context.
5. Original row order, raw quantity, raw cells, validation issues, and mapping decision are saved even when review is incomplete. An incomplete revision cannot promote to an arrival but must be resumable.
6. File review/mapping is stage 1. Default warehouse and promotion are stage 2; warehouse controls do not appear in the file preview. Most rows can be moved to the default warehouse in one trusted operation, then exceptions are edited.

## Allocation and receipt

1. Promotion creates one arrival item for every source row. Its initial allocation may be one default warehouse or a split whose sum equals the row quantity.
2. One row may split across any number of warehouses. Zero/negative quantities, duplicate warehouses, cross-owner IDs, and sums different from the movable remainder are rejected.
3. After receipt or shortage closure, those quantities are fixed. Reallocation moves only the remainder and records before/after values, actor, time, and reason.
4. One receipt request may include multiple source rows and allocations and is all-or-nothing. The UI shows reconciliation by internal variant and warehouse, plus total normal, overage, and resulting `incoming`, before submission.
5. Partial receipt immediately increases warehouse `onHand`, writes transaction/history evidence, decreases warehouse `incoming`, and leaves the arrival `PARTIAL`. Already received quantities remain visible in inventory.
6. The receipt business date defaults to today but is editable; processing time is stored separately.
7. Overage is allowed only with a reason. It stays linked to the import/arrival as possible supplier error, increases stock, and never inflates expected quantity.
8. A user may close some or all remaining quantity as shortage with a reason and may explicitly terminate the arrival. Later goods use a closure-linked follow-up arrival/receipt and do not rewrite the original closure or expected quantity.
9. Receipt correction requires a reason and reverses the entire immutable receipt line with compensating inventory and channel-outbox effects. Corrected evidence remains visible and cannot be corrected twice.
10. Stable request IDs and canonical database payload hashes make retries idempotent. A changed payload with the same request ID is rejected.

## UI acceptance

- Default surface order is `header → compact actions → full-width arrival table/workspace`. Manual creation is secondary disclosure; the removed paste-CSV form must not compete with the Excel template flow.
- Arrival rows show source row/external SKU, mapping target, allocation, received, shortage-closed, and remaining quantities without conflating them.
- Allocation, receipt, shortage, follow-up, and correction failures stay next to their row/allocation as structured errors; a failed editor does not close.
- Complex operations use progressive disclosure rather than rendering every input for every arrival at once. Toolbars stay one line on desktop and use shared size/token primitives.
- Async success/error messages use a live region. All form controls have accessible labels and numeric comparison columns use tabular numerals.

## Known corrective gaps (2026-07-19)

The phase previously marked complete does not yet prove all rules above. The corrective phase must close: persisted incomplete review, supplier mapping maintenance UI, closure-linked follow-up aggregate parity, editable receipt business date, allocation audit/reason, move-all-default operation, grouped reconciliation, structured operation errors, and progressive disclosure of arrival operations. A phase or GitHub issue must not be closed until harness-owned verification records these acceptance checks.
