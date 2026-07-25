# Database

Het volledige schema van Autofiscaliteit staat in `migrations/`, in volgorde uit te voeren:

| Migratie | Wat |
| --- | --- |
| `0001_baseline.sql` | De zes oorspronkelijke tabellen en de fiscale referentiedata |
| `0002_bedrijven_en_profielen.sql` | `companies`, `profiles`, `uitnodigingen`, de hulpfuncties en de registratietrigger |
| `0003_tenantdata_en_rls.sql` | `company_id` op wagens en beslissingen, plus alle RLS-policies |
| `0004_referentiedata_readonly.sql` | Referentiedata publiek leesbaar, alleen schrijfbaar door een platformbeheerder |
| `0005_rollen_uitbreiden.sql` | De rollen `lezer` en `fiscalist` naast `lid` en `beheerder` |
| `0006_bedrijfsprofiel_en_validatie.sql` | Bedrijfsprofiel (KMO, boekjaar, adres, logo), schrijfrechten per rol en de CHECK-constraints op wagens |
| `0007_rekenkern_uitbreiden.sql` | Financiering, btw-methode, eigen bijdrage, laadinfrastructuur en contractdata op wagens |
| `0008_hulpfuncties_afschermen.sql` | `EXECUTE` op de vier RLS-hulpfuncties weg bij `PUBLIC` en `anon` |

`0005` en `0006` horen bij elkaar maar staan bewust apart: PostgreSQL weigert een nieuwe
enumwaarde te gebruiken in dezelfde transactie waarin ze is aangemaakt.

### Status van dit project

De migraties `0001` tot en met `0008` zijn uitgevoerd op het project `fkmulfdpuphedfakmmsd`. De
zes permissieve `USING (true)`-policies uit de periode zonder accounts zijn daarmee verdwenen; de
tien bestaande wagens staan in het archiefbedrijf `00000000-0000-0000-0000-000000000001`.

Gecontroleerd na `0008`: elke tabel in `public` heeft RLS aan, geen enkele policy laat `anon`
schrijven, en de Security Advisor meldt geen anon-toegang tot `security definer`-functies meer.

## Uitvoeren

Met de Supabase CLI:

```bash
supabase link --project-ref <project-ref>
supabase db push
```

Of plak elk bestand in volgorde in de SQL-editor van Supabase.

De migraties zijn idempotent geschreven (`if not exists`, `on conflict`), zodat ze veilig op de
bestaande database kunnen draaien.

## Na de eerste migratie

1. **Maak een back-up voordat je begint.** Migratie `0003` is in de praktijk niet omkeerbaar zodra
   er echte gebruikers zijn geregistreerd.
2. **Registreer je eigen account** via `/registreren`.
3. **Maak jezelf platformbeheerder** en koppel je profiel aan het archiefbedrijf met de bestaande
   wagens:

   ```sql
   update public.profiles
   set company_id        = '00000000-0000-0000-0000-000000000001',
       rol               = 'beheerder',
       is_platform_admin = true
   where id = (select id from auth.users where email = 'jouw@email.be');
   ```

   Verwijder daarna het lege bedrijf dat de registratietrigger voor je aanmaakte.
4. **Controleer de afscherming** voordat je het product aankondigt:

   ```sql
   -- elke tabel moet rowsecurity = true hebben
   select tablename, rowsecurity from pg_tables where schemaname = 'public';

   -- geen enkele policy mag anon laten schrijven
   select tablename, policyname, roles, cmd from pg_policies where schemaname = 'public';
   ```

   Draai daarna ook de Security Advisor in het Supabase-dashboard.

   De Advisor blijft na `0008` melden dat `huidig_bedrijf_id()`, `is_platform_admin()`,
   `mag_schrijven()` en `is_beheerder()` door **aangemelde** gebruikers als `security definer`
   aanroepbaar zijn. Dat is bedoeld: de RLS-policies steunen erop, dus de rol `authenticated` moet
   ze mogen uitvoeren. Ze geven uitsluitend informatie terug over de aanroeper zelf en lekken
   niets van een ander bedrijf. Hetzelfde geldt voor `herstel_standaardwaarden()` en
   `verwijder_mijn_bedrijf()`, die hun eigen rechtencontrole in de functie hebben.

   Voor **anon** zijn die meldingen weg sinds `0008`. `handle_new_user()` is en blijft
   afgeschermd: die hoort alleen door de trigger aangeroepen te worden.

## Wagencatalogus

De 25 rijen van `car_catalog` staan niet in de migraties: die data bestaat alleen in het bestaande
project. Exporteer ze daar eenmalig (Table Editor → `car_catalog` → Export CSV) als je het schema in
een nieuw project opbouwt.
