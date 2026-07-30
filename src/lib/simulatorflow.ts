import { autokostenVoorModel, catalogPreview } from "./fiscaal/catalog";
import { DEFAULT_PERIODES } from "./fiscaal/defaults";
import { STANDAARD_GEBRUIK, type Gebruiksprofiel } from "./fiscaal/kosten";
import type {
  BtwMethode,
  CatalogCar,
  Financieringsvorm,
  Gewest,
  Vehicle,
} from "./fiscaal/types";

/**
 * De keuzes van de simulator, en hoe ze in de URL staan.
 *
 * De simulator hield zijn invoer tot nu toe in componentstate. Dat had twee
 * gevolgen die samen de indruk gaven dat er niets te beslissen viel: verversen
 * gooide alles weg, en een resultaat was niet te delen. Voor een gratis tool die
 * van doorvertellen leeft, is die tweede het duurst.
 *
 * Alles wat de URL leest of schrijft staat daarom hier, buiten de component, en
 * niet in een useEffect: zo is het te testen zonder een browser, en kan er maar
 * één plaats zijn waar een grenswaarde afgeklemd wordt.
 */

export const STAPPEN = ["wagen", "besteljaar", "gebruik", "onderneming", "resultaat"] as const;
export type Stap = (typeof STAPPEN)[number];

/** De besteljaren die de flow aanbiedt. Gelijk aan wat de oude keuzelijst had. */
export const BESTELJAREN = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

export const GEWESTEN: Gewest[] = ["vlaanderen", "wallonie", "brussel"];

export const FINANCIERINGSVORMEN: Financieringsvorm[] = [
  "operationele_leasing",
  "financiele_leasing",
  "renting",
  "aankoop",
];

export const BTW_METHODES: BtwMethode[] = ["geen", "forfait35", "werkelijk"];

/** Looptijden in jaren. Vier is wat de rest van de applicatie aanhoudt. */
export const LOOPTIJDEN = [3, 4, 5];

/** Snelkeuzes voor het jaarlijkse kilometrage, naast het invoerveld. */
export const KM_SNELKEUZES = [15_000, 25_000, 40_000];

/**
 * Financieringsvormen waarbij een btw-keuze zinvol is.
 *
 * De rekenkern behandelt `jaarlijkse_autokosten` als volledig btw-inclusief aan
 * 21%. Bij leasing en renting klopt dat: de maandfactuur draagt btw over het hele
 * bedrag. Bij aankoop niet, want dan zit de afschrijving in die jaarkost, en de
 * btw op een gekochte wagen wordt éénmalig bij aanschaf teruggevorderd en niet
 * elk jaar opnieuw. Een forfait van 35% op die basis zou de recuperatie
 * overschatten, en de afschrijving is er de grootste post van.
 *
 * De keuze wordt daarom niet aangeboden bij aankoop, met die reden op het scherm.
 * Dat is eerlijker dan een getal tonen dat te hoog is.
 */
export const BTW_VORMEN: Financieringsvorm[] = [
  "operationele_leasing",
  "financiele_leasing",
  "renting",
];

export function btwKeuzeMogelijk(vorm: Financieringsvorm): boolean {
  return BTW_VORMEN.includes(vorm);
}

export interface Keuzes {
  /** 1 tot en met STAPPEN.length. */
  stap: number;
  /** Sleutel van het gekozen model, of null zolang er niets gekozen is. */
  sleutel: string | null;
  besteljaar: number;
  km: number;
  gewest: Gewest;
  /** Aandeel van het laden dat thuis gebeurt, in procent. */
  thuisPct: number;
  looptijd: number;
  kmoTarief: boolean;
  tankkaart: boolean;
  /** Eigen bijdrage van de werknemer, in euro per maand. */
  eigenBijdrage: number;
  financiering: Financieringsvorm;
  btwMethode: BtwMethode;
  beroepsgebruik: number;
  /** Handmatig overschreven jaarkost, of null zolang de raming volstaat. */
  autokosten: number | null;
}

export const STANDAARD_KEUZES: Keuzes = {
  stap: 1,
  sleutel: null,
  besteljaar: 2026,
  km: STANDAARD_GEBRUIK.km_per_jaar,
  gewest: STANDAARD_GEBRUIK.gewest,
  thuisPct: Math.round(STANDAARD_GEBRUIK.aandeel_thuis_laden * 100),
  looptijd: STANDAARD_GEBRUIK.looptijd_jaren,
  kmoTarief: false,
  tankkaart: true,
  eigenBijdrage: 0,
  financiering: "operationele_leasing",
  btwMethode: "geen",
  beroepsgebruik: 100,
  autokosten: null,
};

