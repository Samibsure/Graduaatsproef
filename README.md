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
6. **Fiscaal kader en parameters**: de regels en cijfers achter de berekening, publiek raadpleegbaar,
   met per cijfer een statusbadge en de rechtsbron erbij.
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

**Geverifieerd of raming.** Van de 163 rijen zijn er negen tegen een genoemde bron gelegd; dat staat
per rij in `zekerheid`. Geverifieerd betekent dat de fiscaal beslissende velden nagekeken zijn: de
cataloguswaarde bij een elektrische wagen (de CO₂ is daar per definitie 0) en de CO₂ bij een plug-in
hybride. De catalogus toont standaard alleen die negen, met een schakelaar bovenaan die de ramingen
erbij zet; elke keuzelijst in de app zet beide groepen apart met een kop erboven. De ramingen blijven
in de dataset staan in plaats van geschrapt te worden: promoveren is dan één bron per regel in plaats
van alle cijfers opnieuw opzoeken. Waar een bron een vork geeft, staat de **hoogste** waarde in de
data — een hoger CO₂-cijfer betekent een hoger VAA, een hogere bijdrage en een grotere kans dat de
valse-hybridetoets kantelt, en wie zich vergist hoort zich naar de veilige kant te vergissen.

Alles wat daaruit volgt, rekent de applicatie zelf uit. `docs/catalogus.md` is de volledige lijst,
gegenereerd uit dezelfde data, met per geverifieerd model de bron erbij; een snapshot-test bewaakt
dat beide gelijk lopen.

Lichte vracht staat er bewust niet in: een bestelwagen die als lichte vracht is ingeschreven valt
buiten de aftrekbeperking van artikel 66 WIB92, en de rekenkern kent die uitzondering nog niet.

### Modelfoto's

159 van de 163 modellen hebben een echte foto, één bestand per slug in `public/cars`. Ontbreekt er
een, dan valt `CarImage` terug op een eigen SVG-illustratie per carrosserietype: bruikbaar als
noodoplossing, maar op een raster van dertig kaarten ziet een bezoeker meteen dat het een
plaatshouder is.

De vier die er geen hebben, staan met hun reden in `scripts/fotos-opnieuw.txt`. Voor die modellen
heeft Commons vrijwel alleen interieurfoto's van beursstands, of blijft het bij een vorige
generatie. Dat is een bewuste keuze: een dashboard op de kaart van de ë-C3 leest als een fout in de
applicatie, een illustratie leest als 'nog geen foto'.

De foto's staan lokaal, niet bij een externe dienst: de CSP laat `img-src 'self'` toe en niets
anders. Ze komen van Wikimedia Commons, alleen onder een licentie die hergebruik toelaat (publiek
domein, CC0, CC BY, CC BY-SA), en zijn bijgesneden op 960 × 600 zodat het raster niet schokt van
de ene verhouding naar de andere.

```bash
python3 scripts/wagenfotos.py --check     # welke modellen hebben er nog geen?
python3 scripts/wagenfotos.py             # de ontbrekende ophalen
python3 scripts/wagenfotos.py --only bmw-i5 --force              # één model vervangen
python3 scripts/wagenfotos.py --only bmw-i5 --force --alternatief 1   # ... en dan de tweede keuze
python3 scripts/wagenfotos_test.py        # de keuzeregels testen
```

**Wat de keuze bepaalt.** De bestandsnaam op Commons zegt welke wagen het is, de categorieën van
het bestand zeggen wat er op staat. Dat tweede is geen luxe: `Ford Explorer EV IAA 2023
1X7A0592.jpg` is een dashboard, en dat is aan de naam niet te zien. Verder moeten alle
modelwoorden als heel woord kloppen (de ID.4 is geen ID.7), is een carrosserievariant een andere
wagen (geen Touring voor de i5), beslist het oudste jaartal over de generatie, en krijgt geen twee
modellen hetzelfde bestand. Een motorversie zoals `C 300 e` mag terugvallen op de familienaam
C-Klasse, want dat is dezelfde wagen.

Die regels zijn niet op één keer goed geweest. Ze staan in `scripts/wagenfotos_test.py` met de
titels en categorieën zoals Commons ze werkelijk teruggaf, inclusief de missers die ze moesten
opvangen — van een politiewagen tot `toy` dat aansloeg op **Toyota**.

Auteur, licentie en bronlink van elke foto staan in `public/cars/BRONNEN.md`. Dat bestand is de
naamsvermelding die CC BY en CC BY-SA verplichten; het script schrijft het bij elke run opnieuw.
`catalogusfotos.test.ts` bewaakt de rest: geen pad dat nergens heen wijst, geen externe URL die de
CSP toch zou blokkeren, geen foto die twee modellen deelt, niets boven 400 kB.

