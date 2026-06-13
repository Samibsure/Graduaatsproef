const tabel1 = [
  ["BEV", "vóór 1/1/2027", "100%", "100%", "100%", "100%", "100%", "100%"],
  ["BEV", "2027", "–", "–", "95%", "95%", "95%", "95% → 67,5%"],
  ["BEV", "2028", "–", "–", "–", "90%", "90%", "90% → 67,5%"],
  ["PHEV", "2023-2025", "75%", "50%", "25%", "0%", "0%", "0%"],
  ["PHEV", "vanaf 1/1/2026", "–", "0%", "0%", "0%", "0%", "0%"],
  ["Diesel/benzine", "2023-2025", "75% (gram)", "50%", "25%", "0%", "0%", "0%"],
  ["Diesel/benzine", "vanaf 1/1/2026", "–", "0%", "0%", "0%", "0%", "0%"],
];

const tabel2 = [
  ["Referentie-CO₂ benzine, LPG, CNG", "70 g/km", "Hoger dan 70 = hoger %"],
  ["Referentie-CO₂ diesel", "58 g/km", "Strenger dan benzine"],
  ["Minimum CO₂-percentage", "4%", "Geldt voor BEV"],
  ["Maximum CO₂-percentage", "18%", "Hoge uitstoot"],
  ["Minimum VAA per jaar", "€ 1.690", "Was € 1.650 in 2025"],
  ["Vrijstelling woon-werk", "€ 500", "Per jaar"],
  ["Leeftijdscorrectie", "100% tot 94%", "− 6% per jaar, min 70%"],
];

const tabel3 = [
  ["Indexatiecoëfficiënt", "1,6291", "+2,8% t.o.v. 2025"],
  ["Multiplicator wagens besteld 1/7/2023 – 31/12/2026", "4", "Ongewijzigd"],
  ["Multiplicator wagens besteld vanaf 1/1/2027", "5,5", "+ 37,5%"],
  ["Multiplicator wagens besteld vanaf 1/1/2028", "6", "+ 50% t.o.v. 2026"],
  ["Minimumbijdrage BEV en lage-uitstoot PHEV", "€ 42,34 / maand", "€ 508,08 / jaar"],
];

const overgangsregels = [
  {
    periode: "Vóór 1 juli 2023",
    regels:
      "Aftrek op basis van de gramformule: 120% − (0,5% × coëfficiënt × CO₂), met een resultaat tussen 50% en 100%. Coëfficiënt: 1 voor diesel, 0,95 voor benzine, LPG en elektrisch, 0,9 voor CNG. RSZ-multiplicator: 1.",
  },
  {
    periode: "1 juli 2023 – 31 december 2025",
    regels:
      "De gramformule blijft maar plafonneert op 100% in 2025; daarna treedt de uitdoofkalender in werking (75% → 50% → 25% → 0% voor fossiel en PHEV). RSZ-multiplicator: 4.",
  },
  {
    periode: "1 januari 2026 – 31 december 2026",
    regels:
      "Fossiele wagens en PHEV: 0% aftrek vanaf het eerste gebruiksjaar. BEV behoudt 100% voor de hele gebruiksduur. RSZ-multiplicator: 4.",
  },
  {
    periode: "Vanaf 1 januari 2027",
    regels:
      "BEV start in het afbouwpad: 95% (2027), 90% (2028), 82,5% (2029), 75% (2030), 67,5% (2031). RSZ-multiplicator stijgt naar 5,5 in 2027 en 6 vanaf 2028.",
  },
];

const checklist = [
  "Welke wagen wordt vervangen? Bestelmoment, type, kilometerstand, jaarlijkse autokosten van de huidige wagen.",
  "Wat is het gewenste vervangmoment? 2026, 2027 of later? Wat zijn de operationele beperkingen?",
  "Welke kandidaten worden vergeleken? Minstens één BEV, eventueel één PHEV, eventueel één fossiel. Cataloguswaarde, CO₂, geschatte jaarlijkse autokosten.",
  "Wat is het verwachte kilometerprofiel? Stadsritten, autosnelweg, buitenland?",
  "Is er thuislaadinfrastructuur bij de werknemer? Indien neen, is installatie mogelijk?",
  "Welke laadkaarten of tankkaarten worden voorzien?",
  "Is de score in de matrix berekend? Welke kandidaat wint? Met welke marge?",
  "Is er een operationele reden om af te wijken van de hoogste score? Welke?",
  "Wat is de besluitvorming? Wie tekent? Tegen welke datum wordt besteld?",
];