/** De stabiele sleutel van een model. Eigen modellen hebben geen slug. */
export function modelSleutel(car: CatalogCar): string {
  return car.slug ?? String(car.id);
}

export function zoekModel(lijst: CatalogCar[], sleutel: string | null): CatalogCar | null {
  if (!sleutel) return null;
  return lijst.find((c) => modelSleutel(c) === sleutel) ?? null;
}

/* ------------------------------------------------------------------ inlezen */

function klem(waarde: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, waarde));
}

function getal(sp: URLSearchParams, naam: string, standaard: number, min: number, max: number) {
  const rauw = sp.get(naam);
  if (rauw === null) return standaard;
  const n = Number(rauw);
  // Number("") is 0 en Number("abc") is NaN: beide horen op de standaard uit te
  // komen en niet op nul, anders zet één typefout het kilometrage op 0.
  if (rauw.trim() === "" || !Number.isFinite(n)) return standaard;
  return klem(Math.round(n), min, max);
}

function booleaan(sp: URLSearchParams, naam: string, standaard: boolean): boolean {
  const rauw = sp.get(naam);
  if (rauw === null) return standaard;
  return rauw === "1" || rauw === "true";
}

function uitLijst<T extends string>(sp: URLSearchParams, naam: string, toegestaan: T[], standaard: T): T {
  const rauw = sp.get(naam);
  return toegestaan.find((t) => t === rauw) ?? standaard;
}

/**
 * Leest de keuzes uit de zoekparameters en klemt alles binnen zijn grenzen af.
 *
 * Een URL is door iedereen te bewerken, dus wordt hier niets vertrouwd. Een
 * onmogelijke waarde valt terug op de standaard in plaats van door te lopen naar
 * de rekenkern: `km=-5` hoort geen negatieve energiekost te geven.
 */
export function leesKeuzes(sp: URLSearchParams): Keuzes {
  const s = STANDAARD_KEUZES;
  const besteljaar = getal(
    sp,
    "jaar",
    s.besteljaar,
    BESTELJAREN[0],
    BESTELJAREN[BESTELJAREN.length - 1],
  );
  const sleutel = sp.get("model");

  return {
    stap: getal(sp, "stap", s.stap, 1, STAPPEN.length),
    sleutel: sleutel && sleutel.trim() !== "" ? sleutel : null,
    besteljaar,
    km: getal(sp, "km", s.km, 0, 200_000),
    gewest: uitLijst(sp, "gewest", GEWESTEN, s.gewest),
    thuisPct: getal(sp, "thuis", s.thuisPct, 0, 100),
    looptijd: getal(sp, "looptijd", s.looptijd, LOOPTIJDEN[0], LOOPTIJDEN[LOOPTIJDEN.length - 1]),
    kmoTarief: booleaan(sp, "kmo", s.kmoTarief),
    tankkaart: booleaan(sp, "kaart", s.tankkaart),
    eigenBijdrage: getal(sp, "bijdrage", s.eigenBijdrage, 0, 5_000),
    financiering: uitLijst(sp, "financiering", FINANCIERINGSVORMEN, s.financiering),
    btwMethode: uitLijst(sp, "btw", BTW_METHODES, s.btwMethode),
    beroepsgebruik: getal(sp, "beroep", s.beroepsgebruik, 0, 100),
    autokosten: sp.has("kosten") ? getal(sp, "kosten", 0, 0, 1_000_000) : null,
  };
}

/**
 * Zet de keuzes om naar een zoekreeks.
 *
 * Alleen wat van de standaard afwijkt komt erin. Dat is geen zuinigheid maar
 * leesbaarheid: een gedeelde link hoort te tonen wat iemand gekozen heeft, niet
 * dertien parameters waarvan twaalf hetzelfde zijn als bij iedereen.
 */
