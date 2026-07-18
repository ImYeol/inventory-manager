-- Executed against a disposable database already migrated through the legacy
-- inbound schema.  The canonical migration itself owns the representative
-- backfill; the fixture records pre-migration invariants for the assertions.
create table if not exists public.inbound_canonical_fixture_baseline (
  inventory_total bigint not null,
  transaction_count bigint not null
);
truncate public.inbound_canonical_fixture_baseline;
insert into public.inbound_canonical_fixture_baseline(inventory_total, transaction_count)
select coalesce(sum(quantity), 0), (select count(*) from public.transactions) from public.inventory;
