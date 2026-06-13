import type { Bestelperiode, DeductionRule, FiscaleContext, TaxParameters } from "./types";

/**
 * Standaardwaarden zoals beschreven in het rapport (Tabellen 1-3 en Bijlage 3).
 * Deze data wordt ook als seed in Supabase geladen; dit bestand dient als
 * referentie voor "herstel standaardwaarden" en voor de unit tests.
 */

export const DEFAULT_PARAMETERS: TaxParameters[] = [2025, 2026, 2027, 2028, 2029, 2030, 2031].map(
  (year) => ({
    year,
    vaa_minimum: year === 2025 ? 1650 : 1690,
    ref_co2_benzine: year === 2025 ? 71 : 70,
    ref_co2_diesel: year === 2025 ? 59 : 58,
    co2_pct_min: 4,
    co2_pct_max: 18,
    co2_pct_basis: 5.5,
    co2_pct_per_gram: 0.1,
    rsz_index: year === 2025 ? 1.5948 : 1.6291,
    rsz_min_maand: year === 2025 ? 37.33 : 42.34,
    venb_tarief: 25,
    kmo_tarief: 20,
    kmo_min_bezoldiging: year === 2025 ? 45000 : 50000,
    vu_pct_met_kaart: 40,
    vu_pct_zonder_kaart: 17,
  }),
);

export const DEFAULT_PERIODES: Bestelperiode[] = [
  { code: "voor_07_2023", label: "Vóór 1 juli 2023 (gramformule)", van: null, tot: "2023-06-30", rsz_multiplicator: 1, volgorde: 1 },
  { code: "2023H2_2025", label: "1 juli 2023 – 31 december 2025", van: "2023-07-01", tot: "2025-12-31", rsz_multiplicator: 4, volgorde: 2 },
  { code: "2026", label: "1 januari – 31 december 2026", van: "2026-01-01", tot: "2026-12-31", rsz_multiplicator: 4, volgorde: 3 },
  { code: "2027", label: "Kalenderjaar 2027", van: "2027-01-01", tot: "2027-12-31", rsz_multiplicator: 5.5, volgorde: 4 },
  { code: "2028", label: "Kalenderjaar 2028", van: "2028-01-01", tot: "2028-12-31", rsz_multiplicator: 6, volgorde: 5 },
  { code: "2029", label: "Kalenderjaar 2029", van: "2029-01-01", tot: "2029-12-31", rsz_multiplicator: 6, volgorde: 6 },
  { code: "2030", label: "Kalenderjaar 2030", van: "2030-01-01", tot: "2030-12-31", rsz_multiplicator: 6, volgorde: 7 },
  { code: "2031_plus", label: "Vanaf 1 januari 2031", van: "2031-01-01", tot: null, rsz_multiplicator: 6, volgorde: 8 },
];

const bevLevenslang: Array<[string, number]> = [
  ["2023H2_2025", 100],
  ["2026", 100],
  ["2027", 95],
  ["2028", 90],
  ["2029", 82.5],
  ["2030", 75],
  ["2031_plus", 67.5],
];

const uitdoofkalender: Array<[number, number]> = [
  [2025, 75],
  [2026, 50],
  [2027, 25],
  [2028, 0],
];

const verbranding = ["PHEV", "HEV", "fossiel"] as const;

export const DEFAULT_REGELS: DeductionRule[] = [
  ...bevLevenslang.map(([bestelperiode, aftrek_pct]): DeductionRule => ({
    voertuigtype: "BEV",
    bestelperiode,
    gebruiksjaar: null,
    aftrek_pct,
  })),
  ...verbranding.flatMap((voertuigtype) =>
    uitdoofkalender.map(([gebruiksjaar, aftrek_pct]): DeductionRule => ({
      voertuigtype,
      bestelperiode: "2023H2_2025",
      gebruiksjaar,
      aftrek_pct,
    })),
  ),
  ...verbranding.flatMap((voertuigtype) =>
    ["2026", "2027", "2028", "2029", "2030", "2031_plus"].map((bestelperiode): DeductionRule => ({
      voertuigtype,
      bestelperiode,
      gebruiksjaar: null,
      aftrek_pct: 0,
    })),
  ),
];

export const DEFAULT_CONTEXT: FiscaleContext = {
  parameters: DEFAULT_PARAMETERS,
  periodes: DEFAULT_PERIODES,
  regels: DEFAULT_REGELS,
};
