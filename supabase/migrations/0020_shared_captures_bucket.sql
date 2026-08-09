-- Temp staging bucket for share_target (PWA share-sheet) uploads: the
-- /share-target route stages the shared image here, then the Dashboard
-- downloads it client-side and feeds it into the existing scan-capture
-- review flow. Same private, per-user-folder pattern as the `statements`
-- bucket in 0006_phase4_imports.sql.

insert into storage.buckets (id, name, public)
values ('shared-captures', 'shared-captures', false)
on conflict (id) do nothing;

drop policy if exists shared_captures_own_read on storage.objects;
create policy shared_captures_own_read on storage.objects for select to authenticated
  using (bucket_id = 'shared-captures' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists shared_captures_own_write on storage.objects;
create policy shared_captures_own_write on storage.objects for insert to authenticated
  with check (bucket_id = 'shared-captures' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists shared_captures_own_delete on storage.objects;
create policy shared_captures_own_delete on storage.objects for delete to authenticated
  using (bucket_id = 'shared-captures' and (storage.foldername(name))[1] = auth.uid()::text);
