import { describe, expect, it } from "vitest";
import { DEFAULT_CONTEXT } from "./defaults";
import { aftrekPct, bestelperiodeVoorDatum } from "./engine";
import {
  aftrekMatrix,
  aftrekPerKostensoort,
  gramdrempels,
  regimebanden,
  type Referentiewagen,
} from "./regimes";
import type { Vehicle } from "./types";

const ctx = DEFAULT_CONTEXT;

/**
 * De weergave mag nooit los komen te staan van de rekenkern. Daarom staat er in
 * dit bestand geen enkel percentage dat niet óf uit `engine.test.ts` komt, óf
 * naast `aftrekPct` van een echte wagen gelegd wordt.
 */

/** Kale wagen; alleen de velden die de aftrek beïnvloeden doen mee. */
function wagen(over: Partial<Vehicle>): Vehicle {
  return {
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
    besteldatum: "2024-03-01",
    eerste_ingebruikname: "2024-03-01",
    co2: 135,
    cataloguswaarde: 0,
    jaarlijkse_autokosten: 0,
    aankoopprijs: null,
    tankkaart: false,
    beroepsgebruik_pct: 0,
    thuislaadpunt: false,
    km_per_jaar: null,
    flex_score: 0,
    restwaarde_score: 0,
    ...over,
  };
}

describe("regimebanden", () => {
  const banden = regimebanden(ctx, "2026-07-30");

  it("geeft één band per bestelperiode, in volgorde", () => {
    expect(banden.map((b) => b.periodeCode)).toEqual([
      "voor_07_2023",
      "2023H2_2025",
      "2026",
      "2027",
      "2028",
      "2029",
      "2030",
      "2031_plus",
    ]);
  });

  it("volgt voor elektrisch het afbouwpad uit de aftrekkalender", () => {
    expect(banden.map((b) => b.bev)).toEqual([100, 100, 100, 95, 90, 82.5, 75, 67.5]);
  });

  it("markeert precies één band als die van vandaag", () => {
    expect(banden.filter((b) => b.isVandaag).map((b) => b.periodeCode)).toEqual(["2026"]);
  });

  it("zet de oudste periode op de gramformule, niet op een vast percentage", () => {
    const oud = banden[0].verbranding;
    expect(oud.soort).toBe("formule");
    if (oud.soort !== "formule") throw new Error("onverwacht regime");
    // De band is 50 tot 100%, met een aftopping op 40% vanaf 200 g/km. Precies
    // die 40% ontbrak in de oude kaart, die "50 tot 100%" beweerde.
    expect(oud).toMatchObject({ ondergrens: 50, bovengrens: 100, forfait: 40 });
  });

  it("geeft het overgangsregime als plafond per gebruiksjaar, niet als waarde", () => {
    const overgang = banden[1].verbranding;
    expect(overgang.soort).toBe("plafondPerJaar");
    if (overgang.soort !== "plafondPerJaar") throw new Error("onverwacht regime");
    expect(overgang.stappen).toEqual([
      { gebruiksjaar: 2025, plafond: 75 },
      { gebruiksjaar: 2026, plafond: 50 },
      { gebruiksjaar: 2027, plafond: 25 },
      { gebruiksjaar: 2028, plafond: 0 },
    ]);
  });

  it("zet verbranding vanaf besteljaar 2026 op vast 0%", () => {
    for (const band of banden.slice(2)) {
      expect(band.verbranding).toEqual({ soort: "vast", pct: 0 });
    }
  });

  it("houdt elke band binnen zijn eigen periode volgens de rekenkern", () => {
    // Vangt een periodetabel op waarin een beheerder de grenzen laat overlappen.
    for (const band of banden) {
      const peildatum = band.van ?? band.tot;
      if (!peildatum) continue;
      expect(bestelperiodeVoorDatum(ctx, peildatum).code).toBe(band.periodeCode);
    }
  });
});

