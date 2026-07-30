import { START_HIER_HREF } from "./navigatie";

/**
 * De opbouw van de startpagina, los van de opmaak.
 *
 * Deze lijsten staan hier en niet in de pagina zelf om één reden: de pagina
 * stelt haar vertaalsleutels samen (`t(`${sleutel}Titel`)`), en zulke sleutels
 * zijn met geen enkele zoekactie in de broncode terug te vinden. Ontbreekt er
 * één in het Frans, dan valt dat pas op wanneer iemand de Franse startpagina
 * opent, en dan met een harde fout.
 *
 * Doordat de lijsten hier staan, kan `startpagina.test.ts` voor elke sleutel in
 * elke taal nakijken of hij bestaat.
 */

export interface Onderdeel {
  href: string;
  icoon: string;
  /** Basis van de vertaalsleutels: `${sleutel}Titel`, `Tekst` en `Link`. */
  sleutel: string;
}

/** De zes onderdelen van de applicatie. Elke kaart is zelf de link. */
export const ONDERDELEN: readonly Onderdeel[] = [
  { href: START_HIER_HREF, icoon: "calculator", sleutel: "featSimulator" },
  { href: "/catalogus", icoon: "layout-grid", sleutel: "featCatalogus" },
  { href: "/vergelijking", icoon: "scale", sleutel: "featVergelijking" },
  { href: "/vloot", icoon: "bar-chart-3", sleutel: "featVloot" },
  { href: "/modellen", icoon: "upload", sleutel: "featModellen" },
  { href: "/parameters", icoon: "file-text", sleutel: "featKader" },
];

/** De fiscale posten die de rekenkern doorrekent: `${sleutel}Titel` en `Tekst`. */
export const POSTEN: readonly string[] = [
  "rekenAftrek",
  "rekenVaa",
  "rekenVu",
  "rekenRsz",
  "rekenBtw",
  "rekenGewest",
  "rekenLaden",
  "rekenHybride",
];

/** De omslag naar elektrisch: `${sleutel}Periode`, `Waarde` en `Tekst`. */
export const OMSLAG: readonly string[] = [
  "omslagOud",
  "omslagOvergang",
  "omslag2026",
  "omslagAfbouw",
];

/** De veelgestelde vragen: `${sleutel}Vraag` en `Antwoord`. */
export const VRAGEN: readonly string[] = [
  "vraagGratis",
  "vraagAccount",
  "vraagCijfers",
  "vraagAdvies",
  "vraagGegevens",
];

/** Elke vertaalsleutel die de startpagina samenstelt, uitgeschreven. */
export function samengesteldeSleutels(): string[] {
  return [
    ...ONDERDELEN.flatMap((o) => [`${o.sleutel}Titel`, `${o.sleutel}Tekst`, `${o.sleutel}Link`]),
    ...POSTEN.flatMap((p) => [`${p}Titel`, `${p}Tekst`]),
    ...OMSLAG.flatMap((o) => [`${o}Periode`, `${o}Waarde`, `${o}Tekst`]),
    ...VRAGEN.flatMap((v) => [`${v}Vraag`, `${v}Antwoord`]),
  ];
}
