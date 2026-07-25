# Autofiscaliteit

Gratis webapplicatie die de werkelijke kost van een bedrijfswagen in België berekent en kandidaten
onderling vergelijkt: aftrekbaarheid in de vennootschapsbelasting, voordeel van alle aard,
verworpen uitgaven, de CO₂-solidariteitsbijdrage en de totale gebruikskost.

Elk bedrijf registreert zich gratis en beheert zijn eigen wagenpark. Wagens en bewaarde
beslissingen zijn strikt afgeschermd per bedrijf; collega's kunnen worden uitgenodigd.
De applicatie is beschikbaar in het Nederlands, het Frans en het Engels.

De toepassing groeide uit het eindwerk van Sami Elhamdaoui over de impact van autokosten op
verworpen uitgaven, en is sindsdien uitgebouwd tot een publiek product.

## Onderdelen

1. **Catalogus**: de bekendste bedrijfswagens in België met een directe fiscale preview.
2. **Mijn wagens**: eigen vloot en kandidaten, met de volledige berekening per gebruiksjaar.
3. **Vergelijking**: scoringsmatrix met zes gewogen criteria, een grafiek en een advies
   *aanvaarden / overwegen / afwijzen*, met beslissingshistoriek.
4. **Fiscaal kader en parameters**: de regels en cijfers achter de berekening, publiek raadpleegbaar.
5. **Onboarding en instellingen**: een wizard van drie stappen bij de eerste aanmelding, en daarna
   het bedrijfsprofiel, het fiscaal profiel en het team op `/instellingen`.

### Onboarding

Wie zich registreert komt op `/welkom`: bedrijfsgegevens, het fiscaal profiel (KMO-tarief en de
startmaand van het boekjaar) en de keuze om te starten met een lege vloot of met een voorbeeldvloot
van drie wagens. Die voorbeeldvloot is bewust een elektrische, een plug-in hybride en een diesel,
zodat de fiscale kloof meteen zichtbaar is in plaats van een lege tabel.

De middleware stuurt naar `/welkom` zolang `companies.onboarding_voltooid` op false staat.

### Rollen

| Rol | Mag |
| --- | --- |
| `lezer` | alles bekijken, niets bewaren of verwijderen |
| `lid` | wagens en beslissingen beheren |
| `fiscalist` | zoals lid; bedoeld als aanspreekpunt voor de fiscale beoordeling |
| `beheerder` | alles, plus het team en de bedrijfsgegevens |

De rol `lezer` bestaat voor de externe accountant of de zaakvoerder die enkel meekijkt. De rechten
worden afgedwongen door de policies (`public.mag_schrijven()` en `public.is_beheerder()`); de
helpers in `src/lib/rollen.ts` bepalen alleen wat de interface toont.

## Technische opbouw

| Laag | Keuze |
| --- | --- |
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS |
| Talen | next-intl, Nederlands / Frans / Engels |
| Rekenkern | Pure TypeScript-functies in `src/lib/fiscaal/` (geen UI- of DB-afhankelijkheid) |
| Data & auth | Supabase (PostgreSQL, Supabase Auth), afscherming via RLS |
| Tests | Vitest, `src/lib/fiscaal/*.test.ts` |
| Hosting | Vercel |

### Rekenkern

- **Aftrekbaarheid VenB**: opzoeking in de aftrekkalender per voertuigtype × bestelperiode ×
  gebruiksjaar; gramformule (`120% − 0,5% × coëfficiënt × CO₂`) voor bestellingen vóór 1 juli 2023.
- **VAA**: `cataloguswaarde × 6/7 × leeftijdscorrectie × CO₂-percentage`, met wettelijk minimum.
- **RSZ CO₂-bijdrage**: `((CO₂ × 9 − 600) / 12) × indexcoëfficiënt × multiplicator`, met minimum.
- **Verworpen uitgaven**: `(1 − aftrek%) × autokosten + (17% zonder / 40% met tank- of laadkaart) × VAA`.
- **Scoringsmatrix**: TCO 4 jaar (40%), aftrekbaarheid VenB (20%), verworpen uitgaven (15%),
  operationele flexibiliteit (10%), CO₂/ESG (10%), restwaarde (5%).

De rekenkern is bewust vrij van UI en database, zodat de formules los te testen zijn. De unit tests
valideren de uitkomsten tegen een uitgewerkt referentiedossier.

### Afscherming

De database is de beveiligingsgrens, niet de frontend:

- Wagens en beslissingen dragen een `company_id` dat de database zélf invult op basis van de
  sessie. De browser stuurt dat nooit mee en kan het dus ook niet vervalsen.
