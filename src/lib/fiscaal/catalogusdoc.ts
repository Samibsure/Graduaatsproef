import { DEFAULT_CATALOGUS } from "./catalogusdata";
import type { CatalogCar } from "./types";

/**
 * Zet de ingebouwde catalogus om naar een leesbare lijst.
 *
 * Deze functie bestaat zodat `docs/catalogus.md` geen tweede, met de hand
 * bijgehouden waarheid is. Het document wordt uit dezelfde data gegenereerd en
 * een snapshot-test bewaakt dat het niet uit de pas loopt: wijzigt er een
 * cijfer in catalogusdata.ts zonder dat het document mee wijzigt, dan faalt de
 * test in plaats van dat er stilletjes een verouderde lijst blijft staan.
 */

const TYPE_LABEL: Record<string, string> = {
  BEV: "Elektrisch",
  PHEV: "Plug-in hybride",
  HEV: "Hybride",
  fossiel: "Verbranding",
};

function getal(n: number | null | undefined, eenheid = ""): string {
  if (n === null || n === undefined) return "–";
  return `${n.toLocaleString("nl-BE")}${eenheid}`;
}

function euro(n: number): string {
  return `€ ${n.toLocaleString("nl-BE")}`;
}

function rij(c: CatalogCar): string {
  const naam = c.uitvoering ? `${c.model} ${c.uitvoering}` : c.model;
  const verbruikEenheid = c.voertuigtype === "BEV" ? " kWh" : " l";
  return [
    c.zekerheid === "geverifieerd" ? "✔" : "~",
    c.merk,
    naam,
    String(c.modeljaar ?? "–"),
    c.segment ?? "–",
    `${c.co2} g`,
    getal(c.verbruik, verbruikEenheid),
    getal(c.actieradius_km, " km"),
    getal(c.vermogen_kw, " kW"),
    getal(c.koffer_liter, " l"),
    getal(c.trekgewicht_kg, " kg"),
    euro(c.cataloguswaarde),
    `${c.restwaarde_pct_4j ?? "–"}%`,
  ]
    .map((v) => v.replace(/\|/g, "/"))
    .join(" | ");
}

