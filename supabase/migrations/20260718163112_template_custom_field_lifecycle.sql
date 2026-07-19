-- A custom field is user-owned and its stable id is retained in template JSON
-- mappings. Deleting must be explicitly authorized by RLS; application code
-- rejects deletion while any immutable version still references the id.
drop policy if exists "Users delete own template custom fields" on public.template_custom_fields;
create policy "Users delete own template custom fields"
  on public.template_custom_fields for delete to authenticated
  using ((select auth.uid()) = user_id);
