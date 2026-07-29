import type { CatalogCar, Onderhoudsklasse, Voertuigtype } from "./types";

/**
 * Wat een wagen per jaar kost, berekend uit zijn specificaties.
 *
 * Tot nu toe was de raming één regel: cataloguswaarde × 0,17 voor een
 * elektrische wagen, × 0,21 voor een verbrandingswagen, × 0,19 voor de rest.
 * Dat is geen model maar een vuistregel: ze weet niet of je 15.000 of 45.000 km
 * rijdt, of de wagen 12 of 22 kWh per 100 km verbruikt, of je thuis laadt of aan
 * een snellader, en of de restwaarde na vier jaar 32% of 52% is. Voor een
 * applicatie die zegt de werkelijke kost te tonen, is dat te grof.
 *
 * Hier wordt elk bestanddeel apart berekend uit de gegevens die de catalogus
 * over de wagen heeft. Alle prijzen en tarieven staan in KOSTENPARAMETERS, op
 * één plaats, aanpasbaar, in plaats van verstopt in een factor.
 *
 * ## Wat dit model wel en niet doet
 *
 * Energie, onderhoud, banden, verzekering en afschrijving worden **afgeleid**
 * uit de specificaties. Dat kan, want ze volgen rechtstreeks uit verbruik,
 * kilometers, vermogen, cataloguswaarde en restwaarde.
 *
 * De verkeersbelasting is een **parametertabel** per gewest en voertuigtype, en
 * geen formule. De gewestelijke regels hangen af van cilinderinhoud, euronorm
 * en vermogen in fiscale paardenkracht, verschillen per gewest en wijzigen
 * geregeld. Een half nagebouwde formule zou een precisie voorwenden die er niet
 * is; een richtbedrag dat je zelf kan bijstellen, is eerlijker.
 *
 * Alles wat hier uitkomt, is een vertrekpunt. De gebruiker kan elk bedrag
 * overschrijven met de cijfers uit zijn offerte.
 */

export type Gewest = "vlaanderen" | "wallonie" | "brussel";

export interface KostenParameters {
  /** Brandstof en stroom, in euro. */
  benzine_per_liter: number;
  diesel_per_liter: number;
  lpg_per_liter: number;
  cng_per_kg: number;
  stroom_thuis_per_kwh: number;
  stroom_publiek_per_kwh: number;
  /**
   * Laadverlies tussen stopcontact en batterij, in procent. Het opgegeven
   * verbruik is wat de wagen uit de batterij haalt; de meter thuis telt meer.
   */
  laadverlies_pct: number;

  /** Onderhoud in euro per kilometer, per onderhoudsklasse. */
  onderhoud_per_km: Record<Onderhoudsklasse, number>;
  /** Toeslag per kilometer per 100 kW: meer vermogen betekent duurdere onderdelen. */
  onderhoud_toeslag_per_100kw: number;
  /** Banden in euro per kilometer, voor een wagen van 100 kW. */
  banden_per_km: number;

  /** Verzekering: een vast deel, plus een deel naar waarde en naar vermogen. */
  verzekering_basis: number;
  verzekering_per_1000_euro: number;
  verzekering_per_10_kw: number;

  /** Verkeersbelasting per jaar, richtbedrag per gewest en voertuigtype. */
  verkeersbelasting: Record<Gewest, Record<Voertuigtype, number>>;

  /**
   * Het werkelijke verbruik van een plug-in hybride die niet geladen wordt.
   * De WLTP-cijfers van een PHEV veronderstellen dat de batterij vol vertrekt;
   * rijdt hij op de motor, dan verbruikt hij als een gewone benzinewagen. Deze
   * twee getallen schatten dat verbruik uit het vermogen.
   */
  phev_verbranding_basis: number;
  phev_verbranding_per_kw: number;
  /** Deel van de kilometers dat een plug-in hybride elektrisch aflegt. */
  phev_elektrisch_aandeel: number;
}

/**
 * Richtwaarden voor België, begin 2026. Ze horen bijgewerkt te worden zoals de
 * fiscale parameters: één keer per jaar, na de begroting en met de energieprijs
 * van het moment.
 */
export const KOSTENPARAMETERS: KostenParameters = {
  benzine_per_liter: 1.72,
  diesel_per_liter: 1.79,
  lpg_per_liter: 0.95,
  cng_per_kg: 1.35,
  stroom_thuis_per_kwh: 0.34,
  stroom_publiek_per_kwh: 0.62,
  laadverlies_pct: 10,

  onderhoud_per_km: { laag: 0.035, midden: 0.062, hoog: 0.085 },
  onderhoud_toeslag_per_100kw: 0.012,
  banden_per_km: 0.022,

  verzekering_basis: 420,
  verzekering_per_1000_euro: 8.5,
  verzekering_per_10_kw: 22,

  verkeersbelasting: {
    vlaanderen: { BEV: 97, PHEV: 130, HEV: 310, fossiel: 420 },
    wallonie: { BEV: 84, PHEV: 250, HEV: 350, fossiel: 480 },
    brussel: { BEV: 84, PHEV: 250, HEV: 350, fossiel: 480 },
  },

  phev_verbranding_basis: 5.4,
  phev_verbranding_per_kw: 0.011,
  phev_elektrisch_aandeel: 0.55,
};

export interface Gebruiksprofiel {
  km_per_jaar: number;
  /** Deel van het laden dat thuis gebeurt, van 0 tot 1. Publiek laden is duurder. */
  aandeel_thuis_laden: number;
  gewest: Gewest;
  /** Looptijd van het contract of de afschrijving, in jaren. */
  looptijd_jaren: number;
}

export const STANDAARD_GEBRUIK: Gebruiksprofiel = {
  km_per_jaar: 25_000,
  aandeel_thuis_laden: 0.7,
  gewest: "vlaanderen",
  looptijd_jaren: 4,
};

