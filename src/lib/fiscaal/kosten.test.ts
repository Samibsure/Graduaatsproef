import { describe, expect, it } from "vitest";
import { catalogusPerSlug } from "./catalogusdata";
import { autokostenVoorModel, flexScore, geschatteAutokosten, nutScore, restwaardeScore } from "./catalog";
import {
  KOSTENPARAMETERS,
  STANDAARD_GEBRUIK,
  afschrijving,
  berekenKosten,
  energiekost,
  type Gebruiksprofiel,
} from "./kosten";
import type { CatalogCar } from "./types";

const model = (slug: string): CatalogCar => {
  const c = catalogusPerSlug(slug);
  if (!c) throw new Error(`Onbekend model in de test: ${slug}`);
  return c;
};

const bev = model("tesla-model-3");
const diesel = model("bmw-320d");
const plugin = model("bmw-330e");
const hybride = model("toyota-corolla");

describe("energiekost", () => {
  it("rekent elektrisch met de gewogen laadprijs en het laadverlies", () => {
    const gebruik: Gebruiksprofiel = { ...STANDAARD_GEBRUIK, km_per_jaar: 20_000, aandeel_thuis_laden: 1 };
    // 12,5 kWh/100 km × 20.000 km = 2.500 kWh, thuis aan 0,34 plus 10% laadverlies.
    const verwacht = 2500 * KOSTENPARAMETERS.stroom_thuis_per_kwh * 1.1;
    expect(energiekost(bev, gebruik)).toBeCloseTo(verwacht, 2);
  });

  it("maakt publiek laden duurder dan thuis laden", () => {
    const thuis = energiekost(bev, { ...STANDAARD_GEBRUIK, aandeel_thuis_laden: 1 });
    const publiek = energiekost(bev, { ...STANDAARD_GEBRUIK, aandeel_thuis_laden: 0 });
    expect(publiek).toBeGreaterThan(thuis);
  });

  it("rekent diesel met de literprijs", () => {
    const gebruik: Gebruiksprofiel = { ...STANDAARD_GEBRUIK, km_per_jaar: 30_000 };
    const verwacht = (diesel.verbruik! / 100) * 30_000 * KOSTENPARAMETERS.diesel_per_liter;
    expect(energiekost(diesel, gebruik)).toBeCloseTo(verwacht, 2);
  });

  it("mengt bij een plug-in stroom en brandstof", () => {
    // Wie nooit laadt, rijdt op de motor en betaalt meer dan wie altijd laadt.
    const altijdLaden = energiekost(plugin, STANDAARD_GEBRUIK, {
      ...KOSTENPARAMETERS,
      phev_elektrisch_aandeel: 1,
    });
    const nooitLaden = energiekost(plugin, STANDAARD_GEBRUIK, {
      ...KOSTENPARAMETERS,
      phev_elektrisch_aandeel: 0,
    });
    expect(nooitLaden).toBeGreaterThan(altijdLaden);
  });

  it("schaalt lineair met de kilometers", () => {
    const weinig = energiekost(diesel, { ...STANDAARD_GEBRUIK, km_per_jaar: 10_000 });
    const veel = energiekost(diesel, { ...STANDAARD_GEBRUIK, km_per_jaar: 40_000 });
    expect(veel).toBeCloseTo(weinig * 4, 5);
  });
});

describe("afschrijving", () => {
  it("verliest over vier jaar precies het complement van de restwaarde", () => {
    const perJaar = afschrijving(bev, { ...STANDAARD_GEBRUIK, looptijd_jaren: 4 });
    const totaal = perJaar * 4;
    const verwacht = bev.cataloguswaarde * (1 - bev.restwaarde_pct_4j! / 100);
    expect(totaal).toBeCloseTo(verwacht, 5);
  });

  it("is per jaar lager naarmate de wagen langer wordt gehouden", () => {
    const vier = afschrijving(bev, { ...STANDAARD_GEBRUIK, looptijd_jaren: 4 });
    const zes = afschrijving(bev, { ...STANDAARD_GEBRUIK, looptijd_jaren: 6 });
    expect(zes).toBeLessThan(vier);
  });
});

