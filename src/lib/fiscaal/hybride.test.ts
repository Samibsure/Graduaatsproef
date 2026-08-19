import { describe, expect, it } from "vitest";
import { DEFAULT_CONTEXT } from "./defaults";
import { aftrekPct, voordeelAlleAard } from "./engine";
import { beoordeelValseHybride, co2Drempel, fiscaleCo2 } from "./hybride";
import type { Vehicle } from "./types";

/**
 * De valse hybride is de duurste vergissing in dit dossier: dezelfde wagen
 * rekent volledig anders naargelang batterij, gewicht en euronorm. Deze tests
 * leggen de vier gevallen vast waar dat op kantelt.
 */

const ctx = DEFAULT_CONTEXT;

/** Plug-inhybride besteld in 2024, 40 g/km, batterij 14 kWh, 1.800 kg. */
const phev: Vehicle = {
  id: "p",
  omschrijving: "PHEV",
  werknemer: null,
  kenteken: null,
  categorie: "kandidaat",
  merk: null,
  model: null,
  catalog_id: null,
  voertuigtype: "PHEV",
  brandstof: "benzine",
  besteldatum: "2024-03-01",
  eerste_ingebruikname: "2024-06-01",
  co2: 40,
  cataloguswaarde: 52000,
  jaarlijkse_autokosten: 9000,
  aankoopprijs: 52000,
  tankkaart: true,
  beroepsgebruik_pct: 100,
  thuislaadpunt: true,
  km_per_jaar: 25000,
  flex_score: 7,
  restwaarde_score: 6,
  batterij_kwh: 14,
  wagengewicht: 1800,
};

describe("de batterijtoets", () => {
  it("laat een echte plug-inhybride ongemoeid", () => {
    // 14 kWh op 1.800 kg is 0,78 kWh per 100 kg, ruim boven de 0,5.
    const oordeel = beoordeelValseHybride(phev);
    expect(oordeel.isValseHybride).toBe(false);
    expect(oordeel.kwhPer100kg).toBeCloseTo(0.78, 2);
    expect(fiscaleCo2(phev).co2).toBe(40);
  });

  it("bestempelt een te kleine batterij als valse hybride", () => {
    // 7 kWh op 2.100 kg is 0,33 kWh per 100 kg.
    const klein = { ...phev, batterij_kwh: 7, wagengewicht: 2100 };
    expect(beoordeelValseHybride(klein).isValseHybride).toBe(true);
    expect(fiscaleCo2(klein).co2).toBe(100); // 40 × 2,5
  });

  it("slaat de batterijtoets over wanneer de gegevens ontbreken", () => {
    // Een ontbrekend technisch veld mag de wagen niet zwaarder belasten; dat
    // zou de gebruiker straffen voor een leeg invoervak.
    const zonder = { ...phev, batterij_kwh: null, wagengewicht: null };
    const oordeel = beoordeelValseHybride(zonder);
    expect(oordeel.isValseHybride).toBe(false);
    expect(oordeel.kwhPer100kg).toBeNull();
    expect(oordeel.reden).toMatch(/batterijcapaciteit of gewicht ontbreekt/);
  });
});

describe("de CO2-drempel", () => {
  it("ligt op 50 g/km voor een gewone plug-inhybride", () => {
    expect(co2Drempel(phev)).toBe(50);
    expect(beoordeelValseHybride({ ...phev, co2: 60 }).isValseHybride).toBe(true);
  });

  it("ligt op 75 g/km vanaf Euro 6e-bis en een bestelling vanaf 2025", () => {
    const nieuw = { ...phev, besteldatum: "2025-04-01", euronorm: "euro6e-bis" as const, co2: 60 };
    expect(co2Drempel(nieuw)).toBe(75);
    expect(beoordeelValseHybride(nieuw).isValseHybride).toBe(false);
  });

  it("houdt de oude drempel aan bij een bestelling vóór 2025", () => {
    const oud = { ...phev, besteldatum: "2024-11-01", euronorm: "euro6e-bis" as const, co2: 60 };
    expect(co2Drempel(oud)).toBe(50);
    expect(beoordeelValseHybride(oud).isValseHybride).toBe(true);
  });

  /*
   * De toets is `co2 > drempel`, dus de drempel zelf hoort er nog bij. De tests
   * hierboven staan op 40 en 60 g/km en raken de kantelwaarde dus nooit: een
   * verschuiving van één gram of een omslag naar `>=` bleef onzichtbaar,
   * terwijl dat het verschil is tussen de echte uitstoot en die maal 2,5.
   */
  it.each([
    [50, false],
    [51, true],
  ])("kantelt bij %i g/km op de gewone drempel naar %s", (co2, verwacht) => {
    expect(beoordeelValseHybride({ ...phev, co2 }).isValseHybride).toBe(verwacht);
  });

  it.each([
    [75, false],
    [76, true],
  ])("kantelt bij %i g/km op de Euro 6e-bis-drempel naar %s", (co2, verwacht) => {
    const nieuw = { ...phev, besteldatum: "2025-04-01", euronorm: "euro6e-bis" as const, co2 };
    expect(beoordeelValseHybride(nieuw).isValseHybride).toBe(verwacht);
  });
});

describe("de gecorrigeerde uitstoot in de berekening", () => {
  it("gebruikt bij voorkeur het overeenstemmende niet-plug-in model", () => {
    const vals = { ...phev, batterij_kwh: 5, co2_equivalent: 132 };
    const resultaat = fiscaleCo2(vals);
    expect(resultaat.co2).toBe(132);
    expect(resultaat.gecorrigeerd).toBe(true);
  });

  it("valt zonder dat model terug op de officiële uitstoot maal 2,5", () => {
    const vals = { ...phev, batterij_kwh: 5 };
    expect(fiscaleCo2(vals).co2).toBe(100);
  });

  it("verlaagt de aftrek van een valse hybride uit het overgangsregime", () => {
    // Echte PHEV: 120 − 0,5 × 0,95 × 40 = 101 → afgetopt op 100, dan op het
    // plafond van 2025. Valse hybride: 40 g wordt 100 g, dus 120 − 47,5 = 72,5.
    const echt = aftrekPct(ctx, phev, 2025);
    const vals = aftrekPct(ctx, { ...phev, batterij_kwh: 5 }, 2025);
    expect(echt).toBe(75);
    expect(vals).toBe(72.5);
  });

  it("verhoogt het voordeel van alle aard van een valse hybride", () => {
    const echt = voordeelAlleAard(ctx, phev, 2026);
    const vals = voordeelAlleAard(ctx, { ...phev, batterij_kwh: 5 }, 2026);
    // Echte PHEV zit op het CO2-minimum van 4% en komt daarmee onder het
    // wettelijke minimum-VAA uit. Met 100 g wordt het percentage
    // 5,5% + (100 − 70) × 0,1% = 8,5%, en dan telt de formule wél.
    expect(echt).toBe(1690);
    expect(vals).toBeCloseTo(52000 * (6 / 7) * 0.88 * 0.085, 2);
  });

  it("raakt een wagen die geen plug-inhybride is niet aan", () => {
    const fossiel = { ...phev, voertuigtype: "fossiel" as const, co2: 140, batterij_kwh: null };
    expect(fiscaleCo2(fossiel).co2).toBe(140);
    expect(fiscaleCo2(fossiel).gecorrigeerd).toBe(false);
  });
});
