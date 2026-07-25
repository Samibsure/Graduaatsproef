-- 0004_referentiedata_readonly.sql
--
-- De fiscale parameters, bestelperiodes, aftrekkalender en wagencatalogus zijn
-- nationale referentiedata: er is per jaar precies één juist cijfer. Eén bedrijf
-- mag die niet voor alle andere kunnen wijzigen.
--
-- Vandaag kan dat wel: iedereen, ook uitgelogd, kan de aftrekkalender wissen.
-- Deze migratie zet dat recht.

do $$
declare
  p record;
begin
  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('tax_parameters', 'bestelperiodes', 'deduction_rules', 'car_catalog')
  loop
    execute format('drop policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end $$;

alter table public.tax_parameters  enable row level security;
alter table public.bestelperiodes  enable row level security;
alter table public.deduction_rules enable row level security;
alter table public.car_catalog     enable row level security;

-- Lezen mag iedereen, ook zonder account: de catalogus en het fiscaal kader
-- zijn publieke pagina's.
create policy tax_parameters_lees on public.tax_parameters
  for select to anon, authenticated using (true);
create policy bestelperiodes_lees on public.bestelperiodes
  for select to anon, authenticated using (true);
create policy deduction_rules_lees on public.deduction_rules
  for select to anon, authenticated using (true);
create policy car_catalog_lees on public.car_catalog
  for select to anon, authenticated using (true);

-- Schrijven kan alleen een platformbeheerder.
create policy tax_parameters_beheer on public.tax_parameters
  for all to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy bestelperiodes_beheer on public.bestelperiodes
  for all to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy deduction_rules_beheer on public.deduction_rules
  for all to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy car_catalog_beheer on public.car_catalog
  for all to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- Herstel standaardwaarden
--
-- Stond tot nu toe in de frontend als een reeks losse delete/insert-aanroepen
-- die elke anonieme bezoeker kon uitvoeren. Wordt één functie, met de controle
-- in de functie zelf én een revoke voor anonieme gebruikers.
-- ---------------------------------------------------------------------------

create or replace function public.herstel_standaardwaarden()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Alleen een platformbeheerder kan de standaardwaarden herstellen'
      using errcode = '42501';
  end if;

  insert into public.tax_parameters (
    year, vaa_minimum, ref_co2_benzine, ref_co2_diesel, co2_pct_min, co2_pct_max,
    co2_pct_basis, co2_pct_per_gram, rsz_index, rsz_min_maand, rsz_min_basis,
    rsz_multiplicator, venb_tarief, kmo_tarief, kmo_min_bezoldiging,
    vu_pct_met_kaart, vu_pct_zonder_kaart, updated_at
  ) values
    (2025, 1650, 71, 59, 4, 18, 5.5, 0.1, 1.5948, 37.33, 33.22, 2.75, 25, 20, 45000, 40, 17, now()),
    (2026, 1690, 70, 58, 4, 18, 5.5, 0.1, 1.6291, 42.34, 33.93, 4.0,  25, 20, 50000, 40, 17, now()),
    (2027, 1690, 70, 58, 4, 18, 5.5, 0.1, 1.6291, 42.34, 33.93, 5.5,  25, 20, 50000, 40, 17, now()),
    (2028, 1690, 70, 58, 4, 18, 5.5, 0.1, 1.6291, 42.34, 33.93, 5.5,  25, 20, 50000, 40, 17, now()),
    (2029, 1690, 70, 58, 4, 18, 5.5, 0.1, 1.6291, 42.34, 33.93, 5.5,  25, 20, 50000, 40, 17, now()),
    (2030, 1690, 70, 58, 4, 18, 5.5, 0.1, 1.6291, 42.34, 33.93, 5.5,  25, 20, 50000, 40, 17, now()),
    (2031, 1690, 70, 58, 4, 18, 5.5, 0.1, 1.6291, 42.34, 33.93, 5.5,  25, 20, 50000, 40, 17, now())
  on conflict (year) do update set
    vaa_minimum         = excluded.vaa_minimum,
    ref_co2_benzine     = excluded.ref_co2_benzine,
    ref_co2_diesel      = excluded.ref_co2_diesel,
    co2_pct_min         = excluded.co2_pct_min,
    co2_pct_max         = excluded.co2_pct_max,
    co2_pct_basis       = excluded.co2_pct_basis,
    co2_pct_per_gram    = excluded.co2_pct_per_gram,
    rsz_index           = excluded.rsz_index,
    rsz_min_maand       = excluded.rsz_min_maand,
    rsz_min_basis       = excluded.rsz_min_basis,
    rsz_multiplicator   = excluded.rsz_multiplicator,
    venb_tarief         = excluded.venb_tarief,
    kmo_tarief          = excluded.kmo_tarief,
    kmo_min_bezoldiging = excluded.kmo_min_bezoldiging,
    vu_pct_met_kaart    = excluded.vu_pct_met_kaart,
    vu_pct_zonder_kaart = excluded.vu_pct_zonder_kaart,
    updated_at          = now();

  insert into public.bestelperiodes (code, label, van, tot, rsz_multiplicator, volgorde) values
    ('voor_07_2023', 'Vóór 1 juli 2023 (gramformule)', null,         '2023-06-30', 1,   1),
    ('2023H2_2025',  '1 juli 2023 – 31 december 2025', '2023-07-01', '2025-12-31', 4,   2),
    ('2026',         '1 januari – 31 december 2026',   '2026-01-01', '2026-12-31', 4,   3),
    ('2027',         'Kalenderjaar 2027',              '2027-01-01', '2027-12-31', 5.5, 4),
    ('2028',         'Kalenderjaar 2028',              '2028-01-01', '2028-12-31', 6,   5),
    ('2029',         'Kalenderjaar 2029',              '2029-01-01', '2029-12-31', 6,   6),
    ('2030',         'Kalenderjaar 2030',              '2030-01-01', '2030-12-31', 6,   7),
    ('2031_plus',    'Vanaf 1 januari 2031',           '2031-01-01', null,         6,   8)
  on conflict (code) do update set
    label             = excluded.label,
    van               = excluded.van,
    tot               = excluded.tot,
    rsz_multiplicator = excluded.rsz_multiplicator,
    volgorde          = excluded.volgorde;

  delete from public.deduction_rules;

  insert into public.deduction_rules (voertuigtype, bestelperiode, gebruiksjaar, aftrek_pct) values
    ('BEV', '2023H2_2025', null, 100),
    ('BEV', '2026',        null, 100),
    ('BEV', '2027',        null, 95),
    ('BEV', '2028',        null, 90),
    ('BEV', '2029',        null, 82.5),
    ('BEV', '2030',        null, 75),
    ('BEV', '2031_plus',   null, 67.5);

  insert into public.deduction_rules (voertuigtype, bestelperiode, gebruiksjaar, aftrek_pct)
  select t.voertuigtype, '2023H2_2025', k.gebruiksjaar, k.aftrek_pct
  from (values ('PHEV'), ('HEV'), ('fossiel')) as t (voertuigtype)
  cross join (values (2025, 75), (2026, 50), (2027, 25), (2028, 0)) as k (gebruiksjaar, aftrek_pct);

  insert into public.deduction_rules (voertuigtype, bestelperiode, gebruiksjaar, aftrek_pct)
  select t.voertuigtype, p.bestelperiode, null, 0
  from (values ('PHEV'), ('HEV'), ('fossiel')) as t (voertuigtype)
  cross join (values ('2026'), ('2027'), ('2028'), ('2029'), ('2030'), ('2031_plus')) as p (bestelperiode);
end $$;

revoke execute on function public.herstel_standaardwaarden() from anon, public;
grant execute on function public.herstel_standaardwaarden() to authenticated;
