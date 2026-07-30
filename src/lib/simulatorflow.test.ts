import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { catalogusPerSlug } from "./fiscaal/catalogusdata";
import { STANDAARD_GEBRUIK, berekenKosten } from "./fiscaal/kosten";
import {
  BESTELJAREN,
  STANDAARD_KEUZES,
  STAPPEN,
  btwKeuzeMogelijk,
  gebruiksprofielUit,
  keuzesNaarWagen,
  leesKeuzes,
  modelSleutel,
  naarQuery,
  samengesteldeSleutels,
  zoekModel,
  type Keuzes,
} from "./simulatorflow";

const model = (slug: string) => {
  const c = catalogusPerSlug(slug);
  if (!c) throw new Error(`Onbekend model in de test: ${slug}`);
  return c;
};

const lees = (query: string) => leesKeuzes(new URLSearchParams(query));

describe("keuzes uit de URL lezen", () => {
  it("geeft zonder parameters de standaardkeuzes", () => {
    expect(lees("")).toEqual(STANDAARD_KEUZES);
  });

  it("leest elke parameter uit", () => {
    const k = lees(
      "stap=5&model=tesla-model-3&jaar=2028&km=40000&gewest=brussel&thuis=30" +
        "&looptijd=5&kmo=1&kaart=0&bijdrage=150&financiering=aankoop&btw=forfait35" +
        "&beroep=80&kosten=11000",
    );
    expect(k).toEqual({
      stap: 5,
      sleutel: "tesla-model-3",
      besteljaar: 2028,
      km: 40_000,
      gewest: "brussel",
      thuisPct: 30,
      looptijd: 5,
      kmoTarief: true,
      tankkaart: false,
      eigenBijdrage: 150,
      financiering: "aankoop",
      btwMethode: "forfait35",
      beroepsgebruik: 80,
      autokosten: 11_000,
    });
  });

  it("klemt getallen binnen hun grenzen", () => {
    expect(lees("stap=99").stap).toBe(STAPPEN.length);
    expect(lees("stap=0").stap).toBe(1);
    expect(lees("jaar=1990").besteljaar).toBe(BESTELJAREN[0]);
    expect(lees("jaar=2099").besteljaar).toBe(BESTELJAREN[BESTELJAREN.length - 1]);
    expect(lees("thuis=-40").thuisPct).toBe(0);
    expect(lees("thuis=400").thuisPct).toBe(100);
    expect(lees("km=-5").km).toBe(0);
    expect(lees("looptijd=1").looptijd).toBe(3);
    expect(lees("looptijd=9").looptijd).toBe(5);
    expect(lees("beroep=250").beroepsgebruik).toBe(100);
  });

  it("valt bij onzin terug op de standaard in plaats van op nul", () => {
    // Number("abc") is NaN en Number("") is 0. Zonder deze afhandeling zou één
    // typefout in de URL het kilometrage op nul zetten, en dan is de energiekost
    // stil nul.
    expect(lees("km=abc").km).toBe(STANDAARD_KEUZES.km);
    expect(lees("km=").km).toBe(STANDAARD_KEUZES.km);
    expect(lees("gewest=atlantis").gewest).toBe(STANDAARD_KEUZES.gewest);
    expect(lees("btw=gratis").btwMethode).toBe(STANDAARD_KEUZES.btwMethode);
    expect(lees("financiering=ruilen").financiering).toBe(STANDAARD_KEUZES.financiering);
  });

  it("beschouwt een leeg model als geen model", () => {
    expect(lees("model=").sleutel).toBeNull();
    expect(lees("model=%20%20").sleutel).toBeNull();
  });

  it("houdt een overschreven jaarkost apart van een ontbrekende", () => {
    expect(lees("").autokosten).toBeNull();
    expect(lees("kosten=0").autokosten).toBe(0);
    expect(lees("kosten=8500").autokosten).toBe(8500);
  });
});

describe("keuzes naar de URL schrijven", () => {
  it("laat alles weg wat op de standaard staat", () => {
    expect(naarQuery(STANDAARD_KEUZES)).toBe("");
  });

  it("schrijft alleen op wat afwijkt", () => {
    const q = new URLSearchParams(
      naarQuery({ ...STANDAARD_KEUZES, sleutel: "kia-ev3", km: 40_000 }),
    );
    expect([...q.keys()].sort()).toEqual(["km", "model"]);
  });

  it("overleeft een rondrit heen en terug", () => {
    const keuzes: Keuzes[] = [
      STANDAARD_KEUZES,
      { ...STANDAARD_KEUZES, stap: 5, sleutel: "bmw-320d", besteljaar: 2024 },
      {
        stap: 4,
        sleutel: "vw-id3",
        besteljaar: 2030,
        km: 12_500,
        gewest: "wallonie",
        thuisPct: 0,
        looptijd: 3,
        kmoTarief: true,
        tankkaart: false,
        eigenBijdrage: 75,
        financiering: "renting",
        btwMethode: "werkelijk",
        beroepsgebruik: 40,
        autokosten: 9_999,
      },
    ];
    for (const k of keuzes) {
      expect(lees(naarQuery(k))).toEqual(k);
    }
  });
});

