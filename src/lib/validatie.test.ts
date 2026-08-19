import { describe, expect, it } from "vitest";
import { bedrijfSchema, eigenModelSchema, leesbareFout, valideer, wagenSchema } from "./validatie";

/**
 * Deze tests bewaken dat de grenzen hier dezelfde zijn als de CHECK-constraints
 * in supabase/migrations/0006_bedrijfsprofiel_en_validatie.sql. Loopt een van
 * beide uit de pas, dan krijgt de gebruiker een onbegrijpelijke databankfout in
 * plaats van een bruikbare melding.
 */

const geldigeWagen = {
  omschrijving: "Tesla Model Y",
  categorie: "kandidaat" as const,
  voertuigtype: "BEV" as const,
  brandstof: "elektrisch" as const,
  besteldatum: "2026-01-15",
  eerste_ingebruikname: "2026-03-01",
  co2: 0,
  cataloguswaarde: 39990,
  jaarlijkse_autokosten: 6800,
  aankoopprijs: 39990,
  beroepsgebruik_pct: 100,
  km_per_jaar: 25000,
  flex_score: 7,
  restwaarde_score: 6,
  tankkaart: true,
  thuislaadpunt: true,
};

describe("wagenSchema", () => {
  it("aanvaardt een wagen uit de catalogus ongewijzigd", () => {
    expect(() => valideer(wagenSchema, geldigeWagen)).not.toThrow();
  });

  it("aanvaardt de randwaarden die de database ook toelaat", () => {
    const randen = { ...geldigeWagen, co2: 1000, beroepsgebruik_pct: 0, flex_score: 1, restwaarde_score: 10 };
    expect(() => valideer(wagenSchema, randen)).not.toThrow();
  });

  it("laat aankoopprijs en km per jaar leeg zijn", () => {
    const zonder = { ...geldigeWagen, aankoopprijs: null, km_per_jaar: null };
    expect(() => valideer(wagenSchema, zonder)).not.toThrow();
  });

  // De vier gevallen die vóór deze laag gewoon in de database belandden.
  it.each([
    ["negatieve CO2", { co2: -5 }],
    ["beroepsgebruik boven 100%", { beroepsgebruik_pct: 300 }],
    ["cataloguswaarde van nul", { cataloguswaarde: 0 }],
    ["score buiten 1 tot 10", { flex_score: 42 }],
  ])("weigert %s", (_naam, afwijking) => {
    expect(() => valideer(wagenSchema, { ...geldigeWagen, ...afwijking })).toThrow();
  });

  it("weigert een lege omschrijving, ook met alleen spaties", () => {
    expect(() => valideer(wagenSchema, { ...geldigeWagen, omschrijving: "   " })).toThrow();
  });

  it("weigert een datum buiten het bereik dat de database aanvaardt", () => {
    expect(() => valideer(wagenSchema, { ...geldigeWagen, besteldatum: "1850-01-01" })).toThrow();
    expect(() => valideer(wagenSchema, { ...geldigeWagen, besteldatum: "15-01-2026" })).toThrow();
  });

  it("noemt het veld waarover het misgaat, met het label uit het formulier", () => {
    const resultaat = wagenSchema.safeParse({ ...geldigeWagen, co2: -5 });
    expect(resultaat.success).toBe(false);
    // "CO2: mag niet negatief zijn" en niet "co2: Too small: expected number..."
    if (!resultaat.success) expect(leesbareFout(resultaat.error)).toMatch(/^CO2: /);
  });

  it("schrijft de meldingen in het Nederlands, niet in de standaardtaal van Zod", () => {
    const resultaat = wagenSchema.safeParse({ ...geldigeWagen, beroepsgebruik_pct: 150 });
    expect(resultaat.success).toBe(false);
    if (!resultaat.success) {
      const tekst = leesbareFout(resultaat.error);
      expect(tekst).toBe("Beroepsgebruik: mag niet groter zijn dan 100");
      expect(tekst).not.toMatch(/Too (small|big)|expected/i);
    }
  });
});

