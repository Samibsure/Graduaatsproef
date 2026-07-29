-- 0011_overbodige_tabelrechten_intrekken.sql
--
-- `anon` en `authenticated` hadden op élke tabel in `public` ook TRUNCATE,
-- TRIGGER en REFERENCES. Dat zijn de standaardrechten die Supabase op een nieuw
-- project zet; er is nooit iets voor gedaan, en ze zijn nooit gebruikt.
--
-- TRUNCATE is de vervelende van de drie: **row level security geldt niet voor
-- TRUNCATE**. Een policy die zegt "alleen rijen van je eigen bedrijf" doet
-- daar niets. Wie die opdracht zou kunnen versturen, veegt de tabel leeg voor
-- alle bedrijven tegelijk, hoe strak de policies ook staan.
--
-- Vandaag is dat niet uit te buiten. PostgREST vertaalt alleen naar SELECT,
-- INSERT, UPDATE en DELETE en kent geen TRUNCATE; er bestaat geen enkele functie
-- die TRUNCATE uitvoert; en `anon` noch `authenticated` mag iets aanmaken in
-- `public`, waardoor ook het TRIGGER-recht nergens toe leidt. Het is dus geen
-- gat maar een openstaande deur naar een lege gang.
--
-- Ze gaat toch dicht, om dezelfde reden waarom 0009 kolomrechten zette naast een
-- trigger: een recht dat niemand nodig heeft, hoort niet uitgedeeld te zijn. De
-- dag dat er wél een RPC-functie bijkomt, of dat iemand CREATE op public
-- terugzet, is dit het verschil tussen een fout en een ramp.
--
-- Wat de applicatie nodig heeft, blijft ongemoeid: SELECT, INSERT, UPDATE en
-- DELETE, met de RLS-policies en de kolomrechten uit 0006 en 0009 eroverheen.

do $$
declare
  tabel record;
begin
  for tabel in
    select schemaname, tablename
      from pg_tables
     where schemaname = 'public'
  loop
    execute format(
      'revoke truncate, trigger, references on %I.%I from anon, authenticated',
      tabel.schemaname,
      tabel.tablename
    );
  end loop;
end $$;

-- En ook voor tabellen die er later bijkomen, zodat dit geen terugkerende
-- opruimbeurt wordt.
alter default privileges in schema public
  revoke truncate, trigger, references on tables from anon, authenticated;
