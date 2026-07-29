import type { Bron } from "./bronnen";

/**
 * De vergoedingen en heffingen rond de wagen die geen autokost zijn: de
 * kilometervergoeding voor dienstreizen, de fietsvergoeding, de taks op de
 * verzekeringspremie en de terugbetaalbare accijns op professionele diesel.
 *
 * Ze horen bij elkaar omdat ze allemaal periodiek geïndexeerd worden, sommige
 * per kwartaal en in 2026 zelfs per maand. Ze staan daarom als tabel en niet als
 * constante: een nieuw tarief is één regel data, geen wijziging in de code.
 */

/* ------------------------------------------------------------------ *
 * Kilometervergoeding eigen wagen
 * ------------------------------------------------------------------ */

export interface Kilometertarief {
  /** Sleutel: "2026-Q1", "2026-04" of "2025-07/2026-06" voor het jaarforfait. */
  periode: string;
  eurPerKm: number;
  soort: "jaar" | "kwartaal" | "maand";
  /** Waarom dit tarief afwijkt, wanneer dat het geval is. */
  opmerking?: string;
}

/**
 * De federale kilometervergoeding. Een werkgever kiest tussen het jaarforfait
 * en het kwartaalforfait en past die keuze consequent toe. In het voorjaar van
 * 2026 kwamen daar tijdelijke maandtarieven bij als energiesteun; die zijn geen
 * derde keuzemogelijkheid maar een correctie binnen het kwartaalspoor.
 */
export const KILOMETERVERGOEDING: Kilometertarief[] = [
  { periode: "2025-07/2026-06", eurPerKm: 0.4449, soort: "jaar" },
  { periode: "2026-Q1", eurPerKm: 0.4326, soort: "kwartaal" },
  { periode: "2026-Q2", eurPerKm: 0.4327, soort: "kwartaal" },
  { periode: "2026-04", eurPerKm: 0.4571, soort: "maand", opmerking: "Tijdelijke energiesteun." },
  { periode: "2026-05", eurPerKm: 0.4841, soort: "maand", opmerking: "Tijdelijke energiesteun." },
  { periode: "2026-06", eurPerKm: 0.5055, soort: "maand", opmerking: "Tijdelijke energiesteun." },
  { periode: "2026-Q3", eurPerKm: 0.444, soort: "kwartaal" },
];

/**
 * Boven dit aantal beroepskilometers per jaar aanvaardt de administratie het
 * forfait niet meer zonder verantwoording.
 */
export const KILOMETERVERGOEDING_GRENS = 24_000;

export const BRON_KILOMETERVERGOEDING: Bron = {
  wet: "FOD Beleid en Ondersteuning, kilometervergoeding dienstreizen",
  zekerheid: "bevestigd",
};

export interface KilometervergoedingResultaat {
  km: number;
  eurPerKm: number;
  totaal: number;
  /** True zodra de 24.000 km overschreden wordt. */
  boven24000: boolean;
  /** Het aantal kilometers waarvoor bewijsstukken nodig zijn. */
  teVerantwoordenKm: number;
  waarschuwing: string | null;
}

/** Het tarief voor een periode, of null wanneer die niet in de tabel staat. */
export function kilometertarief(periode: string): Kilometertarief | null {
  return KILOMETERVERGOEDING.find((t) => t.periode === periode) ?? null;
}

/**
 * De kilometervergoeding voor een aantal beroepskilometers. Boven de grens van
 * 24.000 km blijft het bedrag hetzelfde, maar de bewijslast verschuift; dat
 * onderscheid zit in de waarschuwing en niet in het bedrag.
 */
export function berekenKilometervergoeding(
  km: number,
  eurPerKm: number,
): KilometervergoedingResultaat {
  const veiligeKm = Math.max(0, km);
  const boven = Math.max(0, veiligeKm - KILOMETERVERGOEDING_GRENS);
  return {
    km: veiligeKm,
    eurPerKm,
    totaal: veiligeKm * Math.max(0, eurPerKm),
    boven24000: boven > 0,
    teVerantwoordenKm: boven,
    waarschuwing:
      boven > 0
        ? `Boven ${KILOMETERVERGOEDING_GRENS.toLocaleString("nl-BE")} beroepskilometers per jaar aanvaardt de administratie het forfait niet zonder verantwoording. Voor ${Math.round(boven).toLocaleString("nl-BE")} km zijn bewijsstukken nodig.`
        : null,
  };
}

/* ------------------------------------------------------------------ *
 * Fietsvergoeding
 * ------------------------------------------------------------------ */

export interface Fietsparameters {
  /** Suppletief bedrag uit cao 164, wanneer er geen sectorregeling is. */
  cao164PerKm: number;
  /** Maximum dat vrijgesteld is van belasting en sociale bijdragen. */
  vrijgesteldPerKm: number;
  /** Jaarlijks vrijgesteld maximum. */
  vrijgesteldPerJaar: number;
  /** Maximaal aantal vergoede kilometers heen en terug per dag onder cao 164. */
  maxKmPerDag: number;
}

