import { z } from "zod";

/**
 * De ingebouwde meldingen van Zod zijn Engels ("Too small: expected number to
 * be >0"), en die kwamen letterlijk op het scherm terecht. Alleen de eigen
 * `.refine()`-regels hieronder waren Nederlands, dus de gebruiker kreeg een
 * mengeling van twee talen te zien op het moment dat hij een fout moest
 * herstellen.
 *
 * Deze error map vervangt de standaardteksten in één keer. Ze zijn Nederlands,
 * net als de rest van deze laag; de meldingen vertalen naar Frans en Engels
 * vraagt foutcodes in plaats van zinnen en een vertaalslag bij elke aanroeper,
 * en dat is een aparte ingreep.
 */
const TYPENAAM: Record<string, string> = {
  number: "een getal",
  string: "tekst",
  boolean: "ja of nee",
  array: "een lijst",
};

z.config({
  customError: (issue) => {
    switch (issue.code) {
      case "too_small":
        if (issue.inclusive === false) return `moet groter zijn dan ${issue.minimum}`;
        return issue.minimum === 0
          ? "mag niet negatief zijn"
          : `mag niet kleiner zijn dan ${issue.minimum}`;
      case "too_big":
        return issue.inclusive === false
          ? `moet kleiner zijn dan ${issue.maximum}`
          : `mag niet groter zijn dan ${issue.maximum}`;
      case "invalid_type":
        return issue.input === undefined || issue.input === null
          ? "is verplicht"
          : `moet ${TYPENAAM[String(issue.expected)] ?? String(issue.expected)} zijn`;
      case "invalid_value":
        return "is geen toegelaten waarde";
      case "invalid_format":
        return "heeft niet de juiste vorm";
      default:
        return undefined;
    }
  },
});

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

const EURONORMEN = [
  "euro0",
  "euro1",
  "euro2",
  "euro3",
  "euro4",
  "euro5",
  "euro6",
  "euro6d",
  "euro6e",
  "euro6e-bis",
  "euro6e-ter",
  "euro7",
] as const;

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

  // De uitbreidingen uit migratie 0012, met dezelfde grenzen als de constraint
  // vehicles_kostensoorten_geldig.
  kosten_boetes: z.number().min(0).max(1_000_000).optional(),
  kosten_brandstof: z.number().min(0).max(1_000_000).optional(),
  co2_onbekend: z.boolean().optional(),
  batterij_kwh: z.number().min(0).max(500).nullable().optional(),
  wagengewicht: z.number().min(0).max(10_000).nullable().optional(),
  euronorm: z.enum(EURONORMEN).nullable().optional(),
  co2_equivalent: z.number().min(0).max(1000).nullable().optional(),
  gewest: z.enum(["vlaanderen", "wallonie", "brussel"]).nullable().optional(),
  fiscale_pk: z.number().min(0).max(100).nullable().optional(),
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
  )
  .refine(
    (w) => (w.kosten_brandstof ?? 0) <= w.jaarlijkse_autokosten,
    {
      message: "de brandstofkosten kunnen niet groter zijn dan de jaarlijkse autokosten",
      path: ["kosten_brandstof"],
    },
  );

const CARROSSERIEEN = [
  "hatchback",
  "berline",
  "break",
  "suv",
  "mpv",
  "coupe",
  "bestelwagen",
] as const;
const AANDRIJVINGEN = ["voor", "achter", "vierwiel"] as const;
const ONDERHOUDSKLASSEN = ["laag", "midden", "hoog"] as const;

/**
 * Een eigen wagenmodel van een bedrijf.
 *
 * Spiegelt de CHECK-constraints van `eigen_modellen` in migratie 0010, om
 * dezelfde reden als hierboven: de database weigert het toch wel, maar dan met
 * een constraintnaam in plaats van met de naam van het veld.
 *
 * De laatste twee regels zijn geen vormcontrole maar een inhoudelijke: een
 * elektrische wagen met uitstoot, of een verbrandingswagen zonder, is een
 * tikfout. Die glipt anders door tot in de vergelijking, waar hij een kandidaat
 * onterecht laat winnen.
 */
