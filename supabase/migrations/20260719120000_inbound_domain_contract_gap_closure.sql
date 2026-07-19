-- Close the remaining inbound domain contracts in the deployed schema.
alter table public.factory_receipt_events add column if not exists receipt_business_date date;
update public.factory_receipt_events set receipt_business_date=received_at::date where receipt_business_date is null;
alter table public.factory_receipt_events alter column receipt_business_date set default current_date;
alter table public.factory_receipt_events alter column receipt_business_date set not null;
create index if not exists factory_receipt_events_user_business_date_idx on public.factory_receipt_events(user_id,receipt_business_date);

-- Registration deliberately preserves an incomplete review as immutable source
-- evidence.  Promotion remains the only boundary that rejects unresolved rows.
create or replace function public.register_inbound_import_revision(p_supplier_id bigint,p_external_shipment_number text,p_source_type text,p_source_filename text,p_source_storage_path text,p_source_file_hash text,p_template_id bigint,p_template_version_id bigint,p_sheet_name text,p_header_row_number integer,p_headers jsonb,p_rows jsonb)
returns table(inbound_import_id bigint, revision_id bigint, revision_number integer, proposed_revision boolean)
language plpgsql security definer set search_path=private,public as $$
declare v_user uuid:=auth.uid(); v_shipment text:=private.normalize_external_shipment_number(p_external_shipment_number); v_import public.inbound_imports%rowtype; v_previous public.inbound_import_revisions%rowtype; v_revision bigint; v_number integer; v_row jsonb; v_ordinal integer:=0; v_sku text; v_variant bigint;
begin
 if v_user is null then raise exception 'Authentication is required.'; end if;
 if p_source_type not in ('FILE','MANUAL') or coalesce(v_shipment,'')='' then raise exception 'Invalid logical import.'; end if;
 if p_source_type='FILE' and (p_source_storage_path is null or p_source_file_hash !~ '^[0-9a-f]{64}$') then raise exception 'Invalid file hash or storage path.'; end if;
 if p_source_type='MANUAL' and p_source_file_hash is not null then raise exception 'Manual evidence cannot have a file hash.'; end if;
 if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows)=0 then raise exception 'At least one source row is required.'; end if;
 if not exists(select 1 from public.factories f where f.id=p_supplier_id and f.user_id=v_user) then raise exception 'Supplier not found.'; end if;
 if not exists(select 1 from public.inbound_templates t join public.inbound_template_versions tv on tv.id=p_template_version_id and tv.template_id=t.id and tv.user_id=t.user_id where t.id=p_template_id and t.user_id=v_user) then raise exception 'Template/version relationship not found.'; end if;
 if p_source_file_hash is not null and exists(select 1 from public.inbound_import_revisions r where r.user_id=v_user and r.source_file_hash=p_source_file_hash) then raise exception 'duplicate_file_hash'; end if;
 perform pg_advisory_xact_lock(hashtextextended(v_user::text || ':' || p_supplier_id::text || ':' || v_shipment,0));
 select * into v_import from public.inbound_imports i where i.user_id=v_user and i.supplier_id=p_supplier_id and i.external_shipment_number=v_shipment for update;
 if not found then insert into public.inbound_imports(user_id,supplier_id,source_type,external_shipment_number) values(v_user,p_supplier_id,p_source_type,v_shipment) returning * into v_import; v_number:=1;
 else
   select * into v_previous from public.inbound_import_revisions r where r.inbound_import_id=v_import.id and r.user_id=v_user order by r.revision_number desc for update limit 1;
   if exists(select 1 from public.factory_arrivals a left join public.factory_arrival_allocations al on al.factory_arrival_id=a.id and al.user_id=a.user_id left join public.factory_receipt_lines rl on rl.factory_arrival_allocation_id=al.id and rl.user_id=al.user_id where a.user_id=v_user and a.import_revision_id in(select r.id from public.inbound_import_revisions r where r.inbound_import_id=v_import.id) and (coalesce(al.normally_received_quantity,0)>0 or rl.id is not null)) then raise exception 'supersession_after_receipt_evidence'; end if;
   v_number:=coalesce(v_previous.revision_number,0)+1;
 end if;
 insert into public.inbound_import_revisions(user_id,inbound_import_id,revision_number,supersedes_revision_id,source_filename,source_storage_path,source_file_hash,template_id,template_version_id,source_sheet_name,source_header_row_number,source_headers) values(v_user,v_import.id,v_number,case when v_number>1 then v_previous.id end,p_source_filename,p_source_storage_path,p_source_file_hash,p_template_id,p_template_version_id,p_sheet_name,p_header_row_number,coalesce(p_headers,'{}'::jsonb)) returning id into v_revision;
 for v_row in select * from jsonb_array_elements(p_rows) loop
   v_ordinal:=v_ordinal+1; v_sku:=private.normalize_supplier_external_sku(v_row->>'externalSku');
   select l.product_variant_id into v_variant from public.supplier_sku_links l where l.user_id=v_user and l.supplier_id=p_supplier_id and l.normalized_external_sku=v_sku and l.is_active;
   insert into public.inbound_import_source_rows(user_id,inbound_import_revision_id,source_row_ordinal,source_row_number,external_sku,raw_quantity,quantity,source_values,validation_error,product_variant_id,seller_sku_snapshot,product_name_snapshot,option_name_snapshot,supplier_name_snapshot)
   select v_user,v_revision,v_ordinal,nullif(v_row->>'sourceRowNumber','')::integer,v_row->>'externalSku',v_row->>'rawQuantity',nullif(v_row->>'quantity','')::integer,coalesce(v_row->'sourceValues','{}'::jsonb),nullif(v_row->>'validationError',''),v_variant,pv.seller_sku,m.name,concat_ws(' / ',c.name,s.name),f.name from public.factories f left join public.product_variants pv on pv.id=v_variant and pv.user_id=v_user left join public.models m on m.id=pv.model_id and m.user_id=v_user left join public.sizes s on s.id=pv.size_id and s.user_id=v_user left join public.colors c on c.id=pv.color_id and c.user_id=v_user where f.id=p_supplier_id and f.user_id=v_user;
 end loop;
 return query select v_import.id,v_revision,v_number,v_number>1;
