-- Quick inbound shares the reasoned warehouse-operation boundary while
-- recording inspected stock immediately, never as factory incoming supply.
create or replace function public.apply_manual_inventory_operations(p_items jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  item jsonb;
  v_kind text;
  v_model_id bigint;
  v_size_id bigint;
  v_color_id bigint;
  v_warehouse_id bigint;
  v_quantity integer;
  v_date date;
  v_reason text;
  v_inventory public.inventory%rowtype;
  v_variant_id bigint;
  v_on_hand integer;
  v_committed integer;
  v_target integer;
  v_ref record;
  v_requested_at timestamptz := timezone('utc', now());
  v_sync_error text := '동기화 필요: 현재 provider는 재고 수량 쓰기를 지원하지 않습니다.';
begin
  if v_user_id is null then raise exception 'Authentication is required.'; end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'p_items must be a non-empty JSON array.';
  end if;

  for item in select * from jsonb_array_elements(p_items) loop
    v_kind := item ->> 'kind';
    v_model_id := (item ->> 'model_id')::bigint;
    v_size_id := (item ->> 'size_id')::bigint;
    v_color_id := (item ->> 'color_id')::bigint;
    v_warehouse_id := (item ->> 'warehouse_id')::bigint;
    v_quantity := (item ->> 'quantity')::integer;
    v_reason := btrim(coalesce(item ->> 'reason', ''));
    v_date := (item ->> 'date')::date;

    if v_kind not in ('inbound', 'manual-outbound', 'count-adjustment') then raise exception 'Unsupported manual inventory operation.'; end if;
    if v_reason = '' then raise exception 'A reason is required.'; end if;
    if v_date is null then raise exception 'A date is required.'; end if;
    if v_quantity is null or v_quantity < 0 or (v_kind <> 'count-adjustment' and v_quantity = 0) then raise exception 'Quantity is invalid.'; end if;
    if not exists (select 1 from public.warehouses where id = v_warehouse_id and user_id = v_user_id) then raise exception 'Warehouse not found.'; end if;

    select * into v_inventory from public.inventory
    where user_id = v_user_id and model_id = v_model_id and size_id = v_size_id and color_id = v_color_id and warehouse_id = v_warehouse_id for update;
    if not found and v_kind <> 'inbound' then raise exception 'Inventory not found.'; end if;

    if v_kind = 'inbound' then
      insert into public.inventory (user_id, model_id, size_id, color_id, warehouse_id, quantity)
      values (v_user_id, v_model_id, v_size_id, v_color_id, v_warehouse_id, v_quantity)
      on conflict (user_id, model_id, size_id, color_id, warehouse_id)
      do update set quantity = public.inventory.quantity + excluded.quantity, updated_at = v_requested_at;
      insert into public.transactions (user_id, date, model_id, size_id, color_id, type, quantity, warehouse_id, source_channel, reference_type, memo)
      values (v_user_id, v_date, v_model_id, v_size_id, v_color_id, 'INBOUND', v_quantity, v_warehouse_id, 'manual', 'quick_inbound', v_reason);
    elsif v_kind = 'manual-outbound' then
      if v_inventory.quantity < v_quantity then raise exception 'Insufficient on-hand inventory.'; end if;
      update public.inventory set quantity = quantity - v_quantity, updated_at = v_requested_at where id = v_inventory.id;
      insert into public.transactions (user_id, date, model_id, size_id, color_id, type, quantity, warehouse_id, source_channel, reference_type, memo)
      values (v_user_id, v_date, v_model_id, v_size_id, v_color_id, 'OUTBOUND', v_quantity, v_warehouse_id, 'manual', 'manual_outbound', v_reason);
    else
      update public.inventory set quantity = v_quantity, updated_at = v_requested_at where id = v_inventory.id;
      insert into public.transactions (user_id, date, model_id, size_id, color_id, type, quantity, warehouse_id, source_channel, reference_type, memo)
      values (v_user_id, v_date, v_model_id, v_size_id, v_color_id, 'ADJUSTMENT', v_quantity - v_inventory.quantity, v_warehouse_id, 'manual', 'stock_count_adjustment', v_reason);
    end if;

    select id into v_variant_id from public.product_variants where user_id = v_user_id and model_id = v_model_id and size_id = v_size_id and color_id = v_color_id;
    if found then
      select coalesce(sum(quantity), 0) into v_on_hand from public.inventory where user_id = v_user_id and model_id = v_model_id and size_id = v_size_id and color_id = v_color_id;
      select coalesce(sum(quantity), 0) into v_committed from public.inventory_reservations where user_id = v_user_id and product_variant_id = v_variant_id and status = 'active';
      v_target := greatest(0, v_on_hand - v_committed);
      for v_ref in select id from public.channel_product_refs where user_id = v_user_id and variant_id = v_variant_id loop
        update public.channel_product_refs set sync_target_quantity = v_target, sync_status = 'required', last_sync_error = v_sync_error, updated_at = v_requested_at where id = v_ref.id and user_id = v_user_id;
        insert into public.inventory_sync_outbox (user_id, channel_product_ref_id, target_quantity, status, last_error, requested_at, updated_at)
        values (v_user_id, v_ref.id, v_target, 'required', v_sync_error, v_requested_at, v_requested_at)
        on conflict (user_id, channel_product_ref_id) do update set target_quantity = excluded.target_quantity, status = 'required', last_error = excluded.last_error, requested_at = excluded.requested_at, updated_at = excluded.updated_at;
      end loop;
    end if;
  end loop;
end;
$$;