describe("aftrekMatrix naast de rekenkern", () => {
  const jaren = [2025, 2026, 2027, 2028];

  const wagens: Referentiewagen[] = [
    { sleutel: "dieselOud", aandrijving: "fossiel", co2: 135, besteldatum: "2023-03-01" },
    { sleutel: "diesel", aandrijving: "fossiel", co2: 135, besteldatum: "2024-03-01" },
    { sleutel: "benzine", aandrijving: "PHEV", co2: 120, besteldatum: "2024-03-01" },
    { sleutel: "onbekend", aandrijving: "fossiel", co2: null, besteldatum: "2024-03-01" },
    { sleutel: "bev", aandrijving: "BEV", co2: 0, besteldatum: "2026-01-15" },
    { sleutel: "diesel2026", aandrijving: "fossiel", co2: 135, besteldatum: "2026-01-15" },
  ];

  const rijen = aftrekMatrix(ctx, wagens, jaren);

  it("geeft per cel exact wat aftrekPct voor diezelfde wagen geeft", () => {
    for (const rij of rijen) {
      const bron = wagens.find((w) => w.sleutel === rij.sleutel);
      if (!bron) throw new Error("rij zonder wagen");
      const v = wagen({
        voertuigtype: bron.aandrijving,
        brandstof: rij.brandstof,
        besteldatum: bron.besteldatum,
        co2: bron.co2 ?? 0,
        co2_onbekend: bron.co2 === null,
      });
      for (const cel of rij.cellen) {
        expect(cel.aftrek).toBe(aftrekPct(ctx, v, cel.gebruiksjaar));
      }
    }
  });

  it("laat zien dat de formule bindt waar de kaart het plafond beweerde", () => {
    // Diesel 135 g komt op 52,5% uit en zit daarmee onder het plafond van 75%.
    // De oude tekst "Daalt naar 0%" verzweeg dat.
    const diesel = rijen.find((r) => r.sleutel === "diesel");
    expect(diesel?.cellen[0]).toMatchObject({
      gebruiksjaar: 2025,
      aftrek: 52.5,
      formule: 52.5,
      plafond: 75,
      bindend: "formule",
    });
    expect(diesel?.cellen[1]).toMatchObject({ gebruiksjaar: 2026, aftrek: 50, bindend: "plafond" });
  });

  it("houdt een wagen besteld vóór juli 2023 levenslang op de formule", () => {
    const oud = rijen.find((r) => r.sleutel === "dieselOud");
    expect(oud?.levenslangVast).toBe(true);
    expect(oud?.cellen.map((c) => c.aftrek)).toEqual([52.5, 52.5, 52.5, 52.5]);
  });

  it("toont bij een valse hybride de gecorrigeerde uitstoot in de formulekolom", () => {
    // Een plug-inhybride van 120 g/km zit ver boven de drempel van 50 g, dus de
    // rekenkern rekent met 120 x 2,5 = 300 g. Toonde de formulekolom de ruwe
    // waarde, dan stond er 63% naast een aftrek van 0% en verklaarde de tabel
    // precies het tegenovergestelde van wat er gebeurt.
    const [rij] = aftrekMatrix(
      ctx,
      [{ sleutel: "vals", aandrijving: "PHEV", co2: 120, besteldatum: "2024-03-01" }],
      [2025],
    );
    expect(rij.cellen[0].aftrek).toBe(0);
    expect(rij.cellen[0].formule).toBe(0);
    expect(rij.cellen[0].bindend).toBe("formule");
  });

  it("valt bij onbekende uitstoot op het forfait van 40% terug", () => {
    const onbekend = rijen.find((r) => r.sleutel === "onbekend");
    expect(onbekend?.cellen[0].aftrek).toBe(40);
  });

  it("houdt elektrisch besteld in 2026 levenslang op 100%", () => {
    const bev = rijen.find((r) => r.sleutel === "bev");
    expect(bev?.levenslangVast).toBe(true);
    expect(bev?.cellen.every((c) => c.aftrek === 100)).toBe(true);
    expect(bev?.cellen.every((c) => c.bindend === "kalender")).toBe(true);
  });

  it("houdt verbranding besteld in 2026 op nul, zonder formule", () => {
    const rij = rijen.find((r) => r.sleutel === "diesel2026");
    expect(rij?.cellen.every((c) => c.aftrek === 0 && c.formule === null)).toBe(true);
  });
});