describe("wagenSchema, uitbreidingen", () => {
  it("aanvaardt een wagen met BTW, financiering, eigen bijdrage en laadpaal", () => {
    const uitgebreid = {
      ...geldigeWagen,
      btw_methode: "forfait35" as const,
      btw_tarief: 21,
      kosten_financiering: 1500,
      financieringsvorm: "operationele_leasing" as const,
      eigen_bijdrage_maand: 75,
      laadpaal_jaarkost: 800,
      laadstroom_jaar: 600,
      start_contract: "2026-03-01",
      einde_contract: "2030-02-28",
    };
    expect(() => valideer(wagenSchema, uitgebreid)).not.toThrow();
  });

  it("weigert een contracteinde dat vóór de start ligt", () => {
    const fout = { ...geldigeWagen, start_contract: "2030-01-01", einde_contract: "2026-01-01" };
    expect(() => valideer(wagenSchema, fout)).toThrow();
  });

  it("weigert financieringskosten die groter zijn dan de autokosten zelf", () => {
    const fout = { ...geldigeWagen, jaarlijkse_autokosten: 6800, kosten_financiering: 9000 };
    expect(() => valideer(wagenSchema, fout)).toThrow();
  });

  it("weigert een onbekende BTW-methode", () => {
    expect(() => valideer(wagenSchema, { ...geldigeWagen, btw_methode: "verzonnen" })).toThrow();
  });
});

describe("bedrijfSchema", () => {
  const geldigBedrijf = {
    naam: "Voorbeeld NV",
    ondernemingsnummer: "0123.456.789",
    btw_nummer: null,
    adres: null,
    postcode: null,
    gemeente: null,
    is_kmo: true,
    boekjaar_start_maand: 1,
  };

  it("aanvaardt een ingevuld profiel", () => {
    expect(() => valideer(bedrijfSchema, geldigBedrijf)).not.toThrow();
  });

  it("weigert een naam van één teken, zoals de constraint op companies", () => {
    expect(() => valideer(bedrijfSchema, { ...geldigBedrijf, naam: "X" })).toThrow();
  });

  it("weigert een boekjaarmaand buiten 1 tot 12", () => {
    expect(() => valideer(bedrijfSchema, { ...geldigBedrijf, boekjaar_start_maand: 13 })).toThrow();
    expect(() => valideer(bedrijfSchema, { ...geldigBedrijf, boekjaar_start_maand: 0 })).toThrow();
  });
});

describe("eigenModelSchema", () => {
  const geldig = {
    merk: "Volkswagen",
    model: "ID.7",
    voertuigtype: "BEV" as const,
    brandstof: "elektrisch" as const,
    co2: 0,
    cataloguswaarde: 57990,
  };

  it("aanvaardt een model met alleen de verplichte velden", () => {
    expect(eigenModelSchema.safeParse(geldig).success).toBe(true);
  });

  it("weigert een elektrische wagen met uitstoot", () => {
    // Dit is geen vormfout maar een inhoudelijke: zo'n tikfout glipt anders door
    // tot in de vergelijking, waar hij een kandidaat onterecht laat verliezen.
    const r = eigenModelSchema.safeParse({ ...geldig, co2: 120 });
    expect(r.success).toBe(false);
    expect(leesbareFout(r.error!)).toContain("CO2");
  });

  it("weigert een verbrandingswagen zonder uitstoot", () => {
    const r = eigenModelSchema.safeParse({
      ...geldig,
      voertuigtype: "fossiel",
      brandstof: "diesel",
      co2: 0,
    });
    expect(r.success).toBe(false);
  });

  it("weigert een elektrische wagen op diesel", () => {
    const r = eigenModelSchema.safeParse({ ...geldig, brandstof: "diesel" });
    expect(r.success).toBe(false);
    expect(leesbareFout(r.error!)).toContain("Brandstof");
  });

  it("bewaakt dezelfde grenzen als de CHECK-constraints van migratie 0010", () => {
    expect(eigenModelSchema.safeParse({ ...geldig, cataloguswaarde: 0 }).success).toBe(false);
    expect(eigenModelSchema.safeParse({ ...geldig, cataloguswaarde: 1_000_001 }).success).toBe(false);
    expect(eigenModelSchema.safeParse({ ...geldig, zitplaatsen: 10 }).success).toBe(false);
    expect(eigenModelSchema.safeParse({ ...geldig, trekgewicht_kg: 4000 }).success).toBe(false);
    expect(eigenModelSchema.safeParse({ ...geldig, restwaarde_pct_4j: 101 }).success).toBe(false);
    expect(eigenModelSchema.safeParse({ ...geldig, modeljaar: 1899 }).success).toBe(false);
    expect(eigenModelSchema.safeParse({ ...geldig, modeljaar: 2026 }).success).toBe(true);
  });

  it("weigert een onbekende enumwaarde met de naam van het veld", () => {
    // De CSV-import van de vloot castte enums blind, waarna pas de databank
    // protesteerde met een constraintnaam. Hier komt de veldnaam mee.
    const r = eigenModelSchema.safeParse({ ...geldig, carrosserie: "cabrio" });
    expect(r.success).toBe(false);
    expect(leesbareFout(r.error!)).toContain("Carrosserie");
  });
});
