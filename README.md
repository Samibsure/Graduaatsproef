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

1. **Simulator**: één wagen volledig doorrekenen zonder account. Dit is de bestemming van
   "Start hier": eerst tonen wat de applicatie kan, pas registreren om te bewaren.
2. **Catalogus**: 163 bedrijfswagens met hun specificaties en een directe fiscale preview,
   met filters op merk, carrosserie en voertuigtype en een keuze van besteljaar.
3. **Eigen modellen**: een modellenbibliotheek per bedrijf, met CSV-import en -export, voor
   uitvoeringen die niet in de catalogus staan.
4. **Mijn wagens**: eigen vloot en kandidaten, met de volledige berekening per gebruiksjaar.
5. **Vergelijking**: scoringsmatrix met zeven gewogen criteria, een grafiek en een advies
   *aanvaarden / overwegen / afwijzen*, met beslissingshistoriek.
6. **Fiscaal kader en parameters**: de regels en cijfers achter de berekening, publiek raadpleegbaar.
7. **Onboarding en instellingen**: een wizard van drie stappen bij de eerste aanmelding, en daarna
   het bedrijfsprofiel, het fiscaal profiel en het team op `/instellingen`.
8. **Melden**: een knop op elke pagina om een fout in een berekening te melden of een verbetering
   te vragen.
9. **Over en steunen**: het verhaal achter de tool, de toelichting bij Ekoon ICT, en de pagina voor
   de vrijwillige bijdrage.

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
| Tests | Vitest in twee projecten: de rekenkern in node (`*.test.ts`), de componenten in jsdom (`*.test.tsx`) |
| Hosting | Vercel |

### De catalogus

De 163 modellen staan in `src/lib/fiscaal/catalogusdata.ts`, niet in de databank. Dat is een
bewuste keuze: de vorige catalogus bestond uitsluitend als rijen in het productieproject, dus
uitbreiden ging alleen met de hand, een fout was niet terug te draaien, en viel de databank weg
dan viel de catalogus mee weg.

CO₂, cataloguswaarde, verbruik, actieradius, koffervolume en trekgewicht zijn **opgezochte**
gegevens per model en modeljaar, uit publieke fabrikants- en WLTP-cijfers voor de Belgische markt.
Elke rij draagt een modeljaar en een bron, zodat een cijfer na te kijken valt. Ze zijn
richtinggevend, niet contractueel.

Alles wat daaruit volgt, rekent de applicatie zelf uit. `docs/catalogus.md` is de volledige lijst,
gegenereerd uit dezelfde data; een snapshot-test bewaakt dat beide gelijk lopen.

Lichte vracht staat er bewust niet in: een bestelwagen die als lichte vracht is ingeschreven valt
buiten de aftrekbeperking van artikel 66 WIB92, en de rekenkern kent die uitzondering nog niet.

### Modelfoto's

Elk model hoort een echte foto te hebben. Heeft het er geen, dan valt `CarImage` terug op een
eigen SVG-illustratie per carrosserietype: bruikbaar als noodoplossing, maar op een raster van
dertig kaarten ziet een bezoeker meteen dat het een plaatshouder is.

De foto's staan lokaal in `public/cars`, niet bij een externe dienst: de CSP laat `img-src 'self'`
toe en niets anders. Ze worden opgehaald door `scripts/wagenfotos.py` van Wikimedia Commons,
alleen onder een licentie die hergebruik toelaat (publiek domein, CC0, CC BY, CC BY-SA), en
bijgesneden op 960 × 600 zodat het raster niet schokt van de ene verhouding naar de andere.

```bash
python3 scripts/wagenfotos.py --check     # welke modellen hebben er nog geen?
python3 scripts/wagenfotos.py             # de ontbrekende ophalen
python3 scripts/wagenfotos.py --only bmw-i5 --force   # één model vervangen
```

Auteur, licentie en bronlink van elke foto staan in `public/cars/BRONNEN.md`. Dat bestand is de
naamsvermelding die CC BY en CC BY-SA verplichten; het script schrijft het bij elke run opnieuw.
`catalogusfotos.test.ts` bewaakt de rest: geen pad dat nergens heen wijst, geen externe URL die de
CSP toch zou blokkeren, geen foto die twee modellen deelt, niets boven 400 kB.

Het script heeft netwerktoegang tot `commons.wikimedia.org` en `upload.wikimedia.org` nodig. In
een omgeving die alleen GitHub, npm en PyPI doorlaat, faalt het met `403` op de CONNECT.

### Kostenmodel

`src/lib/fiscaal/kosten.ts` berekent de jaarlijkse autokosten uit de specificaties: energie (met
gewogen laadprijs, laadverlies en brandstofprijs), onderhoud naar klasse en vermogen, banden,
verzekering, verkeersbelasting per gewest en afschrijving uit de restwaarde. Alle prijzen staan in
`KOSTENPARAMETERS`, op één plaats, en horen jaarlijks bijgewerkt te worden zoals de fiscale
parameters.

