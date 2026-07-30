import { describe, expect, it } from "vitest";
import { DEFAULT_CONTEXT } from "./defaults";
import { berekenJaar, btwAftrekPct, kostenBasis, voordeelAlleAard } from "./engine";
import type { Vehicle } from "./types";

/**
 * Tests voor de uitbreidingen op de rekenkern: BTW, financieringskosten, de
 * eigen bijdrage van de werknemer en de laadinfrastructuur.
 *
 * De referentietests in engine.test.ts blijven het ijkpunt voor de
 * basisberekening. Deze tests bewaken twee dingen: dat elke uitbreiding
 * neutraal is zolang ze niet ingevuld wordt, en dat de bedragen kloppen met een
 * handberekening zodra dat wel gebeurt.
 */

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

/** Diesel besteld 2024: in 2026 nog 50% aftrekbaar. Handig ijkpunt. */
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

describe("BTW-aftrek op autokosten", () => {
  it("vordert niets terug zolang er geen methode gekozen is", () => {
    expect(btwAftrekPct(diesel)).toBe(0);
    expect(kostenBasis(diesel).btwTeruggevorderd).toBe(0);
    expect(kostenBasis(diesel).kostenOnderworpen).toBe(9200);
  });

  it("past het 35%-forfait toe op het BTW-deel van de kosten", () => {
    const wagen = { ...diesel, btw_methode: "forfait35" as const };
    // 9.200 incl. 21% bevat 9.200 × 21/121 = 1.596,69 BTW; daarvan 35%.
    const verwacht = 9200 * (21 / 121) * 0.35;
    expect(kostenBasis(wagen).btwTeruggevorderd).toBeCloseTo(verwacht, 2);
    expect(kostenBasis(wagen).kostenOnderworpen).toBeCloseTo(9200 - verwacht, 2);
  });

  it("begrenst het werkelijke beroepsgebruik op het wettelijke plafond van 50%", () => {
    expect(btwAftrekPct({ ...diesel, btw_methode: "werkelijk", beroepsgebruik_pct: 100 })).toBe(50);
    expect(btwAftrekPct({ ...diesel, btw_methode: "werkelijk", beroepsgebruik_pct: 80 })).toBe(50);
  });

  it("volgt het beroepsgebruik wanneer dat onder 50% ligt", () => {
    expect(btwAftrekPct({ ...diesel, btw_methode: "werkelijk", beroepsgebruik_pct: 30 })).toBe(30);
  });

  it("verlaagt de verworpen uitgaven, want teruggevorderde BTW is geen kost", () => {
    const zonder = berekenJaar(ctx, diesel, 2026);
    const met = berekenJaar(ctx, { ...diesel, btw_methode: "forfait35" }, 2026);
    expect(met.nietAftrekbaar).toBeLessThan(zonder.nietAftrekbaar);
    expect(met.totaleKost).toBeLessThan(zonder.totaleKost);
  });
});

describe("financieringskosten buiten de aftrekbeperking", () => {
  it("laat de intrest volledig aftrekbaar, ook bij 50% aftrek", () => {
    const wagen = { ...diesel, kosten_financiering: 2000 };
    const basis = kostenBasis(wagen);
    expect(basis.kostenOnderworpen).toBe(7200);
    expect(basis.kostenVolledigAftrekbaar).toBe(2000);

    const r = berekenJaar(ctx, wagen, 2026);
    // Alleen de 7.200 valt onder de beperking: (1 − 0,50) × 7.200.
    expect(r.nietAftrekbaar).toBeCloseTo(3600, 2);
  });

  it("verlaagt de verworpen uitgaven tegenover dezelfde wagen zonder uitsplitsing", () => {
    const zonder = berekenJaar(ctx, diesel, 2026);
    const met = berekenJaar(ctx, { ...diesel, kosten_financiering: 2000 }, 2026);
    expect(met.verworpenUitgaven).toBeLessThan(zonder.verworpenUitgaven);
    // De totale kost verandert niet: er wordt alleen anders toegerekend.
    expect(met.kostenOnderworpen + met.kostenVolledigAftrekbaar).toBeCloseTo(9200, 2);
  });

  it("laat de intrest nooit groter worden dan de kosten zelf", () => {
    const basis = kostenBasis({ ...diesel, kosten_financiering: 99999 });
    expect(basis.kostenOnderworpen).toBe(0);
    expect(basis.kostenVolledigAftrekbaar).toBe(9200);
  });
});

describe("eigen bijdrage van de werknemer", () => {
  it("verlaagt het VAA met twaalf maal de maandbijdrage", () => {
    const wagen = { ...diesel, eigen_bijdrage_maand: 100 };
    const bruto = voordeelAlleAard(ctx, diesel, 2026);
    const r = berekenJaar(ctx, wagen, 2026);
    expect(r.vaaBruto).toBeCloseTo(bruto, 2);
    expect(r.eigenBijdrageJaar).toBe(1200);
    expect(r.vaa).toBeCloseTo(bruto - 1200, 2);
    expect(r.vuUitVaa).toBeCloseTo(0.4 * (bruto - 1200), 2);
  });

  it("duwt het VAA niet onder nul bij een hoge bijdrage", () => {
    // Het VAA van de BEV is het minimum van € 1.690; € 200 per maand is meer.
    const r = berekenJaar(ctx, { ...bev, eigen_bijdrage_maand: 200 }, 2026);
    expect(r.vaaBruto).toBe(1690);
    expect(r.vaa).toBe(0);
    expect(r.vuUitVaa).toBe(0);
  });

  it("wordt pas ná het wettelijk minimum toegepast", () => {
    // Zonder bijdrage zit de BEV op het minimum; de bijdrage gaat daar vanaf,
    // ze verlaagt niet eerst de berekende waarde waarna het minimum weer optilt.
    const r = berekenJaar(ctx, { ...bev, eigen_bijdrage_maand: 40 }, 2026);
    expect(r.vaa).toBeCloseTo(1690 - 480, 2);
  });

  it("verlaagt de totale kost, want ze is een opbrengst voor de vennootschap", () => {
    const zonder = berekenJaar(ctx, bev, 2026);
    const met = berekenJaar(ctx, { ...bev, eigen_bijdrage_maand: 100 }, 2026);
    expect(zonder.totaleKost - met.totaleKost).toBeGreaterThan(1200);
  });
});

