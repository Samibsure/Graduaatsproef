import type { Brandstof, CatalogCar, Onderhoudsklasse, Voertuigtype } from "./types";

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
 * is; een richtbedrag dat je zelf kan bijstellen, is eerlijker. Waar bronnen
 * elkaar tegenspreken, staat het hoogste bedrag in de tabel en de tegenspraak
 * in VERKEERSBELASTING_VOORBEHOUD, zodat ze op het scherm terechtkomt.
 *
 * Alles wat hier uitkomt, is een vertrekpunt. De gebruiker kan elk bedrag
 * overschrijven met de cijfers uit zijn offerte.
 */

export type Gewest = "vlaanderen" | "wallonie" | "brussel";

/**
 * Restwaarde per aandrijftype, na **36 maanden en 60.000 km**.
 *
 * Bron: JD Power / Autovista24, Duitse markt, gegevens november 2025.
 *
 * Waarom niet per model? Omdat dat cijfer voor België niet bestaat. Autovista en
 * Eurotax publiceren op 36 maanden en 60.000 km, op modelniveau achter een
 * betaalmuur; een restwaarde na vier jaar en 80.000 km per Belgisch model is
 * publiek nergens erkend te vinden. Wat in de catalogus stond, waren dus
 * honderdzestig getallen die iemand plausibel had gevonden — met een spreiding
 * van 32% tot 52% die niets meer betekende dan de gok die eronder zat.
 *
 * De volgorde die deze ranges tonen, is wél robuust en over meerdere markten
 * bevestigd: HEV ≈ benzine ≈ diesel > PHEV > BEV.
 */
export const RESTWAARDE_36M: Record<string, number> = {
  HEV: 49.8,
  benzine: 49.2,
  diesel: 48,
  PHEV: 45.1,
  BEV: 37.6,
};

/**
 * Van 36 naar 48 maanden: `rest48 = rest36 ^ (4/3)`.
 *
 * De app rekent op vier jaar, de bron meet op drie. Dat gat wordt hier in één
 * regel overbrugd in plaats van weggemoffeld door het driejarige cijfer als
 * vierjarig te gebruiken — dat laatste zou de restwaarde overschatten en dus de
 * TCO te laag voorstellen, precies de fout die deze applicatie hoort te
 * vermijden. Waardeverlies verloopt meetkundig: elk jaar gaat er ongeveer
 * hetzelfde deel van de resterende waarde af.
 *
 * Het resultaat blijft een schatting, en zo staat het ook op het scherm.
 */
export const restwaarde48 = (pct36: number) => Math.round((pct36 / 100) ** (4 / 3) * 1000) / 10;

/** Restwaarde na vier jaar voor een aandrijving, uit de gesourcete ranges. */
export function restwaardeVoor(voertuigtype: Voertuigtype, brandstof: Brandstof): number {
  const sleutel = voertuigtype === "fossiel" ? brandstof : voertuigtype;
  return restwaarde48(RESTWAARDE_36M[sleutel] ?? RESTWAARDE_36M.benzine);
}

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

  /*
   * De BEV-bedragen zijn per 2026 herzien; zie VERKEERSBELASTING_VOORBEHOUD voor
   * waar ze vandaan komen en waar ze betwist zijn.
   *
   * Vlaanderen: de vrijstelling voor nieuwe elektrische wagens verviel voor
   * inschrijvingen vanaf 1/1/2026. De gepubliceerde vork is €69,72 tot €87,24
   * naargelang de fiscale pk; hier staat de bovengrens.
   *
   * Wallonië en Brussel: €102,96, het minimumtarief 1/7/2025–30/6/2026. Eén bron
   * zegt dat elektrische wagens daar niets betalen; die tegenspraak staat in het
   * voorbehoud en niet stil in dit getal.
   *
   * De niet-BEV-bedragen blijven ongewijzigd. Voor Wallonië bestaat sinds
   * 1/7/2025 een formule (basisbedrag × CO₂/115 × M/1838 × C), maar zonder het
   * basisbedrag levert die geen cijfer op dat dit richtbedrag kan vervangen.
   */
  verkeersbelasting: {
    vlaanderen: { BEV: 87.24, PHEV: 130, HEV: 310, fossiel: 420 },
    wallonie: { BEV: 102.96, PHEV: 250, HEV: 350, fossiel: 480 },
    brussel: { BEV: 102.96, PHEV: 250, HEV: 350, fossiel: 480 },
  },

  phev_verbranding_basis: 5.4,
  phev_verbranding_per_kw: 0.011,
  phev_elektrisch_aandeel: 0.55,
};

/**
 * Waar de verkeersbelasting hierboven betwist of onvolledig is.
 *
 * Een bedrag dat in een totaal verdwijnt, kan niet zeggen dat er iets aan
 * scheelt. Dit kan dat wel, en het hoort zichtbaar te zijn op elke plaats waar
 * dat totaal getoond wordt: het verschil tussen €0 en €102,96 per jaar is over
 * vier jaar meer dan €400 en dus geen voetnoot.
 *
 * `sleutel` verwijst naar `kosten.voorbehoud_*` in messages/*.json, zodat de
 * waarschuwing ook in het Frans en het Engels bestaat.
 */
export interface Belastingvoorbehoud {
  gewest: Gewest;
  voertuigtype: Voertuigtype;
  sleutel: string;
}

export const VERKEERSBELASTING_VOORBEHOUD: Belastingvoorbehoud[] = [
  { gewest: "vlaanderen", voertuigtype: "BEV", sleutel: "bevVlaanderen" },
  { gewest: "wallonie", voertuigtype: "BEV", sleutel: "bevWallonieBrussel" },
  { gewest: "brussel", voertuigtype: "BEV", sleutel: "bevWallonieBrussel" },
];

/** Het voorbehoud bij deze combinatie, of null wanneer er geen is. */
export function verkeersbelastingVoorbehoud(
  gewest: Gewest,
  voertuigtype: Voertuigtype,
): string | null {
  return (
    VERKEERSBELASTING_VOORBEHOUD.find(
      (v) => v.gewest === gewest && v.voertuigtype === voertuigtype,
    )?.sleutel ?? null
  );
}

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
  const restNa4 =
    (car.restwaarde_pct_4j ?? restwaardeVoor(car.voertuigtype, car.brandstof)) / 100;
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
