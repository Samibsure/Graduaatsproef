import { describe, expect, it } from "vitest";
import { DEFAULT_CATALOGUS, catalogusPerSlug } from "./catalogusdata";
import { catalogusMarkdown } from "./catalogusdoc";
import { wagenSchema } from "../validatie";
import { catalogNaarWagen } from "./catalog";

/**
 * De catalogus is data, geen code, en juist daarom heeft ze tests nodig: een
 * tikfout in een van de honderdvijftig regels valt anders pas op wanneer een
 * gebruiker een onmogelijk cijfer op zijn scherm krijgt.
 *
 * Deze tests bewaken de interne samenhang. Ze kunnen niet controleren of de
 * cataloguswaarde van een Kia EV3 klopt; dat blijft mensenwerk, en daarom draagt
 * elke rij een modeljaar en een bron.
 */
describe("ingebouwde catalogus", () => {
  it("bevat minstens 150 modellen", () => {
    expect(DEFAULT_CATALOGUS.length).toBeGreaterThanOrEqual(150);
  });

  it("heeft unieke sleutels en volgnummers", () => {
    const slugs = DEFAULT_CATALOGUS.map((c) => c.slug);
    const ids = DEFAULT_CATALOGUS.map((c) => c.id);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("geeft elke rij een slug, een modeljaar en een bron", () => {
    for (const c of DEFAULT_CATALOGUS) {
      expect(c.slug, `${c.merk} ${c.model}`).toBeTruthy();
      expect(c.modeljaar, `${c.merk} ${c.model}`).toBeGreaterThanOrEqual(2020);
      expect(c.bron, `${c.merk} ${c.model}`).toBeTruthy();
    }
  });

  it("laat CO₂ en brandstof bij het voertuigtype passen", () => {
    for (const c of DEFAULT_CATALOGUS) {
      const naam = `${c.merk} ${c.model}`;
      if (c.voertuigtype === "BEV") {
        expect(c.co2, naam).toBe(0);
        expect(c.brandstof, naam).toBe("elektrisch");
        expect(c.batterij_kwh, naam).toBeGreaterThan(0);
        expect(c.actieradius_km, naam).toBeGreaterThan(0);
      } else {
        // Een wagen die brandstof verbrandt en 0 g/km uitstoot, bestaat niet.
        expect(c.co2, naam).toBeGreaterThan(0);
        expect(c.brandstof, naam).not.toBe("elektrisch");
      }
      // Een stekkerloze hybride heeft per definitie geen elektrisch bereik.
      if (c.voertuigtype === "HEV") {
        expect(c.actieradius_km, naam).toBeNull();
        expect(c.batterij_kwh, naam).toBeNull();
      }
      if (c.voertuigtype === "PHEV") {
        expect(c.batterij_kwh, naam).toBeGreaterThan(0);
        expect(c.actieradius_km, naam).toBeGreaterThan(0);
      }
    }
  });

  it("houdt elke specificatie binnen een realistische band", () => {
    for (const c of DEFAULT_CATALOGUS) {
      const naam = `${c.merk} ${c.model}`;
      expect(c.cataloguswaarde, naam).toBeGreaterThan(10_000);
      expect(c.cataloguswaarde, naam).toBeLessThan(250_000);
      expect(c.co2, naam).toBeLessThanOrEqual(400);
      expect(c.vermogen_kw, naam).toBeGreaterThan(30);
      expect(c.vermogen_kw, naam).toBeLessThan(600);
      expect(c.koffer_liter, naam).toBeGreaterThan(100);
      expect(c.zitplaatsen, naam).toBeGreaterThanOrEqual(4);
      expect(c.zitplaatsen, naam).toBeLessThanOrEqual(9);
      expect(c.restwaarde_pct_4j, naam).toBeGreaterThan(20);
      expect(c.restwaarde_pct_4j, naam).toBeLessThan(70);
      expect(c.verbruik, naam).toBeGreaterThan(0);
      expect(c.trekgewicht_kg, naam).toBeGreaterThanOrEqual(0);
      expect(c.trekgewicht_kg, naam).toBeLessThanOrEqual(3500);
    }
  });

  it("levert per model een wagen op die de validatie doorstaat", () => {
    // Wat de catalogus aanbiedt, moet ook bewaard kunnen worden. Zonder deze
    // controle kan een model met een cataloguswaarde buiten de CHECK-constraint
    // pas bij het opslaan stukgaan, ná de klik van de gebruiker.
    for (const c of DEFAULT_CATALOGUS) {
      const resultaat = wagenSchema.safeParse(catalogNaarWagen(c, 2026));
      expect(resultaat.success, `${c.merk} ${c.model}: ${resultaat.error?.message}`).toBe(true);
    }
  });

  it("vindt een model terug op zijn sleutel", () => {
    expect(catalogusPerSlug("tesla-model-y")?.merk).toBe("Tesla");
    expect(catalogusPerSlug("bestaat-niet")).toBeNull();
  });

  it("dekt alle vier de voertuigtypes", () => {
    const types = new Set(DEFAULT_CATALOGUS.map((c) => c.voertuigtype));
    expect(types).toEqual(new Set(["BEV", "PHEV", "HEV", "fossiel"]));
  });
});

describe("gegenereerde catalogusdocumentatie", () => {
  it("houdt docs/catalogus.md gelijk aan de dataset", async () => {
    // Een snapshot naar een echt bestand: het document is daarmee geen tweede,
    // met de hand bijgehouden waarheid. Wijzig je een cijfer in catalogusdata.ts
    // zonder het document te vernieuwen, dan faalt deze test. Vernieuwen doe je
    // met `npm test -- -u`.
    await expect(catalogusMarkdown()).toMatchFileSnapshot("../../../docs/catalogus.md");
  });
});