describe("laadinfrastructuur", () => {
  it("houdt de laadpaal buiten de aftrekbeperking", () => {
    const r = berekenJaar(ctx, { ...diesel, laadpaal_jaarkost: 800 }, 2026);
    expect(r.kostenVolledigAftrekbaar).toBe(800);
    // De laadpaal verhoogt de kost, maar niet de verworpen uitgaven.
    expect(r.nietAftrekbaar).toBeCloseTo(berekenJaar(ctx, diesel, 2026).nietAftrekbaar, 2);
  });

  it("laat de terugbetaalde laadstroom de aftrekbaarheid van de wagen volgen", () => {
    const r = berekenJaar(ctx, { ...diesel, laadstroom_jaar: 600 }, 2026);
    expect(r.kostenOnderworpen).toBe(9800);
    expect(r.nietAftrekbaar).toBeCloseTo(0.5 * 9800, 2);
  });

  it("blijft neutraal wanneer beide velden leeg zijn", () => {
    const basis = berekenJaar(ctx, diesel, 2026);
    const leeg = berekenJaar(ctx, { ...diesel, laadpaal_jaarkost: 0, laadstroom_jaar: 0 }, 2026);
    expect(leeg.totaleKost).toBeCloseTo(basis.totaleKost, 6);
  });
});

describe("kostensoorten met een eigen aftrekregime", () => {
  it("houdt verkeersboetes volledig buiten de aftrek", () => {
    const r = berekenJaar(ctx, { ...diesel, kosten_boetes: 300 }, 2026);
    // De volle 300 belandt in de verworpen uitgaven, niet de helft.
    expect(r.nietAftrekbaar).toBeCloseTo(berekenJaar(ctx, diesel, 2026).nietAftrekbaar + 300, 2);
    expect(r.kostenverdeling.kostenNietAftrekbaar).toBe(300);
  });

  it("laat de laadstroom van een PHEV het pad van de elektrische wagens volgen", () => {
    // Een PHEV besteld in 2026 is zelf 0% aftrekbaar, maar zijn laadstroom
    // volgt het EV-pad en blijft in 2026 volledig aftrekbaar.
    const phev = {
      ...diesel,
      voertuigtype: "PHEV" as const,
      brandstof: "benzine" as const,
      besteldatum: "2026-01-15",
      co2: 30,
      batterij_kwh: 18,
      wagengewicht: 1900,
      laadstroom_jaar: 600,
    };
    const r = berekenJaar(ctx, phev, 2026);
    expect(r.aftrekPct).toBe(0);
    expect(r.aftrekPctElektriciteit).toBe(100);
    // Alleen de wagenkosten zijn verworpen, de laadstroom niet.
    expect(r.nietAftrekbaar).toBeCloseTo(9200, 2);
  });

  it("topt het brandstofdeel van een PHEV af op 50% en zet het nul vanaf 2028", () => {
    const phev = {
      ...diesel,
      voertuigtype: "PHEV" as const,
      brandstof: "benzine" as const,
      besteldatum: "2024-03-01",
      co2: 40,
      batterij_kwh: 18,
      wagengewicht: 1900,
      kosten_brandstof: 2000,
    };
    // In 2026 is de wagen zelf 50% aftrekbaar; het brandstofdeel eveneens.
    const r2026 = berekenJaar(ctx, phev, 2026);
    expect(r2026.aftrekPctBrandstof).toBe(50);
    // Vanaf 2028 valt het brandstofdeel weg, ook voor deze oudere bestelling.
    expect(berekenJaar(ctx, phev, 2028).aftrekPctBrandstof).toBe(0);
  });

  it("blijft neutraal voor een wagen die de nieuwe velden niet invult", () => {
    const basis = berekenJaar(ctx, diesel, 2026);
    const leeg = berekenJaar(ctx, { ...diesel, kosten_boetes: 0, kosten_brandstof: 0 }, 2026);
    expect(leeg.totaleKost).toBeCloseTo(basis.totaleKost, 6);
    expect(leeg.nietAftrekbaar).toBeCloseTo(basis.nietAftrekbaar, 6);
  });
});

describe("de uitbreidingen samen", () => {
  it("laten een BEV met eigen bijdrage en BTW-aftrek goedkoper uitvallen", () => {
    const kaal = berekenJaar(ctx, bev, 2026);
    const geoptimaliseerd = berekenJaar(
      ctx,
      { ...bev, btw_methode: "forfait35", eigen_bijdrage_maand: 50, kosten_financiering: 1500 },
      2026,
    );
    expect(geoptimaliseerd.totaleKost).toBeLessThan(kaal.totaleKost);
    // De BEV is 100% aftrekbaar, dus het uitlichten van de intrest verandert
    // daar niets aan de verworpen uitgaven.
    expect(geoptimaliseerd.nietAftrekbaar).toBe(0);
  });
});
