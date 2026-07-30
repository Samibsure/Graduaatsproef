import type { Bron, GemarkeerdBedrag } from "./bronnen";
import type { Gewest } from "./types";

/**
 * Laadinfrastructuur: de verhoogde kostenaftrek, de investeringsaftrek en het
 * belastingvrije maximum voor thuisladen.
 *
 * Drie regelingen die vaak door elkaar gehaald worden, en die elkaar op één punt
 * uitsluiten: de verhoogde kostenaftrek op een publiek toegankelijke laadpaal is
 * niet te combineren met de investeringsaftrek op dezelfde investering. Wie dat
 * toch doet, verliest bij een controle de duurste van de twee.
 */

/* ------------------------------------------------------------------ *
 * Verhoogde kostenaftrek op een publiek toegankelijke laadpaal
 * ------------------------------------------------------------------ */

interface Aftrekperiode {
  van: string;
  tot: string | null;
  pct: number;
}

/**
 * De verhoogde kostenaftrek liep af in twee stappen en is sinds september 2024
 * een gewone aftrek van 100%. Vanaf 2030 zakt ze onder de honderd procent.
 */
export const LAADPAAL_KOSTENAFTREK: Aftrekperiode[] = [
  { van: "2021-09-01", tot: "2023-03-31", pct: 200 },
  { van: "2023-04-01", tot: "2024-08-31", pct: 150 },
  { van: "2024-09-01", tot: "2029-12-31", pct: 100 },
  { van: "2030-01-01", tot: null, pct: 75 },
];

/** De voorwaarden voor de verhoogde aftrek van 200% of 150%. */
export const LAADPAAL_VOORWAARDEN = [
  "De laadpaal is nieuw.",
  "Hij is publiek toegankelijk, minstens tijdens of buiten de openingsuren, en elke derde mag er laden.",
  "Hij is slim: laadtijd en vermogen worden geregistreerd bij een centraal beheersysteem.",
  "Hij wordt over minstens vijf jaar afgeschreven.",
];

export interface LaadpaalAftrek extends GemarkeerdBedrag {
  /** Het aftrekpercentage zelf, los van het bedrag. */
  pct: number;
  /** Gelden er bijkomende voorwaarden voor dit percentage? */
  voorwaarden: string[];
}

const BRON_LAADPAAL: Bron = {
  wet: "Wet 25/11/2021 (verhoogde kostenaftrek laadinfrastructuur)",
  zekerheid: "bevestigd",
};

/**
 * Het aftrekpercentage voor een laadpaal, en het bedrag dat daaruit volgt.
 * De investeringsdatum beslist; de datum van ingebruikname doet er niet toe.
 */
export function laadpaalKostenaftrek(
  investeringsdatum: string,
  bedrag = 0,
): LaadpaalAftrek {
  const periode = LAADPAAL_KOSTENAFTREK.find(
    (p) => investeringsdatum >= p.van && (p.tot === null || investeringsdatum <= p.tot),
  );
  // Vóór september 2021 bestond de regeling niet; dan geldt de gewone aftrek.
  const pct = periode?.pct ?? 100;
  const verhoogd = pct > 100;

  return {
    pct,
    bedrag: bedrag * (pct / 100),
    zekerheid: "bevestigd",
    bronnen: [BRON_LAADPAAL],
    voorwaarden: verhoogd ? LAADPAAL_VOORWAARDEN : [],
    toelichting: [
      `Investering op ${investeringsdatum}: ${pct}% kostenaftrek.`,
      verhoogd
        ? "De verhoogde aftrek geldt enkel voor een nieuwe, publiek toegankelijke en slimme laadpaal, afgeschreven over minstens vijf jaar."
        : "Gewone kostenaftrek; de bijzondere voorwaarden voor de verhoogde aftrek spelen niet.",
    ],
  };
}

/* ------------------------------------------------------------------ *
 * Investeringsaftrek
 * ------------------------------------------------------------------ */

