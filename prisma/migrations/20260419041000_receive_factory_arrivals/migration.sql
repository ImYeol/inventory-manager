alter table public.transactions
  add column if not exists source_channel text,
  add column if not exists reference_type text,
  add column if not exists reference_id bigint,
  add column if not exists memo text;

create index if not exists transactions_reference_type_reference_id_idx
  on public.transactions (user_id, reference_type, reference_id);

create or replace function public.receive_factory_arrival(
  p_arrival_id bigint,
  p_warehouse_id bigint,
  p_items jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_item jsonb;
  v_arrival public.factory_arrivals%rowtype;
  v_arrival_item public.factory_arrival_items%rowtype;
  v_model_id bigint;
  v_size_id bigint;
  v_color_id bigint;
  v_quantity integer;
  v_remaining integer;
  v_total_remaining integer;
begin
  if v_user_id is null then
    raise exception 'Authentication is required.';
  end if;

  select *
  into v_arrival
  from public.factory_arrivals
  where id = p_arrival_id
    and user_id = v_user_id
  for update;

  if not found then
    raise exception 'Factory arrival not found.';
  end if;

  if v_arrival.status = '입고완료' or v_arrival.status = '취소' then
    raise exception 'This arrival cannot be received.';
  end if;

  if jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'p_items must be a JSON array.';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select *
    into v_arrival_item
    from public.factory_arrival_items
    where id = (v_item ->> 'arrival_item_id')::bigint
      and factory_arrival_id = p_arrival_id
      and user_id = v_user_id
    for update;

    if not found then
      raise exception 'Factory arrival item not found.';
    end if;

    v_quantity := (v_item ->> 'quantity')::integer;
    v_remaining := v_arrival_item.ordered_quantity - v_arrival_item.received_quantity;

    if v_quantity is null or v_quantity <= 0 then
      raise exception 'Receive quantity must be greater than zero.';
    end if;

    if v_quantity > v_remaining then
      raise exception 'Receive quantity exceeds remaining quantity.';
    end if;

    v_model_id := v_arrival_item.model_id;
    v_size_id := v_arrival_item.size_id;
    v_color_id := v_arrival_item.color_id;

    update public.factory_arrival_items
    set received_quantity = received_quantity + v_quantity,
        updated_at = timezone('utc', now())
    where id = v_arrival_item.id
      and user_id = v_user_id;

    insert into public.inventory (
      user_id, model_id, size_id, color_id, warehouse_id, quantity
    )
    values (
      v_user_id, v_model_id, v_size_id, v_color_id, p_warehouse_id, v_quantity
    )
    on conflict (user_id, model_id, size_id, color_id, warehouse_id)
    do update
      set quantity = public.inventory.quantity + excluded.quantity,
          updated_at = timezone('utc', now());

    insert into public.transactions (
      user_id, date, model_id, size_id, color_id, type, quantity, warehouse_id, source_channel, reference_type, reference_id, memo
    )
    values (
      v_user_id,
      current_date,
      v_model_id,
      v_size_id,
      v_color_id,
      'INBOUND',
      v_quantity,
      p_warehouse_id,
      'factory-arrival',
      'factory_arrival',
      p_arrival_id,
      coalesce(v_arrival.memo, '공장 예정 입고 반영')
    );
  end loop;

  select coalesce(sum(ordered_quantity - received_quantity), 0)
  into v_total_remaining
  from public.factory_arrival_items
  where factory_arrival_id = p_arrival_id
    and user_id = v_user_id;

  update public.factory_arrivals
  set status = case
      when v_total_remaining = 0 then '입고완료'
      else '부분입고'
    end,
    updated_at = timezone('utc', now())
  where id = p_arrival_id
    and user_id = v_user_id;
end;
$$;