exception when unique_violation then
 if p_source_file_hash is not null and exists(select 1 from public.inbound_import_revisions r where r.user_id=v_user and r.source_file_hash=p_source_file_hash) then raise exception 'duplicate_file_hash'; end if;
 raise exception 'logical_import_conflict';
end $$;

-- A follow-up receipt belongs to its child arrival while its closure remains
-- immutable evidence on the parent. Allow that cross-aggregate reference only
-- for the exact owner, ProductVariant, and declared parent-child relationship.
create or replace function private.assert_factory_arrival_receipt_consistency() returns trigger language plpgsql set search_path=private,public as $$
declare e public.factory_receipt_events%rowtype; x public.factory_arrival_allocations%rowtype; i public.factory_arrival_items%rowtype; t public.transactions%rowtype; v public.product_variants%rowtype; c public.factory_arrival_shortage_closures%rowtype; closure_allocation public.factory_arrival_allocations%rowtype; receipt_arrival public.factory_arrivals%rowtype;
begin
  select * into e from public.factory_receipt_events where id=new.factory_receipt_event_id and user_id=new.user_id; if not found then raise exception 'factory_arrival_receipt_consistency'; end if;
  if new.factory_arrival_item_id is not null then select * into i from public.factory_arrival_items where id=new.factory_arrival_item_id and factory_arrival_id=e.factory_arrival_id and user_id=new.user_id; if not found then raise exception 'factory_arrival_receipt_consistency'; end if; end if;
  if new.factory_arrival_allocation_id is not null then select * into x from public.factory_arrival_allocations where id=new.factory_arrival_allocation_id and factory_arrival_id=e.factory_arrival_id and user_id=new.user_id; if not found or (new.factory_arrival_item_id is not null and x.factory_arrival_item_id<>new.factory_arrival_item_id) then raise exception 'factory_arrival_receipt_consistency'; end if; end if;
  if new.factory_arrival_shortage_closure_id is not null then
    select * into c from public.factory_arrival_shortage_closures where id=new.factory_arrival_shortage_closure_id and user_id=new.user_id;
    select * into closure_allocation from public.factory_arrival_allocations where id=c.factory_arrival_allocation_id and user_id=new.user_id;
    select * into receipt_arrival from public.factory_arrivals where id=e.factory_arrival_id and user_id=new.user_id;
    if c.id is null or closure_allocation.id is null or e.event_kind<>'FOLLOW_UP' or receipt_arrival.follow_up_parent_arrival_id is distinct from closure_allocation.factory_arrival_id or i.id is null or i.product_variant_id is distinct from closure_allocation.product_variant_id then raise exception 'factory_arrival_receipt_consistency'; end if;
  end if;
  if new.transaction_id is not null then
    select * into t from public.transactions where id=new.transaction_id and user_id=new.user_id; select * into v from public.product_variants where id=coalesce(i.product_variant_id,x.product_variant_id) and user_id=new.user_id;
    if not found or t.warehouse_id<>coalesce(new.warehouse_id,x.warehouse_id) or t.quantity<>new.received_quantity or t.model_id<>v.model_id or t.size_id<>v.size_id or t.color_id<>v.color_id then raise exception 'factory_arrival_receipt_consistency'; end if;
  end if;
  if e.event_kind='FOLLOW_UP' and new.factory_arrival_shortage_closure_id is null then raise exception 'factory_arrival_receipt_consistency'; end if;
  return new;
