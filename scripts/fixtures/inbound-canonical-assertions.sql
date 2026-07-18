-- Inventory and transactions are historical facts: migration links evidence but
-- never replays it.
do $$
declare v_before public.inbound_canonical_fixture_baseline%rowtype; v_inventory bigint; v_transactions bigint;
begin
  select * into v_before from public.inbound_canonical_fixture_baseline;
  select coalesce(sum(quantity),0) into v_inventory from public.inventory;
  select count(*) into v_transactions from public.transactions;
  if v_inventory <> v_before.inventory_total or v_transactions <> v_before.transaction_count then raise exception 'canonical migration replayed inventory or transactions'; end if;

  -- source rows remain immutable evidence and incoming is allocation remainder only.
  if (select count(*) from public.inbound_import_source_rows where legacy_inbound_draft_row_id in (210,211,212)) <> 3 then raise exception 'source rows were not preserved'; end if;
  if exists (select 1 from public.factory_arrival_items i where i.inbound_import_source_row_id is not null and i.ordered_quantity <> (select sr.quantity from public.inbound_import_source_rows sr where sr.id=i.inbound_import_source_row_id)) then raise exception 'source row quantity changed'; end if;
  if (select sum(allocated_quantity-normally_received_quantity-shortage_closed_quantity) from public.factory_arrival_allocations where factory_arrival_item_id in (select id from public.factory_arrival_items where inbound_import_source_row_id is not null)) <> 9 then raise exception 'allocation remainder/incoming semantics failed'; end if;

  -- repeated variant transactions attach once, in order, without duplicated evidence.
  if (select count(*) from public.factory_receipt_lines where transaction_id in (410,411)) <> 2
     or exists (select 1 from public.factory_receipt_lines group by transaction_id having transaction_id is not null and count(*) > 1) then raise exception 'repeated variant duplicated receipt evidence'; end if;
  if (select count(distinct factory_arrival_allocation_id) from public.factory_receipt_lines where transaction_id in (410,411)) <> 2 then raise exception 'repeated variant rows shared an allocation'; end if;

  -- multi warehouse received evidence is retained; the unknowable expected tail
  -- is explicitly an exception. Overage never inflates expected allocations.
  if (select count(distinct warehouse_id) from public.factory_arrival_allocations where factory_arrival_item_id=(select id from public.factory_arrival_items where factory_arrival_id=301)) <> 2 then raise exception 'multi warehouse evidence was discarded'; end if;
  if not exists (select 1 from public.inbound_migration_exceptions where exception_type='ambiguous_legacy_arrival_expected_remainder' and details->>'factory_arrival_item_id'=(select id::text from public.factory_arrival_items where factory_arrival_id=301)) then raise exception 'multi warehouse expected remainder was guessed'; end if;
  if not exists (select 1 from public.inbound_migration_exceptions where exception_type='over_received_legacy_arrival' and details->>'factory_arrival_item_id'=(select id::text from public.factory_arrival_items where factory_arrival_id=302)) then raise exception 'overage was not recorded'; end if;
  if exists (select 1 from public.factory_arrival_allocations where factory_arrival_item_id=(select id from public.factory_arrival_items where factory_arrival_id=302) and allocated_quantity > 2) then raise exception 'overage inflated expected allocation'; end if;
  if exists (select 1 from public.factory_receipt_events e where not exists (select 1 from public.factory_receipt_lines l where l.factory_receipt_event_id=e.id)) then raise exception 'dangling receipt event'; end if;
end;
$$;

-- Compatibility path remains atomic under the authenticated role.
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000011', false);
select public.receive_inbound_draft_rows(200, '[{"row_id":210,"quantity":1}]'::jsonb);
do $$
begin
  if (select received_quantity from public.inbound_draft_rows where id=210) <> 1 then raise exception 'compatibility path did not update legacy row'; end if;
  if (select normally_received_quantity from public.factory_arrival_allocations al join public.factory_arrival_items i on i.id=al.factory_arrival_item_id where i.inbound_import_source_row_id=(select id from public.inbound_import_source_rows where legacy_inbound_draft_row_id=210)) <> 1 then raise exception 'compatibility path did not update canonical allocation'; end if;
  if not exists (select 1 from public.factory_receipt_lines where transaction_id=(select max(id) from public.transactions where source_channel='inbound-draft' and reference_id=210)) then raise exception 'compatibility path did not create receipt evidence'; end if;
end;
$$;

-- RLS isolation plus immutable raw/evidence writes are tested as a second user.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000022', false);
do $$
declare v_raw_failed boolean:=false; v_evidence_failed boolean:=false;
begin
  if exists (select 1 from public.factory_arrival_allocations where user_id='00000000-0000-0000-0000-000000000011') then raise exception 'RLS isolation failed'; end if;
  begin update public.inbound_import_source_rows set external_sku='forbidden' where legacy_inbound_draft_row_id=210; exception when others then v_raw_failed:=true; end;
  begin delete from public.factory_receipt_lines where user_id='00000000-0000-0000-0000-000000000011'; exception when others then v_evidence_failed:=true; end;
  if not v_raw_failed then raise exception 'immutable raw source write succeeded'; end if;
  if not v_evidence_failed then raise exception 'immutable evidence write succeeded'; end if;
end;
$$;
reset role;
