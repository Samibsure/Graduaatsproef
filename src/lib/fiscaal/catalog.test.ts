import { describe, expect, it } from "vitest";
import { catalogNaarWagen, catalogPreview, geschatteAutokosten } from "./catalog";
import { DEFAULT_CONTEXT } from "./defaults";
import { berekenJaar } from "./engine";
import type { CatalogCar } from "./types";

const teslaModelY: CatalogCar = {
  id: 1,
  merk: "Tesla",
  model: "Model Y",
  voertuigtype: "BEV",
  brandstof: "elektrisch",
  co2: 0,
  cataloguswaarde: 46000,
  segment: "SUV middenklasse",
  populariteit_rang: 1,
  opmerking: null,
};

const bmw320d: CatalogCar = {
  id: 24,
  merk: "BMW",
  model: "320d",
  voertuigtype: "fossiel",
  brandstof: "diesel",
  co2: 120,
  cataloguswaarde: 48000,
  segment: "Premium berline",
  populariteit_rang: 24,
  opmerking: null,
};

describe("catalogNaarWagen", () => {
  it("neemt merk, model, type en cataloguswaarde over", () => {
    const w = catalogNaarWagen(teslaModelY, 2026);
    expect(w.merk).toBe("Tesla");
    expect(w.model).toBe("Model Y");
    expect(w.catalog_id).toBe(1);
    expect(w.voertuigtype).toBe("BEV");
    expect(w.cataloguswaarde).toBe(46000);
    expect(w.categorie).toBe("kandidaat");
    expect(w.besteldatum).toBe("2026-01-15");
  });

  it("raamt de jaarlijkse autokosten op basis van de cataloguswaarde", () => {
    expect(geschatteAutokosten(46000, "BEV")).toBe(geschatteAutokosten(46000, "BEV"));
    expect(geschatteAutokosten(48000, "fossiel")).toBeGreaterThan(geschatteAutokosten(48000, "BEV"));
  });
});

describe("fiscale preview van catalogusmodellen (2026)", () => {
  it("Tesla Model Y besteld in 2026 behoudt 100% aftrek", () => {
    const r = berekenJaar(DEFAULT_CONTEXT, catalogPreview(teslaModelY, 2026), 2026);
    expect(r.aftrekPct).toBe(100);
    expect(r.nietAftrekbaar).toBe(0);
  });

  it("BMW 320d besteld in 2026 is meteen 0% aftrekbaar (volledige autokosten verworpen)", () => {
    const auto = catalogPreview(bmw320d, 2026);
    const r = berekenJaar(DEFAULT_CONTEXT, auto, 2026);
    expect(r.aftrekPct).toBe(0);
    expect(r.nietAftrekbaar).toBeCloseTo(auto.jaarlijkse_autokosten, 5);
  });
});
