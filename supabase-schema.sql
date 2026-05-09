-- HCS Nachweisboard Supabase schema
-- Prototype-safe: public anon CRUD for demo/GitHub Pages. Tighten policies before production.

create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  customer text not null default '',
  location text not null default '',
  status text not null default 'Aktiv',
  budget numeric not null default 0,
  due date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.proofs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  type text not null default 'Arbeitszeit',
  minutes integer not null default 0 check (minutes >= 0),
  cost numeric not null default 0 check (cost >= 0),
  approved boolean not null default false,
  note text not null default '',
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_proofs_project_id on public.proofs(project_id);
create index if not exists idx_projects_created_at on public.projects(created_at desc);
create index if not exists idx_proofs_created_at on public.proofs(created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

drop trigger if exists proofs_set_updated_at on public.proofs;
create trigger proofs_set_updated_at
before update on public.proofs
for each row execute function public.set_updated_at();

alter table public.projects enable row level security;
alter table public.proofs enable row level security;

drop policy if exists "demo_projects_select" on public.projects;
drop policy if exists "demo_projects_insert" on public.projects;
drop policy if exists "demo_projects_update" on public.projects;
drop policy if exists "demo_projects_delete" on public.projects;
create policy "demo_projects_select" on public.projects for select to anon, authenticated using (true);
create policy "demo_projects_insert" on public.projects for insert to anon, authenticated with check (true);
create policy "demo_projects_update" on public.projects for update to anon, authenticated using (true) with check (true);
create policy "demo_projects_delete" on public.projects for delete to anon, authenticated using (true);

drop policy if exists "demo_proofs_select" on public.proofs;
drop policy if exists "demo_proofs_insert" on public.proofs;
drop policy if exists "demo_proofs_update" on public.proofs;
drop policy if exists "demo_proofs_delete" on public.proofs;
create policy "demo_proofs_select" on public.proofs for select to anon, authenticated using (true);
create policy "demo_proofs_insert" on public.proofs for insert to anon, authenticated with check (true);
create policy "demo_proofs_update" on public.proofs for update to anon, authenticated using (true) with check (true);
create policy "demo_proofs_delete" on public.proofs for delete to anon, authenticated using (true);

insert into public.projects (id, name, customer, location, status, budget, due)
values
  ('00000000-0000-4000-8000-000000000101', 'Badumbau Familie Keller', 'Keller Immobilien GbR', 'Bremen Findorff', 'Aktiv', 8400, '2026-05-18'),
  ('00000000-0000-4000-8000-000000000102', 'Ladenbau Elektro Phase 2', 'Nordlicht Retail GmbH', 'Hamburg Altona', 'Wartet auf Freigabe', 12600, '2026-05-24')
on conflict (id) do nothing;

insert into public.proofs (id, project_id, type, title, minutes, cost, approved, note)
values
  ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000101', 'Zusatzleistung', 'Alte Fliesen entfernt', 135, 210, true, 'Untergrund stärker beschädigt als im Angebot dokumentiert.'),
  ('00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000101', 'Material', 'Feuchtraumplatten nachbestellt', 25, 168, false, 'Vom Kunden telefonisch freigegeben, PDF-Freigabe offen.'),
  ('00000000-0000-4000-8000-000000000203', '00000000-0000-4000-8000-000000000102', 'Arbeitszeit', 'Kabeltrassen angepasst', 210, 346, false, 'Planänderung wegen Lüftungsführung.')
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('proof-photos', 'proof-photos', true, 10485760, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = excluded.public;

drop policy if exists "demo_storage_select" on storage.objects;
drop policy if exists "demo_storage_insert" on storage.objects;
drop policy if exists "demo_storage_update" on storage.objects;
drop policy if exists "demo_storage_delete" on storage.objects;
create policy "demo_storage_select" on storage.objects for select to anon, authenticated using (bucket_id = 'proof-photos');
create policy "demo_storage_insert" on storage.objects for insert to anon, authenticated with check (bucket_id = 'proof-photos');
create policy "demo_storage_update" on storage.objects for update to anon, authenticated using (bucket_id = 'proof-photos') with check (bucket_id = 'proof-photos');
create policy "demo_storage_delete" on storage.objects for delete to anon, authenticated using (bucket_id = 'proof-photos');
