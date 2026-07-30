import { EURONORMEN } from "./types";
import type { Bron } from "./bronnen";
import type { Euronorm, Voertuigtype } from "./types";

/**
 * Het wegenvignet vanaf 1 mei 2027.
 *
 * Alles in dit bestand is voorlopig. De regeling zelf is aangekondigd, de
 * tarieven circuleren maar zijn door de gewesten niet bevestigd, en of het
 * vignet voor een personenwagen fiscaal aftrekbaar is, is niet uitgeklaard.
 *
 * Dat is precies de reden dat het hier apart staat in plaats van in de
 * rekenkern. Een tarief dat later met tien procent verschuift, mag geen stille
 * fout in een vierjarige projectie worden. Elke functie hier geeft de zekerheid
 * mee terug, en de interface hoort dat als zodanig te tonen.
 */

export const WEGENVIGNET_VANAF = "2027-05-01";
export const WEGENVIGNET_VERKOOP_VANAF = "2027-03-01";

export const BRON_WEGENVIGNET: Bron = {
  wet: "Aangekondigd wegenvignet vanaf 1/5/2027; tarieven uitgelekt, niet bevestigd door de gewesten",
  zekerheid: "voorlopig",
};

export type Vignetduur = "dag" | "tiendagen" | "maand" | "tweeMaanden" | "jaar";

/**
 * De drie tariefcategorieën. Welke geldt, hangt af van euronorm en uitstoot.
 * Een streepje betekent dat die duur voor die categorie niet werd genoemd.
 */
export interface Vignettarief {
  categorie: "hoog" | "schoon" | "elektrisch";
  tarieven: Partial<Record<Vignetduur, number>>;
}

export const WEGENVIGNET_TARIEVEN: Vignettarief[] = [
  {
    categorie: "hoog",
    tarieven: { dag: 11.25, tiendagen: 15, maand: 23.75, tweeMaanden: 37.5, jaar: 125 },
  },
  {
    categorie: "schoon",
    tarieven: { dag: 9, tiendagen: 12, maand: 19, tweeMaanden: 30, jaar: 100 },
  },
  { categorie: "elektrisch", tarieven: { dag: 8.1, jaar: 90 } },
];

/** Boetes bij een eerste, tweede en derde vaststelling. */
export const WEGENVIGNET_BOETES = [70, 140, 210];

/** Voertuigen die geen vignet nodig hebben. */
export const WEGENVIGNET_VRIJSTELLINGEN = [
  "Motorfietsen",
  "Autocars",
  "Tractoren",
  "Voertuigen van personen met een handicap",
  "Hulpdiensten",
];

export interface VignetResultaat {
  categorie: Vignettarief["categorie"];
  duur: Vignetduur;
  bedrag: number | null;
  zekerheid: "voorlopig";
  bronnen: Bron[];
  toelichting: string[];
}

/**
 * Het tarief voor een voertuig en een duur. De categorie volgt uit de
 * aandrijving en de euronorm: elektrisch apart, Euro 4 en later het lagere
 * tarief, daaronder het hogere.
 */
export function vignettarief(
  voertuig: { voertuigtype: Voertuigtype; euronorm?: Euronorm | null },
  duur: Vignetduur,
): VignetResultaat {
  const categorie: Vignettarief["categorie"] =
    voertuig.voertuigtype === "BEV"
      ? "elektrisch"
      : voertuig.euronorm && EURONORMEN.indexOf(voertuig.euronorm) >= EURONORMEN.indexOf("euro4")
        ? "schoon"
        : "hoog";

  const rij = WEGENVIGNET_TARIEVEN.find((t) => t.categorie === categorie);
  const bedrag = rij?.tarieven[duur] ?? null;

  return {
    categorie,
    duur,
    bedrag,
    zekerheid: "voorlopig",
    bronnen: [BRON_WEGENVIGNET],
    toelichting: [
      bedrag === null
        ? `Voor de categorie ${categorie} werd geen tarief voor de duur ${duur} bekendgemaakt.`
        : `Uitgelekt tarief: € ${bedrag.toFixed(2)}.`,
      "Deze tarieven zijn niet definitief. Reken er geen budget op vast voordat de gewesten ze bevestigd hebben.",
      voertuig.euronorm
        ? `Categorie bepaald op euronorm ${voertuig.euronorm}.`
        : "Zonder euronorm wordt het hoogste tarief verondersteld.",
    ],
  };
}

/**
 * Of het wegenvignet als autokost aftrekbaar is.
 *
 * Voor beroepsmatige lichte vracht is dat bevestigd. Voor een personenwagen zou
 * het onder de autokosten vallen en dus de gramformule of het EV-percentage
 * volgen, maar dat is niet bevestigd. Deze functie geeft die onzekerheid terug
 * in plaats van ze weg te rekenen.
 */
export function vignetAftrekbaarheid(isLichteVracht: boolean): {
  volgtAftrekbeperking: boolean;
  zekerheid: "bevestigd" | "voorlopig";
  toelichting: string;
} {
  if (isLichteVracht) {
    return {
      volgtAftrekbeperking: false,
      zekerheid: "bevestigd",
      toelichting:
        "Voor beroepsmatig gebruikte lichte vracht is de aftrekbaarheid bevestigd; de aftrekbeperking voor personenwagens speelt niet.",
    };
  }
  return {
    volgtAftrekbeperking: true,
    zekerheid: "voorlopig",
    toelichting:
      "Voor een personenwagen zou het vignet als autokost de aftrekbeperking volgen, maar dat is niet bevestigd.",
  };
}
