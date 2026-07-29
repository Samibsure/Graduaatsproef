-- 0012_kostensoorten_en_gewesten.sql
--
-- Velden die volgen uit het bronrapport van juli 2026 over de Belgische
-- autofiscaliteit. Ze vallen in drie groepen.
--
-- 1. **Kostensoorten met een eigen aftrekregime.** Tot nu toe was elke autokost
--    één bedrag dat één percentage volgde. Dat klopt niet: verkeersboetes zijn
--    nooit aftrekbaar (art. 53 WIB92), en het brandstofdeel van een plug-in
--    hybride heeft een eigen plafond.
--
-- 2. **De gegevens voor de valse-hybridetoets** (art. 65/1 WIB92). Een
--    plug-inhybride met te weinig batterij per 100 kg, of met te veel uitstoot,
--    rekent met de CO2 van het overeenstemmende niet-plug-in model, en bij
--    gebrek daaraan met de officiële waarde maal 2,5. Zonder batterijcapaciteit,
--    gewicht en euronorm is die toets niet te doen.
--
-- 3. **Gewest en fiscale pk**, voor de BIV en de jaarlijkse verkeersbelasting.
--
-- Alle kolommen hebben een default die "verandert niets" betekent: een bestaande
-- wagen rekent na deze migratie exact zoals ervoor. Zie src/lib/fiscaal/engine.ts,
-- hybride.ts en gewesten.ts voor de bijhorende regels.

alter table public.vehicles
  -- Kostensoorten met een eigen regime.
  add column if not exists kosten_boetes    numeric not null default 0,
  add column if not exists kosten_brandstof numeric not null default 0,

  -- Valse-hybridetoets en gramformule.
  add column if not exists co2_onbekend   boolean not null default false,
  add column if not exists batterij_kwh   numeric,
  add column if not exists wagengewicht   numeric,
  add column if not exists euronorm       text,
  add column if not exists co2_equivalent numeric,

  -- Gewestelijke belastingen.
  add column if not exists gewest     text,
  add column if not exists fiscale_pk numeric;

do $$ begin
  alter table public.vehicles add constraint vehicles_euronorm_geldig
    check (euronorm is null or euronorm in (
      'euro0', 'euro1', 'euro2', 'euro3', 'euro4', 'euro5',
      'euro6', 'euro6d', 'euro6e', 'euro6e-bis', 'euro6e-ter', 'euro7'));
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.vehicles add constraint vehicles_gewest_geldig
    check (gewest is null or gewest in ('vlaanderen', 'wallonie', 'brussel'));
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.vehicles add constraint vehicles_kostensoorten_geldig check (
    kosten_boetes    between 0 and 1000000
    and kosten_brandstof between 0 and 1000000
    -- Het brandstofdeel zit ín de jaarlijkse autokosten en kan er dus niet
    -- groter zijn, net zoals de financieringskosten.
    and kosten_brandstof <= jaarlijkse_autokosten
    and (batterij_kwh is null or batterij_kwh between 0 and 500)
    and (wagengewicht is null or wagengewicht between 0 and 10000)
    and (co2_equivalent is null or co2_equivalent between 0 and 1000)
    and (fiscale_pk is null or fiscale_pk between 0 and 100)
  );
exception when duplicate_object then null;
end $$;