describe("aftrekPerKostensoort", () => {
  it("laat de laadstroom van een plug-inhybride het elektrische pad volgen", () => {
    // De wagen zelf zakt naar nul, de laadstroom blijft volledig aftrekbaar.
    // Dit staat vandaag op geen enkele uitlegpagina.
    const rijen = aftrekPerKostensoort(
      ctx,
      { sleutel: "phev", aandrijving: "PHEV", co2: 38, besteldatum: "2024-05-01" },
      [2025, 2027, 2028],
    );
    expect(rijen.map((r) => r.laadstroom)).toEqual([100, 100, 100]);
    expect(rijen.map((r) => r.wagen)).toEqual([75, 25, 0]);
    // Het brandstofdeel heeft zijn eigen plafond van 50% en valt in 2028 weg.
    expect(rijen.map((r) => r.brandstof)).toEqual([50, 25, 0]);
  });

  it("geeft buiten een plug-inhybride geen apart brandstofdeel", () => {
    const rijen = aftrekPerKostensoort(
      ctx,
      { sleutel: "diesel", aandrijving: "fossiel", co2: 135, besteldatum: "2024-03-01" },
      [2026],
    );
    expect(rijen[0].brandstof).toBeNull();
  });
});

describe("de datumgrenzen zelf", () => {
  /**
   * De vier datums waar de oude teksten de mist in gingen. "Besteld in 2023 tot
   * 2025" verzwijgt dat de grens midden in 2023 ligt, en één dag verschil zet een
   * wagen onder een ander regime voor zijn hele leven.
   */
  const grenzen = [
    { datum: "2023-06-30", periode: "voor_07_2023" },
    { datum: "2023-07-01", periode: "2023H2_2025" },
    { datum: "2025-12-31", periode: "2023H2_2025" },
    { datum: "2026-01-01", periode: "2026" },
  ];

  it.each(grenzen)("legt $datum in periode $periode", ({ datum, periode }) => {
    expect(bestelperiodeVoorDatum(ctx, datum).code).toBe(periode);
    expect(regimebanden(ctx, datum).find((b) => b.isVandaag)?.periodeCode).toBe(periode);
  });

  it("laat één dag verschil rond 1 juli 2023 het regime kantelen", () => {
    const [juni, juli] = aftrekMatrix(
      ctx,
      [
        { sleutel: "juni", aandrijving: "fossiel", co2: 135, besteldatum: "2023-06-30" },
        { sleutel: "juli", aandrijving: "fossiel", co2: 135, besteldatum: "2023-07-01" },
      ],
      [2026, 2028],
    );
    // Dezelfde wagen: de ene houdt zijn formule levenslang, de andere valt in de
    // uitdoofkalender en staat in 2028 op nul.
    expect(juni.levenslangVast).toBe(true);
    expect(juni.cellen.map((c) => c.aftrek)).toEqual([52.5, 52.5]);
    expect(juli.cellen.map((c) => c.aftrek)).toEqual([50, 0]);
  });

  it("laat één dag verschil rond 1 januari 2026 de aftrek volledig wegvallen", () => {
    const [december, januari] = aftrekMatrix(
      ctx,
      [
        { sleutel: "dec", aandrijving: "fossiel", co2: 135, besteldatum: "2025-12-31" },
        { sleutel: "jan", aandrijving: "fossiel", co2: 135, besteldatum: "2026-01-01" },
      ],
      [2026],
    );
    expect(december.cellen[0].aftrek).toBe(50);
    expect(januari.cellen[0].aftrek).toBe(0);
  });
});

describe("gramdrempels", () => {
  it("vindt de kantelpunten van de dieselformule", () => {
    // 120 - 0,5 x 1 x CO2: nog 100% tot en met 40 g, de ondergrens van 50% bindt
    // vanaf 140 g, en zonder die ondergrens blijft er vanaf 240 g niets over.
    expect(gramdrempels("diesel")).toMatchObject({
      co2Tot100: 40,
      co2Vanaf50: 140,
      co2VanafNul: 240,
    });
  });

  it("legt benzine hoger dan diesel door de lagere coëfficiënt", () => {
    const benzine = gramdrempels("benzine");
    const diesel = gramdrempels("diesel");
    expect(benzine.co2Vanaf50).toBeGreaterThan(diesel.co2Vanaf50);
    expect(gramdrempels("cng").co2Vanaf50).toBeGreaterThan(benzine.co2Vanaf50);
  });
});
