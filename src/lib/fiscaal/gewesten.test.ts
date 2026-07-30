import { describe, expect, it } from "vitest";
import {
  VLAANDEREN_BIV_EV,
  VLAANDEREN_JVB_EV,
  WALLONIE_BRUSSEL_JVB_MINIMUM,
  berekenBiv,
  berekenVerkeersbelasting,
  fiscalePkElektrisch,
  vlaamseLeeftijdscorrectie,
} from "./gewesten";

/**
 * Bij de gewestelijke belastingen is de belangrijkste eigenschap niet welk
 * bedrag eruit komt, maar dat er géén bedrag uit komt wanneer het barema
 * ontbreekt. Die tests staan daarom vooraan.
 */

describe("wat de rekenkern niet weet, zegt ze ook", () => {
  it("geeft geen Vlaams BIV-bedrag zonder luchtcomponent", () => {
    const r = berekenBiv({
      gewest: "vlaanderen",
      brandstof: "diesel",
      co2: 130,
      euronorm: "euro6",
      inschrijvingsdatum: "2026-03-01",
      aanslagjaar: 2026,
    });
    expect(r.bedrag).toBeNull();
    expect(r.toelichting.join(" ")).toMatch(/luchtcomponent/i);
  });

  it("geeft geen bedrag voor een leeftijd waarvoor de correctie niet gekend is", () => {
    const r = berekenBiv({
      gewest: "vlaanderen",
      brandstof: "benzine",
      co2: 130,
      euronorm: "euro6",
      inschrijvingsdatum: "2026-03-01",
      aanslagjaar: 2026,
      leeftijdInJaren: 8,
    });
    expect(r.bedrag).toBeNull();
    expect(vlaamseLeeftijdscorrectie(8)).toBeNull();
  });

  it("geeft geen TMC zonder montant de base en massa", () => {
    const r = berekenBiv({
      gewest: "wallonie",
      brandstof: "diesel",
      co2: 130,
      inschrijvingsdatum: "2026-03-01",
    });
    expect(r.bedrag).toBeNull();
  });

  it("markeert elk gewestelijk bedrag met een zekerheid en een bron", () => {
    const r = berekenBiv({
      gewest: "vlaanderen",
      brandstof: "elektrisch",
      co2: 0,
      inschrijvingsdatum: "2026-03-01",
    });
    expect(r.zekerheid).toBe("bevestigd");
    expect(r.bronnen.length).toBeGreaterThan(0);
  });
});

describe("BIV Vlaanderen", () => {
  it("rekent de machtsformule uit wanneer alle stukken er zijn", () => {
    const r = berekenBiv({
      gewest: "vlaanderen",
      brandstof: "benzine",
      co2: 130,
      euronorm: "euro6",
      inschrijvingsdatum: "2026-03-01",
      aanslagjaar: 2026,
      leeftijdInJaren: 0,
    });
    // ((130 × 0,744 × 1,245) / 246)^6 × 4.500 + 28,54, maal 100%.
    const verwacht = Math.pow((130 * 0.744 * 1.245) / 246, 6) * 4500 + 28.54;
    expect(r.bedrag).toBeCloseTo(verwacht, 4);
    // De brandstoffactor komt uit een secundaire bron.
    expect(r.zekerheid).toBe("teVerifieren");
  });

  it("past het EV-forfait toe vanaf 2026 en houdt de vrijstelling daarvoor", () => {
    const nieuw = berekenBiv({
      gewest: "vlaanderen",
      brandstof: "elektrisch",
      co2: 0,
      inschrijvingsdatum: "2026-01-01",
    });
    const oud = berekenBiv({
      gewest: "vlaanderen",
      brandstof: "elektrisch",
      co2: 0,
      inschrijvingsdatum: "2025-12-31",
    });
    expect(nieuw.bedrag).toBe(VLAANDEREN_BIV_EV);
    expect(oud.bedrag).toBe(0);
  });

  it("laat de leeftijdscorrectie tien procentpunt per jaar zakken tot 60%", () => {
    expect(vlaamseLeeftijdscorrectie(0)).toBe(1);
    expect(vlaamseLeeftijdscorrectie(2)).toBeCloseTo(0.8, 10);
    expect(vlaamseLeeftijdscorrectie(4)).toBeCloseTo(0.6, 10);
    expect(vlaamseLeeftijdscorrectie(15)).toBe(0);
  });
});

