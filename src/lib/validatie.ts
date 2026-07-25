import { z } from "zod";

/**
 * Invoervalidatie.
 *
 * Deze schema's zijn een bewuste kopie van de CHECK-constraints in
 * supabase/migrations/0006_bedrijfsprofiel_en_validatie.sql. Die duplicatie is
 * gewild: de database is de grens die niet te omzeilen valt, maar een
 * constraintfout uit PostgREST leest als
 * "new row violates check constraint vehicles_waarden_geldig". Deze laag vangt
 * dezelfde fout af vóór het netwerkverzoek en zegt welk veld er mis is.
 *
 * Wijzigt een grens hier, wijzig ze dan ook in de migratie.
 */

const VOERTUIGTYPES = ["BEV", "PHEV", "HEV", "fossiel"] as const;
const BRANDSTOFFEN = ["elektrisch", "diesel", "benzine", "lpg", "cng"] as const;
const CATEGORIEEN = ["vloot", "kandidaat"] as const;

/** Een datum in ISO-notatie binnen het bereik dat de database aanvaardt. */
const datum = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "verwachtte een datum in de vorm jjjj-mm-dd")
  .refine((d) => d >= "1990-01-01" && d <= "2100-12-31", "datum ligt buiten 1990-2100");

export const wagenSchema = z.object({
  omschrijving: z.string().trim().min(1).max(120),
  categorie: z.enum(CATEGORIEEN),
  voertuigtype: z.enum(VOERTUIGTYPES),
  brandstof: z.enum(BRANDSTOFFEN),
  besteldatum: datum,
  eerste_ingebruikname: datum,
  co2: z.number().min(0).max(1000),
  cataloguswaarde: z.number().gt(0).max(1_000_000),
  jaarlijkse_autokosten: z.number().min(0).max(1_000_000),
  aankoopprijs: z.number().min(0).max(1_000_000).nullable(),
  beroepsgebruik_pct: z.number().min(0).max(100),
  km_per_jaar: z.number().min(0).max(500_000).nullable(),
  flex_score: z.number().min(1).max(10),
  restwaarde_score: z.number().min(1).max(10),
  tankkaart: z.boolean(),
  thuislaadpunt: z.boolean(),

  // De uitbreidingen uit migratie 0007. Allemaal optioneel, met dezelfde
  // grenzen als de constraint vehicles_uitbreiding_geldig.
  kosten_financiering: z.number().min(0).max(1_000_000).nullable().optional(),
  financieringsvorm: z
    .enum(["operationele_leasing", "financiele_leasing", "renting", "aankoop"])
    .nullable()
    .optional(),
  btw_methode: z.enum(["geen", "forfait35", "werkelijk"]).optional(),
  btw_tarief: z.number().min(0).max(100).optional(),
  eigen_bijdrage_maand: z.number().min(0).max(100_000).optional(),
  laadpaal_jaarkost: z.number().min(0).max(1_000_000).optional(),
  laadstroom_jaar: z.number().min(0).max(1_000_000).optional(),
  start_contract: datum.nullable().optional(),
  einde_contract: datum.nullable().optional(),
})
  .refine(
    (w) => !w.start_contract || !w.einde_contract || w.einde_contract >= w.start_contract,
    { message: "het einde van het contract ligt vóór de start", path: ["einde_contract"] },
  )
  .refine(
    (w) => (w.kosten_financiering ?? 0) <= w.jaarlijkse_autokosten,
    {
      message: "de financieringskosten kunnen niet groter zijn dan de jaarlijkse autokosten",
      path: ["kosten_financiering"],
    },
  );

export const bedrijfSchema = z.object({
  naam: z.string().trim().min(2).max(120),
  ondernemingsnummer: z.string().trim().max(32).nullable(),
  btw_nummer: z.string().trim().max(32).nullable(),
  adres: z.string().trim().max(200).nullable(),
  postcode: z.string().trim().max(12).nullable(),
  gemeente: z.string().trim().max(100).nullable(),
  is_kmo: z.boolean(),
  boekjaar_start_maand: z.number().int().min(1).max(12),
});

/**
 * Zet een validatiefout om in één leesbare zin per veld. Zod levert een pad en
 * een boodschap; de gebruiker heeft aan "co2: getal mag niet kleiner zijn dan 0"
 * meer dan aan een geneste foutenstructuur.
 */
export function leesbareFout(fout: z.ZodError): string {
  return fout.issues.map((i) => `${i.path.join(".") || "veld"}: ${i.message}`).join("; ");
}

/**
 * Valideert en geeft de geparste waarde terug, of gooit met een leesbare tekst.
 * Bewust een throw en geen resultaatobject: elke aanroeper in deze codebase zit
 * al in een try/catch die de melding toont.
 */
export function valideer<T extends z.ZodType>(schema: T, waarde: unknown): z.infer<T> {
  const resultaat = schema.safeParse(waarde);
  if (!resultaat.success) throw new Error(leesbareFout(resultaat.error));
  return resultaat.data;
}
