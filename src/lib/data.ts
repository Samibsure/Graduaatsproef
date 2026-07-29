import { supabase } from "./supabase";
import type { CatalogCar, FiscaleContext, Vehicle } from "./fiscaal/types";
import type { Bestelperiode, DeductionRule, TaxParameters } from "./fiscaal/types";
import { DEFAULT_CATALOGUS } from "./fiscaal/catalogusdata";
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

/**
 * Laadt parameters, bestelperiodes en aftrekkalender uit Supabase.
 *
 * Standaard valt deze functie terug op `DEFAULT_CONTEXT` wanneer de databank
 * niet antwoordt: een bezoeker ziet dan liever de gepubliceerde cijfers dan een
 * lege pagina. Met `strikt` gooit ze in plaats daarvan een fout.
 *
 * Die schakelaar is niet cosmetisch. De beheerderspagina vult haar formulier
 * met wat deze functie teruggeeft en schrijft dat op "Bewaren" terug naar de
 * databank. Zou ze de terugval krijgen zonder het te weten, dan overschrijft ze
 * de echte fiscale parameters van heel België met de waarden uit de broncode.
 * Wie schrijft, moet dus strikt lezen.
 */
export async function laadFiscaleContext(
  opties?: { strikt?: boolean },
): Promise<FiscaleContext> {
  const [parameters, periodes, regels] = await Promise.all([
    supabase.from("tax_parameters").select("*").order("year"),
    supabase.from("bestelperiodes").select("*").order("volgorde"),
    supabase.from("deduction_rules").select("*").order("id"),
  ]);
  const fout = parameters.error ?? periodes.error ?? regels.error;
  if (fout) {
    if (opties?.strikt) {
      throw new Error(`Fiscale parameters laden mislukt: ${fout.message}`);
    }
    console.error("Kon fiscale context niet laden, val terug op standaardwaarden", {
      parameters: parameters.error,
      periodes: periodes.error,
      regels: regels.error,
    });
    return DEFAULT_CONTEXT;
  }

  // Een geslaagde query die niets teruggeeft is voor een lezer onschuldig, maar
  // voor de beheerderspagina even gevaarlijk als een fout: een leeg formulier
  // bewaren wist de kalender.
  if (opties?.strikt && !parameters.data?.length) {
    throw new Error("Fiscale parameters laden mislukt: de databank gaf geen enkele rij terug.");
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

/**
 * De wagencatalogus.
 *
 * Komt uit de broncode (`catalogusdata.ts`) en niet meer uit de tabel
 * `car_catalog`. Die tabel bestond alleen in het productieproject: niet in deze
 * repository, niet in een migratie. Uitbreiden ging alleen met de hand, een
 * fout was niet terug te draaien, en viel de databank weg dan viel de catalogus
 * mee weg: deze functie gooide een fout, waardoor startpagina, catalogus én
 * simulator tegelijk stukgingen.
 *
 * Blijft async, zodat de aanroepers niet hoeven te wijzigen en een latere
 * databankbron nog altijd kan.
 */
export async function laadCatalogus(): Promise<CatalogCar[]> {
  return DEFAULT_CATALOGUS;
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
