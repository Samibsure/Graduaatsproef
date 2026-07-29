import { describe, expect, it } from "vitest";
import {
  CSV_KOLOMMEN,
  MODEL_KOLOMMEN,
  csvSjabloon,
  leesBoolean,
  leesCsv,
  leesGetal,
  leesUitrusting,
  modelSjabloon,
  modellenNaarCsv,
  splitsRegel,
  wagensNaarCsv,
} from "./csv";
import type { Vehicle } from "./fiscaal/types";

const wagen: Vehicle = {
  id: "a",
  omschrijving: "Tesla Model Y",
  werknemer: null,
  kenteken: null,
  categorie: "kandidaat",
  merk: "Tesla",
  model: "Model Y",
  catalog_id: 1,
  voertuigtype: "BEV",
  brandstof: "elektrisch",
  besteldatum: "2026-01-15",
  eerste_ingebruikname: "2026-03-01",
  co2: 0,
  cataloguswaarde: 39990,
  jaarlijkse_autokosten: 6800,
  aankoopprijs: 39990,
  tankkaart: true,
  beroepsgebruik_pct: 100,
  thuislaadpunt: true,
  km_per_jaar: 25000,
  flex_score: 7,
  restwaarde_score: 6,
};

describe("export naar CSV", () => {
  it("zet de kopregel en de waarden in de vaste kolomvolgorde", () => {
    const csv = wagensNaarCsv([wagen]);
    const [kop, rij] = csv.split("\r\n");
    expect(kop).toBe(CSV_KOLOMMEN.join(";"));
    expect(rij.split(";")[0]).toBe("Tesla Model Y");
  });

  it("zet velden met een puntkomma of aanhalingsteken tussen aanhalingstekens", () => {
    const lastig = { ...wagen, omschrijving: 'Wagen "A"; met leestekens' };
    const rij = wagensNaarCsv([lastig]).split("\r\n")[1];
    expect(rij.startsWith('"Wagen ""A""; met leestekens"')).toBe(true);
  });

  it("laat lege waarden leeg in plaats van null te schrijven", () => {
    const zonder = { ...wagen, aankoopprijs: null, km_per_jaar: null };
    const rij = wagensNaarCsv([zonder]).split("\r\n")[1].split(";");
    expect(rij[CSV_KOLOMMEN.indexOf("aankoopprijs")]).toBe("");
  });

  it("levert een sjabloon met kopregel en één voorbeeldrij", () => {
    const regels = csvSjabloon().split("\r\n");
    expect(regels).toHaveLength(2);
    expect(regels[0]).toBe(CSV_KOLOMMEN.join(";"));
  });
});

describe("regels splitsen", () => {
  it("houdt het scheidingsteken binnen aanhalingstekens bij elkaar", () => {
    expect(splitsRegel('a;"b;c";d', ";")).toEqual(["a", "b;c", "d"]);
  });

  it("leest een dubbel aanhalingsteken als één letterlijk teken", () => {
    expect(splitsRegel('"zeg ""hallo""";x', ";")).toEqual(['zeg "hallo"', "x"]);
  });

  it("geeft lege velden terug in plaats van ze over te slaan", () => {
    expect(splitsRegel("a;;c", ";")).toEqual(["a", "", "c"]);
  });
});

