# B-sure Autofiscaliteit-tool

Beslissingstool voor de voertuigkeuze bij B-sure NV, ontwikkeld als deliverable van de
graduaatsproef **"Autofiscaliteit: impact van autokosten op verworpen uitgaven bij B-sure NV"**
(Sami Elhamdaoui, Graduaat Accounting Administration, Hogeschool PXL, 2025-2026).

De tool implementeert het prototype uit Bijlage 4 van het rapport als webapplicatie, met de drie
onderdelen uit het schema:

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

Het Supabase-project bevat vijf tabellen, aangemaakt via migraties en geseed met alle data uit het
rapport:

- `tax_parameters` — fiscale parameters per jaar (2025-2031)
- `bestelperiodes` — bestelperiodes met RSZ-multiplicator
- `deduction_rules` — aftrekkalender (Tabel 1 + Bijlage 3)
- `vehicles` — wagens, incl. de twee geanonimiseerde dossierwagens uit Bijlage 1 en een
  PHEV-kandidaat
- `evaluations` — beslissingshistoriek van bewaarde vergelijkingen

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
