import { describe, expect, it } from "vitest";
import { DEFAULT_CONTEXT } from "./defaults";
import {
  aftrekPct,
  berekenJaar,
  berekenProjectie,
  co2Percentage,
  gramformule,
  leeftijdscorrectie,
  parametersVoorJaar,
  rszBijdrageMaand,
  voordeelAlleAard,
} from "./engine";
import type { Vehicle } from "./types";

const ctx = DEFAULT_CONTEXT;
const params2026 = parametersVoorJaar(ctx, 2026);

/** Wagen A uit Bijlage 1: BEV besteld 2026, cataloguswaarde € 45.000. */
const bev: Vehicle = {
  id: "a",
  omschrijving: "Wagen A – BEV",
  werknemer: null,
  kenteken: null,
  voertuigtype: "BEV",
  brandstof: "elektrisch",
  besteldatum: "2026-01-15",
  eerste_ingebruikname: "2026-03-01",
  co2: 0,
  cataloguswaarde: 45000,
  jaarlijkse_autokosten: 8500,
  aankoopprijs: 45000,
  tankkaart: true,
  beroepsgebruik_pct: 100,
  thuislaadpunt: true,
  km_per_jaar: 25000,
  flex_score: 7,
  restwaarde_score: 6,
};

/** Wagen B uit Bijlage 1: diesel besteld 2024, cataloguswaarde € 38.000, 135 g/km. */
const diesel: Vehicle = {
  ...bev,
  id: "b",
  omschrijving: "Wagen B – Diesel",
  voertuigtype: "fossiel",
  brandstof: "diesel",
  besteldatum: "2024-03-01",
  eerste_ingebruikname: "2024-06-01",
  co2: 135,
  cataloguswaarde: 38000,
  jaarlijkse_autokosten: 9200,
  aankoopprijs: 38000,
  thuislaadpunt: false,
  flex_score: 8,
};

describe("aftrekbaarheid (Tabel 1 en Bijlage 3)", () => {
  it("BEV besteld vóór 1/1/2027 behoudt levenslang 100%", () => {
    for (const jaar of [2026, 2028, 2031]) {
      expect(aftrekPct(ctx, bev, jaar)).toBe(100);
    }
  });

  it("BEV besteld in 2027 valt in het afbouwpad op 95%", () => {
    const bev2027 = { ...bev, besteldatum: "2027-02-01" };
    expect(aftrekPct(ctx, bev2027, 2027)).toBe(95);
    expect(aftrekPct(ctx, bev2027, 2030)).toBe(95);
  });

  it("diesel besteld 2024 volgt de uitdoofkalender 75 → 50 → 25 → 0", () => {
    expect(aftrekPct(ctx, diesel, 2025)).toBe(75);
    expect(aftrekPct(ctx, diesel, 2026)).toBe(50);
    expect(aftrekPct(ctx, diesel, 2027)).toBe(25);
    expect(aftrekPct(ctx, diesel, 2028)).toBe(0);
    expect(aftrekPct(ctx, diesel, 2029)).toBe(0);
  });

  it("verbrandingswagen besteld vanaf 2026 is meteen 0% aftrekbaar", () => {
    const nieuweDiesel = { ...diesel, besteldatum: "2026-02-01" };
    expect(aftrekPct(ctx, nieuweDiesel, 2026)).toBe(0);
  });

  it("gramformule voor bestellingen vóór 1/7/2023, begrensd 50-100%", () => {
    expect(gramformule("diesel", 100)).toBe(70); // 120 − 0,5 × 1 × 100
    expect(gramformule("benzine", 120)).toBe(63); // 120 − 0,5 × 0,95 × 120
    expect(gramformule("diesel", 200)).toBe(50); // ondergrens
    expect(gramformule("elektrisch", 0)).toBe(100); // bovengrens
    const oudeDiesel = { ...diesel, besteldatum: "2023-03-01" };
    expect(aftrekPct(ctx, oudeDiesel, 2026)).toBe(120 - 0.5 * 135);
  });
});

