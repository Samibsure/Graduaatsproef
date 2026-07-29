import { describe, expect, it } from "vitest";
import {
  FIETSPARAMETERS_2026,
  KILOMETERVERGOEDING_GRENS,
  berekenFietsvergoedingJaar,
  berekenKilometervergoeding,
  kilometertarief,
  terugvorderbareAccijns,
  verzekeringstaks,
} from "./vergoedingen";

describe("kilometervergoeding", () => {
  it("kent het jaarforfait en de kwartaaltarieven", () => {
    expect(kilometertarief("2025-07/2026-06")?.eurPerKm).toBe(0.4449);
    expect(kilometertarief("2026-Q1")?.eurPerKm).toBe(0.4326);
    expect(kilometertarief("2026-Q3")?.eurPerKm).toBe(0.444);
    expect(kilometertarief("2027-Q1")).toBeNull();
  });

  it("markeert de tijdelijke maandtarieven van het voorjaar 2026", () => {
    const mei = kilometertarief("2026-05");
    expect(mei?.soort).toBe("maand");
    expect(mei?.opmerking).toMatch(/energiesteun/i);
  });

  it("waarschuwt zodra de 24.000 kilometer overschreden wordt", () => {
    const onder = berekenKilometervergoeding(20_000, 0.444);
    expect(onder.boven24000).toBe(false);
    expect(onder.waarschuwing).toBeNull();

    const boven = berekenKilometervergoeding(30_000, 0.444);
    expect(boven.boven24000).toBe(true);
    expect(boven.teVerantwoordenKm).toBe(30_000 - KILOMETERVERGOEDING_GRENS);
    // Het bedrag verandert niet; alleen de bewijslast verschuift.
    expect(boven.totaal).toBeCloseTo(30_000 * 0.444, 6);
  });
});

describe("fietsvergoeding", () => {
  it("laat alles vrij bij het cao-tarief en een normale afstand", () => {
    const r = berekenFietsvergoedingJaar(5000, FIETSPARAMETERS_2026.cao164PerKm);
    expect(r.totaal).toBeCloseTo(1500, 6);
    expect(r.belastbaar).toBe(0);
  });

  it("belast het deel boven de vrijgestelde € 0,37 per kilometer", () => {
    const r = berekenFietsvergoedingJaar(5000, 0.45);
    expect(r.vrijgesteld).toBeCloseTo(5000 * 0.37, 6);
    expect(r.belastbaar).toBeCloseTo(5000 * 0.08, 6);
    expect(r.redenBelastbaar).toMatch(/per km/);
  });

  it("belast ook wat boven het jaarplafond van € 3.700 uitkomt", () => {
    // 12.000 km aan het maximumtarief is € 4.440, ruim boven het plafond.
    const r = berekenFietsvergoedingJaar(12_000, 0.37);
    expect(r.vrijgesteld).toBe(3700);
    expect(r.belastbaar).toBeCloseTo(12_000 * 0.37 - 3700, 6);
    expect(r.redenBelastbaar).toMatch(/jaarplafond/);
  });

  it("benoemt beide oorzaken wanneer ze samen spelen", () => {
    const r = berekenFietsvergoedingJaar(12_000, 0.5);
    expect(r.redenBelastbaar).toMatch(/én/);
  });
});

describe("verzekeringstaks en accijnzen", () => {
  it("heft 9,25% op de premie", () => {
    expect(verzekeringstaks(1200)).toBeCloseTo(111, 6);
  });

  it("geeft de terugvorderbare accijns per liter en per jaar", () => {
    expect(terugvorderbareAccijns(1000, 2026).perLiter).toBe(0.1913);
    expect(terugvorderbareAccijns(1000, 2026).terugvorderbaar).toBeCloseTo(191.3, 6);
    expect(terugvorderbareAccijns(1000, 2026).termijnJaren).toBe(3);
  });

  it("geeft niets terug voor een jaar dat niet in de tabel staat", () => {
    expect(terugvorderbareAccijns(1000, 2020).terugvorderbaar).toBeNull();
  });
});
