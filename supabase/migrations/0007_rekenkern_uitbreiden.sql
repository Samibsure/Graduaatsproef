-- 0007_rekenkern_uitbreiden.sql
--
-- Velden voor de uitbreidingen op de rekenkern. Alle kolommen hebben een
-- default die "verandert niets" betekent, zodat bestaande wagens exact hetzelfde
-- blijven rekenen. Zie src/lib/fiscaal/engine.ts voor de bijhorende regels.

alter table public.vehicles
  -- Deel van de jaarlijkse autokosten dat intrest is. Financieringskosten
  -- vallen buiten de aftrekbeperking van artikel 66 WIB92.
  add column if not exists kosten_financiering numeric,
  add column if not exists financieringsvorm   text,

  -- BTW-aftrek op de autokosten (circulaire E.T. 119.650). 'geen' is de
  -- standaard: zonder expliciete keuze wordt er niets teruggevorderd.
  add column if not exists btw_methode text not null default 'geen',
  add column if not exists btw_tarief  numeric not null default 21,

  -- Eigen bijdrage van de werknemer. Verlaagt het voordeel van alle aard.
  add column if not exists eigen_bijdrage_maand numeric not null default 0,

  -- Laadinfrastructuur. De laadpaal valt buiten de aftrekbeperking, de
  -- terugbetaalde laadstroom volgt de aftrekbaarheid van de wagen.
  add column if not exists laadpaal_jaarkost numeric not null default 0,
  add column if not exists laadstroom_jaar   numeric not null default 0,

  -- Voor de vervangplanner.
  add column if not exists start_contract date,
  add column if not exists einde_contract date;

do $$ begin
  alter table public.vehicles add constraint vehicles_btw_methode_geldig
    check (btw_methode in ('geen', 'forfait35', 'werkelijk'));
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.vehicles add constraint vehicles_financieringsvorm_geldig
    check (financieringsvorm is null or financieringsvorm in
      ('operationele_leasing', 'financiele_leasing', 'renting', 'aankoop'));
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.vehicles add constraint vehicles_uitbreiding_geldig check (
    (kosten_financiering is null or (kosten_financiering >= 0 and kosten_financiering <= 1000000))
    and btw_tarief            between 0 and 100
    and eigen_bijdrage_maand  between 0 and 100000
    and laadpaal_jaarkost     between 0 and 1000000
    and laadstroom_jaar       between 0 and 1000000
    and (einde_contract is null or start_contract is null or einde_contract >= start_contract)
  );
exception when duplicate_object then null;
end $$;