describe("TMC Wallonië", () => {
  it("vermenigvuldigt het montant de base met de CO2- en massafactor", () => {
    const r = berekenBiv({
      gewest: "wallonie",
      brandstof: "diesel",
      co2: 136,
      inschrijvingsdatum: "2026-03-01",
      montantDeBase: 500,
      mma: 1838,
    });
    // Bij precies de referentiewaarden vallen beide factoren op één terug.
    expect(r.bedrag).toBeCloseTo(500, 6);
  });

  it("laat een elektrische wagen de CO2-factor overslaan", () => {
    const r = berekenBiv({
      gewest: "wallonie",
      brandstof: "elektrisch",
      co2: 0,
      inschrijvingsdatum: "2026-03-01",
      montantDeBase: 5000,
      mma: 1838,
    });
    // 5.000 × 1 × 1 × 0,01 = 50, precies de ondergrens.
    expect(r.bedrag).toBe(50);
  });

  it("houdt de uitkomst tussen € 50 en € 9.000", () => {
    const hoog = berekenBiv({
      gewest: "wallonie",
      brandstof: "diesel",
      co2: 400,
      inschrijvingsdatum: "2026-03-01",
      montantDeBase: 9000,
      mma: 3000,
    });
    expect(hoog.bedrag).toBe(9000);
  });
});

describe("jaarlijkse verkeersbelasting", () => {
  it("geeft de gepubliceerde EV-tarieven voor 1 en 5 fiscale pk", () => {
    const een = berekenVerkeersbelasting({
      gewest: "vlaanderen",
      brandstof: "elektrisch",
      fiscalePk: 1,
      co2: 0,
    });
    const vijf = berekenVerkeersbelasting({
      gewest: "vlaanderen",
      brandstof: "elektrisch",
      fiscalePk: 5,
      co2: 0,
    });
    expect(een.bedrag).toBe(VLAANDEREN_JVB_EV.pk1);
    expect(vijf.bedrag).toBe(VLAANDEREN_JVB_EV.pk5);
    expect(een.zekerheid).toBe("bevestigd");
  });

  it("markeert een afgeleid tarief tussen die twee als te verifiëren", () => {
    const drie = berekenVerkeersbelasting({
      gewest: "vlaanderen",
      brandstof: "elektrisch",
      fiscalePk: 3,
      co2: 0,
    });
    expect(drie.bedrag).toBeCloseTo((69.72 + 87.24) / 2, 6);
    expect(drie.zekerheid).toBe("teVerifieren");
  });

  it("past CO2-correctie, luchtcomponent en opdeciem toe op de Vlaamse basis", () => {
    const r = berekenVerkeersbelasting({
      gewest: "vlaanderen",
      brandstof: "diesel",
      fiscalePk: 11,
      co2: 152,
      basisbedrag: 500,
      luchtcomponent: 40,
    });
    // 152 g tegenover het neutrale punt van 122 g is +30 × 0,3% = +9%.
    expect(r.bedrag).toBeCloseTo((500 * 1.09 + 40) * 1.1, 6);
  });

  it("tilt Wallonië en Brussel op tot het minimumtarief", () => {
    const r = berekenVerkeersbelasting({
      gewest: "brussel",
      brandstof: "benzine",
      fiscalePk: 4,
      co2: 130,
      basisbedrag: 60,
    });
    expect(r.bedrag).toBe(WALLONIE_BRUSSEL_JVB_MINIMUM);
  });
});

describe("fiscale pk van een elektrische wagen", () => {
  it("volgt 0,013 × kW + 0,5, afgerond en afgetopt op vijf", () => {
    expect(fiscalePkElektrisch(150)).toBe(2); // 2,45
    expect(fiscalePkElektrisch(250)).toBe(4); // 3,75
    expect(fiscalePkElektrisch(600)).toBe(5); // afgetopt
  });
});
