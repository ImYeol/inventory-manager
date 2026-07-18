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
  if (select sum(allocated_quantity-normally_received_quantity-shortage_closed_quantity) from public.factory_arrival_allocations where user_id='00000000-0000-0000-0000-000000000011' and factory_arrival_item_id in (select id from public.factory_arrival_items where inbound_import_source_row_id is not null and user_id='00000000-0000-0000-0000-000000000011')) <> 9 then raise exception 'allocation remainder/incoming semantics failed'; end if;

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

-- Forward mapping migration collapse and the installed compatibility RPC are
-- exercised after the complete migration chain, not by inspecting SQL text.
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000011',false);
do $$
declare v_before bigint; v_after bigint; v_failed boolean:=false;
begin
  if (select count(*) from public.supplier_sku_links where supplier_id=140 and normalized_external_sku='SAME-001' and is_active) <> 1 then raise exception 'same-target duplicate collapse failed'; end if;
  if exists(select 1 from public.supplier_sku_links where supplier_id=140 and normalized_external_sku='CONFLICT-001' and is_active) then raise exception 'conflicting duplicate collapse failed'; end if;
  if (select count(*) from public.supplier_sku_mapping_audits where supplier_id=140 and normalized_external_sku in ('SAME-001','CONFLICT-001')) <> 3 then raise exception 'migration collapse audit evidence missing'; end if;
  perform public.confirm_supplier_sku_mapping(140,'RECONFIRM-001',150,'{}');
  perform public.deactivate_supplier_sku_mapping(140,'RECONFIRM-001','fixture deactivation');
  perform public.confirm_supplier_sku_mapping(140,'RECONFIRM-001',150,'{}');
  select count(*) into v_before from public.supplier_sku_links;
  begin perform public.confirm_supplier_sku_mapping(140,'UNT-001',150,array[1,1]); exception when others then v_failed:=true; end;
  select count(*) into v_after from public.supplier_sku_links;
  if not v_failed or v_before<>v_after then raise exception 'source-row mismatch rollback failed'; end if;
end;
$$;
reset role;

-- Step-5/6 RPC proof: this runs after the complete migration chain, using the
-- real authenticated boundary rather than SQL-text inspection.
insert into public.inbound_templates(user_id,name) values ('00000000-0000-0000-0000-000000000011','RPC fixture') returning id as template_id \gset
insert into public.inbound_template_versions(user_id,template_id,version_number,sheet_name,header_row_number,headers,mappings)
values ('00000000-0000-0000-0000-000000000011', :template_id, 1, 'Sheet1', 1, '["SKU","Qty"]', '{"externalSku":"SKU","quantity":"Qty"}') returning id as version_id \gset
select set_config('inbound_fixture.template_id', :'template_id', false), set_config('inbound_fixture.version_id', :'version_id', false);
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000011',false);
select public.confirm_supplier_sku_mapping(140,'IMP-001',150,'{}');
do $$
declare r1 bigint; r2 bigint; arrival bigint; inventory_before bigint; transaction_before bigint; failed boolean:=false;
begin
 select coalesce(sum(quantity),0) into inventory_before from public.inventory;
 select count(*) into transaction_before from public.transactions;
 select revision_id into r1 from public.register_inbound_import_revision(140,E'\u00a0SHIP-1\u3000','FILE','a.xlsx','owner/a.xlsx','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',current_setting('inbound_fixture.template_id')::bigint,current_setting('inbound_fixture.version_id')::bigint,'Sheet1',1,'[]','[{"sourceRowNumber":2,"externalSku":"IMP-001","rawQuantity":"001","quantity":1},{"sourceRowNumber":3,"externalSku":"IMP-001","rawQuantity":"1,000","quantity":1000}]');
 select revision_id into r2 from public.register_inbound_import_revision(140,'SHIP-1','FILE','b.xlsx','owner/b.xlsx','bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',current_setting('inbound_fixture.template_id')::bigint,current_setting('inbound_fixture.version_id')::bigint,'Sheet1',1,'[]','[{"sourceRowNumber":2,"externalSku":"IMP-001","rawQuantity":"1","quantity":1}]');
 if r1=r2 or (select supersedes_revision_id from public.inbound_import_revisions where id=r2)<>r1 then raise exception 'logical revision linkage failed'; end if;
 if (select array_agg(raw_quantity order by source_row_ordinal) from public.inbound_import_source_rows where inbound_import_revision_id=r1) <> array['001','1,000'] then raise exception 'raw quantity/order proof failed'; end if;
 begin perform public.register_inbound_import_revision(140,'SHIP-X','FILE','x.xlsx','owner/x.xlsx','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',current_setting('inbound_fixture.template_id')::bigint,current_setting('inbound_fixture.version_id')::bigint,'Sheet1',1,'[]','[{"externalSku":"IMP-001","rawQuantity":"1","quantity":1}]'); exception when others then failed:=sqlerrm='duplicate_file_hash'; end;
 if not failed then raise exception 'user-wide hash block failed'; end if;
 failed:=false;
 select public.promote_inbound_import_revision(r2,130) into arrival;
 if (select count(*) from public.factory_arrival_items where factory_arrival_id=arrival)<>1 or (select count(*) from public.factory_arrival_allocations where factory_arrival_id=arrival and warehouse_id=130 and allocated_quantity=1)<>1 then raise exception 'atomic default allocation failed'; end if;
 begin perform public.promote_inbound_import_revision(r2,130); exception when others then failed:=true; end;
 if not failed then raise exception 'one promotion proof failed'; end if;
 if (select coalesce(sum(quantity),0) from public.inventory)<>inventory_before or (select count(*) from public.transactions)<>transaction_before then raise exception 'registration/promotion mutated inventory'; end if;
