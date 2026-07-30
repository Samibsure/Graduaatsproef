import { describe, expect, it } from "vitest";
import {
  belastingvrijeTerugbetaling,
  investeringsaftrek,
  laadpaalKostenaftrek,
  overschotBovenForfait,
} from "./laadinfra";

describe("verhoogde kostenaftrek laadpaal", () => {
  it("volgt de investeringsdatum, niet de ingebruikname", () => {
    expect(laadpaalKostenaftrek("2022-06-01").pct).toBe(200);
    expect(laadpaalKostenaftrek("2023-06-01").pct).toBe(150);
    expect(laadpaalKostenaftrek("2026-06-01").pct).toBe(100);
    expect(laadpaalKostenaftrek("2030-06-01").pct).toBe(75);
  });

  it("rekent het aftrekbare bedrag uit", () => {
    expect(laadpaalKostenaftrek("2022-06-01", 2000).bedrag).toBe(4000);
    expect(laadpaalKostenaftrek("2026-06-01", 2000).bedrag).toBe(2000);
  });

  it("vermeldt de voorwaarden alleen wanneer de verhoogde aftrek geldt", () => {
    expect(laadpaalKostenaftrek("2022-06-01").voorwaarden.length).toBeGreaterThan(0);
    expect(laadpaalKostenaftrek("2026-06-01").voorwaarden).toEqual([]);
  });
});

describe("investeringsaftrek", () => {
  it("past de thematische aftrek van 40% toe", () => {
    const r = investeringsaftrek(10_000, "thematisch", "2026-05-01");
    expect(r.pct).toBe(40);
    expect(r.bedrag).toBe(4000);
  });

  it("weigert de cumul met de verhoogde kostenaftrek", () => {
    // Deze fout kost geld: wie beide toepast, verliest bij controle de duurste.
    const r = investeringsaftrek(10_000, "thematisch", "2026-05-01", {
      verhoogdeKostenaftrekToegepast: true,
    });
    expect(r.bedrag).toBe(0);
    expect(r.toelichting.join(" ")).toMatch(/niet cumuleerbaar/);
  });

  it("laat het attest vallen voor laadinfra in 2025 en 2026", () => {
    expect(investeringsaftrek(1000, "thematisch", "2026-05-01").attestVereist).toBe(false);
    expect(investeringsaftrek(1000, "thematisch", "2027-05-01").attestVereist).toBe(true);
  });
});

describe("CREG-tarief voor thuisladen", () => {
  it("neemt het tarief van het gewest en het kwartaal", () => {
    const r = belastingvrijeTerugbetaling(1000, "vlaanderen", "2026-Q1");
    expect(r.tariefPerKwh).toBe(0.3132);
    expect(r.bedrag).toBeCloseTo(313.2, 6);
  });

  it("neemt bij een uniform tarief het laagste van de gewesten", () => {
    const r = belastingvrijeTerugbetaling(1000, "wallonie", "2026-Q1", { uniform: true });
    expect(r.tariefPerKwh).toBe(0.3132);
  });

  it("geeft geen bedrag wanneer de CREG voor dat gewest niets publiceerde", () => {
    // Voor het tweede kwartaal van 2026 is alleen het Vlaamse tarief bekend.
    const r = belastingvrijeTerugbetaling(1000, "brussel", "2026-Q2");
    expect(r.bedrag).toBeNull();
    expect(r.zekerheid).toBe("teVerifieren");
  });

  it("splitst een te hoge terugbetaling in een vrijgesteld en een belastbaar deel", () => {
    const r = overschotBovenForfait(400, 1000, "vlaanderen", "2026-Q1");
    expect(r.vrijgesteld).toBeCloseTo(313.2, 6);
    expect(r.belastbaar).toBeCloseTo(86.8, 6);
  });

  it("laat niets belastbaar zolang de terugbetaling onder het forfait blijft", () => {
    const r = overschotBovenForfait(250, 1000, "vlaanderen", "2026-Q1");
    expect(r.belastbaar).toBe(0);
  });
});
