import type { Referentiewagen } from "./fiscaal/regimes";

/**
 * De opbouw van /fiscaal-kader, los van de opmaak.
 *
 * Deze lijsten staan hier en niet in de pagina zelf om dezelfde reden als bij
 * `startpagina.ts`: de pagina stelt haar vertaalsleutels samen uit een basis plus
 * een achtervoegsel, en zulke sleutels zijn met geen enkele zoekactie in de
 * broncode terug te vinden. Ontbreekt er één in het Frans, dan valt dat pas op
 * wanneer iemand de Franse pagina opent, en dan met een harde fout.
 *
 * Doordat de lijsten hier staan, kan `fiscaalKaderIndeling.test.ts` voor elke
 * sleutel in elke taal nakijken of hij bestaat.
 */

export interface Sectie {
  /** Anker in de URL. Blijft stabiel: er wordt vanaf de startpagina naar gelinkt. */
  id: string;
  /** Basis van de vertaalsleutels: `${sleutel}Titel` en `${sleutel}Tekst`. */
  sleutel: string;
}

/**
 * De elf secties, in leesorde. De vorige versie had er vier, en die begon
 * meteen met de aftrekbaarheid. Wat ontbrak, was juist de vraag die een lezer
 * eerst stelt: onder welk regime valt mijn wagen, en wat betekent "gebruiksjaar".
 */
export const SECTIES: readonly Sectie[] = [
  { id: "fk-lezen", sleutel: "lezen" },
  { id: "fk-regime", sleutel: "regime" },
  { id: "fk-aftrek", sleutel: "aftrek" },
  { id: "fk-kosten", sleutel: "kosten" },
  { id: "fk-hybride", sleutel: "hybride" },
  { id: "fk-vaa", sleutel: "vaa" },
  { id: "fk-vu", sleutel: "vu" },
  { id: "fk-co2", sleutel: "co2" },
  { id: "fk-tco", sleutel: "tco" },
  { id: "fk-buiten", sleutel: "buiten" },
  { id: "fk-bronnen", sleutel: "bronnen" },
];

/** De drie assen uit de eerste sectie: `${sleutel}Titel` en `Tekst`. */
export const ASSEN: readonly string[] = ["asBesteldatum", "asAandrijving", "asGebruiksjaar"];

/** De drie factoren van het voordeel alle aard: `${sleutel}Titel` en `Tekst`. */
export const VAA_FACTOREN: readonly string[] = ["vaaCatalogus", "vaaCo2", "vaaLeeftijd"];

/** De brandstoffen waarvoor de gramformule haar drempels toont. */
export const GRAMBRANDSTOFFEN = ["diesel", "benzine", "cng"] as const;

/**
 * De gebruiksjaren in de aftrekmatrix. 2025 tot 2028 is het venster waarin de
 * uitdoofkalender zijn vier trappen doorloopt; buiten dat venster staat er niets
 * meer te gebeuren.
 */
export const MATRIXJAREN: readonly number[] = [2025, 2026, 2027, 2028];

/**
 * De wagens in de aftrekmatrix. Elke rij bestaat om één misvatting te weerleggen
 * die in de oude tabel op deze pagina stond.
 */
export const MATRIXWAGENS: readonly Referentiewagen[] = [
  // De oude tabel gaf één rij "Diesel / benzine: CO₂-formule, in uitdoof". Dat
  // klopt alleen voor deze bestelperiode, en levenslang in plaats van dalend.
  { sleutel: "dieselOud", aandrijving: "fossiel", co2: 135, besteldatum: "2023-03-01" },
  // Hier zit de kern: de kalender zegt 75% in 2025, de formule zegt 52,5%, en de
  // laagste van de twee geldt. De oude kaart toonde alleen die 75%.
  { sleutel: "diesel", aandrijving: "fossiel", co2: 135, besteldatum: "2024-03-01" },
  // Benzine en niet een plug-inhybride: een PHEV van 120 g/km is een valse
  // hybride, en dan zakt de aftrek naar nul om een heel andere reden. Die les
  // hoort in de sectie over valse hybrides en zou hier alleen verwarren.
  {
    sleutel: "benzine",
    aandrijving: "fossiel",
    brandstof: "benzine",
    co2: 120,
    besteldatum: "2024-03-01",
  },
  // Hoge uitstoot: 40% is een plafond, geen bodem. Zodra de ondergrens van 50%
  // wegvalt, blijft er niets over.
  { sleutel: "dieselHoog", aandrijving: "fossiel", co2: 250, besteldatum: "2024-03-01" },
  { sleutel: "onbekend", aandrijving: "fossiel", co2: null, besteldatum: "2024-03-01" },
  // De twee die de oude kaart als "0% of 100%" samenvatte.
  { sleutel: "bev", aandrijving: "BEV", co2: 0, besteldatum: "2026-01-15" },
  { sleutel: "diesel2026", aandrijving: "fossiel", co2: 135, besteldatum: "2026-01-15" },
];

/** De plug-inhybride waarop de kostensoorten uiteenlopen. */
export const KOSTENWAGEN: Referentiewagen = {
  sleutel: "phev",
  aandrijving: "PHEV",
  co2: 38,
  besteldatum: "2024-05-01",
};

/** De kostensoorten met elk hun eigen aftrekregime: `${sleutel}Titel` en `Tekst`. */
export const KOSTENSOORTEN: readonly string[] = [
  "kostWagen",
  "kostLaadstroom",
  "kostBrandstof",
  "kostIntrest",
  "kostBoetes",
];

/** Wat deze pagina bewust niet behandelt: `${sleutel}Titel` en `Tekst`. */
export const BUITEN: readonly string[] = [
  "buitenGewest",
  "buitenLez",
  "buitenVignet",
  "buitenMobiliteit",
  "buitenJaren",
  "buitenAdvies",
];

/** De drie zekerheidsniveaus uit bronnen.ts: `${sleutel}Titel` en `Tekst`. */
export const ZEKERHEDEN: readonly string[] = [
  "zekerBevestigd",
  "zekerTeVerifieren",
  "zekerVoorlopig",
];

/** Elke vertaalsleutel die de pagina samenstelt, uitgeschreven. */
export function samengesteldeSleutels(): string[] {
  return [
    ...SECTIES.flatMap((s) => [`${s.sleutel}Titel`, `${s.sleutel}Tekst`]),
    ...ASSEN.flatMap((a) => [`${a}Titel`, `${a}Tekst`]),
    ...VAA_FACTOREN.flatMap((v) => [`${v}Titel`, `${v}Tekst`]),
    ...KOSTENSOORTEN.flatMap((k) => [`${k}Titel`, `${k}Tekst`]),
    ...BUITEN.flatMap((b) => [`${b}Titel`, `${b}Tekst`]),
    ...ZEKERHEDEN.flatMap((z) => [`${z}Titel`, `${z}Tekst`]),
    ...MATRIXWAGENS.map((w) => `wagen_${w.sleutel}`),
    `wagen_${KOSTENWAGEN.sleutel}`,
    ...GRAMBRANDSTOFFEN.map((b) => `brandstof_${b}`),
  ];
}
