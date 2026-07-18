-- Harden the trusted import/revision boundary.  Preview ProductVariant ids are
-- deliberately ignored: only the active exact supplier mapping is evidence.
create schema if not exists private;

-- Preserve legacy evidence when an old deployment has duplicate hash claims.
-- A deterministic canonical claim survives; ambiguity is recorded, never lost.
with ranked as (
  select id, user_id, source_file_hash,
    row_number() over (partition by user_id, source_file_hash order by created_at, id) as position
  from public.inbound_import_revisions where source_file_hash is not null
), changed as (
  update public.inbound_import_revisions r set source_file_hash=null
  from ranked x where r.id=x.id and x.position>1 returning r.id,r.user_id,x.source_file_hash
)
insert into public.inbound_migration_exceptions(user_id, exception_type, details)
select user_id, 'duplicate_legacy_import_file_hash', jsonb_build_object('revision_id',id,'file_hash',source_file_hash)
from changed;

alter table public.inbound_import_revisions drop constraint if exists inbound_import_revisions_template_version_template_fkey;
alter table public.inbound_template_versions add constraint inbound_template_versions_id_template_user_key unique(id,template_id,user_id);
alter table public.inbound_import_revisions add constraint inbound_import_revisions_template_version_template_fkey
  foreign key(template_version_id,template_id,user_id) references public.inbound_template_versions(id,template_id,user_id) on delete restrict;

drop policy if exists "Users manage own inbound_imports" on public.inbound_imports;
drop policy if exists "Users insert own inbound_import_revisions" on public.inbound_import_revisions;
drop policy if exists "Users insert own inbound_import_source_rows" on public.inbound_import_source_rows;
drop policy if exists "Users manage own factory_arrival_allocations" on public.factory_arrival_allocations;
drop policy if exists "Users manage own factory arrivals" on public.factory_arrivals;
drop policy if exists "Users manage own factory arrival items" on public.factory_arrival_items;
create policy "Users read own inbound imports" on public.inbound_imports for select to authenticated using ((select auth.uid())=user_id);
create policy "Users read own factory arrivals" on public.factory_arrivals for select to authenticated using ((select auth.uid())=user_id);
create policy "Users read own factory arrival items" on public.factory_arrival_items for select to authenticated using ((select auth.uid())=user_id);
revoke insert,update,delete on public.inbound_imports,public.inbound_import_revisions,public.inbound_import_source_rows,public.factory_arrivals,public.factory_arrival_items,public.factory_arrival_allocations from authenticated;

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
 if not exists(select 1 from public.factories where id=p_supplier_id and user_id=v_user) then raise exception 'Supplier not found.'; end if;
 if not exists(select 1 from public.inbound_templates t join public.inbound_template_versions tv on tv.id=p_template_version_id and tv.template_id=t.id and tv.user_id=t.user_id where t.id=p_template_id and t.user_id=v_user) then raise exception 'Template/version relationship not found.'; end if;
 if p_source_file_hash is not null and exists(select 1 from public.inbound_import_revisions where user_id=v_user and source_file_hash=p_source_file_hash) then raise exception 'duplicate_file_hash'; end if;
 -- Advisory serialization closes the empty-row race before the logical unique index.
 perform pg_advisory_xact_lock(hashtextextended(v_user::text || ':' || p_supplier_id::text || ':' || v_shipment,0));
 select * into v_import from public.inbound_imports where user_id=v_user and supplier_id=p_supplier_id and external_shipment_number=v_shipment for update;
 if not found then insert into public.inbound_imports(user_id,supplier_id,source_type,external_shipment_number) values(v_user,p_supplier_id,p_source_type,v_shipment) returning * into v_import; v_number:=1;
 else
   select * into v_previous from public.inbound_import_revisions where inbound_import_id=v_import.id and user_id=v_user order by revision_number desc for update limit 1;
   if exists(select 1 from public.factory_arrivals a left join public.factory_arrival_allocations al on al.factory_arrival_id=a.id and al.user_id=a.user_id left join public.factory_receipt_lines rl on rl.factory_arrival_allocation_id=al.id and rl.user_id=al.user_id where a.user_id=v_user and a.import_revision_id in(select id from public.inbound_import_revisions where inbound_import_id=v_import.id) and (coalesce(al.normally_received_quantity,0)>0 or rl.id is not null)) then raise exception 'supersession_after_receipt_evidence'; end if;
   v_number:=coalesce(v_previous.revision_number,0)+1;
 end if;
 -- Mapping confirmation happens before immutable evidence is written. Client ids
 -- are ignored and cannot select an arbitrary owned variant.
 for v_row in select * from jsonb_array_elements(p_rows) loop
   v_sku:=private.normalize_supplier_external_sku(v_row->>'externalSku');
   select product_variant_id into v_variant from public.supplier_sku_links where user_id=v_user and supplier_id=p_supplier_id and normalized_external_sku=v_sku and is_active;
   if coalesce(v_sku,'')='' or v_variant is null then raise exception 'mapping_blocker:%', coalesce(v_row->>'externalSku',''); end if;
 end loop;
 insert into public.inbound_import_revisions(user_id,inbound_import_id,revision_number,supersedes_revision_id,source_filename,source_storage_path,source_file_hash,template_id,template_version_id,source_sheet_name,source_header_row_number,source_headers)
 values(v_user,v_import.id,v_number,case when v_number>1 then v_previous.id end,p_source_filename,p_source_storage_path,p_source_file_hash,p_template_id,p_template_version_id,p_sheet_name,p_header_row_number,coalesce(p_headers,'{}'::jsonb)) returning id into v_revision;
 for v_row in select * from jsonb_array_elements(p_rows) loop
   v_ordinal:=v_ordinal+1; v_sku:=private.normalize_supplier_external_sku(v_row->>'externalSku');
   select product_variant_id into v_variant from public.supplier_sku_links where user_id=v_user and supplier_id=p_supplier_id and normalized_external_sku=v_sku and is_active;
   insert into public.inbound_import_source_rows(user_id,inbound_import_revision_id,source_row_ordinal,source_row_number,external_sku,raw_quantity,quantity,source_values,validation_error,product_variant_id,seller_sku_snapshot,product_name_snapshot,option_name_snapshot,supplier_name_snapshot)
   select v_user,v_revision,v_ordinal,nullif(v_row->>'sourceRowNumber','')::integer,v_row->>'externalSku',v_row->>'rawQuantity',nullif(v_row->>'quantity','')::integer,coalesce(v_row->'sourceValues','{}'::jsonb),nullif(v_row->>'validationError',''),v_variant,pv.seller_sku,m.name,concat_ws(' / ',c.name,s.name),f.name from public.factories f join public.product_variants pv on pv.id=v_variant and pv.user_id=v_user left join public.models m on m.id=pv.model_id and m.user_id=v_user left join public.sizes s on s.id=pv.size_id and s.user_id=v_user left join public.colors c on c.id=pv.color_id and c.user_id=v_user where f.id=p_supplier_id and f.user_id=v_user;
 end loop;
 return query select v_import.id,v_revision,v_number,v_number>1;