**Ophalen gebeurt in CI.** Het script heeft `commons.wikimedia.org` en `upload.wikimedia.org`
nodig, en de omgeving waarin aan deze repository gewerkt wordt mag alleen GitHub, npm en PyPI
bereiken: daar antwoordt elke CONNECT met `403`. Daarom draait het in
`.github/workflows/modelfotos.yml`, met de hand aan te roepen per slug of voor alles, en het zet
het resultaat als één commit op een doelbranch — nooit op `main`.

### Kostenmodel

`src/lib/fiscaal/kosten.ts` berekent de jaarlijkse autokosten uit de specificaties: energie (met
gewogen laadprijs, laadverlies en brandstofprijs), onderhoud naar klasse en vermogen, banden,
verzekering, verkeersbelasting per gewest en afschrijving uit de restwaarde. Alle prijzen staan in
`KOSTENPARAMETERS`, op één plaats, en horen jaarlijks bijgewerkt te worden zoals de fiscale
parameters.

De verkeersbelasting is bewust een parametertabel en geen formule: de gewestelijke regels hangen af
van cilinderinhoud, euronorm en fiscale paardenkracht, verschillen per gewest en wijzigen geregeld.
Waar bronnen elkaar tegenspreken, staat het hoogste bedrag in de tabel en de tegenspraak in
`VERKEERSBELASTING_VOORBEHOUD`, zodat ze op het scherm terechtkomt in plaats van in een getal te
verdwijnen. Dat geldt vandaag voor de elektrische wagen: Vlaanderen liet de vrijstelling vervallen per
1 januari 2026 (vork € 69,72–€ 87,24 naar fiscale pk), en over Wallonië en Brussel spreken de bronnen
elkaar tegen (€ 0 tegenover € 102,96 per jaar). Over vier jaar is dat meer dan € 400 verschil; het
hoort uitgeklaard te worden met SPW Finances en Brussel Fiscaliteit.

**Restwaarde.** Die is niet per model bepaald, want dat cijfer bestaat voor België niet publiek:
Autovista en Eurotax publiceren op 36 maanden en 60.000 km, op modelniveau achter een betaalmuur. De
app rekent daarom met ranges per aandrijftype (JD Power/Autovista24, Duitse markt, november 2025):
hybride 49,8%, benzine 49,2%, diesel 48%, plug-in 45,1% en elektrisch 37,6% na 36 maanden, in één
regel meetkundig doorgerekend naar 48 maanden. Elke restwaarde in de app is dus een schatting, en de
rangorde is wat de bron robuust noemt: hybride ≈ benzine ≈ diesel > plug-in > elektrisch.

### Besteljaar

Het besteljaar bepaalt onder welk regime een wagen valt en is fiscaal het zwaarste gegeven in de
applicatie. `vergelijkBesteljaren()` in `src/lib/fiscaal/besteljaar.ts` zet dezelfde wagen naast
elkaar voor verschillende besteljaren. Dat is het spiegelbeeld van `uitfasering.ts`, dat het
besteljaar vasthoudt en het gebruiksjaar laat lopen.

### Rekenkern

- **Aftrekbaarheid VenB**: drie regimes, allemaal opgehangen aan de aanschaffingsdatum, dat wil
  zeggen de datum van de bestelbon of van het leasecontract. Vóór 1 juli 2023 geldt de gramformule
  (`120% − 0,5% × coëfficiënt × CO₂`) levenslang. Tussen 1 juli 2023 en 31 december 2025 blijft die
  formule gelden, maar afgetopt op een plafond dat per aanslagjaar zakt van 75% naar 0%; de
  minimumaftrek van 50% verdwijnt daar vanaf aanslagjaar 2026. Vanaf 1 januari 2026 vallen
  verbrandingswagens op 0% en houden elektrische wagens levenslang het percentage van hun
  besteljaar. Bij een uitstoot vanaf 200 g/km of een onbekende uitstoot geldt 40%, maar
  alleen zolang de wettelijke ondergrens bestaat: die 40% en het minimum van 50% zijn samen
  afgeschaft vanaf aanslagjaar 2026. In het overgangsregime valt een wagen van 250 g/km
  vanaf gebruiksjaar 2025 dus op 0%, niet op 40%. Een onbekende uitstoot houdt het forfait
  wél, want zonder waarde op het attest is er geen formule om toe te passen.
- **VAA**: `cataloguswaarde × 6/7 × leeftijdscorrectie × CO₂-percentage`, met wettelijk minimum.
- **RSZ CO₂-bijdrage**: `((CO₂ × 9 − 600) / 12) × indexcoëfficiënt × multiplicator`, met minimum.
  Zonder CO₂-waarde legt de RSZ een forfait op van 182 g/km (benzine) of 165 g/km (diesel).
