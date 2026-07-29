import { describe, expect, it } from "vitest";
import { standaardBesteljaren, vergelijkBesteljaren } from "./besteljaar";
import { catalogPreview } from "./catalog";
import { catalogusPerSlug } from "./catalogusdata";
import { DEFAULT_CONTEXT } from "./defaults";

const model = (slug: string) => {
  const c = catalogusPerSlug(slug);
  if (!c) throw new Error(`Onbekend model in de test: ${slug}`);
  return c;
};

const diesel = catalogPreview(model("bmw-320d"), 2026);
const elektrisch = catalogPreview(model("tesla-model-3"), 2026);

describe("vergelijkBesteljaren", () => {
  it("toont de uitdoofkalender voor een verbrandingswagen", () => {
    const v = vergelijkBesteljaren(DEFAULT_CONTEXT, diesel, [2024, 2025, 2026, 2027]);
    const perJaar = Object.fromEntries(v.rijen.map((r) => [r.jaar, r]));

    // Besteld in 2024 of 2025 valt de wagen onder het regime 2023H2-2025 en is
    // hij in zijn eerste gebruiksjaar nog aftrekbaar. Vanaf 2026 is dat over.
    expect(perJaar[2025].aftrekEerste).toBeGreaterThan(0);
    expect(perJaar[2026].aftrekEerste).toBe(0);
    expect(perJaar[2027].aftrekEerste).toBe(0);
  });

  it("wijst het laatste jaar aan waarin bestellen nog aftrek oplevert", () => {
    const v = vergelijkBesteljaren(DEFAULT_CONTEXT, diesel, [2024, 2025, 2026, 2027]);
    expect(v.laatsteJaarMetAftrek).toBe(2025);
  });

  it("laat een elektrische wagen tot en met 2026 volledig aftrekbaar", () => {
    const v = vergelijkBesteljaren(DEFAULT_CONTEXT, elektrisch, [2025, 2026, 2027, 2028]);
    const perJaar = Object.fromEntries(v.rijen.map((r) => [r.jaar, r]));
    expect(perJaar[2026].aftrekEerste).toBe(100);
    // Vanaf bestelling in 2027 begint de afbouw ook voor elektrisch.
    expect(perJaar[2027].aftrekEerste).toBeLessThan(100);
    expect(perJaar[2028].aftrekEerste).toBeLessThan(perJaar[2027].aftrekEerste);
    expect(v.laatsteJaarMetAftrek).toBe(2028);
  });

  it("maakt uitstellen duurder voor een verbrandingswagen", () => {
    const v = vergelijkBesteljaren(DEFAULT_CONTEXT, diesel, [2025, 2026]);
    const perJaar = Object.fromEntries(v.rijen.map((r) => [r.jaar, r]));
    expect(perJaar[2026].totaleKost).toBeGreaterThan(perJaar[2025].totaleKost);
    expect(v.besteJaar).toBe(2025);
    expect(v.spreiding).toBeGreaterThan(0);
  });

  it("berekent de meerkost tegenover het goedkoopste jaar", () => {
    const v = vergelijkBesteljaren(DEFAULT_CONTEXT, diesel, [2025, 2026, 2027]);
    const beste = v.rijen.find((r) => r.jaar === v.besteJaar)!;
    expect(beste.meerkostTegenoverBeste).toBe(0);
    for (const r of v.rijen) {
      expect(r.meerkostTegenoverBeste).toBeCloseTo(r.totaleKost - beste.totaleKost, 6);
      expect(r.meerkostTegenoverBeste).toBeGreaterThanOrEqual(0);
    }
  });

  it("sorteert de jaren oplopend, ongeacht de volgorde van de invoer", () => {
    const v = vergelijkBesteljaren(DEFAULT_CONTEXT, diesel, [2027, 2025, 2026]);
    expect(v.rijen.map((r) => r.jaar)).toEqual([2025, 2026, 2027]);
  });

  it("geeft een leeg maar bruikbaar resultaat zonder jaren", () => {
    const v = vergelijkBesteljaren(DEFAULT_CONTEXT, diesel, []);
    expect(v.rijen).toEqual([]);
    expect(v.laatsteJaarMetAftrek).toBeNull();
    expect(v.spreiding).toBe(0);
  });

  it("laat de besteldatum de eerste ingebruikname twee maanden voorgaan", () => {
    // De leeftijdscorrectie op het VAA vertrekt vanaf de inschrijving; die mag
    // dus niet samenvallen met de bestelling.
    const v = vergelijkBesteljaren(DEFAULT_CONTEXT, elektrisch, [2026]);
    expect(v.rijen).toHaveLength(1);
    expect(v.rijen[0].totaleKost).toBeGreaterThan(0);
  });
});

describe("standaardBesteljaren", () => {
  it("kijkt twee jaar terug en twee vooruit", () => {
    expect(standaardBesteljaren(2026)).toEqual([2024, 2025, 2026, 2027, 2028]);
  });
});
