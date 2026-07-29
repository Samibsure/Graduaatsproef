-- 0010_feedback_en_eigen_modellen.sql
--
-- Twee dingen die de applicatie tot nu toe niet kon.
--
-- 1. Een gebruiker kon niets melden. Voor een gratis fiscale rekentool is "er
--    zit een fout in deze berekening" het waardevolste signaal dat er bestaat,
--    en de enige weg was een e-mailadres overtypen uit een alinea op /over.
--
-- 2. Een bedrijf kon geen eigen wagenmodel aanmaken. De tabel car_catalog is
--    nationale referentiedata: alleen een platformbeheerder mag erin schrijven
--    (0004) en ze heeft geen company_id, dus er is geen enkele manier om er per
--    bedrijf iets aan toe te voegen. Daarvoor is een eigen tabel nodig.
--
-- Deze migratie is niet vereist om de applicatie te laten draaien. Zolang ze
-- niet is uitgevoerd, valt het feedbackformulier terug op e-mail en blijft de
-- eigen modellenbibliotheek verborgen.


-- ============================================================ 1. feedback ===

create table if not exists public.feedback (
  id            uuid primary key default gen_random_uuid(),
  soort         text not null check (soort in ('bug', 'idee', 'vraag')),
  omschrijving  text not null,
  -- Optioneel: alleen wie een antwoord wil, laat een adres achter.
  email         text,
  -- Context die het onderzoeken mogelijk maakt. Bewust niets uit de vloot of
  -- het bedrijfsprofiel: een foutmelding hoort geen bedrijfsgegevens mee te
  -- sturen.
  pagina        text,
  taal          text,
  schermbreedte integer,
  user_agent    text,
  created_at    timestamptz not null default now()
);

-- Grenzen in de database, niet alleen in het formulier: dit is de enige tabel
-- waar een niet-aangemelde bezoeker in mag schrijven.
do $$
begin
  alter table public.feedback add constraint feedback_waarden_geldig check (
    length(trim(omschrijving)) between 5 and 4000
    and (email is null or length(email) <= 254)
    and (pagina is null or length(pagina) <= 500)
    and (taal is null or length(taal) <= 10)
    and (user_agent is null or length(user_agent) <= 500)
    and (schermbreedte is null or schermbreedte between 0 and 20000)
  );
exception when duplicate_object then null;
end $$;

create index if not exists feedback_created_at_idx on public.feedback (created_at desc);

alter table public.feedback enable row level security;

-- Iedereen mag melden, ook zonder account: de simulator en de catalogus zijn
-- publiek, dus de fouten die daar opvallen komen van bezoekers zonder account.
drop policy if exists feedback_insert on public.feedback;
create policy feedback_insert on public.feedback
  for insert to anon, authenticated
  with check (true);

-- Lezen is iets anders. Meldingen kunnen een e-mailadres bevatten en soms
-- gevoelige omschrijvingen; alleen een platformbeheerder komt erbij.
drop policy if exists feedback_lees on public.feedback;
create policy feedback_lees on public.feedback
  for select to authenticated
  using (public.is_platform_admin());

-- Geen update- of deletepolicy: een melding wordt niet achteraf bijgesteld.
revoke update, delete on public.feedback from anon, authenticated;


-- ===================================================== 2. eigen_modellen ===

create table if not exists public.eigen_modellen (
  id                 uuid primary key default gen_random_uuid(),
  company_id         uuid not null references public.companies (id) on delete cascade
                       default public.huidig_bedrijf_id(),

  merk               text not null,
  model              text not null,
  uitvoering         text,
  voertuigtype       text not null check (voertuigtype in ('BEV', 'PHEV', 'HEV', 'fossiel')),
  brandstof          text not null check (brandstof in ('elektrisch', 'diesel', 'benzine', 'lpg', 'cng')),
  carrosserie        text check (carrosserie in
                       ('hatchback', 'berline', 'break', 'suv', 'mpv', 'coupe', 'bestelwagen')),
  segment            text,

  -- Het bouwjaar van de specificaties. Zonder dit veld staat nergens uit welk
  -- modeljaar de CO2 en de cataloguswaarde komen, terwijl beide per modeljaar
  -- verschillen.
  modeljaar          integer,
  bron               text,

  co2                numeric not null,
  cataloguswaarde    numeric not null,
  vermogen_kw        numeric,
  aandrijving        text check (aandrijving in ('voor', 'achter', 'vierwiel')),
  verbruik           numeric,
  batterij_kwh       numeric,
  actieradius_km     numeric,
  laadvermogen_dc_kw numeric,

  zitplaatsen        integer,
  koffer_liter       numeric,
  trekgewicht_kg     numeric,
  restwaarde_pct_4j  numeric,
  onderhoudsklasse   text check (onderhoudsklasse in ('laag', 'midden', 'hoog')),
  uitrusting         text[] not null default '{}',

  image_url          text,
  opmerking          text,
  created_at         timestamptz not null default now()
);