end $$;

-- Request identity is owned by factory_receipt_requests. A business-date change
-- changes the canonical payload hash and therefore conflicts under the same ID.
alter table public.factory_receipt_events drop constraint if exists factory_receipt_events_request_payload_key;

create table if not exists public.factory_arrival_allocation_audits (
  id bigint generated by default as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  factory_arrival_id bigint not null,
  factory_arrival_item_id bigint not null,
  before_allocations jsonb not null,
  after_allocations jsonb not null,
  reason text not null check (btrim(reason)<>''),
  actor_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc',now())
);
alter table public.factory_arrival_allocation_audits drop constraint if exists factory_arrival_allocation_audits_id_user_key;
alter table public.factory_arrival_allocation_audits add constraint factory_arrival_allocation_audits_id_user_key unique(id,user_id);
alter table public.factory_arrival_allocation_audits drop constraint if exists factory_arrival_allocation_audits_arrival_user_fkey;
alter table public.factory_arrival_allocation_audits add constraint factory_arrival_allocation_audits_arrival_user_fkey foreign key (factory_arrival_id,user_id) references public.factory_arrivals(id,user_id) on delete restrict;
alter table public.factory_arrival_allocation_audits drop constraint if exists factory_arrival_allocation_audits_item_user_fkey;
alter table public.factory_arrival_allocation_audits add constraint factory_arrival_allocation_audits_item_user_fkey foreign key (factory_arrival_item_id,user_id) references public.factory_arrival_items(id,user_id) on delete restrict;
create index if not exists factory_allocation_audits_arrival_idx on public.factory_arrival_allocation_audits(user_id,factory_arrival_id,created_at desc);
create index if not exists factory_allocation_audits_item_idx on public.factory_arrival_allocation_audits(user_id,factory_arrival_item_id,created_at desc);
alter table public.factory_arrival_allocation_audits enable row level security;
drop policy if exists "Users read own factory allocation audits" on public.factory_arrival_allocation_audits;
create policy "Users read own factory allocation audits" on public.factory_arrival_allocation_audits for select to authenticated using ((select auth.uid())=user_id);
drop trigger if exists factory_allocation_audits_immutable on public.factory_arrival_allocation_audits;
create trigger factory_allocation_audits_immutable before update or delete on public.factory_arrival_allocation_audits for each row execute function private.reject_factory_operation_evidence_mutation();
grant select on public.factory_arrival_allocation_audits to authenticated;
revoke insert,update,delete on public.factory_arrival_allocation_audits from authenticated;

create or replace function public.replace_factory_arrival_allocations(p_payload jsonb) returns jsonb
language plpgsql security definer set search_path=private,public as $$
declare
  u uuid:=auth.uid(); a public.factory_arrivals%rowtype; i public.factory_arrival_items%rowtype;
  r jsonb; total integer:=0; seen bigint[]:='{}'; desired integer;
  x public.factory_arrival_allocations%rowtype; before_rows jsonb; after_rows jsonb;