- **Verworpen uitgaven**: `(1 − aftrek%) × autokosten + (17% zonder / 40% met tank- of laadkaart) × VAA`.
- **Kostensoorten**: niet elke autokost volgt hetzelfde percentage. Intrest en laadpaal vallen
  buiten de aftrekbeperking, laadstroom volgt het afbouwpad van de elektrische wagens (ook voor het
  elektrische deel van een plug-inhybride), het brandstofdeel van een PHEV kent een eigen plafond
  van 50% dat vanaf 2028 nul wordt, en verkeersboetes zijn nooit aftrekbaar.
- **Valse hybrides** (`hybride.ts`): een plug-inhybride met minder dan 0,5 kWh batterij per 100 kg
  of met te veel uitstoot rekent met de CO₂ van het overeenstemmende niet-plug-in model, en bij
  gebrek daaraan met de officiële waarde maal 2,5. De drempel ligt op 50 g/km, of 75 g/km vanaf
  Euro 6e-bis voor bestellingen vanaf 2025.
- **Scoringsmatrix**: de zes criteria van het rapport (TCO 4 jaar 40%, aftrekbaarheid VenB 20%,
  verworpen uitgaven 15%, operationele flexibiliteit 10%, CO₂/ESG 10%, restwaarde 5%) blijven de
  referentie en worden door de tests bewaakt. De applicatie gebruikt `CRITERIA_UITGEBREID`, met
  daarnaast **praktisch nut** (13%) uit koffervolume, zitplaatsen en trekgewicht. Zonder dat
  criterium wint een kleine elektrische hatchback stelselmatig van een break of een zevenzitter, op
  criteria die niets zeggen over de vraag of het gerief erin past.
- **Afgeleide scores**: flexibiliteit en restwaarde komen uit de specificaties van het model
  (actieradius, laadvermogen, verwacht waardebehoud) in plaats van uit een getal dat de gebruiker
  zelf van 1 tot 10 intikt. De restwaardescore is herijkt op de band 25%–42%, want de gesourcete
  ranges liggen lager dan de geraden cijfers die er eerst stonden.

De rekenkern is bewust vrij van UI en database, zodat de formules los te testen zijn. De unit tests
valideren de uitkomsten tegen een uitgewerkt referentiedossier.

### Wat naast de federale kern staat

De federale parameters staan tot op de cent in het Staatsblad. Daarbuiten is dat niet zo, en de
rekenkern doet daar niet alsof. Elk cijfer buiten de federale kern draagt zijn eigen zekerheid en
rechtsbron mee (`bronnen.ts`, met **bevestigd**, **te verifiëren** en **voorlopig**), en de
referentiepagina toont die als badge naast het bedrag.

| Module | Wat | Bijzonderheid |
| --- | --- | --- |
| `gewesten.ts` | BIV en jaarlijkse verkeersbelasting per gewest | Geeft **geen bedrag** wanneer het barema ontbreekt, in plaats van te raden |
| `laadinfra.ts` | Verhoogde kostenaftrek, investeringsaftrek, CREG-tarieven thuisladen | Weigert de cumul van verhoogde kostenaftrek en investeringsaftrek |
| `vergoedingen.ts` | Kilometervergoeding, fietsvergoeding, verzekeringstaks, accijns professionele diesel | Waarschuwt boven 24.000 beroepskilometers |
| `lez.ts` | Toegang tot de lage-emissiezones per stad en euronorm | Doet geen uitspraak zonder euronorm |
| `wegenvignet.ts` | Wegenvignet vanaf 1 mei 2027 | Alles voorlopig: tarieven uitgelekt, aftrekbaarheid voor personenwagens onbevestigd |

Dat onderscheid is geen voorzichtigheid om de voorzichtigheid: een gewestelijk barema dat niet
gepubliceerd is, mag geen bedrag opleveren dat een boekhouder overneemt. Voor een bindend bedrag
verwijst de applicatie door naar de simulator van het gewest zelf.

`kosten.ts` blijft daarnaast een *raming* van de verkeersbelasting geven, omdat een TCO altijd een
getal nodig heeft. Die twee benaderingen vullen elkaar aan en horen niet door elkaar gebruikt te
worden.

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
CHECK-constraints in migratie `0006`, aangevuld door `0007` en `0012`. Dat is de regel die niet te
omzeilen valt, want de browser
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

`vercel.json` zet de serverfuncties in `fra1` (Frankfurt). Dat is geen detail: elke
paginaweergave rendert server-side en leest daarbij het profiel en het bedrijf van de
gebruiker, en de privacyverklaring belooft opslag binnen de Europese Unie. De standaardregio
van Vercel is `iad1`, in de Verenigde Staten.

## Vóór de eerste publieke lancering

Deze stappen staan buiten de code en kan geen enkele migratie of test garanderen. Ze horen
allemaal gezet te zijn vóór het adres rondgaat.

**Supabase → Authentication**

