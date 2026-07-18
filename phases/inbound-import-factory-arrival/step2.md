# Step 2: executable-legacy-migration-proof

Finish only the executable migration proof left by child issue #12. Tests first. Do not accept the current fixture skeleton as coverage.

## Known defects to correct

- `scripts/fixtures/inbound-canonical-legacy.sql` currently creates only a baseline table and inserts no users, catalogs, warehouses, ProductVariants, legacy FactoryArrivals/items, inbound drafts/rows, inventory, or transactions. Replace it with representative pre-canonical fixture data for two users, repeated same-variant rows, untouched/partial/received drafts, deterministic one- and multi-warehouse receipt evidence, and overage.
- `scripts/fixtures/inbound-canonical-assertions.sql` currently checks only aggregate no-replay and two receipt uniqueness conditions. Add explicit assertions for every behavioral bullet in step1.md: source preservation, allocation remainder/incoming semantics, repeated-row no duplicated evidence, multi-warehouse/overage meaning, compatibility path, RLS isolation, and immutable raw/evidence writes.
- The runner assumes a host `psql`, which is absent in the outer environment. Support either a supplied psql binary or an explicitly supplied Docker container name while keeping destructive safety checks. It must be runnable against the resolved dedicated container `supabase_db_seleccase-inventory-issue-11` without changing committed Supabase ports.
- The current legacy FactoryArrival backfill still joins every repeated item to the same transaction aggregate before unique receipt-line selection and still refuses all multi-warehouse groups. Correct the migration so allocation received counters and receipt linkage cannot duplicate transaction quantities across repeated rows. For ambiguous expected remainder, record an exception rather than guessing; deterministic received warehouse allocations must still be retained.
- Remove the accidental unrelated type change that made `getTransactions.filters.warehouseId` required.

## Required execution

Run the fixture against a disposable database/container if accessible. The runner must apply an explicit captured pre-canonical baseline, seed fixtures, apply the forward migration, run assertions, and exit nonzero on any violation. Report the exact command. Also run focused/full tests, Prisma validation, lint, and build.
