-- 0006_bedrijfsprofiel_en_validatie.sql
--
-- Drie dingen die na 0005 nog ontbreken:
--
-- 1. Een bedrijfsprofiel. De KMO-status was tot nu toe een selectievakje op de
--    vergelijkingspagina dat je bij elk bezoek opnieuw moest aanvinken, terwijl
--    het een eigenschap van het bedrijf is en niet van de vergelijking.
-- 2. Schrijfrechten die de nieuwe rol 'lezer' respecteren.
-- 3. Validatie in de database. RLS beschermt tegen de gegevens van een ander
--    bedrijf, maar niet tegen onzin: een CO2-uitstoot van -5 of een
--    beroepsgebruik van 300% werd tot nu toe zonder morren bewaard.

-- ---------------------------------------------------------------------------
-- 1. Bedrijfsprofiel
-- ---------------------------------------------------------------------------

alter table public.companies
  add column if not exists is_kmo               boolean not null default true,
  add column if not exists boekjaar_start_maand integer not null default 1,
  add column if not exists btw_nummer           text,
  add column if not exists adres                text,
  add column if not exists postcode             text,
  add column if not exists gemeente             text,
  add column if not exists logo_url             text,
  add column if not exists onboarding_voltooid  boolean not null default false;

do $$ begin
  alter table public.companies
    add constraint companies_boekjaar_maand_geldig
    check (boekjaar_start_maand between 1 and 12);
exception when duplicate_object then null;
end $$;

-- Het archiefbedrijf uit 0003 bevat de dossierwagens van het eindwerk en hoeft
-- de onboarding niet te doorlopen.
update public.companies
set onboarding_voltooid = true
where id = '00000000-0000-0000-0000-000000000001';

-- ---------------------------------------------------------------------------
-- 2. Schrijfrechten per rol
--
-- Twee hulpfuncties in dezelfde stijl als huidig_bedrijf_id(): security definer
-- met een leeg zoekpad, zodat een policy op profiles niet opnieuw profiles
-- bevraagt en er geen pad naar privilege-escalatie ontstaat.
-- ---------------------------------------------------------------------------

create or replace function public.mag_schrijven()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select rol <> 'lezer' from public.profiles where id = auth.uid()),
    false
  )
$$;

create or replace function public.is_beheerder()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select rol = 'beheerder' from public.profiles where id = auth.uid()),
    false
  )
$$;

-- Schrijfpolicies opnieuw opbouwen, nu met de rolcontrole erin. Lezen blijft
-- ongewijzigd: iedereen in het bedrijf mag alles van dat bedrijf zien.
drop policy if exists vehicles_insert    on public.vehicles;
drop policy if exists vehicles_update    on public.vehicles;
drop policy if exists vehicles_delete    on public.vehicles;
drop policy if exists evaluations_insert on public.evaluations;
drop policy if exists evaluations_update on public.evaluations;
drop policy if exists evaluations_delete on public.evaluations;

create policy vehicles_insert on public.vehicles
  for insert to authenticated
  with check (company_id = public.huidig_bedrijf_id() and public.mag_schrijven());

create policy vehicles_update on public.vehicles
  for update to authenticated
  using (company_id = public.huidig_bedrijf_id() and public.mag_schrijven())
  with check (company_id = public.huidig_bedrijf_id() and public.mag_schrijven());

create policy vehicles_delete on public.vehicles
  for delete to authenticated
  using (company_id = public.huidig_bedrijf_id() and public.mag_schrijven());

create policy evaluations_insert on public.evaluations
  for insert to authenticated
  with check (company_id = public.huidig_bedrijf_id() and public.mag_schrijven());

create policy evaluations_update on public.evaluations
  for update to authenticated
  using (company_id = public.huidig_bedrijf_id() and public.mag_schrijven())
  with check (company_id = public.huidig_bedrijf_id() and public.mag_schrijven());

create policy evaluations_delete on public.evaluations
  for delete to authenticated
  using (company_id = public.huidig_bedrijf_id() and public.mag_schrijven());

-- De policies op companies, profiles en uitnodigingen bevatten een uitgeschreven
-- exists-controle op 'beheerder'. Nu is_beheerder() bestaat, vervangen we die
-- door één aanroep: dezelfde regel, op één plaats te wijzigen.
drop policy if exists companies_update                 on public.companies;
drop policy if exists profiles_delete_door_beheerder   on public.profiles;
drop policy if exists uitnodigingen_beheer             on public.uitnodigingen;

create policy companies_update on public.companies
  for update to authenticated
  using (id = public.huidig_bedrijf_id() and public.is_beheerder())
  with check (id = public.huidig_bedrijf_id());

create policy profiles_delete_door_beheerder on public.profiles
  for delete to authenticated
  using (
    company_id = public.huidig_bedrijf_id()
    and id <> auth.uid()
    and public.is_beheerder()
  );

-- Een beheerder mag de rol van een collega aanpassen, maar niet zijn eigen rol:
-- anders zet de laatste beheerder zichzelf per ongeluk buitenspel.
create policy profiles_update_door_beheerder on public.profiles
  for update to authenticated
  using (
    company_id = public.huidig_bedrijf_id()
    and id <> auth.uid()
    and public.is_beheerder()
  )
  with check (company_id = public.huidig_bedrijf_id());

create policy uitnodigingen_beheer on public.uitnodigingen
  for all to authenticated
  using (company_id = public.huidig_bedrijf_id() and public.is_beheerder())
  with check (company_id = public.huidig_bedrijf_id() and public.is_beheerder());

-- ---------------------------------------------------------------------------
-- 3. Validatie
--
-- Deze grenzen staan met opzet in de database en niet alleen in het formulier.
-- De browser praat rechtstreeks met PostgREST, dus een controle die enkel in
-- React staat is een suggestie, geen regel.
-- ---------------------------------------------------------------------------

do $$ begin
  alter table public.vehicles add constraint vehicles_waarden_geldig check (
    co2                   >= 0   and co2                   <= 1000
    and cataloguswaarde   >  0   and cataloguswaarde       <= 1000000
    and jaarlijkse_autokosten >= 0 and jaarlijkse_autokosten <= 1000000
    and (aankoopprijs is null or (aankoopprijs >= 0 and aankoopprijs <= 1000000))
    and beroepsgebruik_pct between 0 and 100
    and (km_per_jaar is null or (km_per_jaar >= 0 and km_per_jaar <= 500000))
    and flex_score       between 1 and 10
    and restwaarde_score between 1 and 10
    and length(trim(omschrijving)) between 1 and 120
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.vehicles add constraint vehicles_datums_geldig check (
    besteldatum          between date '1990-01-01' and date '2100-12-31'
    and eerste_ingebruikname between date '1990-01-01' and date '2100-12-31'
  );
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- 4. handle_new_user afschermen
--
-- De Supabase-adviseur meldt terecht dat deze security definer-functie via
-- /rest/v1/rpc bereikbaar is. Ze hoort alleen door de trigger op auth.users
-- aangeroepen te worden.
-- ---------------------------------------------------------------------------

revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant  execute on function public.handle_new_user() to supabase_auth_admin;
