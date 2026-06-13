import type {
  Bestelperiode,
  Brandstof,
  FiscaleContext,
  JaarResultaat,
  Projectie,
  TaxParameters,
  Vehicle,
} from "./types";

/**
 * Rekenkern van de beslissingstool. Alle formules komen letterlijk uit het
 * rapport "Autofiscaliteit: impact van autokosten op verworpen uitgaven bij
 * B-sure NV" (paragraaf 1.4.1 en Bijlagen 1 en 3).
 */

/** Coëfficiënt in de gramformule per brandstoftype (FOD Financiën, 2025). */
const GRAMFORMULE_COEFF: Record<Brandstof, number> = {
  diesel: 1,
  benzine: 0.95,
  lpg: 0.95,
  elektrisch: 0.95,
  cng: 0.9,
};

/** Aftrektrekterm in de RSZ-CO₂-formule per brandstoftype (RSZ-instructies). */
const RSZ_CONSTANTE: Record<Brandstof, number> = {
  diesel: 600,
  benzine: 768,
  cng: 768,
  lpg: 990,
  elektrisch: 768,
};

/** Datum vanaf wanneer het verhoogde RSZ-regime (hoger minimum + multiplicator) geldt. */
const RSZ_VERHOGING_VANAF = "2023-07-01";

export function parametersVoorJaar(ctx: FiscaleContext, jaar: number): TaxParameters {
  const exact = ctx.parameters.find((p) => p.year === jaar);
  if (exact) return exact;
  // Buiten de gekende jaren: neem het dichtstbijzijnde gekende jaar.
  const gesorteerd = [...ctx.parameters].sort((a, b) => a.year - b.year);
  if (jaar < gesorteerd[0].year) return gesorteerd[0];
  return gesorteerd[gesorteerd.length - 1];
}

/** Bepaalt onder welke bestelperiode (en dus welk regime) een besteldatum valt. */
export function bestelperiodeVoorDatum(ctx: FiscaleContext, besteldatum: string): Bestelperiode {
  const d = besteldatum;
  const match = ctx.periodes.find(
    (p) => (p.van === null || d >= p.van) && (p.tot === null || d <= p.tot),
  );
  if (!match) throw new Error(`Geen bestelperiode gevonden voor datum ${besteldatum}`);
  return match;
}

/**
 * Gramformule voor wagens besteld vóór 1 juli 2023:
 * 120% − (0,5% × coëfficiënt × CO₂), begrensd tussen 50% en 100%.
 */
export function gramformule(brandstof: Brandstof, co2: number): number {
  const pct = 120 - 0.5 * GRAMFORMULE_COEFF[brandstof] * co2;
  return Math.min(100, Math.max(50, pct));
}

/** Aftrekbaarheid in VenB voor een wagen in een bepaald gebruiksjaar (Tabel 1). */
export function aftrekPct(ctx: FiscaleContext, vehicle: Vehicle, gebruiksjaar: number): number {
  const periode = bestelperiodeVoorDatum(ctx, vehicle.besteldatum);
  if (periode.code === "voor_07_2023") {
    return gramformule(vehicle.brandstof, vehicle.co2);
  }
  const regels = ctx.regels.filter(
    (r) => r.voertuigtype === vehicle.voertuigtype && r.bestelperiode === periode.code,
  );
  const exact = regels.find((r) => r.gebruiksjaar === gebruiksjaar);
  if (exact) return exact.aftrek_pct;
  const levenslang = regels.find((r) => r.gebruiksjaar === null);
  if (levenslang) return levenslang.aftrek_pct;
  // Uitdoofkalender: vóór het eerste kalenderjaar geldt de hoogste trap,
  // na het laatste kalenderjaar de laagste (0%).
  const perJaar = regels
    .filter((r) => r.gebruiksjaar !== null)
    .sort((a, b) => (a.gebruiksjaar as number) - (b.gebruiksjaar as number));
  if (perJaar.length === 0) return 0;
  if (gebruiksjaar < (perJaar[0].gebruiksjaar as number)) return perJaar[0].aftrek_pct;
  return perJaar[perJaar.length - 1].aftrek_pct;
}

/** Leeftijdscorrectie VAA: 100% in het eerste jaar, −6% per jaar, minimum 70%. */
export function leeftijdscorrectie(gebruiksjaar: number, jaarIngebruikname: number): number {
  const verstreken = Math.max(0, gebruiksjaar - jaarIngebruikname);
  return Math.max(70, 100 - 6 * verstreken) / 100;
}

/**
 * CO₂-percentage voor de VAA-berekening: 5,5% bij de referentie-CO₂,
 * +0,1% per gram daarboven, begrensd tussen 4% en 18%.
 */
export function co2Percentage(params: TaxParameters, brandstof: Brandstof, co2: number): number {
  const referentie = brandstof === "diesel" ? params.ref_co2_diesel : params.ref_co2_benzine;
  const pct = params.co2_pct_basis + (co2 - referentie) * params.co2_pct_per_gram;
  return Math.min(params.co2_pct_max, Math.max(params.co2_pct_min, pct));
}

