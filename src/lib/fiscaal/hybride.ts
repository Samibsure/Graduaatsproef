import { EURONORMEN } from "./types";
import type { Euronorm, Vehicle } from "./types";

/**
 * Valse hybrides (art. 65/1 WIB92).
 *
 * Een plug-inhybride die te weinig batterij aan boord heeft of te veel uitstoot,
 * wordt fiscaal niet als hybride behandeld. Voor de aftrekbaarheid en het
 * voordeel van alle aard rekent men dan met de uitstoot van het overeenstemmende
 * niet-plug-in model, en bij gebrek daaraan met de officiële uitstoot maal 2,5.
 *
 * Dat verschil is niet klein. Een PHEV met 40 g op het attest springt zonder
 * batterijcapaciteit naar 100 g fiscale CO2, en dat verschuift zowel de
 * gramformule als het CO2-percentage van het VAA over meerdere procentpunten.
 *
 * Twee voorwaarden, elk voldoende om de wagen als vals te bestempelen:
 * - minder dan 0,5 kWh batterijcapaciteit per 100 kg wagengewicht, of
 * - een uitstoot boven de drempel.
 *
 * De drempel lag altijd op 50 g/km. Sinds 1 januari 2025 ligt ze op 75 g/km voor
 * voertuigen met de norm Euro 6e-bis of later (wet 18/12/2025, BS 30/12/2025).
 */

/** Minimale batterijcapaciteit in kWh per 100 kg wagengewicht. */
export const MIN_KWH_PER_100KG = 0.5;

/** Algemene CO2-drempel voor een echte plug-inhybride. */
export const CO2_DREMPEL = 50;

/** Verhoogde drempel voor Euro 6e-bis en later, vanaf 1 januari 2025. */
export const CO2_DREMPEL_EURO6E_BIS = 75;

/** Datum vanaf wanneer de verhoogde drempel geldt. */
export const VERHOOGDE_DREMPEL_VANAF = "2025-01-01";

/** Vermenigvuldiger bij gebrek aan een overeenstemmend niet-plug-in model. */
export const CO2_FACTOR_ZONDER_EQUIVALENT = 2.5;

function isMinstens(norm: Euronorm | null | undefined, drempel: Euronorm): boolean {
  if (!norm) return false;
  return EURONORMEN.indexOf(norm) >= EURONORMEN.indexOf(drempel);
}

/**
 * De CO2-drempel die voor deze wagen geldt. De besteldatum is het scharnierpunt,
 * niet het gebruiksjaar: de verhoging geldt voor voertuigen die onder de nieuwe
 * norm op de markt komen.
 */
export function co2Drempel(vehicle: Pick<Vehicle, "euronorm" | "besteldatum">): number {
  const verhoogd =
    vehicle.besteldatum >= VERHOOGDE_DREMPEL_VANAF && isMinstens(vehicle.euronorm, "euro6e-bis");
  return verhoogd ? CO2_DREMPEL_EURO6E_BIS : CO2_DREMPEL;
}

export interface ValseHybrideOordeel {
  isValseHybride: boolean;
  /** Reden waarom, of waarom niet. Wordt in de detailweergave getoond. */
  reden: string;
  /** De drempel die op deze wagen van toepassing is. */
  drempel: number;
  /**
   * De batterijcapaciteit per 100 kg, of null wanneer batterij of gewicht
   * ontbreken. Zonder die gegevens is de capaciteitstoets niet te doen.
   */
  kwhPer100kg: number | null;
}

/**
 * Toetst of een plug-inhybride fiscaal als valse hybride geldt.
 *
 * Ontbreken de batterijcapaciteit of het gewicht, dan wordt de capaciteitstoets
 * overgeslagen en beslist de uitstoot alleen. Dat is bewust de mildere
 * uitkomst: de tool mag een wagen niet zwaarder belasten omdat de gebruiker een
 * technisch veld nog niet heeft ingevuld. De toelichting zegt dat er gegevens
 * ontbreken, zodat het verschil zichtbaar blijft.
 */
