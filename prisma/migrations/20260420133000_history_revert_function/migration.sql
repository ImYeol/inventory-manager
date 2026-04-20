create or replace function public.revert_inventory_transaction(
  p_transaction_id bigint,
  p_memo text default null
)
returns bigint
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_transaction public.transactions%rowtype;
  v_previous public.transactions%rowtype;
  v_new_type public.transaction_type_value;
  v_new_quantity integer;
  v_current_quantity integer;
  v_running_quantity integer := 0;
  v_new_transaction_id bigint;
  v_normalized_memo text := nullif(btrim(p_memo), '');
begin
  if v_user_id is null then
    raise exception 'Authentication is required.';
  end if;

  select *
  into v_transaction
  from public.transactions
  where id = p_transaction_id
    and user_id = v_user_id
  for update;

  if not found then
    raise exception 'Transaction not found.';
  end if;

  if v_transaction.type not in ('INBOUND', 'OUTBOUND', 'ADJUSTMENT') then
    raise exception 'Unsupported transaction type.';
  end if;

  if v_transaction.source_channel = 'csv' then
    raise exception 'CSV 반영 이력은 되돌릴 수 없습니다.';
  end if;

  if v_transaction.source_channel = 'factory-arrival' then
    raise exception '예정입고 반영 이력은 되돌릴 수 없습니다.';
  end if;

  if v_transaction.reference_type is not null or v_transaction.reference_id is not null then
    raise exception '이미 시스템 참조가 있는 행은 되돌릴 수 없습니다.';
  end if;

  if v_transaction.source_channel is not null and v_transaction.source_channel <> 'manual' then
    raise exception '수동 등록 이력만 되돌릴 수 있습니다.';
  end if;

  if exists (
    select 1
    from public.transactions newer
    where newer.user_id = v_user_id
      and newer.model_id = v_transaction.model_id
      and newer.size_id = v_transaction.size_id
      and newer.color_id = v_transaction.color_id
      and newer.warehouse_id = v_transaction.warehouse_id
      and (
        newer.date > v_transaction.date
        or (newer.date = v_transaction.date and newer.created_at > v_transaction.created_at)
        or (
          newer.date = v_transaction.date
          and newer.created_at = v_transaction.created_at
          and newer.id > v_transaction.id
        )
      )
  ) then
    raise exception '후속 이력 있음';
  end if;

  if v_transaction.type = 'INBOUND' then
    v_new_type := 'OUTBOUND';
    v_new_quantity := v_transaction.quantity;

    select quantity
    into v_current_quantity
    from public.inventory
    where user_id = v_user_id
      and model_id = v_transaction.model_id
      and size_id = v_transaction.size_id
      and color_id = v_transaction.color_id
      and warehouse_id = v_transaction.warehouse_id
    for update;

    if not found then
      raise exception 'Inventory not found for inbound revert.';
    end if;

    if v_current_quantity < v_new_quantity then
      raise exception 'Insufficient inventory to revert inbound transaction.';
    end if;

    update public.inventory
    set quantity = quantity - v_new_quantity,
        updated_at = timezone('utc', now())
    where user_id = v_user_id
      and model_id = v_transaction.model_id
      and size_id = v_transaction.size_id
      and color_id = v_transaction.color_id
      and warehouse_id = v_transaction.warehouse_id;
  elsif v_transaction.type = 'OUTBOUND' then
    v_new_type := 'INBOUND';
    v_new_quantity := v_transaction.quantity;

    insert into public.inventory (
      user_id, model_id, size_id, color_id, warehouse_id, quantity
    )
    values (
      v_user_id,
      v_transaction.model_id,
      v_transaction.size_id,
      v_transaction.color_id,
      v_transaction.warehouse_id,
      v_new_quantity
    )
    on conflict (user_id, model_id, size_id, color_id, warehouse_id)
    do update
      set quantity = public.inventory.quantity + excluded.quantity,
          updated_at = timezone('utc', now());
  else
    v_new_type := 'ADJUSTMENT';

    for v_previous in
      select *
      from public.transactions prior
      where prior.user_id = v_user_id
        and prior.model_id = v_transaction.model_id
        and prior.size_id = v_transaction.size_id
        and prior.color_id = v_transaction.color_id
        and prior.warehouse_id = v_transaction.warehouse_id
        and (
          prior.date < v_transaction.date
          or (prior.date = v_transaction.date and prior.created_at < v_transaction.created_at)
          or (
            prior.date = v_transaction.date
            and prior.created_at = v_transaction.created_at
            and prior.id < v_transaction.id
          )
        )
      order by prior.date asc, prior.created_at asc, prior.id asc
    loop
      if v_previous.type = 'INBOUND' then
        v_running_quantity := v_running_quantity + v_previous.quantity;
      elsif v_previous.type = 'OUTBOUND' then
        v_running_quantity := greatest(v_running_quantity - v_previous.quantity, 0);
      else
        v_running_quantity := v_previous.quantity;
      end if;
    end loop;

    v_new_quantity := v_running_quantity;

    insert into public.inventory (
      user_id, model_id, size_id, color_id, warehouse_id, quantity
    )
    values (
      v_user_id,
      v_transaction.model_id,
      v_transaction.size_id,
      v_transaction.color_id,
      v_transaction.warehouse_id,
      v_new_quantity
    )
    on conflict (user_id, model_id, size_id, color_id, warehouse_id)
    do update
      set quantity = excluded.quantity,
          updated_at = timezone('utc', now());
  end if;

  insert into public.transactions (
    user_id,
    date,
    model_id,
    size_id,
    color_id,
    type,
    quantity,
    warehouse_id,
    source_channel,
    reference_type,
    reference_id,
    memo
  )
  values (
    v_user_id,
    current_date,
    v_transaction.model_id,
    v_transaction.size_id,
    v_transaction.color_id,
    v_new_type,
    v_new_quantity,
    v_transaction.warehouse_id,
    'history-revert',
    'transaction_revert',
    v_transaction.id,
    coalesce(v_normalized_memo, '이력 되돌리기')
  )
  returning id into v_new_transaction_id;

  return v_new_transaction_id;
end;
$$;
