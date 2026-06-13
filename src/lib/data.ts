import { supabase } from "./supabase";
import { DEFAULT_CONTEXT, DEFAULT_PARAMETERS, DEFAULT_PERIODES, DEFAULT_REGELS } from "./fiscaal/defaults";
import type {
  Bestelperiode,
  CatalogCar,
  DeductionRule,
  FiscaleContext,
  TaxParameters,
  Vehicle,
} from "./fiscaal/types";
import type { ScoreResultaat } from "./fiscaal/scoring";

export interface Evaluatie {
  id: string;
  titel: string;
  vehicle_ids: string[];
  resultaten: ScoreResultaat[];
  aanbeveling: string;
  notitie: string | null;
  created_at: string;
}

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
  const { error } = id
    ? await supabase.from("vehicles").update(velden).eq("id", id)
    : await supabase.from("vehicles").insert(velden);
  if (error) throw new Error(`Wagen bewaren mislukt: ${error.message}`);
}

export async function verwijderWagen(id: string): Promise<void> {
  const { error } = await supabase.from("vehicles").delete().eq("id", id);
  if (error) throw new Error(`Wagen verwijderen mislukt: ${error.message}`);
}

export async function bewaarParameters(params: TaxParameters): Promise<void> {
  const { error } = await supabase
    .from("tax_parameters")
    .update({ ...params, updated_at: new Date().toISOString() })
    .eq("year", params.year);
  if (error) throw new Error(`Parameters bewaren mislukt: ${error.message}`);
}

export async function bewaarMultiplicator(code: string, multiplicator: number): Promise<void> {
  const { error } = await supabase
    .from("bestelperiodes")
    .update({ rsz_multiplicator: multiplicator })
    .eq("code", code);
  if (error) throw new Error(`Multiplicator bewaren mislukt: ${error.message}`);
}

export async function bewaarAftrekRegel(regel: DeductionRule): Promise<void> {
  let query = supabase
    .from("deduction_rules")
    .update({ aftrek_pct: regel.aftrek_pct })
    .eq("voertuigtype", regel.voertuigtype)
    .eq("bestelperiode", regel.bestelperiode);
  query =
    regel.gebruiksjaar === null
      ? query.is("gebruiksjaar", null)
      : query.eq("gebruiksjaar", regel.gebruiksjaar);
  const { error } = await query;
  if (error) throw new Error(`Aftrekregel bewaren mislukt: ${error.message}`);
}

/** Zet parameters, periodes en aftrekkalender terug naar de waarden uit het rapport. */
export async function herstelStandaardwaarden(): Promise<void> {
  const fouten: string[] = [];
  for (const p of DEFAULT_PARAMETERS) {
    const { error } = await supabase.from("tax_parameters").upsert(p, { onConflict: "year" });
    if (error) fouten.push(error.message);
  }
  for (const per of DEFAULT_PERIODES) {
    const { error } = await supabase.from("bestelperiodes").upsert(per, { onConflict: "code" });
    if (error) fouten.push(error.message);
  }
  const del = await supabase.from("deduction_rules").delete().gte("id", 0);
  if (del.error) fouten.push(del.error.message);
  const ins = await supabase.from("deduction_rules").insert(DEFAULT_REGELS);
  if (ins.error) fouten.push(ins.error.message);
  if (fouten.length) throw new Error(`Herstellen mislukt: ${fouten.join("; ")}`);
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
