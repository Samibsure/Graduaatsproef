# Database

Het volledige schema van Autofiscaliteit staat in `migrations/`, in volgorde uit te voeren:

| Migratie | Wat |
| --- | --- |
| `0001_baseline.sql` | De zes oorspronkelijke tabellen en de fiscale referentiedata |
| `0002_bedrijven_en_profielen.sql` | `companies`, `profiles`, `uitnodigingen`, de hulpfuncties en de registratietrigger |
| `0003_tenantdata_en_rls.sql` | `company_id` op wagens en beslissingen, plus alle RLS-policies |
| `0004_referentiedata_readonly.sql` | Referentiedata publiek leesbaar, alleen schrijfbaar door een platformbeheerder |

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

## Wagencatalogus

De 25 rijen van `car_catalog` staan niet in de migraties: die data bestaat alleen in het bestaande
project. Exporteer ze daar eenmalig (Table Editor → `car_catalog` → Export CSV) als je het schema in
een nieuw project opbouwt.
