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
  ]
    .map((v) => v.replace(/\|/g, "/"))
    .join(" | ");
}

export function catalogusMarkdown(): string {
  const perType = ["BEV", "PHEV", "HEV", "fossiel"] as const;
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
  regels.push("| Aandrijving | Aantal |");
  regels.push("| --- | ---: |");
  for (const type of perType) {
    const n = DEFAULT_CATALOGUS.filter((c) => c.voertuigtype === type).length;
    regels.push(`| ${TYPE_LABEL[type]} | ${n} |`);
  }
  regels.push(`| **Totaal** | **${DEFAULT_CATALOGUS.length}** |`);
  regels.push("");

  const kop =
    "| Merk | Model | Modeljaar | Segment | CO₂ | Verbruik/100 km | Actieradius | Vermogen | Koffer | Trekgewicht | Cataloguswaarde |";
  const lijn = "| --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |";

  for (const type of perType) {
    const groep = DEFAULT_CATALOGUS.filter((c) => c.voertuigtype === type);
    if (groep.length === 0) continue;
    regels.push(`## ${TYPE_LABEL[type]} (${groep.length})`);
    regels.push("");
    regels.push(kop, lijn);
    for (const c of groep) regels.push(`| ${rij(c)} |`);
    regels.push("");
  }

  regels.push("## Bron");
  regels.push("");
  regels.push(
    "Fabrikantopgave WLTP en Belgische prijslijsten. Per rij staat het modeljaar vermeld, zodat een",
    "cijfer na te kijken valt tegen de juiste versie van het model.",
  );
  regels.push("");

  return regels.join("\n");
}
