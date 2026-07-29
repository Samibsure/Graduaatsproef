import type { CatalogCar } from "./fiscaal/types";
import { isOntbrekendeTabel } from "./postgrest";
import { supabase } from "./supabase";
import { eigenModelSchema, valideer } from "./validatie";

/**
 * De eigen modellenbibliotheek van een bedrijf.
 *
 * De ingebouwde catalogus dekt de courante Belgische bedrijfswagens, maar niet
 * elk bedrijf rijdt courant. Een specifieke uitvoering, een importmodel, een
 * bestaand contract met cijfers uit de offerte: dat hoort in de applicatie te
 * kunnen zonder dat er iemand aan de nationale referentiedata raakt.
 *
 * Waarom een eigen tabel en niet `car_catalog`: die tabel is nationale
 * referentiedata, alleen beschrijfbaar door een platformbeheerder (migratie
 * 0004), en ze heeft geen `company_id`. Er is dus geen enkele manier om er per
 * bedrijf iets aan toe te voegen zonder het voor iedereen te veranderen.
 *
 * Net als bij de wagens filtert niets hier expliciet op bedrijf: de RLS-policies
 * uit migratie 0010 beperken elke query tot het bedrijf uit de sessie, en de
 * kolom `company_id` krijgt haar waarde uit een default. De browser stuurt ze
 * dus nooit mee en kan er ook geen verzinnen.
 */

/** Wat een gebruiker invult. Zonder de velden die de applicatie zelf afleidt. */
export type EigenModelInvoer = Omit<
  CatalogCar,
  "id" | "slug" | "populariteit_rang" | "modeljaar_tot"
>;

/**
 * Een bewaard eigen model.
 *
 * Het is een volwaardige CatalogCar, zodat het overal werkt waar een
 * catalogusmodel werkt: in de kostenberekening, in de fiscale preview en in de
 * vergelijking. Alleen de herkomst verschilt, en dat zit in de twee extra velden.
 */
export interface EigenModel extends CatalogCar {
  /** uuid uit de databank, in tegenstelling tot het volgnummer van de catalogus. */
  eigen_id: string;
  created_at: string;
}

/** De kolommen die de tabel echt heeft; `id` is een uuid en wordt hernoemd. */
const VELDEN =
  "id, merk, model, uitvoering, voertuigtype, brandstof, carrosserie, segment, modeljaar, bron, " +
  "co2, cataloguswaarde, vermogen_kw, aandrijving, verbruik, batterij_kwh, actieradius_km, " +
  "laadvermogen_dc_kw, zitplaatsen, koffer_liter, trekgewicht_kg, restwaarde_pct_4j, " +
  "onderhoudsklasse, uitrusting, image_url, opmerking, created_at";

/**
 * Een rij uit de databank naar het type dat de rest van de applicatie kent.
 *
 * `id` is hier een uuid, terwijl `CatalogCar.id` een getal is dat de catalogus
 * als volgnummer gebruikt. Om te vermijden dat een eigen model botst met een
 * catalogusmodel, krijgen eigen modellen een negatief volgnummer: dat kan nooit
 * met een rij uit catalogusdata.ts samenvallen.
 */
function naarModel(rij: Record<string, unknown>, index: number): EigenModel {
  return {
    eigen_id: rij.id as string,
    id: -(index + 1),
    slug: `eigen-${rij.id as string}`,
    merk: rij.merk as string,
    model: rij.model as string,
    uitvoering: (rij.uitvoering as string) ?? null,
    voertuigtype: rij.voertuigtype as CatalogCar["voertuigtype"],
    brandstof: rij.brandstof as CatalogCar["brandstof"],
    carrosserie: (rij.carrosserie as CatalogCar["carrosserie"]) ?? null,
    segment: (rij.segment as string) ?? null,
    modeljaar: (rij.modeljaar as number) ?? null,
    modeljaar_tot: null,
    bron: (rij.bron as string) ?? null,
    co2: Number(rij.co2),
    cataloguswaarde: Number(rij.cataloguswaarde),
    vermogen_kw: rij.vermogen_kw === null ? null : Number(rij.vermogen_kw),
    aandrijving: (rij.aandrijving as CatalogCar["aandrijving"]) ?? null,
    verbruik: rij.verbruik === null ? null : Number(rij.verbruik),
    batterij_kwh: rij.batterij_kwh === null ? null : Number(rij.batterij_kwh),
    actieradius_km: rij.actieradius_km === null ? null : Number(rij.actieradius_km),
    laadvermogen_dc_kw: rij.laadvermogen_dc_kw === null ? null : Number(rij.laadvermogen_dc_kw),
    zitplaatsen: rij.zitplaatsen === null ? null : Number(rij.zitplaatsen),
    koffer_liter: rij.koffer_liter === null ? null : Number(rij.koffer_liter),
    trekgewicht_kg: rij.trekgewicht_kg === null ? null : Number(rij.trekgewicht_kg),
    restwaarde_pct_4j: rij.restwaarde_pct_4j === null ? null : Number(rij.restwaarde_pct_4j),
    onderhoudsklasse: (rij.onderhoudsklasse as CatalogCar["onderhoudsklasse"]) ?? null,
    uitrusting: (rij.uitrusting as string[]) ?? [],
    populariteit_rang: null,
    opmerking: (rij.opmerking as string) ?? null,
    image_url: (rij.image_url as string) ?? null,
    created_at: rij.created_at as string,
  } as EigenModel;
}

