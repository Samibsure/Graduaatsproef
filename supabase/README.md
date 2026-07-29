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
| `0009_profielrechten_afdwingen.sql` | Kolomrechten en een trigger op `profiles`: geen zelfpromotie meer tot beheerder of platformbeheerder |
| `0010_feedback_en_eigen_modellen.sql` | Tabel `feedback` (iedereen mag melden, alleen een platformbeheerder leest), tabel `eigen_modellen` per bedrijf, en de vreemde sleutel `vehicles.catalog_id` losgekoppeld |
| `0011_overbodige_tabelrechten_intrekken.sql` | `TRUNCATE`, `TRIGGER` en `REFERENCES` weg bij `anon` en `authenticated`, op elke tabel en voor toekomstige tabellen |

`0005` en `0006` horen bij elkaar maar staan bewust apart: PostgreSQL weigert een nieuwe
enumwaarde te gebruiken in dezelfde transactie waarin ze is aangemaakt.

### Status van dit project

De migraties `0001` tot en met `0009` zijn uitgevoerd op het project `fkmulfdpuphedfakmmsd`. De
zes permissieve `USING (true)`-policies uit de periode zonder accounts zijn daarmee verdwenen; de
tien bestaande wagens staan in het archiefbedrijf `00000000-0000-0000-0000-000000000001`.

Gecontroleerd na `0009`, met testgebruikers in een teruggedraaide transactie:

| Poging | Uitkomst |
| --- | --- |
| Gewoon lid maakt zichzelf platformbeheerder | geweigerd |
| Gewoon lid waardeert zijn eigen rol op | geweigerd |
| Gebruiker verhuist zichzelf naar een ander bedrijf | geweigerd |
| Bedrijf B leest de wagens van bedrijf A | 0 rijen |
| Rol `lezer` schrijft | `mag_schrijven()` is false |
| Eigen naam aanpassen, rol van collega wijzigen, bedrijfsprofiel en wagens bewerken | werkt |

Verder: elke tabel in `public` heeft RLS aan, geen enkele policy laat `anon` schrijven, en de
Security Advisor meldt geen anon-toegang tot `security definer`-functies meer.

### Wat de database niet kan afdwingen

De uitnodigingsflow koppelt een nieuwe registratie aan een bedrijf **op e-mailadres**: registreert
iemand zich met een adres waarvoor een uitnodiging openstaat, dan komt die in dat bedrijf terecht.
Dat is veilig zolang Supabase de e-mailbevestiging afdwingt, want dan moet je het adres echt
bezitten. Staat *Confirm email* uit, dan kan iemand die een uitgenodigd adres kent zich als die
persoon registreren en het bedrijf binnenwandelen.

Die instelling staat buiten de database (GoTrue), dus geen enkele migratie kan ze garanderen.
Controleer ze in het dashboard onder Authentication → Providers → Email, samen met de
bot-bescherming op registratie.

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

### Status na `0011`

De migraties `0010` en `0011` zijn uitgevoerd op het project `fkmulfdpuphedfakmmsd`.
Gecontroleerd met testgebruikers in een teruggedraaide transactie:

| Poging | Uitkomst |
| --- | --- |
| Bedrijf B leest de eigen modellen van bedrijf A | 0 rijen |
| Rol `lezer` voegt een eigen model toe | geweigerd |
| Bezoeker zonder account meldt een fout | werkt |
| Bezoeker zonder account leest de meldingen | 0 rijen |
| Elektrische wagen met uitstoot als eigen model | geweigerd door de CHECK |
| Verbrandingswagen zonder uitstoot als eigen model | geweigerd door de CHECK |
| Wagen toevoegen zonder `catalog_id`, en daarna bewerken | werkt |

Verder: elke tabel in `public` heeft RLS aan, en de enige policy die `anon` laat schrijven is
`feedback_insert`. Dat is bedoeld: de simulator en de catalogus zijn publiek, dus de fouten die
daar opvallen komen van bezoekers zonder account. De Security Advisor merkt die policy terecht op
als `WITH CHECK (true)`; de grens zit in de CHECK-constraint die de lengte van elke melding
begrenst, niet in de policy. Er is geen snelheidsbegrenzing: wie de publieke sleutel heeft, kan de
tabel volschrijven. Dat is de prijs van een meldknop zonder drempel.

### Waarom `0011`

`anon` en `authenticated` hadden op élke tabel ook `TRUNCATE`, `TRIGGER` en `REFERENCES` staan.
Dat zijn de standaardrechten van een nieuw Supabase-project.

`TRUNCATE` is de vervelende: **RLS geldt niet voor TRUNCATE**. Een policy die zegt "alleen rijen
van je eigen bedrijf" doet daar niets. Uitbuiten kon niet, want PostgREST kent geen TRUNCATE, geen
enkele functie voert er een uit, en `anon` noch `authenticated` mag iets aanmaken in `public`. Maar
een recht dat niemand nodig heeft, hoort niet uitgedeeld te zijn, en de dag dat er een
RPC-functie bijkomt is dit het verschil tussen een fout en een ramp.

## Wagencatalogus

De catalogus komt **niet meer uit de databank**. De 163 modellen staan in
`src/lib/fiscaal/catalogusdata.ts` en worden mee uitgeleverd met de applicatie.

De tabel `car_catalog` blijft bestaan voor bestaande verwijzingen, maar wordt niet meer gelezen.
Reden: de vorige 25 rijen bestonden uitsluitend in het productieproject, dus uitbreiden ging alleen
met de hand, een fout was niet terug te draaien, en viel de databank weg dan viel de hele catalogus
mee weg. Sinds `0010` verwijst `vehicles.catalog_id` er ook niet meer met een vreemde sleutel naar;
de koppeling tussen een wagen en een catalogusmodel gebeurt op merk en model.
