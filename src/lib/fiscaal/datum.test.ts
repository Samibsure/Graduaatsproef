import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { jaarUit } from "./datum";
import { DEFAULT_CONTEXT } from "./defaults";
import { voordeelAlleAard } from "./engine";
import type { Vehicle } from "./types";

/**
 * De tijdzone van de bezoeker mag geen enkel fiscaal bedrag verschuiven. De
 * simulator is een clientcomponent, dus dit is niet de zone van de server.
 */
describe("jaarUit", () => {
  it("leest het jaartal uit de string", () => {
    expect(jaarUit("2026-01-01")).toBe(2026);
    expect(jaarUit("2023-12-31")).toBe(2023);
  });

  it("geeft NaN in plaats van jaar 0 bij een lege of onvolledige datum", () => {
    expect(jaarUit("")).toBeNaN();
    expect(jaarUit("20")).toBeNaN();
    expect(jaarUit("abcd-01-01")).toBeNaN();
  });

  it("geeft hetzelfde jaar in een westelijke tijdzone", () => {
    const oud = process.env.TZ;
    process.env.TZ = "America/New_York";
    try {
      // Ter vergelijking: new Date("2026-01-01").getFullYear() geeft hier 2025.
      expect(jaarUit("2026-01-01")).toBe(2026);
    } finally {
      process.env.TZ = oud;
    }
  });
});

describe("voordeel van alle aard, los van de tijdzone", () => {
  /** Diesel 135 g/km, in gebruik op nieuwjaarsdag: de gevoeligste datum. */
  const wagen = {
    id: "t",
    omschrijving: "t",
    werknemer: null,
    kenteken: null,
    categorie: "kandidaat",
    merk: null,
    model: null,
    catalog_id: null,
    voertuigtype: "fossiel",
    brandstof: "diesel",
    besteldatum: "2026-01-01",
    eerste_ingebruikname: "2026-01-01",
    co2: 135,
    cataloguswaarde: 38000,
    jaarlijkse_autokosten: 0,
    aankoopprijs: null,
    tankkaart: false,
    beroepsgebruik_pct: 0,
    thuislaadpunt: false,
    km_per_jaar: null,
    flex_score: 0,
    restwaarde_score: 0,
  } as unknown as Vehicle;

  const oud = process.env.TZ;
  beforeAll(() => {
    process.env.TZ = "America/New_York";
  });
  afterAll(() => {
    process.env.TZ = oud;
  });

  it("past de leeftijdscorrectie van het eerste jaar toe, ook in New York", () => {
    // Geen correctie in het jaar van ingebruikname: 38.000 x 6/7 x 100% x 13,2%.
    expect(voordeelAlleAard(DEFAULT_CONTEXT, wagen, 2026)).toBeCloseTo(4299.43, 2);
  });
});
