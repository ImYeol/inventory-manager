# Step 10: canonical-arrival-workspace-integration

Implement child issue #16 and finish parent #11 on top of the behavior-proven Step 9 backend. Read Issue #16, ADR-032, the completed phase summaries, `docs/design/{tokens,components,motion}.md`, relevant sourcing/product/inventory pages, and React best-practice instructions. Tests first. Use Simple Surface First: evolve the existing arrivals table/detail and current toolbars; do not add a competing workspace or decorative summary cards.

## Canonical sourcing workspace

- `getFactoryArrivalsData` must load canonical items, allocations, receipt events/lines, shortage closures, and corrections needed by the UI. Preserve repeated source rows as separate items. Derive each allocation remainder as `allocated - normally received - shortage closed`; do not use item ordered-received when rendering warehouse-specific incoming.
- Replace the legacy one-warehouse `receiveFactoryArrival` control in `ArrivalsView` with the Step-9 server actions. A row can display/edit multiple warehouse allocation targets, including 30 → 20 + 10. Existing received/shortage-fixed quantities remain visibly locked while only remainder moves.
- Support one multi-row partial receipt submission per arrival with a client-generated stable request id, per-allocation normal quantity, optional overage quantity and required reason. Show reconciliation totals before submit: expected selected, overage, and resulting remaining incoming. Successful partial receipt refreshes the page and immediately appears in on-hand/history through the backend.
- Provide compact, reachable actions in the existing row/detail/action rail for shortage closure (quantity + reason), closure-linked late follow-up (warehouse + quantity + reason), and full receipt-line reversal (reason). Corrected lines are visibly marked and cannot be reversed again.
- Status vocabulary must use canonical `DRAFT/READY/PARTIAL/RECEIVED/VARIANCE_CLOSED/CANCELLED` with Korean labels and consistent tones. Do not keep legacy `예정/부분입고/입고완료` comparisons.
- Keep file upload context, first-upload mapping review, and warehouse promotion as the already-separated stages. Warehouse selection must not return to file preview/mapping save. Keep the import launcher reachable, but remove/hide the competing legacy inbound-draft receipt list after canonical promotion.

## Product and inventory integration

- Keep supplier SKU pre-mapping reachable from product management and ensure its factory/product variant context survives create/return flows already implemented.
- Inventory/product loaders and views show canonical `onHand`, `committed`, `available`, and `incoming`. Add a compact deep link from incoming quantity to `/sourcing/arrivals` without duplicating row audit metadata as filters.
- Preserve warehouse filter vocabulary and existing controlled workspace state. Do not create new default filters for reference/audit fields.

## UX, errors, and safety

- Reuse shared Button/Input/Select/Modal/Table primitives and token classes. Avoid hard-coded visual tokens. Keep operational toolbars height-stable.
- Surface structured row/allocation failures next to the operation; do not close an editor on failure. Use short Korean verb labels.
- All mutations remain server actions; client components must not call Supabase or external APIs.

## Acceptance

- User-visible tests cover first upload review → warehouse promotion, pre-existing mapping, repeated rows, 30→20+10 allocation, multi-row partial receipt, overage reason, shortage close, late follow-up, full-line reversal, canonical status labels, and incoming deep link.
- Loader/action tests prove allocation-level remainder, corrected receipt state, and use of the trusted Step-9 RPCs. Legacy one-warehouse receipt action is no longer called by the arrivals UI.
- Run focused/full tests, dedicated Docker behavioral proof, fresh `supabase/schema.sql` execution, Prisma validation, lint, production build, and `git diff --check`.