/**
 * De hervormde investeringsaftrek vanaf aanslagjaar 2027. Laadinfrastructuur
 * valt onder groep 4, koolstofemissievrij vervoer, van bijlage IIbis KB/WIB92.
 */
export const INVESTERINGSAFTREK = {
  basis: 10,
  digitaal: 20,
  thematisch: 40,
  technologie: 13.5,
} as const;

export type Investeringsaftreksoort = keyof typeof INVESTERINGSAFTREK;

/** Voor investeringen in deze periode is er voor groep 4 geen attest nodig. */
export const ATTESTVRIJSTELLING = { van: "2025-01-01", tot: "2026-12-31" };

export interface InvesteringsaftrekResultaat extends GemarkeerdBedrag {
  pct: number;
  /** Is een attest van de bevoegde dienst vereist? */
  attestVereist: boolean;
}

/**
 * De investeringsaftrek op laadinfrastructuur.
 *
 * Slechts één aftrekcategorie per actief, en nooit samen met de verhoogde
 * kostenaftrek op dezelfde laadpaal. Die twee regels zijn de reden dat deze
 * functie de cumul expliciet als invoer neemt in plaats van ze te negeren.
 */
export function investeringsaftrek(
  investeringsbedrag: number,
  soort: Investeringsaftreksoort,
  investeringsdatum: string,
  opties: { verhoogdeKostenaftrekToegepast?: boolean } = {},
): InvesteringsaftrekResultaat {
  const pct = INVESTERINGSAFTREK[soort];
  const bron: Bron = {
    wet: "Hervormde investeringsaftrek vanaf AJ 2027, bijlage IIbis KB/WIB92",
    zekerheid: "bevestigd",
  };

  if (opties.verhoogdeKostenaftrekToegepast) {
    return {
      pct: 0,
      bedrag: 0,
      attestVereist: false,
      zekerheid: "bevestigd",
      bronnen: [bron, BRON_LAADPAAL],
      toelichting: [
        "Geen investeringsaftrek: op dezelfde laadpaal is al de verhoogde kostenaftrek toegepast, en die twee zijn niet cumuleerbaar.",
      ],
    };
  }

  const attestVrij =
    soort === "thematisch" &&
    investeringsdatum >= ATTESTVRIJSTELLING.van &&
    investeringsdatum <= ATTESTVRIJSTELLING.tot;

  return {
    pct,
    bedrag: Math.max(0, investeringsbedrag) * (pct / 100),
    attestVereist: soort === "thematisch" && !attestVrij,
    zekerheid: "bevestigd",
    bronnen: [bron],
    toelichting: [
      `Aftrekcategorie ${soort}: ${pct}%.`,
      attestVrij
        ? `Voor investeringen tussen ${ATTESTVRIJSTELLING.van} en ${ATTESTVRIJSTELLING.tot} is er voor laadinfrastructuur geen attest nodig (KB 16/6/2026).`
        : soort === "thematisch"
          ? "Een attest van de bevoegde gewestelijke of federale dienst is vereist."
          : "Slechts één aftrekcategorie per actief.",
    ],
  };
}

/* ------------------------------------------------------------------ *
 * CREG-tarief voor thuisladen
 * ------------------------------------------------------------------ */

export type Kwartaal = `${number}-Q${1 | 2 | 3 | 4}`;

/**
 * Het maximum per kWh dat een werkgever belastingvrij mag terugbetalen voor
 * thuis laden. De CREG publiceert het per kwartaal en per gewest; circulaire
 * 2025/C/38 maakte de regeling permanent.
 *
 * Een leeg vakje betekent dat de CREG dat tarief nog niet publiceerde. Dat is
 * geen reden om het tarief van een ander gewest te nemen: te veel terugbetalen
 * maakt het meerdere belastbaar loon.
 */