De verkeersbelasting is bewust een parametertabel en geen formule: de gewestelijke regels hangen af
van cilinderinhoud, euronorm en fiscale paardenkracht, verschillen per gewest en wijzigen geregeld.

### Besteljaar

Het besteljaar bepaalt onder welk regime een wagen valt en is fiscaal het zwaarste gegeven in de
applicatie. `vergelijkBesteljaren()` in `src/lib/fiscaal/besteljaar.ts` zet dezelfde wagen naast
elkaar voor verschillende besteljaren. Dat is het spiegelbeeld van `uitfasering.ts`, dat het
besteljaar vasthoudt en het gebruiksjaar laat lopen.

### Rekenkern

- **Aftrekbaarheid VenB**: opzoeking in de aftrekkalender per voertuigtype × bestelperiode ×
  gebruiksjaar; gramformule (`120% − 0,5% × coëfficiënt × CO₂`) voor bestellingen vóór 1 juli 2023.
- **VAA**: `cataloguswaarde × 6/7 × leeftijdscorrectie × CO₂-percentage`, met wettelijk minimum.
- **RSZ CO₂-bijdrage**: `((CO₂ × 9 − 600) / 12) × indexcoëfficiënt × multiplicator`, met minimum.
- **Verworpen uitgaven**: `(1 − aftrek%) × autokosten + (17% zonder / 40% met tank- of laadkaart) × VAA`.
- **Scoringsmatrix**: de zes criteria van het rapport (TCO 4 jaar 40%, aftrekbaarheid VenB 20%,
  verworpen uitgaven 15%, operationele flexibiliteit 10%, CO₂/ESG 10%, restwaarde 5%) blijven de
  referentie en worden door de tests bewaakt. De applicatie gebruikt `CRITERIA_UITGEBREID`, met
  daarnaast **praktisch nut** (13%) uit koffervolume, zitplaatsen en trekgewicht. Zonder dat
  criterium wint een kleine elektrische hatchback stelselmatig van een break of een zevenzitter, op
  criteria die niets zeggen over de vraag of het gerief erin past.
- **Afgeleide scores**: flexibiliteit en restwaarde komen uit de specificaties van het model
  (actieradius, laadvermogen, verwacht waardebehoud) in plaats van uit een getal dat de gebruiker
  zelf van 1 tot 10 intikt.

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

### Vrijwillige bijdrage

De applicatie blijft gratis; `/steunen` legt uit wat het draaien kost en biedt twee kanalen aan: een
externe pagina (Buy Me a Coffee of gelijkaardig) en een gewone overschrijving. Er zit **geen**
betaalintegratie in de applicatie: er wordt geen enkel betaalgegeven verwerkt of bewaard, het
rekeningnummer wordt alleen getoond. De waarden staan in `src/lib/steun.ts` en zijn elk te
overschrijven via de omgeving, zodat een rekeningnummer kan wijzigen zonder deployment van nieuwe
code. Het staat er wel als standaardwaarde: een pagina die om een bijdrage vraagt en vervolgens niet
zegt waarheen, is erger dan geen pagina, en het nummer is sowieso publiek want het staat op de site
zelf. Blijft een waarde leeg, dan verdwijnt dat kanaal en blijven alleen de manieren over om gratis
te helpen.

De vraag komt op vier plaatsen terug en nergens als pop-up of banner: een knop in de voettekst, een
kaart onderaan `/over`, een regel onderaan `/handleiding` en één regel op `/vergelijking`, pas nadat
een beslissing bewaard is. Dat laatste is bewust het enige moment in de applicatie zelf: daar heeft
de tool net iets opgeleverd.

Vragen, foutmeldingen en suggesties gaan naar het adres in `src/lib/contact.ts`. Dat staat op één
plaats, want het komt terug op de Over-pagina, de handleiding, de privacyverklaring en de foutpagina.

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
| `NEXT_PUBLIC_DONATIE_URL` | nee | Externe donatiepagina (Buy Me a Coffee); leeg laten verbergt die kaart |
| `NEXT_PUBLIC_DONATIE_IBAN` | nee | Rekeningnummer voor een overschrijving; leeg laten verbergt die kaart |
| `NEXT_PUBLIC_DONATIE_BIC` | nee | BIC bij het rekeningnummer, voor buitenlandse overschrijvingen |
| `NEXT_PUBLIC_DONATIE_BEGUNSTIGDE` | nee | Naam van de begunstigde bij het rekeningnummer |
| `NEXT_PUBLIC_DONATIE_MEDEDELING` | nee | Voorgestelde mededeling, standaard `Autofiscaliteit` |

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
