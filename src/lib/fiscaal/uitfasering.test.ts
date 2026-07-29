import { describe, expect, it } from "vitest";
import { DEFAULT_CONTEXT } from "./defaults";
import { berekenUitfasering } from "./uitfasering";
import type { Vehicle } from "./types";

const ctx = DEFAULT_CONTEXT;

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

/** Diesel besteld in 2024: volgt de uitdoofkalender 75 → 50 → 25 → 0. */
const diesel: Vehicle = {
  ...bev,
  id: "b",
  omschrijving: "Diesel",
  voertuigtype: "fossiel",
  brandstof: "diesel",
  besteldatum: "2024-03-01",
  eerste_ingebruikname: "2024-06-01",
  co2: 135,
  cataloguswaarde: 38000,
  jaarlijkse_autokosten: 9200,
  thuislaadpunt: false,
};

describe("uitfaseringstijdlijn", () => {
  it("wijst het jaar aan waarin de aftrek van de diesel daalt", () => {
    const u = berekenUitfasering(ctx, diesel, 2025, 2029);
    // 135 g diesel geeft 52,5% via de gramformule. Die blijft gelden zolang ze
    // onder het plafond van het jaar zit; vanaf 2026 knijpt het plafond dicht.
    expect(u.jaren.map((j) => j.aftrekPct)).toEqual([52.5, 50, 25, 0, 0]);
    expect(u.eersteDaling).toBe(2026);
    expect(u.eersteNulJaar).toBe(2028);
    expect(u.aftrekStart).toBe(52.5);
    expect(u.aftrekEinde).toBe(0);
  });

  it("markeert per jaar of de aftrek daar daalt", () => {
    const u = berekenUitfasering(ctx, diesel, 2025, 2029);
    expect(u.jaren.map((j) => j.daaltHier)).toEqual([false, true, true, true, false]);
  });

  it("toont de toename van de fiscale meerkost, het bedrag van de waarschuwing", () => {
    const u = berekenUitfasering(ctx, diesel, 2025, 2029);
    expect(u.meerkostToename).toBeGreaterThan(0);
    // Van 52,5% naar 0% aftrek op € 9.200 kosten is 0,525 × 9.200 extra
    // verworpen uitgaven, tegen 25% VenB. De RSZ-multiplicator stijgt mee.
    expect(u.meerkostToename).toBeGreaterThan(0.25 * 0.525 * 9200);
  });

  it("laat een BEV besteld vóór 2027 vlak lopen, zonder waarschuwing", () => {
    const u = berekenUitfasering(ctx, bev, 2026, 2031);
    expect(new Set(u.jaren.map((j) => j.aftrekPct))).toEqual(new Set([100]));
    expect(u.eersteDaling).toBeNull();
    expect(u.eersteNulJaar).toBeNull();
  });

  it("toont voor een BEV besteld in 2027 wél het afbouwpad, maar nooit tot nul", () => {
    const bev2027 = { ...bev, besteldatum: "2027-03-01", eerste_ingebruikname: "2027-05-01" };
    const u = berekenUitfasering(ctx, bev2027, 2027, 2031);
    expect(u.aftrekStart).toBe(95);
    expect(u.eersteNulJaar).toBeNull();
  });

  it("geeft één jaar terug wanneer start en einde samenvallen", () => {
    const u = berekenUitfasering(ctx, diesel, 2026, 2026);
    expect(u.jaren).toHaveLength(1);
    expect(u.meerkostToename).toBe(0);
  });
});