begin
  if u is null or btrim(coalesce(p_payload->>'reason',''))='' or jsonb_typeof(p_payload->'allocations')<>'array' or jsonb_array_length(p_payload->'allocations')=0 then
    raise exception 'Invalid allocation request.';
  end if;
  select * into a from public.factory_arrivals where id=(p_payload->>'arrival_id')::bigint and user_id=u for update;
  if not found or a.status in('RECEIVED','VARIANCE_CLOSED','CANCELLED') then raise exception 'Arrival cannot be reallocated.'; end if;
  select * into i from public.factory_arrival_items where id=(p_payload->>'item_id')::bigint and factory_arrival_id=a.id and user_id=u for update;
  if not found or i.product_variant_id is null or i.ordered_quantity is null then raise exception 'Arrival item not found.'; end if;
  perform 1 from public.factory_arrival_allocations where factory_arrival_item_id=i.id and user_id=u order by id for update;
  select coalesce(jsonb_agg(jsonb_build_object('allocation_id',id,'warehouse_id',warehouse_id,'allocated_quantity',allocated_quantity,'normally_received_quantity',normally_received_quantity,'shortage_closed_quantity',shortage_closed_quantity) order by warehouse_id),'[]'::jsonb)
    into before_rows from public.factory_arrival_allocations where factory_arrival_item_id=i.id and user_id=u;
  for r in select value from jsonb_array_elements(p_payload->'allocations') loop
    if (r->>'warehouse_id')::bigint=any(seen) or coalesce((r->>'quantity')::integer,0)<=0 then raise exception 'Invalid allocation split.'; end if;
    if not exists(select 1 from public.warehouses where id=(r->>'warehouse_id')::bigint and user_id=u) then raise exception 'Warehouse not found.'; end if;
    seen:=array_append(seen,(r->>'warehouse_id')::bigint); total:=total+(r->>'quantity')::integer;
  end loop;
  if total<>i.ordered_quantity then raise exception 'Allocation total must equal ordered quantity.'; end if;
  for x in select * from public.factory_arrival_allocations where factory_arrival_item_id=i.id and user_id=u order by id loop
    select (value->>'quantity')::integer into desired from jsonb_array_elements(p_payload->'allocations') where (value->>'warehouse_id')::bigint=x.warehouse_id;
    if coalesce(desired,0)<x.normally_received_quantity+x.shortage_closed_quantity then raise exception 'Received or closed allocation quantity cannot be moved.'; end if;
  end loop;
  if (select count(*) from public.factory_arrival_allocations where factory_arrival_item_id=i.id and user_id=u)=jsonb_array_length(p_payload->'allocations')
     and not exists(select 1 from public.factory_arrival_allocations current_allocation where current_allocation.factory_arrival_item_id=i.id and current_allocation.user_id=u and not exists(select 1 from jsonb_array_elements(p_payload->'allocations') requested where (requested->>'warehouse_id')::bigint=current_allocation.warehouse_id and (requested->>'quantity')::integer=current_allocation.allocated_quantity)) then
    return jsonb_build_object('arrival_id',a.id,'item_id',i.id,'unchanged',true);
  end if;
  delete from public.factory_arrival_allocations old_allocation where old_allocation.factory_arrival_item_id=i.id and old_allocation.user_id=u and old_allocation.normally_received_quantity=0 and old_allocation.shortage_closed_quantity=0 and not(old_allocation.warehouse_id=any(seen));
  for r in select value from jsonb_array_elements(p_payload->'allocations') loop
    update public.factory_arrival_allocations set allocated_quantity=(r->>'quantity')::integer,warehouse_name_snapshot=(select name from public.warehouses where id=(r->>'warehouse_id')::bigint and user_id=u),updated_at=timezone('utc',now()) where factory_arrival_item_id=i.id and user_id=u and warehouse_id=(r->>'warehouse_id')::bigint;
    if not found then
      insert into public.factory_arrival_allocations(user_id,factory_arrival_id,factory_arrival_item_id,product_variant_id,warehouse_id,allocated_quantity,warehouse_name_snapshot)
      values(u,a.id,i.id,i.product_variant_id,(r->>'warehouse_id')::bigint,(r->>'quantity')::integer,(select name from public.warehouses where id=(r->>'warehouse_id')::bigint and user_id=u));
    end if;
  end loop;
  select coalesce(jsonb_agg(jsonb_build_object('allocation_id',id,'warehouse_id',warehouse_id,'allocated_quantity',allocated_quantity,'normally_received_quantity',normally_received_quantity,'shortage_closed_quantity',shortage_closed_quantity) order by warehouse_id),'[]'::jsonb)
    into after_rows from public.factory_arrival_allocations where factory_arrival_item_id=i.id and user_id=u;
  insert into public.factory_arrival_allocation_audits(user_id,factory_arrival_id,factory_arrival_item_id,before_allocations,after_allocations,reason,actor_id)
    values(u,a.id,i.id,before_rows,after_rows,btrim(p_payload->>'reason'),u);
  perform private.refresh_factory_arrival_status(a.id,u);
  return jsonb_build_object('arrival_id',a.id,'item_id',i.id);
end $$;

create or replace function public.move_factory_arrival_remainders_to_warehouse(p_payload jsonb) returns jsonb
language plpgsql security definer set search_path=private,public as $$
declare
  u uuid:=auth.uid(); a public.factory_arrivals%rowtype; i public.factory_arrival_items%rowtype;
  target bigint:=(p_payload->>'warehouse_id')::bigint; before_rows jsonb; after_rows jsonb;
  fixed_total integer; target_fixed integer; movable integer; allocation_total integer; changed integer:=0;
