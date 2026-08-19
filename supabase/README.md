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
| `0012_kostensoorten_en_gewesten.sql` | Negen kolommen op `vehicles` voor de kostensoorten met een eigen aftrekregime, de valse-hybridetoets en de gewestelijke belastingen |
| `0013_kolomrechten_voor_de_nieuwe_wagenvelden.sql` | Het `UPDATE`-recht op die negen kolommen, dat `0012` vergat |
| `0014_uitnodigingstoken_en_meldlimiet.sql` | Een token op `uitnodigingen`, zodat koppelen niet meer op e-mailadres alleen gebeurt, plus een bovengrens op het aantal meldingen per uur |

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

**Bijstelling sinds `0014`.** De alinea hierboven schat het risico te laag in: ze beschrijft
alleen de richting waarin iemand zich voordoet als een uitgenodigd adres. De omgekeerde
richting -- een aanvaller die uitnodigingen plant voor adressen die hij niet bezit -- werd
door e-mailbevestiging niet gedekt. Zie "Status na `0014`" hieronder.

### Status na `0014`

`0014` is **nog niet uitgevoerd** op `fkmulfdpuphedfakmmsd`. Ze hoort bij de eerste publieke
lancering en moet vóór die lancering draaien.

De migratie dicht een gat dat de tekst hierboven verkeerd inschatte. Er stond dat
e-mailbevestiging de uitnodigingsflow afdekt, maar dat geldt maar in één richting. De andere
richting was open: `uitnodigingen_beheer` begrenst alleen `company_id`, niet `email`, en elke
zelf-geregistreerde gebruiker is beheerder van zijn eigen bedrijf. Iedereen kon dus vanuit de
browserconsole uitnodigingen planten voor adressen die hij niet bezat:

```js
await supabase.from('uitnodigingen').insert([{ email: 'x@doelbedrijf.be' }])
```

Er vertrekt geen mail, dus het slachtoffer merkt niets. Registreerde iemand van die lijst zich
later zelf, dan kreeg hij geen eigen bedrijf maar landde zijn profiel in dat van de aanvaller,
die vanaf dan de volledige vloot las en wijzigde. E-mailbevestiging helpt daar niet: het
slachtoffer bezít het adres, en `on_auth_user_created` staat op `after insert on auth.users`
en draait dus vóór de bevestiging.

Vanaf `0014` koppelt de trigger alleen wanneer de registratie zowel het token als het adres
van de uitnodiging meebrengt. Zonder geldig token volgt het gewone pad met een eigen bedrijf.
Omdat er nog steeds geen mail vertrekt, toont `/instellingen` de uitnodigingslink met een
kopieerknop; het token zit in die link.

Te controleren na het uitvoeren, met testgebruikers in een teruggedraaide transactie:

| Poging | Verwacht |
| --- | --- |
| Registreren met een uitgenodigd adres **zonder** token | eigen bedrijf, niet dat van de uitnodiger |
| Registreren met token **en** het juiste adres | het bedrijf van de uitnodiger, met de rol uit de uitnodiging |
| Registreren met een geldig token maar een **ander** adres | eigen bedrijf |
| Een tweede keer registreren met hetzelfde token | eigen bedrijf (`aanvaard_op` staat gezet) |
| Meer dan 200 meldingen in een uur | geweigerd met errorcode 53400 |

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

### Status na `0013`

De migraties `0010` tot en met `0013` zijn uitgevoerd op het project `fkmulfdpuphedfakmmsd`.
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
| Wagen bewerken met euronorm, gewest, boetes, batterij en gewicht (`0012` + `0013`) | werkt |
| `company_id` van een wagen wijzigen | nog steeds geweigerd |

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

### Waarom `0013`

`0012` zette negen kolommen bij op `vehicles` en vergat het recht om ze te schrijven. Dat is de
valstrik die `0009` inbouwt: die migratie trekt het tabelbrede `UPDATE`-recht op `vehicles` in en
geeft het per kolom terug. Een nieuwe kolom die niet in die lijst staat, is voor `authenticated`
niet te wijzigen.

Het gevolg was scheef en daarom lastig te vinden. Een `INSERT` slaagt, want daar staat geen
kolomrecht op; alleen de `UPDATE` faalt. Een nieuwe wagen bewaren met een euronorm en een gewest
werkte dus, en diezelfde wagen daarna bijwerken niet. `bewaarWagen()` in `src/lib/data.ts` stuurt bij
een wijziging alle velden van het formulier mee, en het wagenformulier vraagt sinds het bronrapport
net om deze negen: elke bewerking van een bestaande wagen zou een rechtenfout uit PostgREST
opgeleverd hebben.

**Regel voor de volgende keer:** een `add column` op `vehicles`, `companies`, `profiles`,
`evaluations`, `uitnodigingen` of `eigen_modellen` hoort in dezelfde migratie een `grant update` te
krijgen. Die zes tabellen hebben kolomrechten; ze staan in `0009` en `0010`.
