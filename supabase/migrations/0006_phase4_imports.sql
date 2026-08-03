-- JTracker — Phase 4: bank-statement PDF import.
-- imports (one row per uploaded statement) + link transactions to it (cascade
-- delete = rollback) + a PRIVATE storage bucket for the PDFs. RLS everywhere.

create table if not exists public.imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null default 'pdf' check (kind in ('pdf','screenshot')),
  status text not null default 'review' check (status in ('parsing','review','committed','failed')),
  file_path text,
  txn_count int not null default 0,
  statement_start date,
  statement_end date,
  opening_sen integer,
  closing_sen integer,
  created_at timestamptz not null default now()
);
alter table public.imports enable row level security;
drop policy if exists imports_all on public.imports;
create policy imports_all on public.imports
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Link transactions to their import; deleting the import removes its rows.
alter table public.transactions
  drop constraint if exists transactions_import_fk;
alter table public.transactions
  add constraint transactions_import_fk
  foreign key (import_id) references public.imports(id) on delete cascade;

-- Private bucket for statement PDFs; files live under <user_id>/<uuid>.pdf.
insert into storage.buckets (id, name, public)
values ('statements', 'statements', false)
on conflict (id) do nothing;

drop policy if exists statements_own_read on storage.objects;
create policy statements_own_read on storage.objects for select to authenticated
  using (bucket_id = 'statements' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists statements_own_write on storage.objects;
create policy statements_own_write on storage.objects for insert to authenticated
  with check (bucket_id = 'statements' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists statements_own_delete on storage.objects;
create policy statements_own_delete on storage.objects for delete to authenticated
  using (bucket_id = 'statements' and (storage.foldername(name))[1] = auth.uid()::text);