end $$;
reset role;

-- The hash identity is owner-scoped, while the trusted tables remain
-- append-only and RPC-owned.  These are behavioral checks, not SQL text.
insert into public.inbound_templates(user_id,name) values ('00000000-0000-0000-0000-000000000022','Other RPC fixture');
insert into public.inbound_template_versions(user_id,template_id,version_number,sheet_name,header_row_number,headers,mappings)
select '00000000-0000-0000-0000-000000000022', id, 1, 'Sheet1', 1, '["SKU","Qty"]', '{"externalSku":"SKU","quantity":"Qty"}' from public.inbound_templates where user_id='00000000-0000-0000-0000-000000000022' and name='Other RPC fixture';
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000022',false);
select public.confirm_supplier_sku_mapping(141,'IMP-001',151,'{}');
do $$
declare v_template bigint; v_version bigint; v_revision bigint; failed boolean:=false;
begin
 select t.id,tv.id into v_template,v_version from public.inbound_templates t join public.inbound_template_versions tv on tv.template_id=t.id where t.user_id=auth.uid() and t.name='Other RPC fixture';
 -- The exact same file hash is allowed for a different owner.
 select revision_id into v_revision from public.register_inbound_import_revision(141,'OTHER-SHIP','FILE','other.xlsx','other/a.xlsx','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',v_template,v_version,'Sheet1',1,'[]','[{"externalSku":"IMP-001","rawQuantity":"1","quantity":1}]');
 if v_revision is null then raise exception 'two-user same-hash allowance failed'; end if;
 begin insert into public.inbound_imports(user_id,supplier_id,source_type,external_shipment_number) values(auth.uid(),141,'FILE','forged'); exception when others then failed:=true; end;
 if not failed then raise exception 'direct inbound import insert was not denied'; end if;
end $$;
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000011',false);
do $$
declare failed boolean:=false; v_template bigint:=current_setting('inbound_fixture.template_id')::bigint; v_version bigint:=current_setting('inbound_fixture.version_id')::bigint;
begin
 begin update public.inbound_import_revisions set source_filename='forged' where id=(select min(r.id) from public.inbound_import_revisions r where r.user_id=auth.uid()); exception when others then failed:=true; end;
 if not failed then raise exception 'immutable revision update succeeded'; end if;
 failed:=false;
 begin delete from public.inbound_import_source_rows where id=(select min(sr.id) from public.inbound_import_source_rows sr where sr.user_id=auth.uid()); exception when others then failed:=true; end;
 if not failed then raise exception 'immutable source row delete succeeded'; end if;
 failed:=false;
 begin perform public.register_inbound_import_revision(140,'UNMAPPED','FILE','u.xlsx','owner/u.xlsx','eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',v_template,v_version,'Sheet1',1,'[]','[{"externalSku":"NO-MAP","rawQuantity":"1","quantity":1,"productVariantId":150}]'); exception when others then failed:=sqlerrm like 'mapping_blocker:%'; end;
 if not failed then raise exception 'unmapped/forged ProductVariant rejection failed'; end if;
 failed:=false;
 begin perform public.register_inbound_import_revision(140,'INVALID','FILE','i.xlsx','owner/i.xlsx','ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',v_template,v_version,'Sheet1',1,'[]','[{"externalSku":"IMP-001","rawQuantity":"0","quantity":0}]'); exception when others then failed:=sqlerrm like 'review_blocker:%'; end;
 if not failed then raise exception 'invalid quantity rejection failed'; end if;
end $$;
reset role;
-- Receipt evidence is seeded by the fixture owner only through an admin setup
-- boundary, then the authenticated RPC must reject the later revision.
update public.factory_arrival_allocations set normally_received_quantity=1 where factory_arrival_id=(select id from public.factory_arrivals where external_shipment_reference='SHIP-1');
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000011',false);
do $$ declare failed boolean:=false; begin
 begin perform public.register_inbound_import_revision(140,'SHIP-1','FILE','d.xlsx','owner/d.xlsx','dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',current_setting('inbound_fixture.template_id')::bigint,current_setting('inbound_fixture.version_id')::bigint,'Sheet1',1,'[]','[{"externalSku":"IMP-001","rawQuantity":"1","quantity":1}]'); exception when others then failed:=sqlerrm='supersession_after_receipt_evidence'; end;
 if not failed then raise exception 'post-receipt supersession rejection failed'; end if;
end $$;
reset role;

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