export const CREG_TARIEVEN: Record<Kwartaal, Partial<Record<Gewest, number>>> = {
  "2025-Q4": { vlaanderen: 0.307, wallonie: 0.3457 },
  "2026-Q1": { vlaanderen: 0.3132, brussel: 0.3426, wallonie: 0.3523 },
  "2026-Q2": { vlaanderen: 0.3191 },
  "2026-Q3": { vlaanderen: 0.3222 },
};

const BRON_CREG: Bron = {
  wet: "Circulaire 2025/C/38 en 2025/C/72 (CREG-tarieven thuisladen)",
  zekerheid: "bevestigd",
};

export interface ThuisladenResultaat extends GemarkeerdBedrag {
  /** Het toegepaste tarief per kWh. */
  tariefPerKwh: number | null;
}

/**
 * Wat een werkgever belastingvrij mag terugbetalen voor thuisgeladen stroom.
 *
 * De werkgever mag kiezen: het tarief van het gewest waar de werknemer woont,
 * of één uniform tarief voor iedereen. Dat uniforme tarief moet dan wel het
 * laagste van de drie zijn, anders is het verschil loon. Dat is de reden voor
 * de optie `uniform`.
 */
export function belastingvrijeTerugbetaling(
  kwh: number,
  gewest: Gewest,
  kwartaal: Kwartaal,
  opties: { uniform?: boolean } = {},
): ThuisladenResultaat {
  const perGewest = CREG_TARIEVEN[kwartaal];
  if (!perGewest) {
    return {
      bedrag: null,
      tariefPerKwh: null,
      zekerheid: "teVerifieren",
      bronnen: [BRON_CREG],
      toelichting: [`De CREG publiceerde nog geen tarief voor ${kwartaal}.`],
    };
  }

  const beschikbaar = Object.values(perGewest).filter((t): t is number => typeof t === "number");
  const tarief = opties.uniform ? Math.min(...beschikbaar) : perGewest[gewest];

  if (tarief === undefined || !Number.isFinite(tarief)) {
    return {
      bedrag: null,
      tariefPerKwh: null,
      zekerheid: "teVerifieren",
      bronnen: [BRON_CREG],
      toelichting: [`Voor ${gewest} is er geen gepubliceerd tarief voor ${kwartaal}.`],
    };
  }

  return {
    bedrag: Math.max(0, kwh) * tarief,
    tariefPerKwh: tarief,
    zekerheid: "bevestigd",
    bronnen: [BRON_CREG],
    toelichting: [
      opties.uniform
        ? `Uniform tarief: het laagste van de gepubliceerde gewesten, € ${tarief.toFixed(4)} per kWh.`
        : `Tarief ${gewest} ${kwartaal}: € ${tarief.toFixed(4)} per kWh.`,
      "Voorwaarden: een intelligente laadpaal van de werkgever bij de werknemer thuis, met sessieregistratie, en een terugbetaling die het forfait niet overschrijdt.",
      "Het forfait geldt ook wanneer de werknemer zonnepanelen of een thuisbatterij heeft.",
    ],
  };
}

/**
 * Wat er belastbaar wordt wanneer er meer wordt terugbetaald dan het forfait.
 * Het overschot is loon, met alle gevolgen voor bedrijfsvoorheffing en RSZ.
 */
export function overschotBovenForfait(
  terugbetaald: number,
  kwh: number,
  gewest: Gewest,
  kwartaal: Kwartaal,
  opties: { uniform?: boolean } = {},
): { vrijgesteld: number | null; belastbaar: number | null } {
  const forfait = belastingvrijeTerugbetaling(kwh, gewest, kwartaal, opties);
  if (forfait.bedrag === null) return { vrijgesteld: null, belastbaar: null };
  const vrijgesteld = Math.min(Math.max(0, terugbetaald), forfait.bedrag);
  return { vrijgesteld, belastbaar: Math.max(0, terugbetaald) - vrijgesteld };
}