export function beoordeelValseHybride(vehicle: Vehicle): ValseHybrideOordeel {
  const drempel = co2Drempel(vehicle);

  if (vehicle.voertuigtype !== "PHEV") {
    return {
      isValseHybride: false,
      reden: "Geen plug-inhybride, de regel is niet van toepassing.",
      drempel,
      kwhPer100kg: null,
    };
  }

  const batterij = vehicle.batterij_kwh ?? null;
  const gewicht = vehicle.wagengewicht ?? null;
  const kwhPer100kg = batterij && gewicht && gewicht > 0 ? (batterij / gewicht) * 100 : null;

  if (vehicle.co2 > drempel) {
    return {
      isValseHybride: true,
      reden: `Uitstoot ${vehicle.co2} g/km ligt boven de drempel van ${drempel} g/km.`,
      drempel,
      kwhPer100kg,
    };
  }

  if (kwhPer100kg !== null && kwhPer100kg < MIN_KWH_PER_100KG) {
    return {
      isValseHybride: true,
      reden: `Batterij levert ${kwhPer100kg.toFixed(2)} kWh per 100 kg, minder dan de vereiste ${MIN_KWH_PER_100KG}.`,
      drempel,
      kwhPer100kg,
    };
  }

  if (kwhPer100kg === null) {
    return {
      isValseHybride: false,
      reden: `Uitstoot blijft onder ${drempel} g/km. De batterijtoets is niet uitgevoerd: batterijcapaciteit of gewicht ontbreekt.`,
      drempel,
      kwhPer100kg,
    };
  }

  return {
    isValseHybride: false,
    reden: `Echte plug-inhybride: onder ${drempel} g/km en minstens ${MIN_KWH_PER_100KG} kWh per 100 kg.`,
    drempel,
    kwhPer100kg,
  };
}

export interface FiscaleCo2 {
  /** De uitstoot waarmee gerekend wordt, of null als ze onbekend is. */
  co2: number | null;
  /** True wanneer de waarde afwijkt van wat op het attest staat. */
  gecorrigeerd: boolean;
  toelichting: string;
}

/**
 * De CO2-waarde waarmee de gramformule en het VAA rekenen.
 *
 * Voor een gewone wagen is dat gewoon de waarde van het attest. Voor een valse
 * hybride is het de uitstoot van het overeenstemmende niet-plug-in model, en bij
 * gebrek daaraan de officiële uitstoot maal 2,5. Staat er helemaal geen waarde
 * op het attest, dan geeft deze functie null terug en vallen de formules terug
 * op hun forfait.
 */
export function fiscaleCo2(vehicle: Vehicle): FiscaleCo2 {
  if (vehicle.co2_onbekend) {
    return {
      co2: null,
      gecorrigeerd: false,
      toelichting: "Geen CO2-waarde bekend; de forfaitaire regeling is toegepast.",
    };
  }

  const oordeel = beoordeelValseHybride(vehicle);
  if (!oordeel.isValseHybride) {
    return { co2: vehicle.co2, gecorrigeerd: false, toelichting: oordeel.reden };
  }

  const equivalent = vehicle.co2_equivalent ?? null;
  if (equivalent !== null && equivalent > 0) {
    return {
      co2: equivalent,
      gecorrigeerd: true,
      toelichting: `${oordeel.reden} Er wordt gerekend met de ${equivalent} g/km van het overeenstemmende niet-plug-in model.`,
    };
  }

  return {
    co2: vehicle.co2 * CO2_FACTOR_ZONDER_EQUIVALENT,
    gecorrigeerd: true,
    toelichting: `${oordeel.reden} Zonder overeenstemmend model geldt ${vehicle.co2} g/km × ${CO2_FACTOR_ZONDER_EQUIVALENT}.`,
  };
}