export interface EigenModellenResultaat {
  modellen: EigenModel[];
  /**
   * True wanneer migratie 0010 nog niet is uitgevoerd. De interface toont dan
   * uitleg in plaats van een lege lijst die suggereert dat er nog niets is.
   */
  nogNietBeschikbaar: boolean;
}

export async function laadEigenModellen(): Promise<EigenModellenResultaat> {
  const { data, error } = await supabase
    .from("eigen_modellen")
    .select(VELDEN)
    .order("merk")
    .order("model");

  if (error) {
    if (isOntbrekendeTabel(error)) return { modellen: [], nogNietBeschikbaar: true };
    throw new Error(`Eigen modellen laden mislukt: ${error.message}`);
  }
  return {
    modellen: (data as unknown as Record<string, unknown>[]).map(naarModel),
    nogNietBeschikbaar: false,
  };
}

/** Wat er naar de databank gaat: alleen de kolommen, zonder afgeleide velden. */
function naarRij(invoer: Partial<EigenModelInvoer>) {
  const gevalideerd = valideer(eigenModelSchema, {
    merk: invoer.merk,
    model: invoer.model,
    uitvoering: invoer.uitvoering ?? null,
    voertuigtype: invoer.voertuigtype,
    brandstof: invoer.brandstof,
    carrosserie: invoer.carrosserie ?? null,
    segment: invoer.segment ?? null,
    modeljaar: invoer.modeljaar ?? null,
    bron: invoer.bron ?? null,
    co2: invoer.co2,
    cataloguswaarde: invoer.cataloguswaarde,
    vermogen_kw: invoer.vermogen_kw ?? null,
    aandrijving: invoer.aandrijving ?? null,
    verbruik: invoer.verbruik ?? null,
    batterij_kwh: invoer.batterij_kwh ?? null,
    actieradius_km: invoer.actieradius_km ?? null,
    laadvermogen_dc_kw: invoer.laadvermogen_dc_kw ?? null,
    zitplaatsen: invoer.zitplaatsen ?? null,
    koffer_liter: invoer.koffer_liter ?? null,
    trekgewicht_kg: invoer.trekgewicht_kg ?? null,
    restwaarde_pct_4j: invoer.restwaarde_pct_4j ?? null,
    onderhoudsklasse: invoer.onderhoudsklasse ?? null,
    uitrusting: invoer.uitrusting ?? [],
    image_url: invoer.image_url ?? null,
    opmerking: invoer.opmerking ?? null,
  });
  return gevalideerd;
}

export async function bewaarEigenModel(
  invoer: Partial<EigenModelInvoer> & { eigen_id?: string },
): Promise<void> {
  const rij = naarRij(invoer);

  if (!invoer.eigen_id) {
    const { error } = await supabase.from("eigen_modellen").insert(rij);
    if (error) throw new Error(`Model bewaren mislukt: ${vertaal(error)}`);
    return;
  }

  // .select() zoals overal: RLS weigert een update zonder rechten niet met een
  // fout maar raakt nul rijen. Zonder deze controle lijkt ze te slagen.
  const { data, error } = await supabase
    .from("eigen_modellen")
    .update(rij)
    .eq("id", invoer.eigen_id)
    .select("id");
  if (error) throw new Error(`Model bewaren mislukt: ${vertaal(error)}`);
  if (!data?.length) throw new Error("Model bewaren mislukt: geen rechten of niet gevonden.");
}

export async function verwijderEigenModel(eigenId: string): Promise<void> {
  const { data, error } = await supabase
    .from("eigen_modellen")
    .delete()
    .eq("id", eigenId)
    .select("id");
  if (error) throw new Error(`Model verwijderen mislukt: ${vertaal(error)}`);
  if (!data?.length) throw new Error("Model verwijderen mislukt: geen rechten of niet gevonden.");
}

/**
 * Meerdere modellen tegelijk, in één verzoek.
 *
 * De CSV-import van de vloot doet één netwerkverzoek per regel; bij een bestand
 * van tweehonderd rijen zijn dat tweehonderd rondritten. Hier gaat alles in één
 * insert, met de validatie vooraf per regel zodat de gebruiker nog altijd weet
 * wélke rij fout is.
 */
export interface ImportUitkomst {
  gelukt: number;
  fouten: Array<{ regel: number; bericht: string }>;
}

export async function importeerEigenModellen(
  rijen: Array<Partial<EigenModelInvoer>>,
): Promise<ImportUitkomst> {
  const geldig: ReturnType<typeof naarRij>[] = [];
  const fouten: ImportUitkomst["fouten"] = [];

  rijen.forEach((rij, i) => {
    try {
      geldig.push(naarRij(rij));
    } catch (e) {
      // +2: de kopregel telt mee, en mensen tellen vanaf één.
      fouten.push({ regel: i + 2, bericht: e instanceof Error ? e.message : String(e) });
    }
  });

  if (geldig.length === 0) return { gelukt: 0, fouten };

  const { error } = await supabase.from("eigen_modellen").insert(geldig);
  if (error) throw new Error(`Modellen invoeren mislukt: ${vertaal(error)}`);
  return { gelukt: geldig.length, fouten };
}

function vertaal(fout: { code?: string; message: string }): string {
  if (isOntbrekendeTabel(fout)) {
    return "de eigen modellenbibliotheek is nog niet klaargezet in de databank.";
  }
  return fout.message;
}
