/**
 * Rollen, het bedrijfsprofiel en de rechtenhulpjes.
 *
 * Deze module staat bewust los van sessie.ts. Die laatste importeert de
 * Supabase-serverclient en dus next/headers, wat alleen in een server component
 * mag draaien. Client components hebben de types en de helpers hieronder nodig
 * zonder die serverafhankelijkheid mee te slepen.
 */

/**
 * De vier rollen binnen een bedrijf, van weinig naar veel rechten.
 * De volgorde van deze lijst is betekenisvol: ze bepaalt minstensRol().
 */
export const ROLLEN = ["lezer", "lid", "fiscalist", "beheerder"] as const;

export type Bedrijfsrol = (typeof ROLLEN)[number];

export interface Bedrijf {
  id: string;
  naam: string;
  ondernemingsnummer: string | null;
  btw_nummer: string | null;
  adres: string | null;
  postcode: string | null;
  gemeente: string | null;
  logo_url: string | null;
  is_kmo: boolean;
  boekjaar_start_maand: number;
  onboarding_voltooid: boolean;
}

export interface Sessie {
  gebruikerId: string;
  email: string;
  volledigeNaam: string | null;
  rol: Bedrijfsrol;
  isPlatformAdmin: boolean;
  bedrijf: Bedrijf;
}

/** De velden die van companies nodig zijn, op één plaats. */
export const BEDRIJF_VELDEN =
  "id, naam, ondernemingsnummer, btw_nummer, adres, postcode, gemeente, logo_url, is_kmo, boekjaar_start_maand, onboarding_voltooid";

/**
 * Rechtenhulpjes. Ze spiegelen de policies uit
 * supabase/migrations/0006_bedrijfsprofiel_en_validatie.sql. De database blijft
 * de grens; dit bepaalt alleen wat de interface toont. Leidt de UI hier iets
 * verkeerd af, dan weigert de database het alsnog.
 */
export function minstensRol(rol: Bedrijfsrol, minimum: Bedrijfsrol): boolean {
  return ROLLEN.indexOf(rol) >= ROLLEN.indexOf(minimum);
}

/** Mag wagens en beslissingen bewaren of verwijderen: iedereen behalve de lezer. */
export function magSchrijven(sessie: Sessie | null): boolean {
  return sessie !== null && sessie.rol !== "lezer";
}

/** Mag het team en de bedrijfsgegevens beheren. */
export function magBeheren(sessie: Sessie | null): boolean {
  return sessie?.rol === "beheerder";
}
