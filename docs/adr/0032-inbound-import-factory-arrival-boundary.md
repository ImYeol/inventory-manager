# ADR-032: Inbound imports are evidence; FactoryArrival owns expected receipts

**Decision**: The canonical flow is `InboundImport -> FactoryArrival -> Inventory/Transaction`.

`InboundImport`, its immutable revisions, and source rows preserve file/manual source evidence only. They never create `incoming` or post stock. `FactoryArrival` is the expected-receipt aggregate, with ProductVariant-backed items and warehouse allocations. Only open canonical allocations contribute to `incoming`, using `allocated - normally received - shortage closed`.

The original file is identified per user by its SHA-256 hash and duplicate hashes are rejected. A normalized supplier shipment number identifies the logical shipment and may have immutable revisions. Repeated source rows remain distinct evidence even when they resolve to the same `ProductVariant`. A supplier external SKU represents one exact color-and-size stock unit and resolves only through an active exact supplier mapping; product-name similarity is never canonical.

Review/mapping and warehouse promotion are separate stages. A user may pre-map supplier SKUs in product management or resolve them during the first upload. Promotion is blocked only by unresolved or invalid rows, then creates one arrival item per source row. Warehouse choice is a second-stage plan and can split one row across multiple warehouses.

Arrival lifecycle is limited to `DRAFT`, `READY`, `PARTIAL`, `RECEIVED`, `VARIANCE_CLOSED`, and `CANCELLED`. Mapping, allocation, and validation are derived blockers. Manual planned arrivals use the same aggregate without an import revision. Receipt events and lines preserve immutable migrated transaction evidence without replaying inventory.

**Reason**: Imported supplier data must remain auditable even when its rows are unresolved, while inventory changes need one explicit receipt boundary.

**Trade-off**: Source evidence, expected receipts, and stock posting require separate persistence and UI stages, but this prevents duplicate posting and preserves supplier mistakes for audit. Competing legacy CSV/import receipt surfaces are not canonical and must not remain visible after rollout.
