import { describe, expect, it } from "vitest";
import { DEFAULT_CATALOGUS, GEVERIFIEERDE_MODELLEN, catalogusPerSlug } from "./catalogusdata";
import { catalogusMarkdown } from "./catalogusdoc";
import { restwaardeVoor } from "./kosten";
import { wagenSchema } from "../validatie";
import { catalogNaarWagen, zoekCatalogusmodel } from "./catalog";

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

  it("verdeelt elke rij in geverifieerd of raming, en niets ertussen", () => {
    for (const c of DEFAULT_CATALOGUS) {
      expect(["geverifieerd", "raming"], `${c.merk} ${c.model}`).toContain(c.zekerheid);
    }
    // De geverifieerde lijst is een deelverzameling en wordt nergens los
    // bijgehouden: raakt ze uit de pas, dan is dat hier zichtbaar.
    expect(GEVERIFIEERDE_MODELLEN.length).toBeGreaterThan(0);
    expect(GEVERIFIEERDE_MODELLEN.length).toBeLessThan(DEFAULT_CATALOGUS.length);
    for (const c of GEVERIFIEERDE_MODELLEN) {
      expect(DEFAULT_CATALOGUS).toContain(c);
      expect(c.zekerheid).toBe("geverifieerd");
      // Geverifieerd zonder vindplaats is een bewering, geen verificatie.
      expect(c.bron, `${c.merk} ${c.model}`).not.toContain("raming");
    }
  });

  it("draagt de gesourcete correcties uit het onderzoeksrapport", () => {
    // Deze vier cijfers stonden fout in de eerste versie van de catalogus, en de
    // eerste twee zijn materieel: ze bepalen of de valse-hybridetoets kantelt.
    // Een test hierop is geen dubbelop met de data, maar de enige plaats waar
    // staat dat dit een gecontroleerde waarde is en geen tikfout.
    expect(catalogusPerSlug("bmw-x1-30e")?.co2).toBe(64);
    expect(catalogusPerSlug("bmw-x3-30e")?.co2).toBe(57);
    expect(catalogusPerSlug("volvo-xc60-t6")?.co2).toBe(81);
    expect(catalogusPerSlug("bmw-530e")?.co2).toBe(41);
    // De bruikbare batterij, niet de bruto: 23,4 van 31,2 kWh.
    expect(catalogusPerSlug("mercedes-glc-300e")?.batterij_kwh).toBe(23.4);
    expect(catalogusPerSlug("tesla-model-y")?.cataloguswaarde).toBe(53_990);
  });

  it("markeert wat het rapport uitdrukkelijk niet kon bevestigen", () => {
    // Deze vijf zijn geen ramingen bij gebrek aan onderzoek maar bij gebrek aan
    // bevestiging: verkeerde generatie, verkeerde uitvoering of geen CO₂.
    for (const slug of ["bmw-ix1", "bmw-ix3", "bmw-x5-50e", "toyota-rav4-phev"]) {
      const c = catalogusPerSlug(slug);
      expect(c?.zekerheid, slug).toBe("raming");
      expect(c?.voorbehoud, slug).toBeTruthy();
    }
  });

  it("neemt de restwaarde uit de ranges per aandrijving", () => {
    // Niet meer per model geraden. Twee wagens met dezelfde aandrijving hebben
    // daarom dezelfde restwaarde, en die komt uit de gesourcete tabel.
    for (const c of DEFAULT_CATALOGUS) {
      expect(c.restwaarde_pct_4j, `${c.merk} ${c.model}`).toBe(
        restwaardeVoor(c.voertuigtype, c.brandstof),
      );
    }
    const uniek = new Set(DEFAULT_CATALOGUS.map((c) => c.restwaarde_pct_4j));
    // Vijf aandrijvingen: BEV, PHEV, HEV, benzine en diesel.
    expect(uniek.size).toBe(5);
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

describe("zoekCatalogusmodel", () => {
  const wagen = (merk: string | null, model: string | null, catalog_id: number | null = null) => ({
    merk,
    model,
    catalog_id,
  });

  it("vindt een model op merk en modelnaam", () => {
    expect(zoekCatalogusmodel(DEFAULT_CATALOGUS, wagen("Tesla", "Model Y"))?.slug).toBe(
      "tesla-model-y",
    );
  });

  it("vindt een wagen die de uitvoering in het modelveld draagt", () => {
    // Zo staan de bestaande wagens in de databank: "Golf 1.5 eTSI", terwijl de
    // catalogus "Golf" heet met uitvoering "1.5 eTSI".
    expect(zoekCatalogusmodel(DEFAULT_CATALOGUS, wagen("Volkswagen", "Golf 1.5 eTSI"))?.slug).toBe(
      "vw-golf",
    );
  });

  it("kiest de langste treffer, zodat een kortere naam niet voorgaat", () => {
    const model = zoekCatalogusmodel(DEFAULT_CATALOGUS, wagen("Volkswagen", "ID.7 Tourer Pro S"));
    expect(model?.slug).toBe("vw-id7-tourer");
  });

  it("negeert een oud volgnummer dat naar een ander merk wijst", () => {
    // Het volgnummer verwees naar de tabel car_catalog met vijfentwintig rijen;
    // in de ingebouwde catalogus staat op datzelfde nummer een andere wagen.
    // Een foto van een vreemd merk is erger dan geen foto.
    const model = zoekCatalogusmodel(DEFAULT_CATALOGUS, wagen("Volkswagen", "Bestaat niet", 25));
    expect(model).toBeNull();
  });

  it("aanvaardt het volgnummer wel wanneer het merk klopt", () => {
    const eerste = DEFAULT_CATALOGUS[0];
    const model = zoekCatalogusmodel(
      DEFAULT_CATALOGUS,
      wagen(eerste.merk, "Onbekende uitvoering", eerste.id),
    );
    expect(model?.slug).toBe(eerste.slug);
  });

  it("geeft null voor een wagen zonder merk of model", () => {
    expect(zoekCatalogusmodel(DEFAULT_CATALOGUS, wagen(null, null))).toBeNull();
  });
});

describe("zoekCatalogusmodel bij meerdere uitvoeringen van dezelfde naam", () => {
  const wagen = (merk: string, model: string) => ({ merk, model, catalog_id: null });

  it("kiest de uitvoering die in de naam van de wagen staat", () => {
    // De Golf staat twee keer in de catalogus. Het verschil tussen deze twee is
    // een benzinewagen en een plug-in hybride: een andere CO2, een ander VAA en
    // een ander aftrekregime.
    expect(zoekCatalogusmodel(DEFAULT_CATALOGUS, wagen("Volkswagen", "Golf 1.5 eTSI"))?.slug).toBe(
      "vw-golf",
    );
    expect(zoekCatalogusmodel(DEFAULT_CATALOGUS, wagen("Volkswagen", "Golf eHybrid"))?.slug).toBe(
      "vw-golf-ehybrid",
    );
  });

  it("valt terug op de langste modelnaam wanneer geen uitvoering past", () => {
    expect(zoekCatalogusmodel(DEFAULT_CATALOGUS, wagen("Volkswagen", "ID.7 Tourer 2026"))?.slug).toBe(
      "vw-id7-tourer",
    );
  });
});
