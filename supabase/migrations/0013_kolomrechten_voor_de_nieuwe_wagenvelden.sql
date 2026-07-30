-- 0013_kolomrechten_voor_de_nieuwe_wagenvelden.sql
--
-- 0012 zette negen kolommen bij op public.vehicles, maar niet het recht om ze te
-- schrijven. Dat is geen detail: 0009 trekt het tabelbrede UPDATE-recht op
-- vehicles in en geeft het per kolom terug. Een kolom die niet in die lijst
-- staat, is voor `authenticated` dus niet te wijzigen.
--
-- Het gevolg is bovendien scheef. Een INSERT slaagt, want daar staat geen
-- kolomrecht op; alleen de UPDATE faalt. Een nieuwe wagen bewaren met een
-- euronorm en een gewest werkt dus, en diezelfde wagen daarna bijwerken niet.
-- bewaarWagen() in src/lib/data.ts stuurt bij een wijziging alle velden van het
-- formulier mee, en het wagenformulier vraagt sinds het bronrapport net om deze
-- negen. Wie na 0012 een bestaande wagen opent en bewaart, krijgt dus een
-- rechtenfout uit PostgREST te zien.
--
-- GRANT is optelbaar en idempotent, dus alleen de negen nieuwe kolommen hoeven
-- erbij; de lijst uit 0009 blijft staan zoals ze is. Dat is ook veiliger dan die
-- lijst hier opnieuw uittypen, want een vergeten kolom zou een bestaand recht
-- niet intrekken maar wel de illusie geven dat deze migratie de volledige
-- waarheid is.
--
-- Les voor de volgende keer: een `add column` op vehicles, companies, profiles,
-- evaluations, uitnodigingen of eigen_modellen hoort in dezelfde migratie een
-- `grant update` te krijgen. De tabellen met kolomrechten staan in 0009 en 0010.

grant update (
  -- Kostensoorten met een eigen aftrekregime.
  kosten_boetes,
  kosten_brandstof,

  -- Valse-hybridetoets en gramformule.
  co2_onbekend,
  batterij_kwh,
  wagengewicht,
  euronorm,
  co2_equivalent,

  -- Gewestelijke belastingen.
  gewest,
  fiscale_pk
) on public.vehicles to authenticated;
