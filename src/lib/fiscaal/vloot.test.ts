import { describe, expect, it } from "vitest";
import { DEFAULT_CONTEXT } from "./defaults";
import { berekenJaar } from "./engine";
import { berekenVlootPrognose, vervangkalender } from "./vloot";
import type { Vehicle } from "./types";

const ctx = DEFAULT_CONTEXT;

const bev: Vehicle = {
  id: "a",
  omschrijving: "BEV",
  werknemer: null,
  kenteken: null,
  categorie: "vloot",
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

describe("vlootprognose", () => {
  it("telt per jaar op wat de losse berekeningen geven", () => {
    const p = berekenVlootPrognose(ctx, [bev, diesel], 2026, 2026);
    const som =
      berekenJaar(ctx, bev, 2026).verworpenUitgaven + berekenJaar(ctx, diesel, 2026).verworpenUitgaven;
    expect(p.jaren).toHaveLength(1);
    expect(p.jaren[0].verworpenUitgaven).toBeCloseTo(som, 6);
  });

  it("laat de verworpen uitgaven stijgen naarmate de diesel zijn aftrek verliest", () => {
    const p = berekenVlootPrognose(ctx, [bev, diesel], 2026, 2028);
    const [j2026, , j2028] = p.jaren;
    expect(j2028.verworpenUitgaven).toBeGreaterThan(j2026.verworpenUitgaven);
  });

  it("zet de duurste wagen bovenaan", () => {
    const p = berekenVlootPrognose(ctx, [bev, diesel], 2026, 2028);
    expect(p.wagens[0].vehicle.id).toBe("b");
    expect(p.wagens[0].fiscaleMeerkostJaar1).toBeGreaterThan(p.wagens[1].fiscaleMeerkostJaar1);
  });

  it("wijst per wagen het jaar aan waarin de aftrek op nul valt", () => {
    const p = berekenVlootPrognose(ctx, [bev, diesel], 2026, 2031);
    const regels = Object.fromEntries(p.wagens.map((w) => [w.vehicle.id, w.nulJaar]));
    expect(regels.b).toBe(2028);
    expect(regels.a).toBeNull();
  });

  it("weegt de gemiddelde aftrek naar kostenaandeel, niet per wagen", () => {
    // BEV 100% op 8.500, diesel 50% op 9.200 in 2026.
    const p = berekenVlootPrognose(ctx, [bev, diesel], 2026, 2026);
    const verwacht = (100 * 8500 + 50 * 9200) / (8500 + 9200);
    expect(p.jaren[0].gemiddeldeAftrekPct).toBeCloseTo(verwacht, 6);
  });

  it("geeft een lege maar geldige prognose voor een lege vloot", () => {
    const p = berekenVlootPrognose(ctx, [], 2026, 2027);
    expect(p.jaren).toHaveLength(2);
    expect(p.totaleVU).toBe(0);
    expect(p.jaren[0].gemiddeldeAftrekPct).toBe(0);
  });
});

describe("vervangkalender", () => {
  const vandaag = new Date("2026-07-01");

  it("toont alleen contracten die binnen het venster aflopen", () => {
    const wagens = [
      { ...bev, id: "vroeg", einde_contract: "2026-10-01" },
      { ...bev, id: "laat", einde_contract: "2029-01-01" },
      { ...bev, id: "geen", einde_contract: null },
    ];
    const kalender = vervangkalender(wagens, vandaag, 12);
    expect(kalender.map((k) => k.vehicle.id)).toEqual(["vroeg"]);
    expect(kalender[0].maandenTeGaan).toBe(3);
  });

  it("sorteert op wat het eerst vervalt", () => {
    const wagens = [
      { ...bev, id: "b", einde_contract: "2026-12-01" },
      { ...bev, id: "a", einde_contract: "2026-08-01" },
    ];
    expect(vervangkalender(wagens, vandaag, 12).map((k) => k.vehicle.id)).toEqual(["a", "b"]);
  });

  it("neemt een reeds verstreken contract mee, want dat is juist dringend", () => {
    const wagens = [{ ...bev, id: "verlopen", einde_contract: "2026-01-01" }];
    const kalender = vervangkalender(wagens, vandaag, 12);
    expect(kalender).toHaveLength(1);
    expect(kalender[0].maandenTeGaan).toBe(-6);
  });
});