begin
  if u is null or target is null or btrim(coalesce(p_payload->>'reason',''))='' then raise exception 'Invalid move-all allocation request.'; end if;
  if not exists(select 1 from public.warehouses where id=target and user_id=u) then raise exception 'Warehouse not found.'; end if;
  select * into a from public.factory_arrivals where id=(p_payload->>'arrival_id')::bigint and user_id=u for update;
  if not found or a.status in('RECEIVED','VARIANCE_CLOSED','CANCELLED') then raise exception 'Arrival cannot be reallocated.'; end if;
  perform 1 from public.factory_arrival_items where factory_arrival_id=a.id and user_id=u order by id for update;
  perform 1 from public.factory_arrival_allocations where factory_arrival_id=a.id and user_id=u order by id for update;
  if exists(select 1 from public.factory_arrival_items where factory_arrival_id=a.id and user_id=u) and not exists(
    select 1 from public.factory_arrival_items current_item where current_item.factory_arrival_id=a.id and current_item.user_id=u and (
      exists(select 1 from public.factory_arrival_allocations current_allocation where current_allocation.factory_arrival_item_id=current_item.id and current_allocation.user_id=u and current_allocation.allocated_quantity<>(current_allocation.normally_received_quantity+current_allocation.shortage_closed_quantity+case when current_allocation.warehouse_id=target then current_item.ordered_quantity-coalesce((select sum(fixed_allocation.normally_received_quantity+fixed_allocation.shortage_closed_quantity) from public.factory_arrival_allocations fixed_allocation where fixed_allocation.factory_arrival_item_id=current_item.id and fixed_allocation.user_id=u),0) else 0 end))
      or (current_item.ordered_quantity-coalesce((select sum(fixed_allocation.normally_received_quantity+fixed_allocation.shortage_closed_quantity) from public.factory_arrival_allocations fixed_allocation where fixed_allocation.factory_arrival_item_id=current_item.id and fixed_allocation.user_id=u),0)>0 and not exists(select 1 from public.factory_arrival_allocations target_allocation where target_allocation.factory_arrival_item_id=current_item.id and target_allocation.user_id=u and target_allocation.warehouse_id=target))
    )
  ) then return jsonb_build_object('arrival_id',a.id,'changed_item_count',0,'unchanged',true); end if;
  for i in select * from public.factory_arrival_items where factory_arrival_id=a.id and user_id=u order by id for update loop
    if i.product_variant_id is null or i.ordered_quantity is null then raise exception 'Arrival item not found.'; end if;
    perform 1 from public.factory_arrival_allocations where factory_arrival_item_id=i.id and user_id=u order by id for update;
    select coalesce(jsonb_agg(jsonb_build_object('allocation_id',id,'warehouse_id',warehouse_id,'allocated_quantity',allocated_quantity,'normally_received_quantity',normally_received_quantity,'shortage_closed_quantity',shortage_closed_quantity) order by warehouse_id),'[]'::jsonb),
      coalesce(sum(normally_received_quantity+shortage_closed_quantity),0),
      coalesce(sum(case when warehouse_id=target then normally_received_quantity+shortage_closed_quantity else 0 end),0)
      into before_rows,fixed_total,target_fixed from public.factory_arrival_allocations where factory_arrival_item_id=i.id and user_id=u;
    movable:=i.ordered_quantity-fixed_total;
    if movable<0 then raise exception 'Allocation fixed quantity invariant failed.'; end if;

    -- Preserve received/closed quantities at every warehouse and move only the remainder.
    delete from public.factory_arrival_allocations where factory_arrival_item_id=i.id and user_id=u and normally_received_quantity+shortage_closed_quantity=0;
    update public.factory_arrival_allocations set allocated_quantity=normally_received_quantity+shortage_closed_quantity,updated_at=timezone('utc',now()) where factory_arrival_item_id=i.id and user_id=u;
    if movable>0 then
      update public.factory_arrival_allocations set allocated_quantity=target_fixed+movable,warehouse_name_snapshot=(select name from public.warehouses where id=target and user_id=u),updated_at=timezone('utc',now()) where factory_arrival_item_id=i.id and user_id=u and warehouse_id=target;
      if not found then
        insert into public.factory_arrival_allocations(user_id,factory_arrival_id,factory_arrival_item_id,product_variant_id,warehouse_id,allocated_quantity,warehouse_name_snapshot)
        values(u,a.id,i.id,i.product_variant_id,target,movable,(select name from public.warehouses where id=target and user_id=u));
      end if;
    end if;
    select coalesce(sum(allocated_quantity),0),coalesce(jsonb_agg(jsonb_build_object('allocation_id',id,'warehouse_id',warehouse_id,'allocated_quantity',allocated_quantity,'normally_received_quantity',normally_received_quantity,'shortage_closed_quantity',shortage_closed_quantity) order by warehouse_id),'[]'::jsonb)
      into allocation_total,after_rows from public.factory_arrival_allocations where factory_arrival_item_id=i.id and user_id=u;
    if allocation_total<>i.ordered_quantity then raise exception 'Allocation sum invariant failed.'; end if;
    if before_rows is distinct from after_rows then
      insert into public.factory_arrival_allocation_audits(user_id,factory_arrival_id,factory_arrival_item_id,before_allocations,after_allocations,reason,actor_id)
      values(u,a.id,i.id,before_rows,after_rows,btrim(p_payload->>'reason'),u);
      changed:=changed+1;
    end if;
  end loop;
  perform private.refresh_factory_arrival_status(a.id,u);
  return jsonb_build_object('arrival_id',a.id,'changed_item_count',changed);