-- Dezelfde grenzen als op vehicles (0006), zodat een eigen model dat bewaard
-- raakt ook door de rekenkern en door wagenSchema komt.
do $$
begin
  alter table public.eigen_modellen add constraint eigen_modellen_geldig check (
    length(trim(merk))  between 1 and 60
    and length(trim(model)) between 1 and 80
    and co2 >= 0 and co2 <= 1000
    and cataloguswaarde > 0 and cataloguswaarde <= 1000000
    and (vermogen_kw is null or (vermogen_kw > 0 and vermogen_kw <= 2000))
    and (verbruik is null or (verbruik >= 0 and verbruik <= 100))
    and (batterij_kwh is null or (batterij_kwh >= 0 and batterij_kwh <= 500))
    and (actieradius_km is null or (actieradius_km >= 0 and actieradius_km <= 2000))
    and (laadvermogen_dc_kw is null or (laadvermogen_dc_kw >= 0 and laadvermogen_dc_kw <= 1000))
    and (zitplaatsen is null or zitplaatsen between 1 and 9)
    and (koffer_liter is null or (koffer_liter >= 0 and koffer_liter <= 10000))
    and (trekgewicht_kg is null or (trekgewicht_kg >= 0 and trekgewicht_kg <= 3500))
    and (restwaarde_pct_4j is null or restwaarde_pct_4j between 0 and 100)
    and (modeljaar is null or modeljaar between 1990 and 2100)
    -- Een elektrische wagen die uitstoot heeft, of een verbrandingswagen die er
    -- geen heeft, is een tikfout en geen model.
    and (voertuigtype <> 'BEV' or co2 = 0)
    and (voertuigtype = 'BEV' or co2 > 0)
  );
exception when duplicate_object then null;
end $$;

create index if not exists eigen_modellen_company_id_idx
  on public.eigen_modellen (company_id);

alter table public.eigen_modellen enable row level security;

-- Zelfde vorm als de policies op vehicles (0003 en 0006): lezen binnen het eigen
-- bedrijf, schrijven alleen door wie schrijfrecht heeft. De lezer kan dus wel
-- kijken maar niets toevoegen.
drop policy if exists eigen_modellen_select on public.eigen_modellen;
create policy eigen_modellen_select on public.eigen_modellen
  for select to authenticated
  using (company_id = public.huidig_bedrijf_id());

drop policy if exists eigen_modellen_insert on public.eigen_modellen;
create policy eigen_modellen_insert on public.eigen_modellen
  for insert to authenticated
  with check (company_id = public.huidig_bedrijf_id() and public.mag_schrijven());

drop policy if exists eigen_modellen_update on public.eigen_modellen;
create policy eigen_modellen_update on public.eigen_modellen
  for update to authenticated
  using (company_id = public.huidig_bedrijf_id() and public.mag_schrijven())
  with check (company_id = public.huidig_bedrijf_id() and public.mag_schrijven());

drop policy if exists eigen_modellen_delete on public.eigen_modellen;
create policy eigen_modellen_delete on public.eigen_modellen
  for delete to authenticated
  using (company_id = public.huidig_bedrijf_id() and public.mag_schrijven());

-- Kolomrechten, zoals 0009 die voor vehicles en profiles zet. company_id en
-- created_at horen er niet bij: die vult de database zelf in en ze mogen niet
-- van buitenaf verplaatst worden.
revoke update on public.eigen_modellen from anon, authenticated;
grant update (
  merk, model, uitvoering, voertuigtype, brandstof, carrosserie, segment,
  modeljaar, bron, co2, cataloguswaarde, vermogen_kw, aandrijving, verbruik,
  batterij_kwh, actieradius_km, laadvermogen_dc_kw, zitplaatsen, koffer_liter,
  trekgewicht_kg, restwaarde_pct_4j, onderhoudsklasse, uitrusting, image_url,
  opmerking
) on public.eigen_modellen to authenticated;


-- ============================================ 3. koppeling vanuit vehicles ===

-- vehicles.catalog_id verwees naar car_catalog. De catalogus staat sinds deze
-- versie in de broncode (src/lib/fiscaal/catalogusdata.ts) en telt honderdzestig
-- modellen, terwijl de tabel er vijfentwintig heeft. Die vreemde sleutel kan dus
-- niet meer kloppen en de applicatie schrijft de kolom niet meer.
--
-- De kolom blijft staan voor de wagens die er al een hebben; alleen de
-- verwijzing verdwijnt, zodat een oude waarde geen insert meer tegenhoudt.
alter table public.vehicles drop constraint if exists vehicles_catalog_id_fkey;

comment on column public.vehicles.catalog_id is
  'Historisch volgnummer uit car_catalog. Nieuwe wagens vullen dit niet meer in; '
  'de koppeling met een catalogusmodel gebeurt op merk en model.';
