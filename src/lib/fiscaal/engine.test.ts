import { describe, expect, it } from "vitest";
import { DEFAULT_CONTEXT } from "./defaults";
import {
  aftrekOpbouw,
  aftrekPct,
  berekenJaar,
  berekenProjectie,
  co2Percentage,
  gramformule,
  leeftijdscorrectie,
  parametersVoorJaar,
  rszBijdrageMaand,
  voordeelAlleAard,
} from "./engine";
import type { Vehicle } from "./types";

const ctx = DEFAULT_CONTEXT;
const params2026 = parametersVoorJaar(ctx, 2026);

/** Wagen A uit Bijlage 1: BEV besteld 2026, cataloguswaarde € 45.000. */
const bev: Vehicle = {
  id: "a",
  omschrijving: "Wagen A – BEV",
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

/** Wagen B uit Bijlage 1: diesel besteld 2024, cataloguswaarde € 38.000, 135 g/km. */
const diesel: Vehicle = {
  ...bev,
  id: "b",
  omschrijving: "Wagen B – Diesel",
  voertuigtype: "fossiel",
  brandstof: "diesel",
  besteldatum: "2024-03-01",
  eerste_ingebruikname: "2024-06-01",
  co2: 135,
  cataloguswaarde: 38000,
  jaarlijkse_autokosten: 9200,
  aankoopprijs: 38000,
  thuislaadpunt: false,
  flex_score: 8,
};

describe("aftrekbaarheid (Tabel 1 en Bijlage 3)", () => {
  it("BEV besteld vóór 1/1/2027 behoudt levenslang 100%", () => {
    for (const jaar of [2026, 2028, 2031]) {
      expect(aftrekPct(ctx, bev, jaar)).toBe(100);
    }
  });

  it.each([
    ["2026-12-31", 100],
    ["2027-01-01", 95],
  ])("BEV besteld op %s houdt levenslang %i%%", (besteldatum, verwacht) => {
    // De duurste dag in de hele applicatie voor een elektrische wagen: één dag
    // later kost vijf procentpunten aftrek, voor de hele gebruiksduur.
    const wagen = { ...bev, besteldatum };
    expect(aftrekPct(ctx, wagen, 2027)).toBe(verwacht);
    expect(aftrekPct(ctx, wagen, 2031)).toBe(verwacht);
  });

  it("BEV besteld in 2027 valt in het afbouwpad op 95%", () => {
    const bev2027 = { ...bev, besteldatum: "2027-02-01" };
    expect(aftrekPct(ctx, bev2027, 2027)).toBe(95);
    expect(aftrekPct(ctx, bev2027, 2030)).toBe(95);
  });

  it("diesel besteld 2024: de gramformule, afgetopt op het plafond van het jaar", () => {
    // In het overgangsregime blijft de gramformule gelden; het plafond uit de
    // uitdoofkalender is een bovengrens, geen vast percentage. Deze diesel van
    // 135 g komt op 52,5% uit en zit daarmee in 2025 onder het plafond van 75%.
    expect(aftrekPct(ctx, diesel, 2025)).toBe(52.5);
    expect(aftrekPct(ctx, diesel, 2026)).toBe(50);
    expect(aftrekPct(ctx, diesel, 2027)).toBe(25);
    expect(aftrekPct(ctx, diesel, 2028)).toBe(0);
    expect(aftrekPct(ctx, diesel, 2029)).toBe(0);
  });

  it("een vuile wagen in het overgangsregime zakt onder het plafond", () => {
    // 250 g diesel: de formule geeft 120 − 125 = −5%. Tot en met gebruiksjaar
    // 2024 tilt de minimumaftrek dat naar de 40% voor hoge uitstoot; vanaf 2025
    // bestaat die ondergrens niet meer en blijft er niets over.
    const vuil = { ...diesel, co2: 250 };
    expect(aftrekPct(ctx, vuil, 2024)).toBe(40);
    expect(aftrekPct(ctx, vuil, 2025)).toBe(0);
  });

  it("zonder CO2-waarde op het attest geldt het forfait van 40%", () => {
    const onbekend = { ...diesel, besteldatum: "2023-03-01", co2_onbekend: true };
    expect(aftrekPct(ctx, onbekend, 2026)).toBe(40);
  });

  it("verbrandingswagen besteld vanaf 2026 is meteen 0% aftrekbaar", () => {
    const nieuweDiesel = { ...diesel, besteldatum: "2026-02-01" };
    expect(aftrekPct(ctx, nieuweDiesel, 2026)).toBe(0);
  });

  /*
   * De aftopping van het overgangsregime geldt pas vanaf aanslagjaar 2026, dus
   * vanaf inkomstenjaar 2025. Daarom begint de uitdoofkalender bij 2025.
   *
   * Voor gebruiksjaar 2023 en 2024 vulde plafondUitKalender de hoogste trap in
   * (75%), en dat kostte 25 procentpunten op een pad dat elke bezoeker ziet:
   * standaardBesteljaren zet 2024 altijd in de besteljaartabel van de simulator.
   * De wagen hieronder is bewust een schone plug-inhybride: bij 135 g/km ligt de
   * gramformule toch al onder 75% en blijft de fout onzichtbaar.
   */
  const schonePhev: Vehicle = {
    ...diesel,
    voertuigtype: "PHEV",
    brandstof: "benzine",
    co2: 30,
    batterij_kwh: 15,
    wagengewicht: 1800,
  };

  it.each([2023, 2024])(
    "kent in het overgangsregime geen plafond in gebruiksjaar %i",
    (gebruiksjaar) => {
      const opbouw = aftrekOpbouw(ctx, schonePhev, gebruiksjaar);
      expect(opbouw.plafondPct).toBeNull();
      expect(opbouw.herkomst).toBe("gramformule");
      expect(opbouw.pct).toBe(100);
    },
  );

  it.each([
    [2025, 75],
    [2026, 50],
    [2027, 25],
    [2028, 0],
  ])("topt vanaf gebruiksjaar %i af op %i%%", (gebruiksjaar, verwacht) => {
    const opbouw = aftrekOpbouw(ctx, schonePhev, gebruiksjaar);
    expect(opbouw.plafondPct).toBe(verwacht);
    expect(opbouw.pct).toBe(verwacht);
  });

  it("gramformule voor bestellingen vóór 1/7/2023, begrensd 50-100%", () => {
    expect(gramformule("diesel", 100)).toBe(70); // 120 − 0,5 × 1 × 100
    expect(gramformule("benzine", 120)).toBe(63); // 120 − 0,5 × 0,95 × 120
    expect(gramformule("diesel", 200)).toBe(40); // aftopping vanaf 200 g/km
    expect(gramformule("diesel", 199)).toBe(50); // ondergrens, net eronder
    expect(gramformule("elektrisch", 0)).toBe(100); // bovengrens
    expect(gramformule("diesel", null)).toBe(40); // onbekende uitstoot
    const oudeDiesel = { ...diesel, besteldatum: "2023-03-01" };
    expect(aftrekPct(ctx, oudeDiesel, 2026)).toBe(120 - 0.5 * 135);
  });
});

describe("herkomst van het aftrekpercentage", () => {
  const voertuigen: Array<[string, Vehicle]> = [
    ["bev 2026", bev],
    ["bev 2027", { ...bev, besteldatum: "2027-02-01" }],
    ["bev 2031", { ...bev, besteldatum: "2031-02-01" }],
    ["diesel 2024", diesel],
    ["diesel 2026", { ...diesel, besteldatum: "2026-02-01" }],
    ["diesel 2023 H1", { ...diesel, besteldatum: "2023-03-01" }],
    ["vuile diesel 2024", { ...diesel, co2: 250 }],
    ["diesel zonder CO₂", { ...diesel, besteldatum: "2023-03-01", co2_onbekend: true }],
  ];

  it.each(voertuigen)("geeft voor %s hetzelfde getal als aftrekPct", (_naam, wagen) => {
    // aftrekPct gaat door aftrekOpbouw heen. Deze test bewaakt dat die
    // herformulering geen enkel bestaand cijfer verschoven heeft.
    for (const gebruiksjaar of [2024, 2025, 2026, 2027, 2028, 2029, 2031]) {
      expect(aftrekOpbouw(ctx, wagen, gebruiksjaar).pct).toBe(
        aftrekPct(ctx, wagen, gebruiksjaar),
      );
    }
  });

  it("noemt bij een bestelling vóór juli 2023 de gramformule, zonder plafond", () => {
    const oud = { ...diesel, besteldatum: "2023-03-01" };
    const o = aftrekOpbouw(ctx, oud, 2026);
    expect(o.herkomst).toBe("gramformule");
    expect(o.periode.code).toBe("voor_07_2023");
    expect(o.gramformulePct).toBe(52.5);
    expect(o.plafondPct).toBeNull();
    expect(o.gramCoefficient).toBe(1);
    expect(o.gerekendeCo2).toBe(135);
    expect(o.metMinimum).toBe(true);
  });

  it("noemt bij een elektrische wagen de kalender en niet de formule", () => {
    const o = aftrekOpbouw(ctx, { ...bev, besteldatum: "2027-02-01" }, 2027);
    expect(o.herkomst).toBe("kalenderplafond");
    expect(o.plafondPct).toBe(95);
    expect(o.gramformulePct).toBeNull();
  });

  it("onderscheidt levenslang nul van een kalenderjaar dat op nul staat", () => {
    // Besteld vanaf 2026 is de nul een eigenschap van het besteljaar: één regel
    // voor de hele gebruiksduur.
    const nieuw = aftrekOpbouw(ctx, { ...diesel, besteldatum: "2026-02-01" }, 2026);
    expect(nieuw.herkomst).toBe("levenslang_nul");
    expect(nieuw.pct).toBe(0);

    // Besteld in 2024 is de nul een trap in de uitdoofkalender, en dus iets
    // anders om uit te leggen.
    const overgang = aftrekOpbouw(ctx, diesel, 2028);
    expect(overgang.herkomst).toBe("kalenderplafond");
    expect(overgang.pct).toBe(0);
  });

  it("zegt in het overgangsregime welke van de twee bond", () => {
    // 135 g diesel: de formule geeft 52,5%. In gebruiksjaar 2025 ligt het
    // plafond op 75%, dus bindt de formule.
    const formuleBindt = aftrekOpbouw(ctx, diesel, 2025);
    expect(formuleBindt.herkomst).toBe("gramformule");
    expect(formuleBindt.gramformulePct).toBe(52.5);
    expect(formuleBindt.plafondPct).toBe(75);
    expect(formuleBindt.pct).toBe(52.5);

    // Een schone diesel van 40 g komt op 100% uit; dan bindt het plafond.
    const plafondBindt = aftrekOpbouw(ctx, { ...diesel, co2: 40 }, 2026);
    expect(plafondBindt.herkomst).toBe("kalenderplafond");
    expect(plafondBindt.gramformulePct).toBe(100);
    expect(plafondBindt.plafondPct).toBe(50);
    expect(plafondBindt.pct).toBe(50);
  });

  it("meldt of de wettelijke ondergrens van 50% nog gold", () => {
    expect(aftrekOpbouw(ctx, diesel, 2024).metMinimum).toBe(true);
    expect(aftrekOpbouw(ctx, diesel, 2025).metMinimum).toBe(false);
  });

  it("geeft de gecorrigeerde CO₂ van een valse hybride terug", () => {
    // Een PHEV met een te kleine batterij wordt fiscaal op een hogere uitstoot
    // gewogen; de uitleg hoort dat cijfer te tonen en niet dat van het attest.
    const valse: Vehicle = {
      ...diesel,
      voertuigtype: "PHEV",
      brandstof: "benzine",
      besteldatum: "2023-03-01",
      co2: 40,
      batterij_kwh: 1,
      wagengewicht: 2000,
    };
    const o = aftrekOpbouw(ctx, valse, 2026);
    expect(o.gerekendeCo2).toBeGreaterThan(40);
    expect(o.gramCoefficient).toBe(0.95);
  });
});

describe("voordeel van alle aard (Tabel 2)", () => {
  it("BEV zit op het CO₂-minimum van 4% en het VAA-minimum van € 1.690", () => {
    expect(co2Percentage(params2026, "elektrisch", 0)).toBe(4);
    expect(voordeelAlleAard(ctx, bev, 2026)).toBe(1690);
  });

  it("diesel 135 g/km komt op 13,2% (5,5% + 77 × 0,1%)", () => {
    expect(co2Percentage(params2026, "diesel", 135)).toBeCloseTo(13.2, 5);
  });

  it("leeftijdscorrectie: −6% per jaar, minimum 70%", () => {
    expect(leeftijdscorrectie(2024, 2024)).toBe(1);
    expect(leeftijdscorrectie(2026, 2024)).toBe(0.88);
    expect(leeftijdscorrectie(2040, 2024)).toBe(0.7);
  });

  // Bijlage 1 vermeldt ≈ € 4.520, maar de eigen formule van het rapport
  // (38.000 × 6/7 × 0,88 × 13,2%) geeft € 3.783,50. De tool volgt de formule.
  it("VAA diesel 2026 = cataloguswaarde × 6/7 × 88% × 13,2%", () => {
    expect(voordeelAlleAard(ctx, diesel, 2026)).toBeCloseTo(38000 * (6 / 7) * 0.88 * 0.132, 2);
  });
});

describe("RSZ CO₂-solidariteitsbijdrage (Tabel 3)", () => {
  it("BEV betaalt het basisminimum: € 33,93/maand = € 407,16/jaar", () => {
    // Emissievrije wagens zijn vrijgesteld van het verhoogde minimum (€ 42,34).
    expect(rszBijdrageMaand(ctx, bev, 2026)).toBeCloseTo(33.93, 2);
    expect(berekenJaar(ctx, bev, 2026).rszJaar).toBeCloseTo(407.16, 2);
  });

  // Bijlage 1 vermeldt ≈ € 130/maand, maar laat daarbij de multiplicator (4)
  // uit de eigen formule weg. De tool past de formule volledig toe.
  it("diesel: ((135 × 9 − 600)/12) × 1,6291 × multiplicator 4", () => {
    expect(rszBijdrageMaand(ctx, diesel, 2026)).toBeCloseTo(((135 * 9 - 600) / 12) * 1.6291 * 4, 2);
  });
});

describe("verworpen uitgaven en extra VenB (Bijlage 1)", () => {
  it("Wagen A (BEV): VU € 676, extra VenB € 169, totale fiscale meerkost ≈ € 576", () => {
    const r = berekenJaar(ctx, bev, 2026);
    expect(r.nietAftrekbaar).toBe(0);
    expect(r.vuUitVaa).toBeCloseTo(676, 2); // 40% × 1.690 (laadkaart aanwezig)
    expect(r.verworpenUitgaven).toBeCloseTo(676, 2);
    expect(r.extraVenB).toBeCloseTo(169, 2);
    expect(r.fiscaleMeerkost).toBeCloseTo(169 + 407.16, 2);
  });

  it("Wagen B (diesel): niet-aftrekbaar deel € 4.600 + 40% van het VAA", () => {
    const r = berekenJaar(ctx, diesel, 2026);
    const vaa = voordeelAlleAard(ctx, diesel, 2026);
    expect(r.nietAftrekbaar).toBeCloseTo(4600, 2); // (1 − 0,50) × 9.200
    expect(r.verworpenUitgaven).toBeCloseTo(4600 + 0.4 * vaa, 2);
    expect(r.extraVenB).toBeCloseTo(0.25 * (4600 + 0.4 * vaa), 2);
  });

  it("zonder tankkaart vloeit 17% van het VAA naar de verworpen uitgaven", () => {
    const zonderKaart = { ...diesel, tankkaart: false };
    const r = berekenJaar(ctx, zonderKaart, 2026);
    expect(r.vuUitVaa).toBeCloseTo(0.17 * voordeelAlleAard(ctx, diesel, 2026), 2);
  });

  it("KMO-tarief van 20% kan toegepast worden", () => {
    const r = berekenJaar(ctx, diesel, 2026, { kmoTarief: true });
    expect(r.extraVenB).toBeCloseTo(0.2 * r.verworpenUitgaven, 2);
  });
});

describe("meerjarenprojectie", () => {
  it("projectie 2026-2029 voor de diesel volgt de uitdoofkalender", () => {
    const p = berekenProjectie(ctx, diesel, 2026);
    expect(p.jaren.map((j) => j.aftrekPct)).toEqual([50, 25, 0, 0]);
    expect(p.gemiddeldeAftrekPct).toBeCloseTo(18.75, 2);
  });

  it("de BEV is over 4 jaar duidelijk goedkoper dan de diesel", () => {
    const pBev = berekenProjectie(ctx, bev, 2026);
    const pDiesel = berekenProjectie(ctx, diesel, 2026);
    expect(pBev.totaleKost).toBeLessThan(pDiesel.totaleKost);
    expect(pBev.totaleVU).toBeCloseTo(4 * 676, 2);
  });
});