end $$;

create or replace function public.receive_factory_arrival_request(p_payload jsonb) returns jsonb
language plpgsql security definer set search_path=private,public as $$
declare
  u uuid:=auth.uid(); request_id text:=btrim(p_payload->>'receipt_request_id'); business_date date:=nullif(p_payload->>'receipt_business_date','')::date;
  canonical jsonb; hash text; existing public.factory_receipt_requests%rowtype; a public.factory_arrivals%rowtype;
  line jsonb; x public.factory_arrival_allocations%rowtype; i public.factory_arrival_items%rowtype; v public.product_variants%rowtype;
  q integer; oq integer; event_id bigint; tx bigint; seen bigint[]:='{}';
begin
  if u is null or coalesce(request_id,'')='' or business_date is null or jsonb_typeof(p_payload->'lines')<>'array' or jsonb_array_length(p_payload->'lines')=0 then raise exception 'Invalid receipt request.'; end if;
  canonical:=jsonb_build_object('arrival_id',(p_payload->>'arrival_id')::bigint,'receipt_business_date',business_date,'lines',p_payload->'lines');
  hash:=private.factory_payload_hash(canonical);
  perform pg_advisory_xact_lock(hashtextextended(u::text||':'||request_id,0));
  select * into existing from public.factory_receipt_requests where user_id=u and receipt_request_id=request_id;
  if found then if existing.payload_hash<>hash then raise exception 'receipt_request_conflict'; end if; return jsonb_build_object('receipt_event_id',existing.receipt_event_id,'idempotent',true); end if;
  select * into a from public.factory_arrivals where id=(p_payload->>'arrival_id')::bigint and user_id=u for update;
  if not found or a.status in('RECEIVED','VARIANCE_CLOSED','CANCELLED') then raise exception 'Arrival cannot be received.'; end if;
  for line in select value from jsonb_array_elements(p_payload->'lines') order by (value->>'allocation_id')::bigint loop
    q:=coalesce((line->>'quantity')::integer,0); oq:=coalesce((line->>'overage_quantity')::integer,0);
    if (line->>'allocation_id')::bigint=any(seen) then raise exception 'operation_error:allocation:%:Duplicate receipt allocation.',coalesce(line->>'allocation_id','unknown'); end if;
    seen:=array_append(seen,(line->>'allocation_id')::bigint);
    select * into x from public.factory_arrival_allocations where id=(line->>'allocation_id')::bigint and factory_arrival_id=a.id and user_id=u for update;
    if not found or q<0 or oq<0 or (q=0 and oq=0) or q>x.allocated_quantity-x.normally_received_quantity-x.shortage_closed_quantity or (oq>0 and btrim(coalesce(line->>'overage_reason',''))='') then raise exception 'operation_error:allocation:%:Invalid receipt line.',coalesce(line->>'allocation_id','unknown'); end if;
  end loop;
  insert into public.factory_receipt_events(user_id,factory_arrival_id,event_kind,received_at,receipt_business_date,immutable_payload,receipt_request_id)
    values(u,a.id,'RECEIPT',timezone('utc',now()),business_date,canonical,request_id) returning id into event_id;
  insert into public.factory_receipt_requests(user_id,receipt_request_id,payload_hash,factory_arrival_id,immutable_payload,receipt_event_id) values(u,request_id,hash,a.id,canonical,event_id);
  for line in select value from jsonb_array_elements(p_payload->'lines') loop
    q:=coalesce((line->>'quantity')::integer,0); oq:=coalesce((line->>'overage_quantity')::integer,0);
    select * into x from public.factory_arrival_allocations where id=(line->>'allocation_id')::bigint and user_id=u;
    select * into i from public.factory_arrival_items where id=x.factory_arrival_item_id and user_id=u;
    select * into v from public.product_variants where id=x.product_variant_id and user_id=u;
    insert into public.inventory(user_id,model_id,size_id,color_id,warehouse_id,quantity) values(u,v.model_id,v.size_id,v.color_id,x.warehouse_id,q+oq) on conflict(user_id,model_id,size_id,color_id,warehouse_id) do update set quantity=public.inventory.quantity+excluded.quantity,updated_at=timezone('utc',now());
    insert into public.transactions(user_id,date,model_id,size_id,color_id,type,quantity,warehouse_id,source_channel,reference_type,reference_id,memo) values(u,business_date,v.model_id,v.size_id,v.color_id,'INBOUND',q+oq,x.warehouse_id,'factory-arrival','factory_receipt_event',event_id,case when oq>0 then btrim(line->>'overage_reason') else '검수 입고' end) returning id into tx;
    insert into public.factory_receipt_lines(user_id,factory_receipt_event_id,factory_arrival_allocation_id,factory_arrival_item_id,warehouse_id,transaction_id,received_quantity,normal_quantity,overage_quantity,overage_reason,seller_sku_snapshot,product_name_snapshot,option_name_snapshot,warehouse_name_snapshot) values(u,event_id,x.id,i.id,x.warehouse_id,tx,q+oq,q,oq,case when oq>0 then btrim(line->>'overage_reason') end,i.seller_sku_snapshot,i.product_name_snapshot,i.option_name_snapshot,x.warehouse_name_snapshot);
    update public.factory_arrival_allocations set normally_received_quantity=normally_received_quantity+q,updated_at=timezone('utc',now()) where id=x.id;
    update public.factory_arrival_items set received_quantity=received_quantity+q,updated_at=timezone('utc',now()) where id=i.id;
    perform private.enqueue_factory_variant(u,v.id);
  end loop;
  perform private.refresh_factory_arrival_status(a.id,u);
  return jsonb_build_object('receipt_event_id',event_id,'idempotent',false);