export default function FiscaalKaderPagina() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold">Het fiscale kader voor autokosten</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">
          Samenvatting van de vier bouwstenen uit het rapport: de aftrekbaarheid in
          vennootschapsbelasting (art. 198bis WIB ’92), het voordeel van alle aard (art. 36 WIB
          ’92), de RSZ-solidariteitsbijdrage en de verworpen uitgaven (art. 198 WIB ’92).
        </p>
      </div>

      <Kader titel="Tabel 1 · Aftrekbaarheidskalender per voertuigtype en aankoopjaar (2025-2031)">
        <table className="w-full text-sm">
          <thead className="border-y border-line bg-paper text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {["Voertuigtype", "Bestelmoment", "2025", "2026", "2027", "2028", "2029", "2030+"].map(
                (h) => (
                  <th key={h} className="px-4 py-2.5">
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tabel1.map((rij) => (
              <tr key={`${rij[0]}-${rij[1]}`}>
                {rij.map((cel, i) => (
                  <td key={i} className={`px-4 py-2 ${i < 2 ? "font-medium" : ""}`}>
                    {cel}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <Bron tekst="FOD Financiën (2025), Wet 25 november 2021, eigen verwerking." />
      </Kader>

      <Kader titel="Tabel 2 · Berekening van het voordeel van alle aard (VAA), parameters 2026">
        <Formule tekst="VAA = cataloguswaarde × 6/7 × leeftijdscorrectie × CO₂-percentage" />
        <p className="px-4 pb-2 text-sm text-slate-600">
          Het CO₂-percentage start op 5,5% bij de referentie-CO₂ en stijgt met 0,1% per gram extra.
          Voor een BEV geldt het minimum van 4%; voor een diesel met 135 g/km loopt het op tot
          13,2%.
        </p>
        <DrieKolommen rijen={tabel2} koppen={["Parameter", "Waarde 2026", "Toelichting"]} />
        <Bron tekst="Moore (2026), FOD Financiën (2025)." />
      </Kader>

      <Kader titel="Tabel 3 · CO₂-solidariteitsbijdrage 2026">
        <Formule tekst="Maandelijkse bijdrage = ((CO₂ × 9 − 600) / 12) × indexcoëfficiënt × multiplicator, met vloerbedrag voor lage-uitstootwagens" />
        <DrieKolommen rijen={tabel3} koppen={["Parameter", "Waarde 2026", "Wijziging"]} />
        <Bron tekst="Securex (2025), RSZ (2025), Wet 25 november 2021." />
      </Kader>

      <Kader titel="Verworpen uitgaven · rekenvoorbeeld uit het rapport">
        <Formule tekst="Verworpen uitgaven = (1 − aftrek%) × autokosten + (17% zonder / 40% met tank- of laadkaart) × VAA" />
        <div className="space-y-2 px-4 pb-4 text-sm text-slate-600">
          <p>
            Stel: een werknemer rijdt een diesel met cataloguswaarde € 38.000 en 135 g/km CO₂. De
            jaarlijkse autokosten bedragen € 10.000, de aftrekbaarheid in 2026 is 50%
            (uitdoofkalender) en er is een tankkaart.
          </p>
          <p className="rounded-lg bg-paper px-3 py-2 font-mono text-xs">
            VU = (1 − 0,50) × 10.000 + 0,40 × VAA → het niet-aftrekbare deel (€ 5.000) plus 40% van
            het voordeel van alle aard wordt bij de belastbare grondslag gevoegd.
          </p>
          <p>
            Bij een vennootschapsbelastingtarief van 25% betekent elke euro verworpen uitgave € 0,25
            extra belasting: winst die niet verlaagd wordt en dus volledig belast blijft.
          </p>
        </div>
      </Kader>

      <Kader titel="Overgangsregels per bestelperiode (Bijlage 3)">
        <ul className="space-y-3 px-4 pb-4">
          {overgangsregels.map((o) => (
            <li key={o.periode} className="text-sm">
              <p className="font-semibold text-ink">{o.periode}</p>
              <p className="mt-0.5 text-slate-600">{o.regels}</p>
            </li>
          ))}
        </ul>
        <p className="px-4 pb-4 text-sm font-medium text-amber-700">
          Belangrijk: voor de aftrekbaarheid telt de besteldatum, niet de leverdatum. Een BEV
          besteld in december 2026 en geleverd in 2027 behoudt levenslang 100% aftrek (BDO, 2026).
        </p>
      </Kader>

      <Kader titel="Checklist directiegesprek bij vlootbeslissing (Bijlage 2)">
        <ol className="list-decimal space-y-2 px-9 pb-4 text-sm text-slate-600">
          {checklist.map((vraag) => (
            <li key={vraag}>{vraag}</li>
          ))}
        </ol>
      </Kader>
    </div>
  );
}

function Kader({ titel, children }: { titel: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-line bg-white">
      <h2 className="px-4 pb-3 pt-4 font-semibold">{titel}</h2>
      {children}
    </section>
  );
}

function Formule({ tekst }: { tekst: string }) {
  return (
    <p className="mx-4 mb-3 rounded-lg bg-gold/10 px-3 py-2 text-sm font-medium text-ink">
      {tekst}
    </p>
  );
}

function Bron({ tekst }: { tekst: string }) {
  return <p className="px-4 py-3 text-xs text-slate-400">Bron: {tekst}</p>;
}

function DrieKolommen({ rijen, koppen }: { rijen: string[][]; koppen: string[] }) {
  return (
    <table className="w-full text-sm">
      <thead className="border-y border-line bg-paper text-left text-xs uppercase tracking-wide text-slate-500">
        <tr>
          {koppen.map((h) => (
            <th key={h} className="px-4 py-2.5">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {rijen.map((rij) => (
          <tr key={rij[0]}>
            <td className="px-4 py-2 font-medium">{rij[0]}</td>
            <td className="px-4 py-2">{rij[1]}</td>
            <td className="px-4 py-2 text-slate-500">{rij[2]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
