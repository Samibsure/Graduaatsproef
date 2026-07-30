import { describe, expect, it } from "vitest";
import { catalogusPerSlug } from "./catalogusdata";
import { autokostenVoorModel, flexScore, geschatteAutokosten, nutScore, restwaardeScore } from "./catalog";
import {
  KOSTENPARAMETERS,
  RESTWAARDE_36M,
  STANDAARD_GEBRUIK,
  afschrijving,
  berekenKosten,
  energiekost,
  restwaarde48,
  restwaardeVoor,
  verkeersbelastingVoorbehoud,
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

describe("restwaarde uit de gesourcete ranges", () => {
  it("rekent 36 maanden meetkundig door naar 48", () => {
    // 37,6% na drie jaar betekent 0,376^(4/3) na vier jaar. Het cijfer in de
    // bron blijft zo letterlijk in de broncode staan en de omrekening is één
    // regel, in plaats van een vierjarencijfer dat niemand kan narekenen.
    expect(restwaarde48(RESTWAARDE_36M.BEV)).toBeCloseTo(27.1, 1);
    expect(restwaarde48(100)).toBe(100);
    // Meer waardebehoud na drie jaar betekent meer waardebehoud na vier.
    expect(restwaarde48(49.8)).toBeGreaterThan(restwaarde48(37.6));
  });

  it("houdt de rangorde van het rapport aan", () => {
    const hev = restwaardeVoor("HEV", "benzine");
    const benzine = restwaardeVoor("fossiel", "benzine");
    const diesel = restwaardeVoor("fossiel", "diesel");
    const phev = restwaardeVoor("PHEV", "benzine");
    const bev = restwaardeVoor("BEV", "elektrisch");

    expect(hev).toBeGreaterThan(benzine);
    expect(benzine).toBeGreaterThan(diesel);
    expect(diesel).toBeGreaterThan(phev);
    expect(phev).toBeGreaterThan(bev);
  });

  it("maakt een elektrische wagen duurder in de afschrijving dan een diesel", () => {
    // Dit is het gevolg dat het rapport voorspelt, en het gaat de andere kant op
    // dan de oude geraden cijfers: die gaven een BEV 45% en een diesel 44%.
    const zelfdePrijs = { ...diesel, cataloguswaarde: 50_000 };
    const alsBev = { ...bev, cataloguswaarde: 50_000 };
    expect(afschrijving(alsBev, STANDAARD_GEBRUIK)).toBeGreaterThan(
      afschrijving(zelfdePrijs, STANDAARD_GEBRUIK),
    );
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

  it("rekent de elektrische verkeersbelasting van 2026, met voorbehoud", () => {
    // De Vlaamse vrijstelling verviel per 1/1/2026, en over het Waalse en
    // Brusselse tarief spreken de bronnen elkaar tegen (€0 tegenover €102,96).
    // De tabel neemt het hoogste bedrag; het voorbehoud hoort dan te bestaan,
    // want een bedrag in een totaal kan zelf niet zeggen dat het betwist is.
    expect(KOSTENPARAMETERS.verkeersbelasting.vlaanderen.BEV).toBe(87.24);
    expect(KOSTENPARAMETERS.verkeersbelasting.wallonie.BEV).toBe(102.96);
    expect(KOSTENPARAMETERS.verkeersbelasting.brussel.BEV).toBe(102.96);

    expect(verkeersbelastingVoorbehoud("vlaanderen", "BEV")).toBe("bevVlaanderen");
    expect(verkeersbelastingVoorbehoud("wallonie", "BEV")).toBe("bevWallonieBrussel");
    expect(verkeersbelastingVoorbehoud("brussel", "BEV")).toBe("bevWallonieBrussel");
    // Waar geen tegenspraak is, hoort er ook geen waarschuwing te staan.
    expect(verkeersbelastingVoorbehoud("vlaanderen", "fossiel")).toBeNull();
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

  it("volgt de restwaardescore de gesourcete rangorde per aandrijving", () => {
    // De restwaarde komt sinds het onderzoeksrapport niet meer per model uit een
    // gok maar uit de ranges per aandrijftype. Twee elektrische wagens scoren
    // daarom gelijk; het verschil zit tussen de aandrijvingen, en de rangorde
    // HEV ≈ benzine ≈ diesel > PHEV > BEV is wat de bron robuust noemt.
    const hybride = restwaardeScore(model("toyota-corolla"));
    const benzine = restwaardeScore(model("vw-golf"));
    const plugin = restwaardeScore(model("bmw-330e"));
    const elektrisch = restwaardeScore(model("mini-cooper-e"));

    expect(hybride).toBeGreaterThan(plugin);
    expect(benzine).toBeGreaterThan(plugin);
    expect(plugin).toBeGreaterThan(elektrisch);
    expect(restwaardeScore(model("leapmotor-t03"))).toBe(elektrisch);
  });

  it("houdt de restwaardescore ook zonder cijfer op de aandrijving", () => {
    // Een eigen model dat de restwaarde leeg laat, hoort de gesourcete range van
    // zijn aandrijving te krijgen en niet een vast getal uit de broncode.
    const zonder: CatalogCar = { ...model("bmw-320d"), restwaarde_pct_4j: null };
    expect(restwaardeScore(zonder)).toBe(restwaardeScore(model("bmw-320d")));
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