end $$;

create or replace function public.record_factory_arrival_follow_up(p_payload jsonb) returns jsonb
language plpgsql security definer set search_path=private,public as $$
declare
  u uuid:=auth.uid(); request_id text:=btrim(p_payload->>'receipt_request_id'); business_date date:=nullif(p_payload->>'receipt_business_date','')::date;
  canonical jsonb; hash text; existing public.factory_receipt_requests%rowtype; c public.factory_arrival_shortage_closures%rowtype;
  parent_x public.factory_arrival_allocations%rowtype; parent_i public.factory_arrival_items%rowtype; parent_a public.factory_arrivals%rowtype;
  w public.warehouses%rowtype; v public.product_variants%rowtype; q integer:=(p_payload->>'quantity')::integer; followed bigint; has_open_child boolean;
  child_arrival_id bigint; child_item_id bigint; child_allocation_id bigint; event_id bigint; line_id bigint; tx bigint;
begin
  if u is null or coalesce(request_id,'')='' or business_date is null or q is null or q<=0 or btrim(coalesce(p_payload->>'reason',''))='' then raise exception 'operation_error:closure:%:Invalid follow-up receipt.',coalesce(p_payload->>'closure_id','unknown'); end if;
  canonical:=jsonb_build_object('closure_id',(p_payload->>'closure_id')::bigint,'warehouse_id',(p_payload->>'warehouse_id')::bigint,'quantity',q,'reason',btrim(p_payload->>'reason'),'receipt_business_date',business_date);
  hash:=private.factory_payload_hash(canonical);
  perform pg_advisory_xact_lock(hashtextextended(u::text||':'||request_id,0));
  select * into existing from public.factory_receipt_requests where user_id=u and receipt_request_id=request_id;
  if found then
    if existing.payload_hash<>hash then raise exception 'receipt_request_conflict'; end if;
    return jsonb_build_object('receipt_event_id',existing.receipt_event_id,'child_arrival_id',existing.factory_arrival_id,'idempotent',true);
  end if;
  select * into c from public.factory_arrival_shortage_closures where id=(p_payload->>'closure_id')::bigint and user_id=u for update;
  if not found then raise exception 'operation_error:closure:%:Shortage closure not found.',coalesce(p_payload->>'closure_id','unknown'); end if;
  select * into parent_x from public.factory_arrival_allocations where id=c.factory_arrival_allocation_id and user_id=u for update;
  select * into parent_i from public.factory_arrival_items where id=parent_x.factory_arrival_item_id and user_id=u;
  select * into parent_a from public.factory_arrivals where id=parent_x.factory_arrival_id and user_id=u for update;
  select * into w from public.warehouses where id=(p_payload->>'warehouse_id')::bigint and user_id=u;
  if not found then raise exception 'operation_error:closure:%:Warehouse not found.',coalesce(p_payload->>'closure_id','unknown'); end if;
  select * into v from public.product_variants where id=parent_x.product_variant_id and user_id=u;
  select coalesce(sum(linked_child.child_expected),0),coalesce(bool_or(linked_child.status in('DRAFT','READY','PARTIAL')),false) into followed,has_open_child
    from (
      select child.id,child.status,sum(child_item.ordered_quantity) as child_expected
      from (select distinct event.factory_arrival_id from public.factory_receipt_lines line join public.factory_receipt_events event on event.id=line.factory_receipt_event_id and event.user_id=line.user_id where line.user_id=u and line.factory_arrival_shortage_closure_id=c.id) closure_child
      join public.factory_arrivals child on child.id=closure_child.factory_arrival_id and child.user_id=u and child.follow_up_parent_arrival_id=parent_a.id
      join public.factory_arrival_items child_item on child_item.factory_arrival_id=child.id and child_item.user_id=child.user_id
      group by child.id,child.status
    ) linked_child;
  if has_open_child then raise exception 'operation_error:closure:%:Follow-up child is still open.',c.id; end if;
  if q>c.quantity-followed then raise exception 'operation_error:closure:%:Follow-up exceeds closed shortage.',c.id; end if;

  insert into public.factory_arrivals(user_id,factory_id,reference_code,expected_date,status,source_channel,memo,follow_up_parent_arrival_id,source_type,external_shipment_reference,supplier_name_snapshot)
    values(u,parent_a.factory_id,coalesce(parent_a.reference_code,'ARR-'||parent_a.id::text)||'-FU-'||c.id::text||'-'||request_id,business_date,'READY','manual',btrim(p_payload->>'reason'),parent_a.id,'MANUAL',parent_a.external_shipment_reference,parent_a.supplier_name_snapshot)
    returning id into child_arrival_id;
  insert into public.factory_arrival_items(user_id,factory_arrival_id,model_id,size_id,color_id,ordered_quantity,received_quantity,product_variant_id,external_sku_snapshot,seller_sku_snapshot,product_name_snapshot,option_name_snapshot)
    values(u,child_arrival_id,v.model_id,v.size_id,v.color_id,q,0,v.id,parent_i.external_sku_snapshot,parent_i.seller_sku_snapshot,parent_i.product_name_snapshot,parent_i.option_name_snapshot)
    returning id into child_item_id;
  insert into public.factory_arrival_allocations(user_id,factory_arrival_id,factory_arrival_item_id,product_variant_id,warehouse_id,allocated_quantity,warehouse_name_snapshot)
    values(u,child_arrival_id,child_item_id,v.id,w.id,q,w.name) returning id into child_allocation_id;
  insert into public.factory_receipt_events(user_id,factory_arrival_id,event_kind,received_at,receipt_business_date,immutable_payload,receipt_request_id)
    values(u,child_arrival_id,'FOLLOW_UP',timezone('utc',now()),business_date,canonical,request_id) returning id into event_id;
  insert into public.factory_receipt_requests(user_id,receipt_request_id,payload_hash,factory_arrival_id,immutable_payload,receipt_event_id)
    values(u,request_id,hash,child_arrival_id,canonical,event_id);
  insert into public.inventory(user_id,model_id,size_id,color_id,warehouse_id,quantity) values(u,v.model_id,v.size_id,v.color_id,w.id,q) on conflict(user_id,model_id,size_id,color_id,warehouse_id) do update set quantity=public.inventory.quantity+excluded.quantity,updated_at=timezone('utc',now());
  insert into public.transactions(user_id,date,model_id,size_id,color_id,type,quantity,warehouse_id,source_channel,reference_type,reference_id,memo)
    values(u,business_date,v.model_id,v.size_id,v.color_id,'INBOUND',q,w.id,'factory-arrival-follow-up','factory_receipt_event',event_id,btrim(p_payload->>'reason')) returning id into tx;
  insert into public.factory_receipt_lines(user_id,factory_receipt_event_id,factory_arrival_allocation_id,factory_arrival_item_id,warehouse_id,factory_arrival_shortage_closure_id,transaction_id,received_quantity,normal_quantity,overage_quantity,overage_reason,seller_sku_snapshot,product_name_snapshot,option_name_snapshot,warehouse_name_snapshot)
    values(u,event_id,child_allocation_id,child_item_id,w.id,c.id,tx,q,q,0,null,parent_i.seller_sku_snapshot,parent_i.product_name_snapshot,parent_i.option_name_snapshot,w.name) returning id into line_id;
  update public.factory_arrival_allocations set normally_received_quantity=q,updated_at=timezone('utc',now()) where id=child_allocation_id and user_id=u;
  update public.factory_arrival_items set received_quantity=q,updated_at=timezone('utc',now()) where id=child_item_id and user_id=u;
  perform private.refresh_factory_arrival_status(child_arrival_id,u);
  perform private.enqueue_factory_variant(u,v.id);
  return jsonb_build_object('receipt_event_id',event_id,'receipt_line_id',line_id,'child_arrival_id',child_arrival_id,'idempotent',false);
end $$;

revoke all on function public.replace_factory_arrival_allocations(jsonb),public.move_factory_arrival_remainders_to_warehouse(jsonb),public.receive_factory_arrival_request(jsonb),public.record_factory_arrival_follow_up(jsonb) from public,anon;
grant execute on function public.replace_factory_arrival_allocations(jsonb),public.move_factory_arrival_remainders_to_warehouse(jsonb),public.receive_factory_arrival_request(jsonb),public.record_factory_arrival_follow_up(jsonb) to authenticated;