describe("berekenKosten", () => {
  it("telt de zes bestanddelen op tot het totaal", () => {
    const k = berekenKosten(diesel);
    expect(k.totaal).toBe(
      k.energie + k.onderhoud + k.banden + k.verzekering + k.verkeersbelasting + k.afschrijving,
    );
  });

  it("houdt onderhoud van een elektrische wagen lager dan van een diesel", () => {
    const elektrisch = berekenKosten(bev);
    const brandstof = berekenKosten(diesel);
    expect(elektrisch.onderhoud).toBeLessThan(brandstof.onderhoud);
  });

  it("laat het gewest alleen de verkeersbelasting verschuiven", () => {
    const vl = berekenKosten(diesel, { ...STANDAARD_GEBRUIK, gewest: "vlaanderen" });
    const wa = berekenKosten(diesel, { ...STANDAARD_GEBRUIK, gewest: "wallonie" });
    expect(wa.verkeersbelasting).not.toBe(vl.verkeersbelasting);
    expect(wa.totaal - vl.totaal).toBe(wa.verkeersbelasting - vl.verkeersbelasting);
  });

  it("levert voor elk model in de catalogus een plausibel bedrag op", () => {
    for (const slug of ["tesla-model-3", "bmw-320d", "bmw-330e", "toyota-corolla", "leapmotor-t03"]) {
      const totaal = berekenKosten(model(slug)).totaal;
      expect(totaal, slug).toBeGreaterThan(2000);
      expect(totaal, slug).toBeLessThan(60_000);
    }
  });
});

describe("autokostenVoorModel", () => {
  it("gebruikt het kostenmodel wanneer de specificaties er zijn", () => {
    expect(autokostenVoorModel(bev)).toBe(berekenKosten(bev).totaal);
  });

  it("valt terug op de vuistregel voor een model zonder specificaties", () => {
    const kaal: CatalogCar = {
      id: 999,
      merk: "Onbekend",
      model: "Zonder specificaties",
      voertuigtype: "BEV",
      brandstof: "elektrisch",
      co2: 0,
      cataloguswaarde: 40_000,
      segment: null,
      populariteit_rang: null,
      opmerking: null,
      image_url: null,
    };
    expect(autokostenVoorModel(kaal)).toBe(geschatteAutokosten(40_000, "BEV"));
  });
});

describe("afgeleide scores", () => {
  it("geeft een verbrandingswagen de hoogste flexibiliteit", () => {
    expect(flexScore(diesel)).toBe(9);
    expect(flexScore(hybride)).toBe(9);
  });

  it("laat een elektrische wagen met veel bereik en snelladen meer scoren", () => {
    const groot = flexScore(model("mercedes-cla-ev"));
    const klein = flexScore(model("leapmotor-t03"));
    expect(groot).toBeGreaterThan(klein);
  });

  it("volgt de restwaardescore het waardebehoud", () => {
    const sterk = restwaardeScore(model("mini-cooper-e"));
    const zwak = restwaardeScore(model("leapmotor-t03"));
    expect(sterk).toBeGreaterThan(zwak);
  });

  it("beloont ruimte en trekvermogen in het praktisch nut", () => {
    const zevenzitter = nutScore(model("kia-ev9"));
    const stadswagen = nutScore(model("fiat-500e"));
    expect(zevenzitter).toBeGreaterThan(stadswagen);
  });

  it("houdt elke afgeleide score binnen 1 tot 10", () => {
    for (const slug of ["tesla-model-3", "bmw-320d", "bmw-330e", "kia-ev9", "fiat-500e"]) {
      for (const score of [flexScore(model(slug)), restwaardeScore(model(slug)), nutScore(model(slug))]) {
        expect(score, slug).toBeGreaterThanOrEqual(1);
        expect(score, slug).toBeLessThanOrEqual(10);
      }
    }
  });
});