/** VAA = cataloguswaarde × 6/7 × leeftijdscorrectie × CO₂-percentage, met wettelijk minimum. */
export function voordeelAlleAard(
  ctx: FiscaleContext,
  vehicle: Vehicle,
  gebruiksjaar: number,
): number {
  const params = parametersVoorJaar(ctx, gebruiksjaar);
  const jaarIngebruikname = new Date(vehicle.eerste_ingebruikname).getFullYear();
  const vaa =
    vehicle.cataloguswaarde *
    (6 / 7) *
    leeftijdscorrectie(gebruiksjaar, jaarIngebruikname) *
    (co2Percentage(params, vehicle.brandstof, vehicle.co2) / 100);
  return Math.max(params.vaa_minimum, vaa);
}

/**
 * CO₂-solidariteitsbijdrage RSZ per maand:
 * ((CO₂ × 9 − constante) / 12) × indexcoëfficiënt × multiplicator,
 * met een minimumbijdrage als ondergrens. De constante hangt af van de
 * brandstof (diesel 600, benzine/CNG 768, LPG 990). Voor niet-emissievrije
 * wagens besteld vanaf 1/7/2023 geldt het verhoogde regime: een hogere
 * multiplicator (die per bijdragejaar oploopt) en een hoger minimum. Volledig
 * elektrische wagens en wagens besteld vóór 1/7/2023 vallen op het basisminimum
 * zonder multiplicator.
 */
export function rszBijdrageMaand(
  ctx: FiscaleContext,
  vehicle: Vehicle,
  gebruiksjaar: number,
): number {
  const params = parametersVoorJaar(ctx, gebruiksjaar);
  const verhoogdRegime =
    vehicle.voertuigtype !== "BEV" && vehicle.besteldatum >= RSZ_VERHOGING_VANAF;
  const multiplicator = verhoogdRegime ? params.rsz_multiplicator : 1;
  const minimum = verhoogdRegime ? params.rsz_min_maand : params.rsz_min_basis;
  const basis =
    ((vehicle.co2 * 9 - RSZ_CONSTANTE[vehicle.brandstof]) / 12) * params.rsz_index * multiplicator;
  return Math.max(minimum, basis);
}

/** Volledige fiscale berekening voor één gebruiksjaar (cf. Bijlage 1 van het rapport). */
export function berekenJaar(
  ctx: FiscaleContext,
  vehicle: Vehicle,
  gebruiksjaar: number,
  opties?: { kmoTarief?: boolean },
): JaarResultaat {
  const params = parametersVoorJaar(ctx, gebruiksjaar);
  const aftrek = aftrekPct(ctx, vehicle, gebruiksjaar);
  const vaa = voordeelAlleAard(ctx, vehicle, gebruiksjaar);
  const nietAftrekbaar = (1 - aftrek / 100) * vehicle.jaarlijkse_autokosten;
  const vuPct = vehicle.tankkaart ? params.vu_pct_met_kaart : params.vu_pct_zonder_kaart;
  const vuUitVaa = (vuPct / 100) * vaa;
  const verworpenUitgaven = nietAftrekbaar + vuUitVaa;
  const tarief = opties?.kmoTarief ? params.kmo_tarief : params.venb_tarief;
  const extraVenB = verworpenUitgaven * (tarief / 100);
  const rszMaand = rszBijdrageMaand(ctx, vehicle, gebruiksjaar);
  const rszJaar = rszMaand * 12;
  const fiscaleMeerkost = extraVenB + rszJaar;
  return {
    gebruiksjaar,
    aftrekPct: aftrek,
    vaa,
    nietAftrekbaar,
    vuUitVaa,
    verworpenUitgaven,
    extraVenB,
    rszMaand,
    rszJaar,
    fiscaleMeerkost,
    totaleKost: vehicle.jaarlijkse_autokosten + fiscaleMeerkost,
  };
}

/** Meerjarenprojectie (standaard 4 gebruiksjaren) met toepassing van de uitdoofkalender. */
export function berekenProjectie(
  ctx: FiscaleContext,
  vehicle: Vehicle,
  startjaar: number,
  aantalJaren = 4,
  opties?: { kmoTarief?: boolean },
): Projectie {
  const eersteJaar = Math.max(startjaar, new Date(vehicle.eerste_ingebruikname).getFullYear());
  const jaren: JaarResultaat[] = [];
  for (let i = 0; i < aantalJaren; i++) {
    jaren.push(berekenJaar(ctx, vehicle, eersteJaar + i, opties));
  }
  return {
    vehicle,
    jaren,
    totaleKost: jaren.reduce((s, j) => s + j.totaleKost, 0),
    totaleVU: jaren.reduce((s, j) => s + j.verworpenUitgaven, 0),
    gemiddeldeAftrekPct: jaren.reduce((s, j) => s + j.aftrekPct, 0) / jaren.length,
  };
}
