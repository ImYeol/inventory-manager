alter table public.channel_product_refs
  add column if not exists verification_status text not null default 'unverified'
  check (verification_status in ('verified', 'unverified'));