1. **Providers → Email → Confirm email: aan.** Zonder e-mailbevestiging kan iemand die een
   uitgenodigd adres kent zich als die persoon registreren.
2. **Eigen SMTP** instellen met een geverifieerd afzenderdomein en SPF/DKIM. De ingebouwde
   mailserver is niet voor productie bedoeld: hij is beperkt tot enkele mails per uur en
   levert alleen af aan adressen van projectleden. De hele registratieflow hangt aan die mail.
3. **URL Configuration**: Site URL op `https://autofiscaliteit.com`, en
   `https://autofiscaliteit.com/**` bij de Redirect URLs. De code bouwt de terugkeer-URL uit
   `window.location.origin`, maar GoTrue vervangt die stilzwijgend door de Site URL wanneer
   ze niet in de allowlist staat.
4. **Leaked password protection** aan, minimumlengte 8 (het formulier vraagt dat al).
5. **Bot-bescherming** (CAPTCHA) op registratie, en de rate limits nakijken.

**Supabase → Database**

6. Migraties `0001` tot en met `0014` uitvoeren, in volgorde. Zie `supabase/README.md` voor de
   controlestappen; `0014` is nieuw en dicht de uitnodigingsflow.
7. **Security Advisor** draaien en een **back-up** nemen.
8. Een **platformbeheerder** aanmaken, anders is `/beheer/parameters` voor niemand bereikbaar
   en zijn de meldingen onleesbaar.

**Vercel**

9. `NEXT_PUBLIC_SITE_URL=https://autofiscaliteit.com` zetten. Zonder die variabele staan de
   sitemap, robots.txt en alle canonical-links op de standaardwaarde.
10. De twee Supabase-variabelen expliciet zetten, op Production **én** Preview. Zonder die
    laatste praat elke preview-deployment met de productiedatabank; de build zegt dat sinds
    kort in zijn logboek, maar zeggen is geen tegenhouden.
11. Controleren dat de **functieregio** werkelijk op Frankfurt staat. `vercel.json` vraagt
    `fra1`, maar een instelling in het dashboard gaat daarvoor, en op het gratis plan is er
    maar één regio beschikbaar. De privacyverklaring belooft opslag binnen de EU.
12. Na de eerste deploy het volledige registratiepad doorlopen: formulier → bevestigingsmail
    → `/auth/callback` → `/welkom` → `/wagens`, en daarna afmelden. En op de
    preview-deployment van de pull request: `/robots.txt`, `/sitemap.xml`,
    `/nl/opengraph-image` en `/fotobronnen` moeten alle vier antwoorden.

**Over `npm audit`**

`npm audit --omit=dev` meldt vier `high`-adviezen: `postcss`, `nanoid` en `sharp`. Alle drie
zitten in de eigen afhankelijkheidsboom van `next` en zijn alleen op te lossen met `next@16`,
een major bump. Voor deze applicatie zijn ze niet uitbuitbaar: `postcss` en `nanoid` draaien
tijdens de build op onze eigen CSS en komen niet in de browserbundel, en `sharp` hoort bij
`next/image`, dat hier nergens gebruikt wordt (`CarImage` zet bewust een gewone `<img>` neer).
De overstap naar Next 16 hoort na de lancering, niet ervoor.

## Jaarlijkse parameter-update

1. Open **/beheer/parameters** in september, na het federale begrotingsakkoord.
2. Werk per jaar het minimum VAA, de referentie-CO₂, de RSZ-index en de minimumbijdrage bij.
3. Controleer de aftrekkalender en de RSZ-multiplicatoren tegen de circulaires van de FOD Financiën.
4. **Herstel standaardwaarden** zet alles terug naar de gepubliceerde cijfers.

Deze pagina is alleen toegankelijk voor platformbeheerders: de parameters gelden voor heel België
en zijn niet per bedrijf aanpasbaar.

Niet alles loopt op jaarritme. Deze bewegen vaker en staan als tabel in de rekenkern, zodat een
nieuw tarief één regel data is:

| Wat | Wanneer | Waar |
| --- | --- | --- |
| RSZ-indexcoëfficiënt | november | `defaults.ts` |
| Referentie-CO₂ en minimum VAA | december, bij KB | `defaults.ts` |
| CREG-tarief thuisladen | per kwartaal, per gewest | `laadinfra.ts` |
| Kilometervergoeding | per kwartaal, in 2026 tijdelijk per maand | `vergoedingen.ts` |
| Gewestelijke barema's | bij indexatie, verschillend per gewest | `gewesten.ts` |

## Licentie

Alle rechten voorbehouden. De webapplicatie is gratis te gebruiken, maar de broncode staat niet
onder een opensourcelicentie: hergebruik, verspreiding of afgeleide werken zijn niet toegestaan
zonder schriftelijke toestemming van de auteur.
