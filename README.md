# B-sure × PXL · Autofiscaliteit-tool

Beslissingstool voor de voertuigkeuze bij B-sure NV, ontwikkeld als deliverable van de
graduaatsproef **"Autofiscaliteit: impact van autokosten op verworpen uitgaven bij B-sure NV"**
(Sami Elhamdaoui, Graduaat Accounting Administration, Hogeschool PXL, 2025-2026).

De applicatie is een werkinstrument dat verder gaat dan het rapport: ze bevat een **catalogus met de
25 bekendste bedrijfswagens in België**, een verzorgde **gecombineerde huisstijl B-sure × PXL**, en
een pagina **/over** met het auteurschap en het verhaal achter de graduaatsproef.

De tool implementeert het prototype uit Bijlage 4 van het rapport, met de drie onderdelen uit het
schema:

1. **Parameters** — aftrekkalender (Tabel 1), VAA-parameters (Tabel 2), RSZ-parameters (Tabel 3),
   VenB-tarieven en KMO-grenzen, jaarlijks bij te werken.
2. **Invoer per wagen** — identificatie, technische gegevens, financieel en beleid per
   kandidaat-wagen.
3. **Scoredashboard** — automatische berekening van aftrekbaarheid, VAA, verworpen uitgaven, extra
   VenB en RSZ-bijdrage; scoringsmatrix met zes gewogen criteria; vergelijkende grafiek tussen
   maximaal drie kandidaten; aanbeveling *aanvaarden / overwegen / afwijzen*; beslissingshistoriek.

## Technische opbouw

| Laag | Keuze |
| --- | --- |
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS, Recharts |
| Rekenkern | Pure TypeScript-functies in `src/lib/fiscaal/` (geen UI-afhankelijkheid) |
| Data | Supabase (PostgreSQL) — project "Graduaatsproef" |
| Tests | Vitest — `src/lib/fiscaal/*.test.ts` |
| Hosting | Vercel |

### Rekenkern

Alle formules komen letterlijk uit paragraaf 1.4.1 en Bijlage 1 van het rapport:

- **Aftrekbaarheid VenB**: opzoeking in de aftrekkalender per voertuigtype × bestelperiode ×
  gebruiksjaar; gramformule (`120% − 0,5% × coëfficiënt × CO₂`) voor bestellingen vóór 1 juli 2023.
- **VAA**: `cataloguswaarde × 6/7 × leeftijdscorrectie × CO₂-percentage`, met minimum (€ 1.690 in
  2026).
- **RSZ CO₂-bijdrage**: `((CO₂ × 9 − 600) / 12) × indexcoëfficiënt × multiplicator`, met
  minimumbijdrage (€ 42,34/maand in 2026).
- **Verworpen uitgaven**: `(1 − aftrek%) × autokosten + (17% zonder / 40% met tank- of laadkaart) ×
  VAA`.
- **Scoringsmatrix**: TCO 4 jaar (40%), aftrekbaarheid VenB (20%), verworpen uitgaven (15%),
  operationele flexibiliteit (10%), CO₂/ESG (10%), restwaarde (5%).

> **Opmerking bij de cijfers in het rapport.** De rekenkern volgt consequent de formules zoals het
> rapport ze definieert. Bijlage 1 van het rapport bevat twee interne inconsistenties die daardoor
> tot licht andere uitkomsten leiden: (1) het VAA van de dieselwagen volgens de eigen formule is
> € 3.783,50 in plaats van de vermelde ± € 4.520, en (2) de RSZ-bijdrage van de diesel laat in het
> rapport de multiplicator (× 4) weg (± € 334/maand volgens de formule i.p.v. ± € 130). Ook de
> gewogen eindscores in Tabel 5 wijken licht af van de som van de eigen criteriumscores. De unit
> tests documenteren deze afwijkingen.

## Lokaal draaien

```bash
npm install
cp .env.example .env.local   # bevat de Supabase-URL en publishable key
npm run dev                  # http://localhost:3000
npm test                     # unit tests rekenkern (valideert tegen Bijlage 1)
npm run build                # productie-build
```

## Database

Het Supabase-project bevat zes tabellen, aangemaakt via migraties en geseed met alle data uit het
rapport plus de wagencatalogus:

- `tax_parameters` — fiscale parameters per jaar (2025-2031)
- `bestelperiodes` — bestelperiodes met RSZ-multiplicator
- `deduction_rules` — aftrekkalender (Tabel 1 + Bijlage 3)
- `car_catalog` — 25 populaire Belgische bedrijfswagens (richtwaarden cataloguswaarde/CO₂)
- `vehicles` — eigen wagens (vloot of kandidaat), incl. de dossierwagens uit Bijlage 1; met
  optionele koppeling (`catalog_id`, `merk`, `model`) naar de catalogus
- `evaluations` — beslissingshistoriek van bewaarde vergelijkingen

### Wagencatalogus

De 25 modellen zijn een realistische dwarsdoorsnede van de Belgische bedrijfswagenmarkt 2025
(19 BEV, 3 PHEV, 1 HEV, 2 fossiel), zodat de fiscale kloof tussen elektrisch en verbranding
zichtbaar wordt. Cataloguswaarden en CO₂ zijn **indicatieve richtwaarden** die per uitvoering en
optie variëren; de jaarlijkse autokosten worden geraamd op basis van de cataloguswaarde en zijn per
offerte aan te passen.

## Huisstijl & auteurschap

De interface combineert de huisstijl van **B-sure** (diep marineblauw, sober en verzorgd, slogan
"financieel geluk") met die van **Hogeschool PXL** (zwart en goud, `#AE9A64`). De pagina **/over**
en de footer vermelden expliciet dat dit een graduaatsproef van **Sami Elhamdaoui** is. De tool
gebruikt een **eigen wordmark** en geen gekopieerde officiële logo's; merknamen blijven eigendom van
hun respectieve eigenaars en worden enkel ter situering vermeld.

**Beveiliging**: de toepassing gebruikt de *publishable key* met permissieve RLS-policies, zoals
past bij een interne demo-omgeving zonder accounts. Voor productiegebruik binnen B-sure wordt
aangeraden Supabase Auth toe te voegen en de policies te beperken tot aangemelde gebruikers.

## Deployment op Vercel

Het project wordt rechtstreeks vanuit deze repository op Vercel gedeployed. Optionele environment
variables (vallen terug op de ingebouwde standaardwaarden):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Jaarlijkse parameter-update (aanbeveling 5 van het rapport)

1. Open de pagina **Parameters** in september, na het federale begrotingsakkoord.
2. Werk per jaar het minimum VAA, de referentie-CO₂, de RSZ-index en de minimumbijdrage bij.
3. Controleer de aftrekkalender en de RSZ-multiplicatoren tegen de circulaires van de FOD
   Financiën.
4. Gebruik **Herstel standaardwaarden** om terug te keren naar de cijfers uit het rapport
   (toestand mei 2026).
