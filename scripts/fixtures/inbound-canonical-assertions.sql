do $$
declare v_before public.inbound_canonical_fixture_baseline%rowtype; v_inventory bigint; v_transactions bigint;
begin
  select * into v_before from public.inbound_canonical_fixture_baseline;
  select coalesce(sum(quantity),0) into v_inventory from public.inventory;
  select count(*) into v_transactions from public.transactions;
  if v_inventory <> v_before.inventory_total or v_transactions <> v_before.transaction_count then
    raise exception 'canonical migration replayed inventory or transactions';
  end if;
  if exists (select 1 from public.factory_receipt_lines group by transaction_id having transaction_id is not null and count(*) > 1) then
    raise exception 'a historical transaction has multiple receipt lines';
  end if;
  if exists (select 1 from public.factory_receipt_events e where not exists (select 1 from public.factory_receipt_lines l where l.factory_receipt_event_id=e.id)) then
    raise exception 'dangling receipt event';
  end if;
end;
$$;