export interface Kostenopbouw {
  energie: number;
  onderhoud: number;
  banden: number;
  verzekering: number;
  verkeersbelasting: number;
  afschrijving: number;
  /** De som, en meteen de waarde voor `jaarlijkse_autokosten` op een wagen. */
  totaal: number;
}

const rond = (x: number) => Math.round(x);

/**
 * Energiekost per jaar.
 *
 * Elektrisch rekent met een gewogen prijs tussen thuis en publiek laden, plus
 * het laadverlies. Verbranding rekent met de brandstofprijs. Een plug-in
 * hybride is een gewogen som van de twee: elektrisch voor het deel dat hij
 * geladen rijdt, benzine voor de rest, en dat tweede verbruik is niet het
 * WLTP-cijfer maar een schatting van wat hij op de motor werkelijk drinkt.
 */
export function energiekost(
  car: CatalogCar,
  gebruik: Gebruiksprofiel,
  p: KostenParameters = KOSTENPARAMETERS,
): number {
  const km = gebruik.km_per_jaar;
  const thuis = Math.min(1, Math.max(0, gebruik.aandeel_thuis_laden));
  const stroomprijs =
    (thuis * p.stroom_thuis_per_kwh + (1 - thuis) * p.stroom_publiek_per_kwh) *
    (1 + p.laadverlies_pct / 100);

  const brandstofprijs =
    car.brandstof === "diesel"
      ? p.diesel_per_liter
      : car.brandstof === "lpg"
        ? p.lpg_per_liter
        : car.brandstof === "cng"
          ? p.cng_per_kg
          : p.benzine_per_liter;

  if (car.voertuigtype === "BEV") {
    const kwhPer100 = car.verbruik ?? 18;
    return (kwhPer100 / 100) * km * stroomprijs;
  }

  if (car.voertuigtype === "PHEV") {
    const aandeel = Math.min(1, Math.max(0, p.phev_elektrisch_aandeel));
    // Uit de batterij en het bereik volgt hoeveel de wagen elektrisch verbruikt.
    const kwhPer100 =
      car.batterij_kwh && car.actieradius_km
        ? (car.batterij_kwh / car.actieradius_km) * 100
        : 20;
    const litersPer100 = p.phev_verbranding_basis + p.phev_verbranding_per_kw * (car.vermogen_kw ?? 150);

    const elektrisch = (kwhPer100 / 100) * km * aandeel * stroomprijs;
    const verbranding = (litersPer100 / 100) * km * (1 - aandeel) * brandstofprijs;
    return elektrisch + verbranding;
  }

  const litersPer100 = car.verbruik ?? 6.5;
  return (litersPer100 / 100) * km * brandstofprijs;
}

/** Onderhoud en banden, naar klasse, kilometers en vermogen. */
export function onderhoudskost(
  car: CatalogCar,
  gebruik: Gebruiksprofiel,
  p: KostenParameters = KOSTENPARAMETERS,
): { onderhoud: number; banden: number } {
  const km = gebruik.km_per_jaar;
  const kw = car.vermogen_kw ?? 130;
  const klasse: Onderhoudsklasse =
    car.onderhoudsklasse ?? (car.voertuigtype === "BEV" ? "laag" : "midden");

  const onderhoud = (p.onderhoud_per_km[klasse] + (kw / 100) * p.onderhoud_toeslag_per_100kw) * km;
  // Zwaarder en krachtiger betekent bredere banden die sneller slijten.
  const banden = p.banden_per_km * (1 + kw / 500) * km;
  return { onderhoud, banden };
}

export function verzekeringskost(car: CatalogCar, p: KostenParameters = KOSTENPARAMETERS): number {
  return (
    p.verzekering_basis +
    (car.cataloguswaarde / 1000) * p.verzekering_per_1000_euro +
    ((car.vermogen_kw ?? 130) / 10) * p.verzekering_per_10_kw
  );
}

/**
 * Afschrijving: wat de wagen in waarde verliest over de looptijd, per jaar.
 *
 * De restwaarde staat per model in de catalogus, uitgedrukt na vier jaar. Voor
 * een andere looptijd wordt ze meetkundig omgerekend, want waardeverlies loopt
 * niet lineair: het eerste jaar kost het meest.
 */
export function afschrijving(car: CatalogCar, gebruik: Gebruiksprofiel): number {
  const jaren = Math.max(1, gebruik.looptijd_jaren);
  const restNa4 = (car.restwaarde_pct_4j ?? 42) / 100;
  const perJaarFactor = restNa4 ** (1 / 4);
  const restwaarde = car.cataloguswaarde * perJaarFactor ** jaren;
  return (car.cataloguswaarde - restwaarde) / jaren;
}

/** De volledige jaarkost, opgesplitst per bestanddeel. */
export function berekenKosten(
  car: CatalogCar,
  gebruik: Gebruiksprofiel = STANDAARD_GEBRUIK,
  p: KostenParameters = KOSTENPARAMETERS,
): Kostenopbouw {
  const { onderhoud, banden } = onderhoudskost(car, gebruik, p);
  const opbouw = {
    energie: rond(energiekost(car, gebruik, p)),
    onderhoud: rond(onderhoud),
    banden: rond(banden),
    verzekering: rond(verzekeringskost(car, p)),
    verkeersbelasting: rond(p.verkeersbelasting[gebruik.gewest][car.voertuigtype]),
    afschrijving: rond(afschrijving(car, gebruik)),
  };
  return {
    ...opbouw,
    totaal:
      opbouw.energie +
      opbouw.onderhoud +
      opbouw.banden +
      opbouw.verzekering +
      opbouw.verkeersbelasting +
      opbouw.afschrijving,
  };
}
