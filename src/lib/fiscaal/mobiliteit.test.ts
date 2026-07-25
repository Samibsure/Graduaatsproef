import { describe, expect, it } from "vitest";
import {
  PIJLER3_BIJDRAGE_PCT,
  berekenFietsvergoeding,
  berekenMobiliteitsbudget,
} from "./mobiliteit";
import { DEFAULT_CONTEXT } from "./defaults";
import { eigenBijdrageVoorVaa, pasBinnenBudget, rangschikCatalogus } from "./optimalisatie";
import type { CatalogCar, Vehicle } from "./types";

const ctx = DEFAULT_CONTEXT;

describe("mobiliteitsbudget", () => {
  it("laat pijler 2 volledig netto bij de werknemer terechtkomen", () => {
    const r = berekenMobiliteitsbudget(9000, { pijler1: 0, pijler2: 9000, pijler3: 0 });
    expect(r.bijdragePijler3).toBe(0);
    expect(r.nettoVoorWerknemer).toBe(9000);
  });

  it("houdt op pijler 3 de bijzondere bijdrage van 38,07% in", () => {
    const r = berekenMobiliteitsbudget(9000, { pijler1: 0, pijler2: 0, pijler3: 9000 });
    expect(r.bijdragePijler3).toBeCloseTo(9000 * 0.3807, 2);
    expect(r.nettoVoorWerknemer).toBeCloseTo(9000 * (1 - 0.3807), 2);
    expect(PIJLER3_BIJDRAGE_PCT).toBe(38.07);
  });

  it("normaliseert een verdeling die niet op het budget uitkomt", () => {
    const r = berekenMobiliteitsbudget(9000, { pijler1: 1, pijler2: 1, pijler3: 2 });
    const som = r.verdeling.pijler1 + r.verdeling.pijler2 + r.verdeling.pijler3;
    expect(som).toBeCloseTo(9000, 6);
    expect(r.verdeling.pijler3).toBeCloseTo(4500, 6);
  });

  it("kent geen verworpen uitgaven, en dat is het hele verschil met een wagen", () => {
    const r = berekenMobiliteitsbudget(9000, { pijler1: 0, pijler2: 4000, pijler3: 5000 });
    expect(r.verworpenUitgaven).toBe(0);
    expect(r.kostVoorWerkgever).toBe(9000);
  });

  it("gaat niet onderuit op een negatief of leeg budget", () => {
    const r = berekenMobiliteitsbudget(-500, { pijler1: 0, pijler2: 0, pijler3: 0 });
    expect(r.budget).toBe(0);
    expect(r.nettoVoorWerknemer).toBe(0);
  });
});

describe("fietsvergoeding", () => {
  it("is volledig vrijgesteld onder het wettelijke maximum", () => {
    const r = berekenFietsvergoeding(20, 200, 0.35, 0.36);
    expect(r.totaal).toBeCloseTo(20 * 200 * 0.35, 6);
    expect(r.belastbaar).toBe(0);
  });

  it("belast enkel het deel boven het maximum", () => {
    const r = berekenFietsvergoeding(20, 200, 0.5, 0.36);
    expect(r.vrijgesteld).toBeCloseTo(4000 * 0.36, 6);
    expect(r.belastbaar).toBeCloseTo(4000 * (0.5 - 0.36), 6);
  });
});

describe("optimalisator", () => {
  const bev: Vehicle = {
    id: "a",
    omschrijving: "BEV",
    werknemer: null,
    kenteken: null,
    categorie: "kandidaat",
    merk: null,
    model: null,
    catalog_id: null,
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

  it("berekent de eigen bijdrage die het VAA op nul brengt", () => {
    // Het VAA van deze BEV is het wettelijk minimum van € 1.690.
    expect(eigenBijdrageVoorVaa(ctx, bev, 2026)).toBeCloseTo(1690 / 12, 6);
  });

  it("vraagt geen bijdrage wanneer het doel al gehaald is", () => {
    expect(eigenBijdrageVoorVaa(ctx, bev, 2026, 5000)).toBe(0);
  });

  const catalogus: CatalogCar[] = [
    {
      id: 1, merk: "Goedkoop", model: "BEV", voertuigtype: "BEV", brandstof: "elektrisch",
      co2: 0, cataloguswaarde: 30000, segment: null, populariteit_rang: 1,
      opmerking: null, image_url: null,
    },
    {
      id: 2, merk: "Duur", model: "Diesel", voertuigtype: "fossiel", brandstof: "diesel",
      co2: 140, cataloguswaarde: 60000, segment: null, populariteit_rang: 2,
      opmerking: null, image_url: null,
    },
  ];

  it("rangschikt van goedkoop naar duur op maandelijkse totale kost", () => {
    const rang = rangschikCatalogus(ctx, catalogus, { startjaar: 2026 });
    expect(rang).toHaveLength(2);
    expect(rang[0].car.merk).toBe("Goedkoop");
    expect(rang[0].tcoMaand).toBeLessThan(rang[1].tcoMaand);
  });

  it("toont de diesel besteld in 2026 als 0% aftrekbaar", () => {
    const rang = rangschikCatalogus(ctx, catalogus, { startjaar: 2026 });
    const diesel = rang.find((k) => k.car.voertuigtype === "fossiel");
    expect(diesel?.gemiddeldeAftrekPct).toBe(0);
  });

  it("filtert op budget, CO2 en voertuigtype", () => {
    const rang = rangschikCatalogus(ctx, catalogus, { startjaar: 2026 });
    expect(pasBinnenBudget(rang, { maxCo2: 0 })).toHaveLength(1);
    expect(pasBinnenBudget(rang, { voertuigtypes: ["BEV"] })).toHaveLength(1);
    expect(pasBinnenBudget(rang, { maxCataloguswaarde: 10000 })).toHaveLength(0);
    expect(pasBinnenBudget(rang, {})).toHaveLength(2);
  });
});
