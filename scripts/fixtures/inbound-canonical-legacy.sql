-- Representative pre-canonical data. Run only after the legacy migrations and
-- before 20260718190437_canonical_arrival_schema_and_legacy_migration.sql.
-- IDs are intentionally stable so post-migration assertions name each case.
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'fixture-owner@example.test', 'fixture', now(), '{}'::jsonb, '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'fixture-other@example.test', 'fixture', now(), '{}'::jsonb, '{}'::jsonb);

insert into public.models (id, user_id, name) values
  (110, '00000000-0000-0000-0000-000000000011', 'Fixture model'),
  (120, '00000000-0000-0000-0000-000000000022', 'Other model');
insert into public.sizes (id, user_id, model_id, name) values
  (111, '00000000-0000-0000-0000-000000000011', 110, 'M'),
  (121, '00000000-0000-0000-0000-000000000022', 120, 'M');
insert into public.colors (id, user_id, model_id, name, rgb_code) values
  (112, '00000000-0000-0000-0000-000000000011', 110, 'Black', '#000000'),
  (122, '00000000-0000-0000-0000-000000000022', 120, 'White', '#ffffff');
insert into public.warehouses (id, user_id, name) values
  (130, '00000000-0000-0000-0000-000000000011', 'Fixture one'),
  (131, '00000000-0000-0000-0000-000000000011', 'Fixture two'),
  (132, '00000000-0000-0000-0000-000000000022', 'Other warehouse');
insert into public.factories (id, user_id, name) values
  (140, '00000000-0000-0000-0000-000000000011', 'Fixture factory'),
  (141, '00000000-0000-0000-0000-000000000022', 'Other factory');
insert into public.product_variants (id, user_id, model_id, size_id, color_id, seller_sku) values
  (150, '00000000-0000-0000-0000-000000000011', 110, 111, 112, 'FIXTURE-SKU'),
  (151, '00000000-0000-0000-0000-000000000022', 120, 121, 122, 'OTHER-SKU');

-- The draft rows cover untouched, partial and completely received imports.
insert into public.inbound_drafts (id, user_id, supplier_id, status) values
  (200, '00000000-0000-0000-0000-000000000011', 140, 'partial'),
  (201, '00000000-0000-0000-0000-000000000022', 141, 'draft');
insert into public.inbound_draft_rows (id, user_id, inbound_draft_id, template, external_sku, quantity, received_quantity, warehouse_id, product_variant_id) values
  (210, '00000000-0000-0000-0000-000000000011', 200, 'fixture-import', 'UNT-001', 5, 0, 130, 150),
  (211, '00000000-0000-0000-0000-000000000011', 200, 'fixture-import', 'PAR-001', 6, 2, 130, 150),
  (212, '00000000-0000-0000-0000-000000000011', 200, 'fixture-import', 'REC-001', 4, 4, 131, 150),
  (213, '00000000-0000-0000-0000-000000000022', 201, 'other-import', 'OTHER-001', 3, 0, 132, 151);

-- Repeated rows use a stable transaction order; the migration must not assign
-- either transaction to both items. The multi-warehouse row has received
-- evidence in two warehouses and an intentionally unallocated expected tail.
insert into public.factory_arrivals (id, user_id, factory_id, reference_code, expected_date, status, source_channel) values
  (300, '00000000-0000-0000-0000-000000000011', 140, 'fixture-repeated-variant', current_date, '부분입고', 'manual'),
  (301, '00000000-0000-0000-0000-000000000011', 140, 'fixture-multi-warehouse', current_date, '부분입고', 'manual'),
  (302, '00000000-0000-0000-0000-000000000011', 140, 'fixture-overage', current_date, '입고완료', 'manual');
insert into public.factory_arrival_items (id, user_id, factory_arrival_id, model_id, size_id, color_id, ordered_quantity, received_quantity) values
  (310, '00000000-0000-0000-0000-000000000011', 300, 110, 111, 112, 3, 2),
  (311, '00000000-0000-0000-0000-000000000011', 300, 110, 111, 112, 7, 4),
  (312, '00000000-0000-0000-0000-000000000011', 301, 110, 111, 112, 10, 5),
  (313, '00000000-0000-0000-0000-000000000011', 302, 110, 111, 112, 2, 3);

insert into public.inventory (user_id, model_id, size_id, color_id, warehouse_id, quantity) values
  ('00000000-0000-0000-0000-000000000011', 110, 111, 112, 130, 14),
  ('00000000-0000-0000-0000-000000000011', 110, 111, 112, 131, 7),
  ('00000000-0000-0000-0000-000000000022', 120, 121, 122, 132, 3);
insert into public.transactions (id, user_id, date, model_id, size_id, color_id, type, quantity, warehouse_id, source_channel, reference_type, reference_id, created_at) values
  (400, '00000000-0000-0000-0000-000000000011', current_date, 110, 111, 112, 'INBOUND', 2, 130, 'inbound-draft', 'inbound_draft_row', 211, now() - interval '8 minutes'),
  (401, '00000000-0000-0000-0000-000000000011', current_date, 110, 111, 112, 'INBOUND', 4, 131, 'inbound-draft', 'inbound_draft_row', 212, now() - interval '7 minutes'),
  (410, '00000000-0000-0000-0000-000000000011', current_date, 110, 111, 112, 'INBOUND', 2, 130, 'factory-arrival', 'factory_arrival', 300, now() - interval '6 minutes'),
  (411, '00000000-0000-0000-0000-000000000011', current_date, 110, 111, 112, 'INBOUND', 4, 130, 'factory-arrival', 'factory_arrival', 300, now() - interval '5 minutes'),
  (412, '00000000-0000-0000-0000-000000000011', current_date, 110, 111, 112, 'INBOUND', 2, 130, 'factory-arrival', 'factory_arrival', 301, now() - interval '4 minutes'),
  (413, '00000000-0000-0000-0000-000000000011', current_date, 110, 111, 112, 'INBOUND', 3, 131, 'factory-arrival', 'factory_arrival', 301, now() - interval '3 minutes'),
  (414, '00000000-0000-0000-0000-000000000011', current_date, 110, 111, 112, 'INBOUND', 3, 130, 'factory-arrival', 'factory_arrival', 302, now() - interval '2 minutes');

create table if not exists public.inbound_canonical_fixture_baseline (inventory_total bigint not null, transaction_count bigint not null);
truncate public.inbound_canonical_fixture_baseline;
insert into public.inbound_canonical_fixture_baseline(inventory_total, transaction_count)
select coalesce(sum(quantity), 0), (select count(*) from public.transactions) from public.inventory;
