-- 0005_rollen_uitbreiden.sql
--
-- Breidt de rollen binnen een bedrijf uit van twee naar vier.
--
-- Tot nu toe bestond er enkel 'lid' en 'beheerder'. Dat volstaat niet zodra een
-- bedrijf zijn externe accountant of zijn zaakvoerder wil laten meekijken:
-- vandaag kan wie mag kijken ook alles wijzigen en verwijderen.
--
--   lezer      alleen kijken, kan niets bewaren of verwijderen
--   lid        wagens en beslissingen beheren
--   fiscalist  zoals lid; krijgt in een latere migratie het recht om een
--              beslissing goed te keuren
--   beheerder  alles, plus het team en de bedrijfsgegevens
--
-- Deze migratie doet bewust niets anders dan de waarden toevoegen. Postgres
-- weigert een nieuwe enumwaarde te gebruiken in dezelfde transactie waarin ze
-- is aangemaakt, dus de policies die erop steunen staan in 0006.

alter type public.bedrijfsrol add value if not exists 'lezer'     before 'lid';
alter type public.bedrijfsrol add value if not exists 'fiscalist' after  'lid';
