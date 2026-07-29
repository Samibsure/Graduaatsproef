import { supabase } from "./supabase";
import { type Bedrijfsrol } from "./rollen";
import { bedrijfSchema, valideer } from "./validatie";

/**
 * Het bedrijfsprofiel. Net als bij de wagens filtert niets hier expliciet op
 * bedrijf: de RLS-policy companies_select beperkt de query tot het bedrijf uit
 * de sessie, en companies_update laat alleen een beheerder schrijven.
 */

export type BedrijfsInvoer = {
  naam: string;
  ondernemingsnummer: string | null;
  btw_nummer: string | null;
  adres: string | null;
  postcode: string | null;
  gemeente: string | null;
  is_kmo: boolean;
  boekjaar_start_maand: number;
};

/*
 * laadBedrijf() en bewaarLogoUrl() stonden hier zonder één enkele aanroeper. Het
 * bedrijf komt uit laadSessie(), en er is nergens een scherm om een logo te
 * uploaden. Ongebruikte functies suggereren dat een functionaliteit bestaat;
 * beter weg dan half.
 */

/** Lege tekstvelden horen als null in de database, niet als lege string. */
function leegAlsNull(waarde: string | null | undefined): string | null {
  const getrimd = (waarde ?? "").trim();
  return getrimd === "" ? null : getrimd;
}

export function normaliseerBedrijf(invoer: Partial<BedrijfsInvoer>): BedrijfsInvoer {
  return {
    naam: (invoer.naam ?? "").trim(),
    ondernemingsnummer: leegAlsNull(invoer.ondernemingsnummer),
    btw_nummer: leegAlsNull(invoer.btw_nummer),
    adres: leegAlsNull(invoer.adres),
    postcode: leegAlsNull(invoer.postcode),
    gemeente: leegAlsNull(invoer.gemeente),
    is_kmo: invoer.is_kmo ?? true,
    boekjaar_start_maand: invoer.boekjaar_start_maand ?? 1,
  };
}

async function schrijfBedrijf(velden: Record<string, unknown>): Promise<void> {
  // .select() is hier geen detail: een update zonder rechten wordt door RLS niet
  // geweigerd maar raakt nul rijen. Zonder deze controle lijkt ze te slagen.
  const { data, error } = await supabase
    .from("companies")
    .update(velden)
    .not("id", "is", null)
    .select("id");
  if (error) throw new Error(`Bedrijf bewaren mislukt: ${error.message}`);
  if (!data?.length) throw new Error("Bedrijf bewaren mislukt: alleen een beheerder kan dit.");
}

export async function bewaarBedrijfsprofiel(invoer: Partial<BedrijfsInvoer>): Promise<void> {
  await schrijfBedrijf(valideer(bedrijfSchema, normaliseerBedrijf(invoer)));
}

/** Rondt de onboarding af: bewaart het profiel en markeert de wizard als gedaan. */
export async function voltooiOnboarding(invoer: Partial<BedrijfsInvoer>): Promise<void> {
  await schrijfBedrijf({
    ...valideer(bedrijfSchema, normaliseerBedrijf(invoer)),
    onboarding_voltooid: true,
  });
}

/** Past de rol van een collega aan. De policy weigert de eigen rol te wijzigen. */
export async function wijzigRol(profielId: string, rol: Bedrijfsrol): Promise<void> {
  const { data, error } = await supabase
    .from("profiles")
    .update({ rol })
    .eq("id", profielId)
    .select("id");
  if (error) throw new Error(`Rol wijzigen mislukt: ${error.message}`);
  if (!data?.length) {
    throw new Error("Rol wijzigen mislukt: alleen een beheerder kan de rol van een collega wijzigen.");
  }
}