export const eigenModelSchema = z
  .object({
    merk: z.string().trim().min(1).max(60),
    model: z.string().trim().min(1).max(80),
    uitvoering: z.string().trim().max(80).nullable().optional(),
    voertuigtype: z.enum(VOERTUIGTYPES),
    brandstof: z.enum(BRANDSTOFFEN),
    carrosserie: z.enum(CARROSSERIEEN).nullable().optional(),
    segment: z.string().trim().max(80).nullable().optional(),
    modeljaar: z.number().int().min(1990).max(2100).nullable().optional(),
    bron: z.string().trim().max(200).nullable().optional(),
    co2: z.number().min(0).max(1000),
    cataloguswaarde: z.number().gt(0).max(1_000_000),
    vermogen_kw: z.number().gt(0).max(2000).nullable().optional(),
    aandrijving: z.enum(AANDRIJVINGEN).nullable().optional(),
    verbruik: z.number().min(0).max(100).nullable().optional(),
    batterij_kwh: z.number().min(0).max(500).nullable().optional(),
    actieradius_km: z.number().min(0).max(2000).nullable().optional(),
    laadvermogen_dc_kw: z.number().min(0).max(1000).nullable().optional(),
    zitplaatsen: z.number().int().min(1).max(9).nullable().optional(),
    koffer_liter: z.number().min(0).max(10_000).nullable().optional(),
    trekgewicht_kg: z.number().min(0).max(3500).nullable().optional(),
    restwaarde_pct_4j: z.number().min(0).max(100).nullable().optional(),
    onderhoudsklasse: z.enum(ONDERHOUDSKLASSEN).nullable().optional(),
    uitrusting: z.array(z.string().trim().max(60)).max(30).optional(),
    image_url: z.string().trim().max(500).nullable().optional(),
    opmerking: z.string().trim().max(500).nullable().optional(),
  })
  .refine(
    (m) => m.voertuigtype !== "BEV" || m.co2 === 0,
    { message: "een volledig elektrische wagen stoot 0 g CO₂/km uit", path: ["co2"] },
  )
  .refine(
    (m) => m.voertuigtype === "BEV" || m.co2 > 0,
    { message: "een wagen die brandstof verbrandt, stoot meer dan 0 g CO₂/km uit", path: ["co2"] },
  )
  .refine(
    (m) => m.voertuigtype !== "BEV" || m.brandstof === "elektrisch",
    { message: "een volledig elektrische wagen rijdt op elektriciteit", path: ["brandstof"] },
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
  return fout.issues
    .map((i) => `${veldnaam(i.path.map(String).join(".")) || "veld"}: ${i.message}`)
    .join("; ");
}

/**
 * Het pad uit Zod is een databankkolom (`cataloguswaarde`, `beroepsgebruik_pct`).
 * Dat is precies wat de gebruiker niet ziet staan op zijn scherm. Deze tabel zet
 * er het label bij dat wél in het formulier staat; wat er niet in staat, valt
 * terug op de kolomnaam.
 */
const VELDNAMEN: Record<string, string> = {
  omschrijving: "Omschrijving",
  werknemer: "Werknemer",
  kenteken: "Kenteken",
  merk: "Merk",
  model: "Model",
  uitvoering: "Uitvoering",
  voertuigtype: "Voertuigtype",
  brandstof: "Brandstof",
  carrosserie: "Carrosserie",
  besteldatum: "Besteldatum",
  eerste_ingebruikname: "Eerste ingebruikname",
  einde_contract: "Einde contract",
  co2: "CO2",
  cataloguswaarde: "Cataloguswaarde",
  aankoopprijs: "Aankoopprijs",
  jaarlijkse_autokosten: "Jaarlijkse autokosten",
  beroepsgebruik_pct: "Beroepsgebruik",
  km_per_jaar: "Kilometers per jaar",
  flex_score: "Flexibiliteitsscore",
  restwaarde_score: "Restwaardescore",
  vermogen_kw: "Vermogen",
  verbruik: "Verbruik",
  batterij_kwh: "Batterijcapaciteit",
  actieradius_km: "Actieradius",
  laadvermogen_dc_kw: "Laadvermogen",
  zitplaatsen: "Zitplaatsen",
  koffer_liter: "Koffervolume",
  trekgewicht_kg: "Trekgewicht",
  wagengewicht: "Wagengewicht",
  restwaarde_pct_4j: "Restwaarde na 4 jaar",
  onderhoudsklasse: "Onderhoudsklasse",
  modeljaar: "Modeljaar",
  euronorm: "Euronorm",
  gewest: "Gewest",
  naam: "Bedrijfsnaam",
  ondernemingsnummer: "Ondernemingsnummer",
  btw_nummer: "Btw-nummer",
  postcode: "Postcode",
  gemeente: "Gemeente",
  boekjaar_start_maand: "Startmaand boekjaar",
};

function veldnaam(pad: string): string {
  return VELDNAMEN[pad] ?? pad;
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