describe("modellen terugvinden", () => {
  it("gebruikt de slug wanneer die er is, en anders het volgnummer", () => {
    const tesla = model("tesla-model-3");
    expect(modelSleutel(tesla)).toBe("tesla-model-3");
    expect(modelSleutel({ ...tesla, slug: undefined })).toBe(String(tesla.id));
  });

  it("vindt een model op zijn sleutel", () => {
    const lijst = [model("tesla-model-3"), model("bmw-320d")];
    expect(zoekModel(lijst, "bmw-320d")?.model).toBe("320d");
    expect(zoekModel(lijst, "bestaat-niet")).toBeNull();
    expect(zoekModel(lijst, null)).toBeNull();
  });
});

describe("van keuzes naar een wagen", () => {
  const tesla = model("tesla-model-3");

  it("zet het gebruiksprofiel om naar wat kosten.ts verwacht", () => {
    expect(gebruiksprofielUit(STANDAARD_KEUZES)).toEqual(STANDAARD_GEBRUIK);
  });

  it("rekent de jaarkost uit het gebruiksprofiel in plaats van uit een vuistregel", () => {
    // De oude simulator nam cataloguswaarde × 0,17. Deze wagen moet dus met méér
    // kilometers ook een hogere jaarkost krijgen; met een vaste factor zou het
    // bedrag niet bewegen.
    const rustig = keuzesNaarWagen(tesla, { ...STANDAARD_KEUZES, km: 10_000 });
    const veel = keuzesNaarWagen(tesla, { ...STANDAARD_KEUZES, km: 45_000 });
    expect(veel.jaarlijkse_autokosten).toBeGreaterThan(rustig.jaarlijkse_autokosten);
    expect(veel.jaarlijkse_autokosten).toBe(
      berekenKosten(tesla, gebruiksprofielUit({ ...STANDAARD_KEUZES, km: 45_000 })).totaal,
    );
  });

  it("laat een overschreven jaarkost voorgaan op de raming", () => {
    const w = keuzesNaarWagen(tesla, { ...STANDAARD_KEUZES, autokosten: 7_500 });
    expect(w.jaarlijkse_autokosten).toBe(7_500);
  });

  it("hangt de besteldatum aan het gekozen besteljaar", () => {
    const w = keuzesNaarWagen(tesla, { ...STANDAARD_KEUZES, besteljaar: 2029 });
    expect(w.besteldatum).toBe("2029-01-15");
    expect(w.eerste_ingebruikname).toBe("2029-03-01");
  });

  it("neemt de keuzes over de onderneming mee", () => {
    const w = keuzesNaarWagen(tesla, {
      ...STANDAARD_KEUZES,
      tankkaart: false,
      eigenBijdrage: 120,
      gewest: "brussel",
      financiering: "renting",
      btwMethode: "werkelijk",
      beroepsgebruik: 60,
    });
    expect(w.tankkaart).toBe(false);
    expect(w.eigen_bijdrage_maand).toBe(120);
    expect(w.gewest).toBe("brussel");
    expect(w.financieringsvorm).toBe("renting");
    expect(w.btw_methode).toBe("werkelijk");
    expect(w.beroepsgebruik_pct).toBe(60);
  });

  it("zet de btw-methode terug op geen bij aankoop", () => {
    // De jaarkost bevat dan de afschrijving, en de btw op een gekochte wagen wordt
    // éénmalig bij aanschaf teruggevorderd. Een blijven hangende keuze uit de URL
    // zou de recuperatie overschatten.
    expect(btwKeuzeMogelijk("aankoop")).toBe(false);
    expect(btwKeuzeMogelijk("operationele_leasing")).toBe(true);
    const w = keuzesNaarWagen(tesla, {
      ...STANDAARD_KEUZES,
      financiering: "aankoop",
      btwMethode: "forfait35",
    });
    expect(w.btw_methode).toBe("geen");
  });
});

describe("samengestelde vertaalsleutels", () => {
  it("bestaan allemaal in messages/nl.json", () => {
    const berichten = JSON.parse(
      readFileSync(join(process.cwd(), "messages", "nl.json"), "utf8"),
    ) as Record<string, unknown>;

    const zoek = (pad: string): unknown =>
      pad.split(".").reduce<unknown>((huidig, deel) => {
        if (huidig !== null && typeof huidig === "object") {
          return (huidig as Record<string, unknown>)[deel];
        }
        return undefined;
      }, berichten);

    const ontbreekt = samengesteldeSleutels().filter((s) => typeof zoek(s) !== "string");
    expect(ontbreekt).toEqual([]);
  });
});