/**
 * Parameters 2026. Het jaarplafond is € 3.700 fiscaal; in de berekening van de
 * bedrijfsvoorheffing volgens bijlage III duikt € 3.690 op. Dat is geen
 * tegenspraak maar een afronding in een andere tabel, en het bedrag hieronder
 * volgt de fiscale grens.
 */
export const FIETSPARAMETERS_2026: Fietsparameters = {
  cao164PerKm: 0.3,
  vrijgesteldPerKm: 0.37,
  vrijgesteldPerJaar: 3700,
  maxKmPerDag: 40,
};

export const BRON_FIETSVERGOEDING: Bron = {
  wet: "Cao 164 en art. 38 §1 WIB92 (vrijstelling fietsvergoeding)",
  zekerheid: "bevestigd",
};

export interface FietsvergoedingResultaat {
  km: number;
  totaal: number;
  vrijgesteld: number;
  belastbaar: number;
  /** Waarom er een deel belastbaar is: te hoog tarief, of het jaarplafond. */
  redenBelastbaar: string | null;
}

/**
 * De fietsvergoeding, met beide grenzen tegelijk: het maximum per kilometer én
 * het jaarplafond. Het is die combinatie die in de praktijk misloopt. Wie
 * € 0,37 per kilometer geeft, zit per kilometer juist, maar overschrijdt het
 * jaarplafond al vanaf tienduizend kilometer.
 */
export function berekenFietsvergoedingJaar(
  kmPerJaar: number,
  eurPerKm: number,
  p: Fietsparameters = FIETSPARAMETERS_2026,
): FietsvergoedingResultaat {
  const km = Math.max(0, kmPerJaar);
  const tarief = Math.max(0, eurPerKm);
  const totaal = km * tarief;

  const perKmVrij = km * Math.min(tarief, p.vrijgesteldPerKm);
  const vrijgesteld = Math.min(perKmVrij, p.vrijgesteldPerJaar);
  const belastbaar = totaal - vrijgesteld;

  let reden: string | null = null;
  if (belastbaar > 0) {
    if (tarief > p.vrijgesteldPerKm && perKmVrij > p.vrijgesteldPerJaar) {
      reden = `Het tarief ligt boven € ${p.vrijgesteldPerKm} per km én het jaarplafond van € ${p.vrijgesteldPerJaar} is bereikt.`;
    } else if (tarief > p.vrijgesteldPerKm) {
      reden = `Het tarief ligt boven de vrijgestelde € ${p.vrijgesteldPerKm} per km.`;
    } else {
      reden = `Het jaarplafond van € ${p.vrijgesteldPerJaar} is bereikt.`;
    }
  }

  return { km, totaal, vrijgesteld, belastbaar, redenBelastbaar: reden };
}

/* ------------------------------------------------------------------ *
 * Verzekeringstaks en accijnzen
 * ------------------------------------------------------------------ */

/** Taks op de premie van een autoverzekering. */
export const VERZEKERINGSTAKS_PCT = 9.25;

export function verzekeringstaks(premie: number): number {
  return Math.max(0, premie) * (VERZEKERINGSTAKS_PCT / 100);
}

/**
 * Terugvorderbare accijns op professionele diesel, in euro per liter. Enkel
 * voor voertuigen vanaf 7,5 ton, autobussen en autocars, taxi's en aangepast
 * rolstoelvervoer. Geldt ook voor HVO100.
 */
export const PROFESSIONELE_DIESEL: Record<number, number> = {
  2024: 0.1935,
  2025: 0.1924,
  2026: 0.1913,
};

export const BRON_ACCIJNS: Bron = {
  wet: "KB 29/2/2004 (cliquetsysteem) en de jaarlijkse accijnstarieven",
  zekerheid: "bevestigd",
};

export interface AccijnsResultaat {
  liters: number;
  perLiter: number | null;
  terugvorderbaar: number | null;
  /** Tot wanneer de aanvraag bij Douane en Accijnzen kan worden ingediend. */
  termijnJaren: number;
}

/**
 * Wat er van de accijns terug te vorderen valt. De aanvraag loopt maandelijks
 * bij Douane en Accijnzen en kan tot drie jaar terug; daarvoor is een vergunning
 * energieproducten en elektriciteit nodig.
 */
export function terugvorderbareAccijns(liters: number, jaar: number): AccijnsResultaat {
  const perLiter = PROFESSIONELE_DIESEL[jaar] ?? null;
  return {
    liters: Math.max(0, liters),
    perLiter,
    terugvorderbaar: perLiter === null ? null : Math.max(0, liters) * perLiter,
    termijnJaren: 3,
  };
}
