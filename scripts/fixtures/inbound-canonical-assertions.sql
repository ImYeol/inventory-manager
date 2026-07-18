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

-- Step-9 executable contract: one source/item can split 30 -> 20+10, a single
-- receipt request can partially receive repeated rows atomically, and all
-- variance/correction evidence remains tied to the original aggregate.
insert into public.factory_arrivals(user_id,factory_id,reference_code,expected_date,status,source_channel,source_type,memo,supplier_name_snapshot)
values('00000000-0000-0000-0000-000000000011',140,'STEP9-PROOF',current_date,'READY','manual','MANUAL','step9 proof','Fixture Factory') returning id as step9_arrival_id \gset
insert into public.factory_arrival_items(user_id,factory_arrival_id,model_id,size_id,color_id,product_variant_id,ordered_quantity,received_quantity,seller_sku_snapshot)
select '00000000-0000-0000-0000-000000000011',:step9_arrival_id,model_id,size_id,color_id,id,30,0,seller_sku from public.product_variants where id=150 returning id as step9_item1_id \gset
insert into public.factory_arrival_items(user_id,factory_arrival_id,model_id,size_id,color_id,product_variant_id,ordered_quantity,received_quantity,seller_sku_snapshot)
select '00000000-0000-0000-0000-000000000011',:step9_arrival_id,model_id,size_id,color_id,id,5,0,seller_sku from public.product_variants where id=150 returning id as step9_item2_id \gset
insert into public.factory_arrival_allocations(user_id,factory_arrival_id,factory_arrival_item_id,product_variant_id,warehouse_id,allocated_quantity,warehouse_name_snapshot)
values('00000000-0000-0000-0000-000000000011',:step9_arrival_id,:step9_item1_id,150,130,30,'Fixture one') returning id as step9_alloc1_id \gset
insert into public.factory_arrival_allocations(user_id,factory_arrival_id,factory_arrival_item_id,product_variant_id,warehouse_id,allocated_quantity,warehouse_name_snapshot)
values('00000000-0000-0000-0000-000000000011',:step9_arrival_id,:step9_item2_id,150,130,5,'Fixture one') returning id as step9_alloc2_id \gset
select set_config('inbound_fixture.step9_arrival_id', :'step9_arrival_id', false), set_config('inbound_fixture.step9_item1_id', :'step9_item1_id', false), set_config('inbound_fixture.step9_item2_id', :'step9_item2_id', false), set_config('inbound_fixture.step9_alloc1_id', :'step9_alloc1_id', false), set_config('inbound_fixture.step9_alloc2_id', :'step9_alloc2_id', false);
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000011',false);
do $$
declare arrival_id bigint:=current_setting('inbound_fixture.step9_arrival_id')::bigint; item1 bigint:=current_setting('inbound_fixture.step9_item1_id')::bigint; item2 bigint:=current_setting('inbound_fixture.step9_item2_id')::bigint; alloc1 bigint:=current_setting('inbound_fixture.step9_alloc1_id')::bigint; alloc2 bigint:=current_setting('inbound_fixture.step9_alloc2_id')::bigint; alloc1_other bigint; receipt jsonb; before_tx bigint; before_stock bigint; after_first_tx bigint; after_first_stock bigint; closure_id bigint; line2 bigint; correction jsonb; failed boolean:=false;
begin
  perform public.replace_factory_arrival_allocations(jsonb_build_object('arrival_id',arrival_id,'item_id',item1,'allocations',jsonb_build_array(jsonb_build_object('warehouse_id',130,'quantity',20),jsonb_build_object('warehouse_id',131,'quantity',10))));
  if (select sum(allocated_quantity) from public.factory_arrival_allocations where factory_arrival_item_id=item1)<>30 or (select count(*) from public.factory_arrival_allocations where factory_arrival_item_id=item1)<>2 then raise exception '30 to 20+10 split failed'; end if;
  select id into alloc1_other from public.factory_arrival_allocations where factory_arrival_item_id=item1 and warehouse_id=131;
  select count(*),coalesce(sum(quantity),0) into before_tx,before_stock from public.transactions cross join lateral (select 0) ignored where user_id=auth.uid();
  select coalesce(sum(quantity),0) into before_stock from public.inventory where user_id=auth.uid();
  receipt:=jsonb_build_object('arrival_id',arrival_id,'receipt_request_id','step9-receipt-1','lines',jsonb_build_array(jsonb_build_object('allocation_id',alloc1,'quantity',5,'overage_quantity',2,'overage_reason','factory excess'),jsonb_build_object('allocation_id',alloc2,'quantity',2,'overage_quantity',0,'overage_reason','')));
  perform public.receive_factory_arrival_request(receipt);
  select count(*) into after_first_tx from public.transactions where user_id=auth.uid(); select coalesce(sum(quantity),0) into after_first_stock from public.inventory where user_id=auth.uid();
  if after_first_tx<>before_tx+2 or after_first_stock<>before_stock+9 then raise exception 'multi-row receipt did not post stock/transactions'; end if;
  if (select normally_received_quantity from public.factory_arrival_allocations where id=alloc1)<>5 or (select normally_received_quantity from public.factory_arrival_allocations where id=alloc2)<>2 then raise exception 'normal receipt counters failed'; end if;
  if (select sum(allocated_quantity-normally_received_quantity-shortage_closed_quantity) from public.factory_arrival_allocations where factory_arrival_id=arrival_id)<>28 then raise exception 'incoming remainder inflated by overage'; end if;
  perform public.receive_factory_arrival_request(receipt);
  if (select count(*) from public.transactions where user_id=auth.uid())<>after_first_tx or (select coalesce(sum(quantity),0) from public.inventory where user_id=auth.uid())<>after_first_stock then raise exception 'identical receipt retry duplicated stock'; end if;
  begin perform public.receive_factory_arrival_request(jsonb_set(receipt,'{lines,0,quantity}','6'::jsonb)); exception when others then failed:=sqlerrm='receipt_request_conflict'; end; if not failed then raise exception 'changed receipt retry did not conflict'; end if; failed:=false;
  -- The received five stay in warehouse 130; only the other 25 can move.
  perform public.replace_factory_arrival_allocations(jsonb_build_object('arrival_id',arrival_id,'item_id',item1,'allocations',jsonb_build_array(jsonb_build_object('warehouse_id',130,'quantity',7),jsonb_build_object('warehouse_id',131,'quantity',23))));
  if (select normally_received_quantity from public.factory_arrival_allocations where id=alloc1)<>5 or (select allocated_quantity from public.factory_arrival_allocations where id=alloc1)<>7 then raise exception 'unreceived-only reallocation failed'; end if;
  select (public.close_factory_arrival_shortage(jsonb_build_object('allocation_id',alloc1,'quantity',2,'reason','factory shortage'))->>'closure_id')::bigint into closure_id;
  if (select sum(allocated_quantity-normally_received_quantity-shortage_closed_quantity) from public.factory_arrival_allocations where factory_arrival_id=arrival_id)<>26 then raise exception 'shortage did not remove incoming'; end if;
  perform public.record_factory_arrival_follow_up(jsonb_build_object('closure_id',closure_id,'warehouse_id',131,'quantity',1,'reason','late carton','receipt_request_id','step9-follow-up-1'));
  if (select sum(allocated_quantity-normally_received_quantity-shortage_closed_quantity) from public.factory_arrival_allocations where factory_arrival_id=arrival_id)<>26 then raise exception 'follow-up inflated expected quantity'; end if;
  if not exists(select 1 from public.factory_receipt_lines where factory_arrival_shortage_closure_id=closure_id and overage_quantity=1 and normal_quantity=0) then raise exception 'follow-up closure linkage missing'; end if;
  select l.id into line2 from public.factory_receipt_lines l join public.factory_receipt_events e on e.id=l.factory_receipt_event_id where e.receipt_request_id='step9-receipt-1' and l.factory_arrival_item_id=item2;
  correction:=public.reverse_factory_receipt_line(jsonb_build_object('receipt_line_id',line2,'correction_request_id','step9-correction-1','reason','wrong box'));
  if (select normally_received_quantity from public.factory_arrival_allocations where id=alloc2)<>0 or (select received_quantity from public.factory_arrival_items where id=item2)<>0 then raise exception 'correction did not restore counters'; end if;
  perform public.reverse_factory_receipt_line(jsonb_build_object('receipt_line_id',line2,'correction_request_id','step9-correction-1','reason','wrong box'));
  begin perform public.reverse_factory_receipt_line(jsonb_build_object('receipt_line_id',line2,'correction_request_id','step9-correction-1','reason','changed')); exception when others then failed:=sqlerrm='correction_request_conflict'; end; if not failed then raise exception 'changed correction retry did not conflict'; end if; failed:=false;
  before_tx:=(select count(*) from public.transactions where user_id=auth.uid()); before_stock:=(select coalesce(sum(quantity),0) from public.inventory where user_id=auth.uid());
  begin perform public.receive_factory_arrival_request(jsonb_build_object('arrival_id',arrival_id,'receipt_request_id','step9-invalid-atomic','lines',jsonb_build_array(jsonb_build_object('allocation_id',alloc1_other,'quantity',1,'overage_quantity',0),jsonb_build_object('allocation_id',alloc2,'quantity',999,'overage_quantity',0)))); exception when others then failed:=true; end;
  if not failed or (select count(*) from public.transactions where user_id=auth.uid())<>before_tx or (select coalesce(sum(quantity),0) from public.inventory where user_id=auth.uid())<>before_stock then raise exception 'invalid multi-row receipt was not atomic'; end if;
end $$;
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