export function naarQuery(k: Keuzes): string {
  const sp = new URLSearchParams();
  const s = STANDAARD_KEUZES;

  if (k.stap !== s.stap) sp.set("stap", String(k.stap));
  if (k.sleutel) sp.set("model", k.sleutel);
  if (k.besteljaar !== s.besteljaar) sp.set("jaar", String(k.besteljaar));
  if (k.km !== s.km) sp.set("km", String(k.km));
  if (k.gewest !== s.gewest) sp.set("gewest", k.gewest);
  if (k.thuisPct !== s.thuisPct) sp.set("thuis", String(k.thuisPct));
  if (k.looptijd !== s.looptijd) sp.set("looptijd", String(k.looptijd));
  if (k.kmoTarief !== s.kmoTarief) sp.set("kmo", k.kmoTarief ? "1" : "0");
  if (k.tankkaart !== s.tankkaart) sp.set("kaart", k.tankkaart ? "1" : "0");
  if (k.eigenBijdrage !== s.eigenBijdrage) sp.set("bijdrage", String(k.eigenBijdrage));
  if (k.financiering !== s.financiering) sp.set("financiering", k.financiering);
  if (k.btwMethode !== s.btwMethode) sp.set("btw", k.btwMethode);
  if (k.beroepsgebruik !== s.beroepsgebruik) sp.set("beroep", String(k.beroepsgebruik));
  if (k.autokosten !== null) sp.set("kosten", String(k.autokosten));

  return sp.toString();
}

/* ----------------------------------------------------------------- rekenen */

export function gebruiksprofielUit(k: Keuzes): Gebruiksprofiel {
  return {
    km_per_jaar: k.km,
    aandeel_thuis_laden: k.thuisPct / 100,
    gewest: k.gewest,
    looptijd_jaren: k.looptijd,
  };
}

/**
 * Bouwt de wagen waarop de rekenkern werkt.
 *
 * `catalogPreview` levert de vaste eigenschappen van het model; alles wat de
 * bezoeker in de flow gekozen heeft, komt eroverheen. De jaarkost is niet langer
 * `cataloguswaarde × 0,17`: `autokostenVoorModel` rekent met het gebruiksprofiel
 * en dus met energie, onderhoud, banden, verzekering, verkeersbelasting en
 * afschrijving apart. Wie een offerte op tafel heeft, overschrijft het bedrag.
 */
export function keuzesNaarWagen(car: CatalogCar, k: Keuzes): Vehicle {
  const gebruik = gebruiksprofielUit(k);
  return {
    ...catalogPreview(car, k.besteljaar),
    jaarlijkse_autokosten: k.autokosten ?? autokostenVoorModel(car, gebruik),
    tankkaart: k.tankkaart,
    eigen_bijdrage_maand: k.eigenBijdrage,
    km_per_jaar: k.km,
    gewest: k.gewest,
    financieringsvorm: k.financiering,
    // Bij aankoop staat de keuze niet aan; ze mag dan ook niet blijven hangen in
    // de URL van iemand die eerst leasing koos.
    btw_methode: btwKeuzeMogelijk(k.financiering) ? k.btwMethode : "geen",
    beroepsgebruik_pct: k.beroepsgebruik,
  };
}

/** De drie drijvers achter de fiscale meerkost, in de volgorde waarin ze getoond worden. */
export const DRIJVERS = ["aftrekbaarheid", "voordeelAlleAard", "rsz"] as const;

/** De drie herkomsten die aftrekOpbouw() kan teruggeven. */
export const HERKOMSTEN = ["gramformule", "kalenderplafond", "levenslang_nul"] as const;

/**
 * Alle sleutels die samengesteld worden in plaats van letterlijk opgeschreven.
 *
 * Zonder deze lijst valt een ontbrekende vertaling pas op wanneer iemand die stap
 * in die taal opent, en dan met een harde fout. Zelfde reden en zelfde patroon als
 * startpagina.ts::samengesteldeSleutels(). De sleutel bevat de ruimte, zodat de
 * test één vlakke lijst tegen messages/nl.json kan leggen.
 */
export function samengesteldeSleutels(): string[] {
  return [
    ...STAPPEN.flatMap((s) => [
      `simulator.stap_${s}`,
      `simulator.stap_${s}Titel`,
      `simulator.stap_${s}Sub`,
    ]),
    ...GEWESTEN.map((g) => `simulator.gewest_${g}`),
    ...FINANCIERINGSVORMEN.map((f) => `simulator.financiering_${f}`),
    ...BTW_METHODES.map((b) => `simulator.btw_${b}`),
    ...DEFAULT_PERIODES.map((p) => `regimes.${p.code}`),
    ...DRIJVERS.map((d) => `besteljaar.drijver_${d}`),
    ...HERKOMSTEN.map((h) => `besteljaar.herkomst_${h}`),
  ];
}
