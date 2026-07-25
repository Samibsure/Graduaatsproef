import { supabase } from "./supabase";
import type { CatalogCar, FiscaleContext, Vehicle } from "./fiscaal/types";
import type { Bestelperiode, DeductionRule, TaxParameters } from "./fiscaal/types";
import { DEFAULT_CONTEXT } from "./fiscaal/defaults";
import type { ScoreResultaat } from "./fiscaal/scoring";
import { valideer, wagenSchema } from "./validatie";

export interface Evaluatie {
  id: string;
  titel: string;
  vehicle_ids: string[];
  resultaten: ScoreResultaat[];
  aanbeveling: string;
  notitie: string | null;
  created_at: string;
}

/**
 * De wagens en beslissingen hieronder worden nergens expliciet op bedrijf
 * gefilterd. Dat gebeurt bewust in de database: de RLS-policies beperken elke
 * query tot het bedrijf uit de sessie, en de kolom company_id krijgt zijn
 * waarde uit een default. De browser stuurt dus nooit zelf een company_id mee,
 * en kan er ook geen verzinnen.
 */

/** Laadt parameters, bestelperiodes en aftrekkalender uit Supabase. */
export async function laadFiscaleContext(): Promise<FiscaleContext> {
  const [parameters, periodes, regels] = await Promise.all([
    supabase.from("tax_parameters").select("*").order("year"),
    supabase.from("bestelperiodes").select("*").order("volgorde"),
    supabase.from("deduction_rules").select("*").order("id"),
  ]);
  if (parameters.error || periodes.error || regels.error) {
    console.error("Kon fiscale context niet laden, val terug op standaardwaarden", {
      parameters: parameters.error,
      periodes: periodes.error,
      regels: regels.error,
    });
    return DEFAULT_CONTEXT;
  }
  return {
    parameters: parameters.data as TaxParameters[],
    periodes: periodes.data as Bestelperiode[],
    regels: regels.data as DeductionRule[],
  };
}

export async function laadWagens(): Promise<Vehicle[]> {
  const { data, error } = await supabase.from("vehicles").select("*").order("created_at");
  if (error) throw new Error(`Wagens laden mislukt: ${error.message}`);
  return data as Vehicle[];
}

/** Laadt de catalogus met de bekendste bedrijfswagens, gesorteerd op populariteit. */
export async function laadCatalogus(): Promise<CatalogCar[]> {
  const { data, error } = await supabase
    .from("car_catalog")
    .select("*")
    .order("populariteit_rang", { ascending: true, nullsFirst: false });
  if (error) throw new Error(`Catalogus laden mislukt: ${error.message}`);
  return data as CatalogCar[];
}

export async function bewaarWagen(wagen: Omit<Vehicle, "id"> & { id?: string }): Promise<void> {
  const { id, ...velden } = wagen;

  // Vóór het netwerkverzoek, zodat de gebruiker "co2: getal mag niet kleiner
  // zijn dan 0" leest in plaats van een constraintnaam uit PostgREST. De
  // database controleert dezelfde grenzen nog eens; dit vervangt haar niet.
  valideer(wagenSchema, velden);

  if (!id) {
    const { error } = await supabase.from("vehicles").insert(velden);
    if (error) throw new Error(`Wagen bewaren mislukt: ${error.message}`);
    return;
  }

  // .select() is hier geen detail: een update op een wagen van een ánder
  // bedrijf wordt door RLS niet geweigerd maar raakt gewoon nul rijen. Zonder
  // deze controle lijkt zo'n poging te slagen.
  const { data, error } = await supabase
    .from("vehicles")
    .update(velden)
    .eq("id", id)
    .select("id");
  if (error) throw new Error(`Wagen bewaren mislukt: ${error.message}`);
  if (!data?.length) throw new Error("Wagen bewaren mislukt: wagen niet gevonden.");
}

export async function verwijderWagen(id: string): Promise<void> {
  const { data, error } = await supabase.from("vehicles").delete().eq("id", id).select("id");
  if (error) throw new Error(`Wagen verwijderen mislukt: ${error.message}`);
  if (!data?.length) throw new Error("Wagen verwijderen mislukt: wagen niet gevonden.");
}

export async function bewaarEvaluatie(
  evaluatie: Omit<Evaluatie, "id" | "created_at">,
): Promise<void> {
  const { error } = await supabase.from("evaluations").insert(evaluatie);
  if (error) throw new Error(`Beslissing bewaren mislukt: ${error.message}`);
}

export async function laadEvaluaties(): Promise<Evaluatie[]> {
  const { data, error } = await supabase
    .from("evaluations")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Beslissingen laden mislukt: ${error.message}`);
  return data as Evaluatie[];
}
