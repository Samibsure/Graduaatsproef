import { describe, expect, it } from "vitest";
import { DEFAULT_CONTEXT } from "./defaults";
import { berekenProjectie } from "./engine";
import { adviesVoorScore, CRITERIA, gewogenEindscore, scoreVergelijking } from "./scoring";
import type { Vehicle } from "./types";

const basis: Omit<Vehicle, "id" | "omschrijving"> = {
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

const bev: Vehicle = { ...basis, id: "a", omschrijving: "BEV" };
const diesel: Vehicle = {
  ...basis,
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
  flex_score: 8,
};
const phev: Vehicle = {
  ...basis,
  id: "c",
  omschrijving: "PHEV",
  voertuigtype: "PHEV",
  brandstof: "benzine",
  co2: 30,
  cataloguswaarde: 42000,
  jaarlijkse_autokosten: 8900,
  thuislaadpunt: false,
  restwaarde_score: 5,
};

describe("wegingen (Tabel 5)", () => {
  it("de zes wegingen sommeren tot 100%", () => {
    expect(CRITERIA.reduce((s, c) => s + c.weging, 0)).toBeCloseTo(1, 10);
  });

  it("gewogen eindscore: criteriumscores van de BEV uit Tabel 5", () => {
    // 0,4×8 + 0,2×10 + 0,15×9 + 0,1×7 + 0,1×10 + 0,05×6 = 8,55
    expect(gewogenEindscore({ tco: 8, aftrek: 10, vu: 9, flex: 7, co2: 10, rest: 6 })).toBe(8.55);
    // Dieselrij uit Tabel 5: 0,4×4 + 0,2×3 + 0,15×3 + 0,1×8 + 0,1×2 + 0,05×6 = 3,95
    expect(gewogenEindscore({ tco: 4, aftrek: 3, vu: 3, flex: 8, co2: 2, rest: 6 })).toBe(3.95);
  });
});

describe("advies", () => {
  it("aanvaarden vanaf 7, overwegen vanaf 4, anders afwijzen", () => {
    expect(adviesVoorScore(8.55)).toBe("aanvaarden");
    expect(adviesVoorScore(4)).toBe("overwegen");
    expect(adviesVoorScore(3.95)).toBe("afwijzen");
  });
});

describe("scoreVergelijking op het B-sure dossier", () => {
  const projecties = [bev, phev, diesel].map((v) => berekenProjectie(DEFAULT_CONTEXT, v, 2026));
  const resultaten = scoreVergelijking(projecties);
  const perId = Object.fromEntries(resultaten.map((r) => [r.vehicleId, r]));

  it("BEV wint duidelijk van PHEV en diesel", () => {
    expect(perId.a.eindscore).toBeGreaterThan(perId.c.eindscore);
    expect(perId.c.eindscore).toBeGreaterThan(perId.b.eindscore);
    expect(perId.a.advies).toBe("aanvaarden");
  });

  it("BEV scoort maximaal op TCO, aftrekbaarheid en CO₂", () => {
    expect(perId.a.scores.tco).toBe(10);
    expect(perId.a.scores.aftrek).toBe(10);
    expect(perId.a.scores.co2).toBe(10);
  });

  it("alle scores blijven binnen 1-10", () => {
    for (const r of resultaten) {
      for (const score of Object.values(r.scores)) {
        expect(score).toBeGreaterThanOrEqual(1);
        expect(score).toBeLessThanOrEqual(10);
      }
    }
  });
});
