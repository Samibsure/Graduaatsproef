export type Voertuigtype = "BEV" | "PHEV" | "HEV" | "fossiel";
export type Brandstof = "elektrisch" | "diesel" | "benzine" | "lpg" | "cng";

/** Fiscale parameters per kalenderjaar (tabel tax_parameters). */
export interface TaxParameters {
  year: number;
  vaa_minimum: number;
  ref_co2_benzine: number;
  ref_co2_diesel: number;
  co2_pct_min: number;
  co2_pct_max: number;
  co2_pct_basis: number;
  co2_pct_per_gram: number;
  rsz_index: number;
  rsz_min_maand: number;
  venb_tarief: number;
  kmo_tarief: number;
  kmo_min_bezoldiging: number;
  vu_pct_met_kaart: number;
  vu_pct_zonder_kaart: number;
}

/** Bestelperiode met bijhorende RSZ-multiplicator (tabel bestelperiodes). */
export interface Bestelperiode {
  code: string;
  label: string;
  van: string | null;
  tot: string | null;
  rsz_multiplicator: number;
  volgorde: number;
}

/** Eén regel uit de aftrekkalender (tabel deduction_rules). gebruiksjaar null = hele gebruiksduur. */
export interface DeductionRule {
  voertuigtype: Voertuigtype;
  bestelperiode: string;
  gebruiksjaar: number | null;
  aftrek_pct: number;
}

/** Invoer per wagen (tabel vehicles, cf. Bijlage 4 tabblad 2 van het rapport). */
export interface Vehicle {
  id: string;
  omschrijving: string;
  werknemer: string | null;
  kenteken: string | null;
  voertuigtype: Voertuigtype;
  brandstof: Brandstof;
  besteldatum: string;
  eerste_ingebruikname: string;
  co2: number;
  cataloguswaarde: number;
  jaarlijkse_autokosten: number;
  aankoopprijs: number | null;
  tankkaart: boolean;
  beroepsgebruik_pct: number;
  thuislaadpunt: boolean;
  km_per_jaar: number | null;
  flex_score: number;
  restwaarde_score: number;
}

/** Alle referentiedata die de rekenkern nodig heeft. */
export interface FiscaleContext {
  parameters: TaxParameters[];
  periodes: Bestelperiode[];
  regels: DeductionRule[];
}

/** Resultaat van de fiscale berekening voor één gebruiksjaar. */
export interface JaarResultaat {
  gebruiksjaar: number;
  aftrekPct: number;
  vaa: number;
  nietAftrekbaar: number;
  vuUitVaa: number;
  verworpenUitgaven: number;
  extraVenB: number;
  rszMaand: number;
  rszJaar: number;
  /** extra VenB + RSZ-bijdrage */
  fiscaleMeerkost: number;
  /** autokosten + fiscale meerkost */
  totaleKost: number;
}

export interface Projectie {
  vehicle: Vehicle;
  jaren: JaarResultaat[];
  totaleKost: number;
  totaleVU: number;
  gemiddeldeAftrekPct: number;
}
