# ADR-032: Inbound imports are evidence; FactoryArrival owns expected receipts

**Decision**: The canonical flow is `InboundImport -> FactoryArrival -> Inventory/Transaction`.

`InboundImport`, its immutable revisions, and source rows preserve file/manual source evidence only. They never create `incoming` or post stock. `FactoryArrival` is the expected-receipt aggregate, with ProductVariant-backed items and warehouse allocations. Only open canonical allocations contribute to `incoming`, using `allocated - normally received - shortage closed`.

Arrival lifecycle is limited to `DRAFT`, `READY`, `PARTIAL`, `RECEIVED`, `VARIANCE_CLOSED`, and `CANCELLED`. Mapping, allocation, and validation are derived blockers. Manual planned arrivals use the same aggregate without an import revision. Receipt events and lines preserve immutable migrated transaction evidence without replaying inventory.

**Reason**: Imported supplier data must remain auditable even when its rows are unresolved, while inventory changes need one explicit receipt boundary.

**Trade-off**: The legacy inbound-draft path remains temporarily compatible during rollout, and later receipt work must converge it without re-posting historical stock.