- RLS-policies beperken elke query tot het eigen bedrijf.
- De nationale referentiedata (parameters, bestelperiodes, aftrekkalender, catalogus) is publiek
  leesbaar maar alleen schrijfbaar door een platformbeheerder.
- De middleware in `src/middleware.ts` stuurt niet-aangemelde bezoekers door, maar is een
  gemaksvoorziening, de policies doen het echte werk.
- Schrijfrechten volgen de rol: `mag_schrijven()` sluit de lezer uit, `is_beheerder()` beschermt de
  bedrijfsgegevens, het team en de uitnodigingen.

Zie `supabase/README.md` voor het schema en de controlestappen.

### Validatie

De grenzen op een wagen (CO₂, cataloguswaarde, beroepsgebruik, scores, datums) staan als
CHECK-constraints in migratie `0006`. Dat is de regel die niet te omzeilen valt, want de browser
praat rechtstreeks met PostgREST. `src/lib/validatie.ts` herhaalt dezelfde grenzen met Zod, puur om
vóór het netwerkverzoek te kunnen zeggen wélk veld er misgaat in plaats van een constraintnaam te
tonen. Wijzigt een grens, wijzig ze dan op beide plaatsen; `src/lib/validatie.test.ts` bewaakt dat.

### Talen

Nederlands staat zonder voorvoegsel in de URL, Frans en Engels onder `/fr` en `/en`. De teksten
staan in `messages/{nl,fr,en}.json`, de routering in `src/i18n/`. Voeg je een tekst toe, zet ze dan
in alle drie de bestanden: een ontbrekende sleutel valt zichtbaar door de mand.

Interne functie- en veldnamen blijven Nederlands (`laadWagens`, `verworpenUitgaven`). Die hernoemen
raakt elk bestand en de tests, zonder winst voor de gebruiker.

## Lokaal draaien

```bash
npm install
cp .env.example .env.local   # vul je eigen Supabase-URL en publishable key in
npm run dev                  # http://localhost:3000
npm test                     # unit tests rekenkern
npm run lint
npm run build
```

Zonder `.env.local` draait de applicatie tegen het publieke Supabase-project van Autofiscaliteit.
Wil je met je eigen database werken, zet dan de twee variabelen hieronder.

## Deployment

Het project wordt rechtstreeks vanuit deze repository op Vercel gedeployed, op
`autofiscaliteit.com`. `vercel.json` legt framework, install- en buildcommando vast, zodat een
deployment niet afhangt van instellingen in het dashboard.

| Variabele | Verplicht | Wat |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | nee | URL van het Supabase-project; standaard het publieke project |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | nee | Publishable key (publiek; RLS doet de afscherming) |
| `NEXT_PUBLIC_SITE_URL` | nee | Basis-URL voor metadata, standaard `https://autofiscaliteit.com` |
| `NEXT_PUBLIC_DONATIE_URL` | nee | Externe donatiepagina; leeg laten verbergt de knop |

De Supabase-waarden mogen ook onder de namen staan die de Vercel-marketplace-integratie zet:
`SUPABASE_URL` en `SUPABASE_ANON_KEY` of `SUPABASE_PUBLISHABLE_KEY`. `next.config.ts` neemt de
eerste naam die gevuld is en zet ze door, ook naar de browser. Een secret of service_role-sleutel
wordt geweigerd: die zou in de browserbundel belanden en alle RLS-policies omzeilen.

De standaardwaarden staan in `src/lib/supabase/envnamen.ts`. Ze zijn er zodat een build nooit
struikelt over een ontbrekende variabele — de site plat leggen weegt zwaarder dan een publieke
sleutel in de broncode, want die sleutel gaat sowieso naar elke bezoeker.

Voor publiek gebruik moet in Supabase daarnaast eigen SMTP geconfigureerd zijn (de ingebouwde
mailserver is te beperkt en levert slecht af), met de redirect-URL's op het productiedomein.

## Jaarlijkse parameter-update

1. Open **/beheer/parameters** in september, na het federale begrotingsakkoord.
2. Werk per jaar het minimum VAA, de referentie-CO₂, de RSZ-index en de minimumbijdrage bij.
3. Controleer de aftrekkalender en de RSZ-multiplicatoren tegen de circulaires van de FOD Financiën.
4. **Herstel standaardwaarden** zet alles terug naar de gepubliceerde cijfers.

Deze pagina is alleen toegankelijk voor platformbeheerders: de parameters gelden voor heel België
en zijn niet per bedrijf aanpasbaar.

## Licentie

Alle rechten voorbehouden. De webapplicatie is gratis te gebruiken, maar de broncode staat niet
onder een opensourcelicentie: hergebruik, verspreiding of afgeleide werken zijn niet toegestaan
zonder schriftelijke toestemming van de auteur.