describe("voordeel van alle aard (Tabel 2)", () => {
  it("BEV zit op het CO₂-minimum van 4% en het VAA-minimum van € 1.690", () => {
    expect(co2Percentage(params2026, "elektrisch", 0)).toBe(4);
    expect(voordeelAlleAard(ctx, bev, 2026)).toBe(1690);
  });

  it("diesel 135 g/km komt op 13,2% (5,5% + 77 × 0,1%)", () => {
    expect(co2Percentage(params2026, "diesel", 135)).toBeCloseTo(13.2, 5);
  });

  it("leeftijdscorrectie: −6% per jaar, minimum 70%", () => {
    expect(leeftijdscorrectie(2024, 2024)).toBe(1);
    expect(leeftijdscorrectie(2026, 2024)).toBe(0.88);
    expect(leeftijdscorrectie(2040, 2024)).toBe(0.7);
  });

  // Bijlage 1 vermeldt ≈ € 4.520, maar de eigen formule van het rapport
  // (38.000 × 6/7 × 0,88 × 13,2%) geeft € 3.783,50. De tool volgt de formule.
  it("VAA diesel 2026 = cataloguswaarde × 6/7 × 88% × 13,2%", () => {
    expect(voordeelAlleAard(ctx, diesel, 2026)).toBeCloseTo(38000 * (6 / 7) * 0.88 * 0.132, 2);
  });
});

describe("RSZ CO₂-solidariteitsbijdrage (Tabel 3)", () => {
  it("BEV betaalt het basisminimum: € 33,93/maand = € 407,16/jaar", () => {
    // Emissievrije wagens zijn vrijgesteld van het verhoogde minimum (€ 42,34).
    expect(rszBijdrageMaand(ctx, bev, 2026)).toBeCloseTo(33.93, 2);
    expect(berekenJaar(ctx, bev, 2026).rszJaar).toBeCloseTo(407.16, 2);
  });

  // Bijlage 1 vermeldt ≈ € 130/maand, maar laat daarbij de multiplicator (4)
  // uit de eigen formule weg. De tool past de formule volledig toe.
  it("diesel: ((135 × 9 − 600)/12) × 1,6291 × multiplicator 4", () => {
    expect(rszBijdrageMaand(ctx, diesel, 2026)).toBeCloseTo(((135 * 9 - 600) / 12) * 1.6291 * 4, 2);
  });
});

describe("verworpen uitgaven en extra VenB (Bijlage 1)", () => {
  it("Wagen A (BEV): VU € 676, extra VenB € 169, totale fiscale meerkost ≈ € 576", () => {
    const r = berekenJaar(ctx, bev, 2026);
    expect(r.nietAftrekbaar).toBe(0);
    expect(r.vuUitVaa).toBeCloseTo(676, 2); // 40% × 1.690 (laadkaart aanwezig)
    expect(r.verworpenUitgaven).toBeCloseTo(676, 2);
    expect(r.extraVenB).toBeCloseTo(169, 2);
    expect(r.fiscaleMeerkost).toBeCloseTo(169 + 407.16, 2);
  });

  it("Wagen B (diesel): niet-aftrekbaar deel € 4.600 + 40% van het VAA", () => {
    const r = berekenJaar(ctx, diesel, 2026);
    const vaa = voordeelAlleAard(ctx, diesel, 2026);
    expect(r.nietAftrekbaar).toBeCloseTo(4600, 2); // (1 − 0,50) × 9.200
    expect(r.verworpenUitgaven).toBeCloseTo(4600 + 0.4 * vaa, 2);
    expect(r.extraVenB).toBeCloseTo(0.25 * (4600 + 0.4 * vaa), 2);
  });

  it("zonder tankkaart vloeit 17% van het VAA naar de verworpen uitgaven", () => {
    const zonderKaart = { ...diesel, tankkaart: false };
    const r = berekenJaar(ctx, zonderKaart, 2026);
    expect(r.vuUitVaa).toBeCloseTo(0.17 * voordeelAlleAard(ctx, diesel, 2026), 2);
  });

  it("KMO-tarief van 20% kan toegepast worden", () => {
    const r = berekenJaar(ctx, diesel, 2026, { kmoTarief: true });
    expect(r.extraVenB).toBeCloseTo(0.2 * r.verworpenUitgaven, 2);
  });
});

describe("meerjarenprojectie", () => {
  it("projectie 2026-2029 voor de diesel volgt de uitdoofkalender", () => {
    const p = berekenProjectie(ctx, diesel, 2026);
    expect(p.jaren.map((j) => j.aftrekPct)).toEqual([50, 25, 0, 0]);
    expect(p.gemiddeldeAftrekPct).toBeCloseTo(18.75, 2);
  });

  it("de BEV is over 4 jaar duidelijk goedkoper dan de diesel", () => {
    const pBev = berekenProjectie(ctx, bev, 2026);
    const pDiesel = berekenProjectie(ctx, diesel, 2026);
    expect(pBev.totaleKost).toBeLessThan(pDiesel.totaleKost);
    expect(pBev.totaleVU).toBeCloseTo(4 * 676, 2);
  });
});
