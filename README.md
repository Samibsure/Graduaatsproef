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

1. **Catalogus** — de bekendste bedrijfswagens in België met een directe fiscale preview.
2. **Mijn wagens** — eigen vloot en kandidaten, met de volledige berekening per gebruiksjaar.
3. **Vergelijking** — scoringsmatrix met zes gewogen criteria, een grafiek en een advies
   *aanvaarden / overwegen / afwijzen*, met beslissingshistoriek.
4. **Fiscaal kader en parameters** — de regels en cijfers achter de berekening, publiek raadpleegbaar.

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
  gemaksvoorziening — de policies doen het echte werk.

Zie `supabase/README.md` voor het schema en de controlestappen.

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

Beide environment variables zijn verplicht; zonder deze waarden start de applicatie niet.

## Deployment

Het project wordt rechtstreeks vanuit deze repository op Vercel gedeployed, op
`autofiscaliteit.com`.

| Variabele | Verplicht | Wat |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | ja | URL van het Supabase-project |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ja | Publishable key (publiek; RLS doet de afscherming) |
| `NEXT_PUBLIC_SITE_URL` | nee | Basis-URL voor metadata, standaard `https://autofiscaliteit.com` |
| `NEXT_PUBLIC_DONATIE_URL` | nee | Externe donatiepagina; leeg laten verbergt de knop |

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
