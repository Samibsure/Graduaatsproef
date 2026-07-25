-- 0003_tenantdata_en_rls.sql
--
-- Koppelt wagens en beslissingen aan een bedrijf en zet de afscherming aan.
-- Vanaf hier is de database de beveiligingsgrens, niet de frontend.

-- ---------------------------------------------------------------------------
-- company_id op de gebruikersdata
-- ---------------------------------------------------------------------------

alter table public.vehicles
  add column if not exists company_id uuid references public.companies (id) on delete cascade;

alter table public.evaluations
  add column if not exists company_id uuid references public.companies (id) on delete cascade;

-- Bestaande rijen komen uit de periode zonder accounts en horen bij niemand.
-- Ze gaan naar één bedrijf zodat de dossierwagens uit het eindwerk bewaard
-- blijven. Koppel na je eerste registratie je eigen profiel aan dit bedrijf:
--
--   update public.profiles
--   set company_id = '00000000-0000-0000-0000-000000000001',
--       rol = 'beheerder',
--       is_platform_admin = true
--   where id = (select id from auth.users where email = 'jouw@email.be');
--
-- Verwijder daarna het automatisch aangemaakte lege bedrijf.
insert into public.companies (id, naam)
values ('00000000-0000-0000-0000-000000000001', 'Archief eindwerk')
on conflict (id) do nothing;

update public.vehicles
set company_id = '00000000-0000-0000-0000-000000000001'
where company_id is null;

update public.evaluations
set company_id = '00000000-0000-0000-0000-000000000001'
where company_id is null;

-- De default is het belangrijkste onderdeel van deze migratie: de browser stuurt
-- nooit zelf een company_id mee, de database leidt het af uit de sessie. Samen
-- met de with check-policies hieronder maakt dat schrijven in een ander bedrijf
-- onmogelijk, ook met een gemanipuleerde client.
alter table public.vehicles
  alter column company_id set not null,
  alter column company_id set default public.huidig_bedrijf_id();

alter table public.evaluations
  alter column company_id set not null,
  alter column company_id set default public.huidig_bedrijf_id();

create index if not exists vehicles_company_id_idx    on public.vehicles (company_id);
create index if not exists evaluations_company_id_idx on public.evaluations (company_id);

-- ---------------------------------------------------------------------------
-- RLS: eerst opruimen wat er uit de demo-periode nog openstaat
-- ---------------------------------------------------------------------------

do $$
declare
  p record;
begin
  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('vehicles', 'evaluations', 'companies', 'profiles', 'uitnodigingen')
  loop
    execute format('drop policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end $$;

alter table public.vehicles      enable row level security;
alter table public.evaluations   enable row level security;
alter table public.companies     enable row level security;
alter table public.profiles      enable row level security;
alter table public.uitnodigingen enable row level security;

-- --- wagens ---------------------------------------------------------------

create policy vehicles_select on public.vehicles
  for select to authenticated
  using (company_id = public.huidig_bedrijf_id());

create policy vehicles_insert on public.vehicles
  for insert to authenticated
  with check (company_id = public.huidig_bedrijf_id());

create policy vehicles_update on public.vehicles
  for update to authenticated
  using (company_id = public.huidig_bedrijf_id())
  with check (company_id = public.huidig_bedrijf_id());

create policy vehicles_delete on public.vehicles
  for delete to authenticated
  using (company_id = public.huidig_bedrijf_id());

-- --- beslissingen ---------------------------------------------------------

create policy evaluations_select on public.evaluations
  for select to authenticated
  using (company_id = public.huidig_bedrijf_id());

create policy evaluations_insert on public.evaluations
  for insert to authenticated
  with check (company_id = public.huidig_bedrijf_id());

create policy evaluations_update on public.evaluations
  for update to authenticated
  using (company_id = public.huidig_bedrijf_id())
  with check (company_id = public.huidig_bedrijf_id());

create policy evaluations_delete on public.evaluations
  for delete to authenticated
  using (company_id = public.huidig_bedrijf_id());

-- --- bedrijf --------------------------------------------------------------

create policy companies_select on public.companies
  for select to authenticated
  using (id = public.huidig_bedrijf_id());

create policy companies_update on public.companies
  for update to authenticated
  using (
    id = public.huidig_bedrijf_id()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and rol = 'beheerder'
    )
  )
  with check (id = public.huidig_bedrijf_id());

-- --- profielen ------------------------------------------------------------

-- Collega's binnen hetzelfde bedrijf zijn zichtbaar (ledenlijst),
-- maar je past enkel je eigen profiel aan.
create policy profiles_select on public.profiles
  for select to authenticated
  using (company_id = public.huidig_bedrijf_id());

create policy profiles_update_eigen on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and company_id = public.huidig_bedrijf_id());

-- Een beheerder mag een collega uit het bedrijf verwijderen, zichzelf niet.
create policy profiles_delete_door_beheerder on public.profiles
  for delete to authenticated
  using (
    company_id = public.huidig_bedrijf_id()
    and id <> auth.uid()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and rol = 'beheerder'
    )
  );

-- --- uitnodigingen --------------------------------------------------------

create policy uitnodigingen_select on public.uitnodigingen
  for select to authenticated
  using (company_id = public.huidig_bedrijf_id());

create policy uitnodigingen_beheer on public.uitnodigingen
  for all to authenticated
  using (
    company_id = public.huidig_bedrijf_id()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and rol = 'beheerder'
    )
  )
  with check (
    company_id = public.huidig_bedrijf_id()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and rol = 'beheerder'
    )
  );

-- ---------------------------------------------------------------------------
-- Recht op wissing (AVG art. 17): bedrijf en alle gegevens verwijderen.
-- De cascade ruimt profielen, wagens, beslissingen en uitnodigingen mee op.
-- ---------------------------------------------------------------------------

create or replace function public.verwijder_mijn_bedrijf()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  bedrijf uuid;
begin
  select company_id into bedrijf
  from public.profiles
  where id = auth.uid() and rol = 'beheerder';

  if bedrijf is null then
    raise exception 'Alleen een beheerder kan het bedrijf verwijderen'
      using errcode = '42501';
  end if;

  delete from auth.users
  where id in (select id from public.profiles where company_id = bedrijf);

  delete from public.companies where id = bedrijf;
end $$;

revoke execute on function public.verwijder_mijn_bedrijf() from anon, public;
grant execute on function public.verwijder_mijn_bedrijf() to authenticated;