export function catalogusMarkdown(): string {
  const perType = ["BEV", "PHEV", "HEV", "fossiel"] as const;
  const verifieerd = DEFAULT_CATALOGUS.filter((c) => c.zekerheid === "geverifieerd");
  const regels: string[] = [];

  regels.push("# Wagencatalogus");
  regels.push("");
  regels.push(
    "Deze lijst wordt gegenereerd uit `src/lib/fiscaal/catalogusdata.ts`. Bewerk dat bestand,",
    "niet dit document: `npm test` vergelijkt beide en faalt wanneer ze uit elkaar lopen.",
  );
  regels.push("");
  regels.push("## Wat vaststaat en wat berekend wordt");
  regels.push("");
  regels.push(
    "De kolommen hieronder zijn **opgezochte** gegevens per model en modeljaar: cataloguswaarde,",
    "CO₂ (WLTP), verbruik, actieradius, vermogen, koffervolume en trekgewicht. Ze komen uit publieke",
    "fabrikants- en WLTP-gegevens voor de Belgische markt en zijn richtinggevend, niet contractueel:",
    "uitrusting, opties en bandenmaat verschuiven zowel de cataloguswaarde als de CO₂, en prijzen",
    "wijzigen. Controleer voor een echte beslissing altijd de offerte.",
  );
  regels.push("");
  regels.push(
    "Alles wat daaruit **volgt**, rekent de applicatie zelf uit: energie, onderhoud, verzekering,",
    "verkeersbelasting en afschrijving, en daarbovenop het voordeel van alle aard, de verworpen",
    "uitgaven, de CO₂-solidariteitsbijdrage en de totale kost. Er staat nergens een ingetypte kostprijs.",
  );
  regels.push("");
  regels.push("## Geverifieerd (✔) of raming (~)");
  regels.push("");
  regels.push(
    "De eerste kolom zegt of de **fiscaal beslissende** velden van een rij tegen een genoemde bron",
    "gelegd zijn: de cataloguswaarde bij een elektrische wagen (de CO₂ is daar per definitie 0) en de",
    "CO₂ bij een plug-in hybride. Die twee bepalen het voordeel van alle aard, de verworpen uitgaven",
    "en de CO₂-solidariteitsbijdrage.",
  );
  regels.push("");
  regels.push(
    `Van de ${DEFAULT_CATALOGUS.length} rijen zijn er ${verifieerd.length} geverifieerd. De rest is een raming: een plausibel`,
    "fabrikantscijfer dat niemand nagekeken heeft. Zulke cijfers hebben de goede orde van grootte,",
    "maar horen niet als vaststaand op het scherm te komen — en daarom toont de catalogus in de app",
    "standaard alleen de geverifieerde modellen, met een schakelaar om de ramingen erbij te zetten.",
  );
  regels.push("");
  regels.push(
    "Ze blijven wél in de dataset staan in plaats van geschrapt te worden: promoveren is dan één bron",
    "per regel in plaats van alle cijfers opnieuw opzoeken. Waar een bron een vork geeft, staat de",
    "**hoogste** waarde in de data. Wie zich vergist, hoort zich naar de veilige kant te vergissen:",
    "een hoger CO₂-cijfer betekent een hoger VAA, een hogere bijdrage en een grotere kans dat de",
    "valse-hybridetoets kantelt.",
  );
  regels.push("");
  regels.push("## Restwaarde");
  regels.push("");
  regels.push(
    "De laatste kolom is de verwachte restwaarde na vier jaar, en die is **niet** per model bepaald.",
    "Ze bestaat niet als publiek erkend Belgisch cijfer: Autovista en Eurotax publiceren op 36 maanden",
    "en 60.000 km, op modelniveau achter een betaalmuur. De app rekent daarom met ranges per",
    "aandrijftype (JD Power/Autovista24, Duitse markt, november 2025): hybride 49,8%, benzine 49,2%,",
    "diesel 48%, plug-in 45,1% en elektrisch 37,6% na 36 maanden, meetkundig doorgerekend naar 48",
    "maanden. Elke restwaarde hieronder is dus een schatting, en de rangorde is wat de bron robuust",
    "noemt: hybride ≈ benzine ≈ diesel > plug-in > elektrisch.",
  );
  regels.push("");
  regels.push("## Wat er bewust niet in staat");
  regels.push("");
  regels.push(
    "Lichte vracht. Een bestelwagen die als lichte vracht is ingeschreven, valt buiten de",
    "aftrekbeperking van artikel 66 WIB92. De rekenkern kent die uitzondering nog niet en zou er dus",
    "een aftrekpercentage op plakken dat niet geldt. Zolang dat zo is, hoort een bestelwagen niet in",
    "deze lijst.",
  );
  regels.push("");
  regels.push("## Overzicht");
  regels.push("");
  regels.push("| Aandrijving | Aantal | Waarvan geverifieerd |");
  regels.push("| --- | ---: | ---: |");
  for (const type of perType) {
    const groep = DEFAULT_CATALOGUS.filter((c) => c.voertuigtype === type);
    const n = groep.filter((c) => c.zekerheid === "geverifieerd").length;
    regels.push(`| ${TYPE_LABEL[type]} | ${groep.length} | ${n} |`);
  }
  regels.push(`| **Totaal** | **${DEFAULT_CATALOGUS.length}** | **${verifieerd.length}** |`);
  regels.push("");

  const kop =
    "| ✔ | Merk | Model | Modeljaar | Segment | CO₂ | Verbruik/100 km | Actieradius | Vermogen | Koffer | Trekgewicht | Cataloguswaarde | Restwaarde 4j |";
  const lijn =
    "| :-: | --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |";

  for (const type of perType) {
    const groep = DEFAULT_CATALOGUS.filter((c) => c.voertuigtype === type);
    if (groep.length === 0) continue;
    regels.push(`## ${TYPE_LABEL[type]} (${groep.length})`);
    regels.push("");
    regels.push(kop, lijn);
    for (const c of groep) regels.push(`| ${rij(c)} |`);
    regels.push("");
  }

  regels.push("## Bronnen per geverifieerd model");
  regels.push("");
  regels.push(
    "Voor de ramingen geldt: fabrikantopgave WLTP en Belgische prijslijsten, niet nagekeken. Per rij",
    "staat het modeljaar vermeld, zodat een cijfer na te kijken valt tegen de juiste versie van het",
    "model. Hieronder staat per geverifieerd model waar de cijfers vandaan komen.",
  );
  regels.push("");
  regels.push("| Model | Bron |");
  regels.push("| --- | --- |");
  for (const c of verifieerd) {
    const naam = `${c.merk} ${c.uitvoering ? `${c.model} ${c.uitvoering}` : c.model}`;
    regels.push(`| ${naam} | ${(c.bron ?? "–").replace(/\|/g, "/")} |`);
  }
  regels.push("");

  return regels.join("\n");
}
