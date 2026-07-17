alter table public.inbound_drafts add column if not exists source_storage_path text, add column if not exists source_filename text, add column if not exists source_file_hash text, add column if not exists source_sheet_name text, add column if not exists source_header_row_number integer, add column if not exists source_headers jsonb;
alter table public.inbound_draft_rows alter column quantity drop not null;
alter table public.inbound_draft_rows add column if not exists source_row_number integer, add column if not exists source_values jsonb not null default '{}'::jsonb, add column if not exists validation_error text;
insert into storage.buckets (id, name, public) values ('inbound-source-files', 'inbound-source-files', false) on conflict (id) do update set public = false;
drop policy if exists "Users manage own inbound source files" on storage.objects;
create policy "Users manage own inbound source files" on storage.objects for all to authenticated using (bucket_id = 'inbound-source-files' and (storage.foldername(name))[1] = (select auth.uid()::text)) with check (bucket_id = 'inbound-source-files' and (storage.foldername(name))[1] = (select auth.uid()::text));