exception when unique_violation then
 if p_source_file_hash is not null and exists(select 1 from public.inbound_import_revisions where user_id=v_user and source_file_hash=p_source_file_hash) then raise exception 'duplicate_file_hash'; end if;
 raise exception 'logical_import_conflict';
end $$;

create or replace function public.promote_inbound_import_revision(p_revision_id bigint,p_default_warehouse_id bigint) returns bigint language plpgsql security definer set search_path=private,public as $$
declare v_user uuid:=auth.uid(); v_revision public.inbound_import_revisions%rowtype; v_import public.inbound_imports%rowtype; v_arrival bigint; v_row public.inbound_import_source_rows%rowtype; v_item bigint; v_variant bigint;
begin
 if v_user is null then raise exception 'Authentication is required.'; end if;
 select * into v_revision from public.inbound_import_revisions where id=p_revision_id and user_id=v_user for update; if not found then raise exception 'Import revision not found.'; end if;
 select * into v_import from public.inbound_imports where id=v_revision.inbound_import_id and user_id=v_user for update;
 if exists(select 1 from public.inbound_import_revisions where inbound_import_id=v_import.id and user_id=v_user and revision_number>v_revision.revision_number) then raise exception 'Only the current import revision can be promoted.'; end if;
 if not exists(select 1 from public.warehouses where id=p_default_warehouse_id and user_id=v_user) then raise exception 'Warehouse not found.'; end if;
 if exists(select 1 from public.factory_arrivals where import_revision_id=p_revision_id) then raise exception 'Import revision has already been promoted.'; end if;
 for v_row in select * from public.inbound_import_source_rows where inbound_import_revision_id=p_revision_id and user_id=v_user order by source_row_ordinal,id loop
   select product_variant_id into v_variant from public.supplier_sku_links where user_id=v_user and supplier_id=v_import.supplier_id and normalized_external_sku=private.normalize_supplier_external_sku(v_row.external_sku) and is_active;
   if v_row.validation_error is not null or v_row.quantity is null or v_row.quantity<=0 or v_variant is null or v_variant<>v_row.product_variant_id then raise exception 'Import review blockers must be resolved before promotion.'; end if;
 end loop;
 insert into public.factory_arrivals(user_id,factory_id,reference_code,expected_date,status,source_channel,source_type,import_revision_id,external_shipment_reference,supplier_name_snapshot) select v_user,v_import.supplier_id,v_import.external_shipment_number,current_date,'DRAFT','inbound-import',v_import.source_type,v_revision.id,v_import.external_shipment_number,f.name from public.factories f where f.id=v_import.supplier_id and f.user_id=v_user returning id into v_arrival;
 for v_row in select * from public.inbound_import_source_rows where inbound_import_revision_id=p_revision_id and user_id=v_user order by source_row_ordinal,id loop
   insert into public.factory_arrival_items(user_id,factory_arrival_id,model_id,size_id,color_id,product_variant_id,inbound_import_source_row_id,external_sku_snapshot,seller_sku_snapshot,product_name_snapshot,option_name_snapshot,ordered_quantity) select v_user,v_arrival,pv.model_id,pv.size_id,pv.color_id,v_row.product_variant_id,v_row.id,v_row.external_sku,v_row.seller_sku_snapshot,v_row.product_name_snapshot,v_row.option_name_snapshot,v_row.quantity from public.product_variants pv where pv.id=v_row.product_variant_id and pv.user_id=v_user returning id into v_item;
   insert into public.factory_arrival_allocations(user_id,factory_arrival_id,factory_arrival_item_id,product_variant_id,warehouse_id,allocated_quantity,warehouse_name_snapshot) select v_user,v_arrival,v_item,v_row.product_variant_id,p_default_warehouse_id,v_row.quantity,w.name from public.warehouses w where w.id=p_default_warehouse_id and w.user_id=v_user;
 end loop; return v_arrival;
end $$;

revoke all on function public.register_inbound_import_revision(bigint,text,text,text,text,text,bigint,bigint,text,integer,jsonb,jsonb),public.promote_inbound_import_revision(bigint,bigint) from public,anon;
grant execute on function public.register_inbound_import_revision(bigint,text,text,text,text,text,bigint,bigint,text,integer,jsonb,jsonb),public.promote_inbound_import_revision(bigint,bigint) to authenticated;
