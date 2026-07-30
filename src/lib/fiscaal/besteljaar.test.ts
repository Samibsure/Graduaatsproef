import { describe, expect, it } from "vitest";
import { standaardBesteljaren, vergelijkBesteljaren } from "./besteljaar";
import { catalogPreview } from "./catalog";
import { catalogusPerSlug } from "./catalogusdata";
import { DEFAULT_CONTEXT } from "./defaults";
import { berekenProjectie } from "./engine";

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

/** De som van de drie drijvers, want die telling komt in elke test terug. */
const totaal = (d: { aftrekbaarheid: number; voordeelAlleAard: number; rsz: number }) =>
  d.aftrekbaarheid + d.voordeelAlleAard + d.rsz;

describe("waar het verschil tussen besteljaren zit", () => {
  const wagens: Array<[string, ReturnType<typeof catalogPreview>]> = [
    ["diesel", diesel],
    ["elektrisch", elektrisch],
  ];

  it.each(wagens)(
    "de drie drijvers sommeren voor %s exact tot de kolom Verschil",
    (_naam, wagen) => {
      // Dit is de belofte die de tabel op het scherm doet: de balkjes in de
      // uitleg tellen op tot het bedrag in de laatste kolom. Klopt dat niet, dan
      // is de uitleg erger dan geen uitleg.
      for (const opties of [undefined, { kmoTarief: true }]) {
        const v = vergelijkBesteljaren(
          DEFAULT_CONTEXT,
          wagen,
          [2024, 2025, 2026, 2027, 2028],
          4,
          opties,
        );
        for (const r of v.rijen) {
          expect(totaal(r.drijversVerschil)).toBeCloseTo(r.meerkostTegenoverBeste, 6);
        }
      }
    },
  );

  it("laat het goedkoopste besteljaar op nul staan", () => {
    const v = vergelijkBesteljaren(DEFAULT_CONTEXT, diesel, [2025, 2026, 2027]);
    const beste = v.rijen.find((r) => r.jaar === v.besteJaar)!;
    expect(beste.drijversVerschil).toEqual({
      aftrekbaarheid: 0,
      voordeelAlleAard: 0,
      rsz: 0,
    });
  });

  it("dekt met de drie drijvers de volledige fiscale meerkost over de looptijd", () => {
    // Niet alleen het verschil moet kloppen, ook het absolute bedrag: anders
    // klopt het verschil per ongeluk omdat er twee keer hetzelfde ontbreekt.
    const v = vergelijkBesteljaren(DEFAULT_CONTEXT, diesel, [2025, 2026], 4);
    for (const r of v.rijen) {
      const projectie = berekenProjectie(
        DEFAULT_CONTEXT,
        { ...diesel, besteldatum: `${r.jaar}-01-15`, eerste_ingebruikname: `${r.jaar}-03-01` },
        r.jaar,
        4,
      );
      const meerkost = projectie.jaren.reduce((s, j) => s + j.fiscaleMeerkost, 0);
      expect(totaal(r.drijvers)).toBeCloseTo(meerkost, 6);
    }
  });

  it("wijst voor een elektrische wagen de aftrekbaarheid als de drijver aan", () => {
    // Besteld in 2026 nog 100%, besteld in 2028 nog 90%. Aan de wagen en aan de
    // RSZ verandert bijna niets; het verschil zit in wat aftrekbaar is.
    const v = vergelijkBesteljaren(DEFAULT_CONTEXT, elektrisch, [2026, 2028], 4);
    const laat = v.rijen.find((r) => r.jaar === 2028)!;
    expect(laat.drijversVerschil.aftrekbaarheid).toBeGreaterThan(0);
    expect(laat.drijversVerschil.aftrekbaarheid).toBeGreaterThan(
      Math.abs(laat.drijversVerschil.rsz),
    );
  });

  it("geeft het aftrekpad over de volledige looptijd", () => {
    const v = vergelijkBesteljaren(DEFAULT_CONTEXT, diesel, [2025], 4);
    const r = v.rijen[0];
    expect(r.aftrekPad).toHaveLength(4);
    expect(r.aftrekPad[0]).toBe(r.aftrekEerste);
    // Besteld in 2025 loopt de wagen door de uitdoofkalender: 2025 tot 2028, en
    // dat laatste gebruiksjaar staat op nul.
    expect(r.aftrekPad[3]).toBe(0);
    // Een aftrekpad hoort nooit te stijgen; de kalender kent alleen dalingen.
    for (let i = 1; i < r.aftrekPad.length; i++) {
      expect(r.aftrekPad[i]).toBeLessThanOrEqual(r.aftrekPad[i - 1]);
    }
  });

  it("noemt per besteljaar waar het percentage vandaan komt", () => {
    const v = vergelijkBesteljaren(DEFAULT_CONTEXT, diesel, [2025, 2026]);
    const perJaar = Object.fromEntries(v.rijen.map((r) => [r.jaar, r]));
    expect(perJaar[2025].opbouw.herkomst).toBe("gramformule");
    expect(perJaar[2026].opbouw.herkomst).toBe("levenslang_nul");

    const bev = vergelijkBesteljaren(DEFAULT_CONTEXT, elektrisch, [2027]);
    expect(bev.rijen[0].opbouw.herkomst).toBe("kalenderplafond");
    expect(bev.rijen[0].opbouw.gramformulePct).toBeNull();
  });

  it("houdt de looptijd aan die meegegeven wordt", () => {
    const v = vergelijkBesteljaren(DEFAULT_CONTEXT, elektrisch, [2026], 6);
    expect(v.rijen[0].aftrekPad).toHaveLength(6);
  });
});

describe("standaardBesteljaren", () => {
  it("kijkt twee jaar terug en twee vooruit", () => {
    expect(standaardBesteljaren(2026)).toEqual([2024, 2025, 2026, 2027, 2028]);
  });
});
