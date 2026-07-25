import { supabase } from "./supabase";
import type { DeductionRule, TaxParameters } from "./fiscaal/types";

/**
 * Schrijfacties op de nationale referentiedata. Alleen een platformbeheerder
 * kan deze uitvoeren; de RLS-policies in
 * supabase/migrations/0004_referentiedata_readonly.sql weigeren de rest.
 */

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

/**
 * Zet de referentiedata terug naar de gepubliceerde standaardwaarden.
 *
 * Dit was een reeks losse delete- en insert-aanroepen vanuit de browser, die
 * elke anonieme bezoeker kon uitvoeren. Het is nu één databasefunctie met een
 * beheerderscontrole in de functie zelf.
 */
export async function herstelStandaardwaarden(): Promise<void> {
  const { error } = await supabase.rpc("herstel_standaardwaarden");
  if (error) throw new Error(`Herstellen mislukt: ${error.message}`);
}