describe("import van CSV", () => {
  it("leest een bestand dat de export zelf heeft gemaakt", () => {
    const resultaat = leesCsv(wagensNaarCsv([wagen]));
    expect(resultaat.ontbrekendeKolommen).toEqual([]);
    expect(resultaat.onbekendeKolommen).toEqual([]);
    expect(resultaat.regels).toHaveLength(1);
    expect(resultaat.regels[0].waarden.omschrijving).toBe("Tesla Model Y");
    expect(resultaat.regels[0].regelnummer).toBe(2);
  });

  it("herkent zowel de puntkomma als de komma als scheidingsteken", () => {
    const metKomma = "omschrijving,co2\nWagen A,0";
    expect(leesCsv(metKomma).regels[0].waarden.omschrijving).toBe("Wagen A");
  });

  it("meldt ontbrekende en onbekende kolommen in plaats van stil te falen", () => {
    const resultaat = leesCsv("omschrijving;verzonnen_kolom\nWagen A;x");
    expect(resultaat.onbekendeKolommen).toEqual(["verzonnen_kolom"]);
    expect(resultaat.ontbrekendeKolommen).toContain("co2");
  });

  it("negeert de byte order mark die Excel voor het bestand zet", () => {
    const resultaat = leesCsv("﻿omschrijving;co2\nWagen A;0");
    expect(resultaat.regels[0].waarden.omschrijving).toBe("Wagen A");
  });

  it("slaat lege regels over", () => {
    expect(leesCsv("omschrijving;co2\n\nWagen A;0\n\n").regels).toHaveLength(1);
  });

  it("gaat niet onderuit op een leeg bestand", () => {
    const resultaat = leesCsv("");
    expect(resultaat.regels).toEqual([]);
    expect(resultaat.ontbrekendeKolommen).toEqual([...CSV_KOLOMMEN]);
  });
});

describe("waarden lezen", () => {
  it("leest ja, waar, true en 1 als true", () => {
    for (const w of ["ja", "Ja", "waar", "true", "1", "oui", "yes"]) {
      expect(leesBoolean(w)).toBe(true);
    }
  });

  it("leest al de rest als false, ook leeg", () => {
    for (const w of ["nee", "non", "false", "0", "", undefined]) {
      expect(leesBoolean(w)).toBe(false);
    }
  });

  it("leest de komma én de punt als decimaalteken", () => {
    expect(leesGetal("1234,5")).toBe(1234.5);
    expect(leesGetal("1234.5")).toBe(1234.5);
  });

  it("geeft null voor leeg en voor onzin", () => {
    expect(leesGetal("")).toBeNull();
    expect(leesGetal("abc")).toBeNull();
    expect(leesGetal(undefined)).toBeNull();
  });
});

describe("eigen modellen: CSV", () => {
  it("schrijft de uitrusting als één cel met verticale strepen", () => {
    const csv = modellenNaarCsv([
      { merk: "Kia", model: "EV3", co2: 0, uitrusting: ["warmtepomp", "trekhaak"] },
    ]);
    const [kop, rij] = csv.split("\r\n");
    expect(kop.split(";")).toEqual([...MODEL_KOLOMMEN]);
    // De streep is bewust geen puntkomma: die zou de kolommen breken.
    expect(rij.split(";")[MODEL_KOLOMMEN.indexOf("uitrusting")]).toBe("warmtepomp|trekhaak");
  });

  it("leest het eigen sjabloon terug zonder onbekende of ontbrekende kolommen", () => {
    const gelezen = leesCsv(modelSjabloon(), MODEL_KOLOMMEN);
    expect(gelezen.onbekendeKolommen).toEqual([]);
    expect(gelezen.ontbrekendeKolommen).toEqual([]);
    expect(gelezen.regels).toHaveLength(1);
    expect(gelezen.regels[0].waarden.merk).toBe("Volkswagen");
    expect(gelezen.regels[0].waarden.modeljaar).toBe("2026");
  });

  it("houdt de twee kolomlijsten uit elkaar", () => {
    // Een vlootbestand door de modellezer halen hoort elke modelkolom als
    // ontbrekend te melden, niet stilletjes half in te lezen.
    const gelezen = leesCsv(csvSjabloon(), MODEL_KOLOMMEN);
    expect(gelezen.ontbrekendeKolommen.length).toBeGreaterThan(0);
    expect(gelezen.ontbrekendeKolommen).toContain("modeljaar");
  });

  it("leest uitrusting terug naar een lijst", () => {
    expect(leesUitrusting("warmtepomp|trekhaak")).toEqual(["warmtepomp", "trekhaak"]);
    expect(leesUitrusting(" warmtepomp | | trekhaak ")).toEqual(["warmtepomp", "trekhaak"]);
    expect(leesUitrusting("")).toEqual([]);
    expect(leesUitrusting(undefined)).toEqual([]);
  });
});
