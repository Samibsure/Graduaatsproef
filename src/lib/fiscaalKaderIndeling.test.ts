import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_CONTEXT } from "./fiscaal/defaults";
import { bestelperiodeVoorDatum } from "./fiscaal/engine";
import {
  KOSTENWAGEN,
  MATRIXJAREN,
  MATRIXWAGENS,
  SECTIES,
  samengesteldeSleutels,
} from "./fiscaalKaderIndeling";

/**
 * Net als bij de startpagina stelt /fiscaal-kader haar vertaalsleutels samen uit
 * een basis plus een achtervoegsel. Die zijn met geen zoekactie in de broncode te
 * vinden, en next-intl gooit pas bij het openen van de pagina in die taal.
 */

const TALEN = ["nl", "fr", "en"] as const;

function kader(taal: string): Record<string, string> {
  const pad = join(process.cwd(), "messages", `${taal}.json`);
  return JSON.parse(readFileSync(pad, "utf8")).fiscaalKader;
}

describe("fiscaal kader: de samengestelde vertaalsleutels", () => {
  it.each(TALEN)("bestaan allemaal in %s", (taal) => {
    const teksten = kader(taal);
    const ontbreekt = samengesteldeSleutels().filter((s) => !teksten[s]);
    expect(ontbreekt).toEqual([]);
  });

  it.each(TALEN)("zijn in %s geen loze plaatshouders", (taal) => {
    const teksten = kader(taal);
    const verdacht = samengesteldeSleutels().filter((s) => teksten[s] === s);
    expect(verdacht).toEqual([]);
  });
});

describe("fiscaal kader: de opbouw", () => {
  it("heeft unieke ankers, want de inhoudsopgave springt erheen", () => {
    const ids = SECTIES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("houdt de ankers waarnaar elders gelinkt wordt", () => {
    // De startpagina linkt naar #fk-regime. Wordt dat anker hernoemd, dan landt
    // een bezoeker bovenaan de pagina zonder te weten waarom.
    const ids = new Set(SECTIES.map((s) => s.id));
    expect(ids.has("fk-regime")).toBe(true);
    expect(ids.has("fk-aftrek")).toBe(true);
  });

  it("dekt met de matrixwagens elk van de drie regimes", () => {
    const periodes = new Set(
      MATRIXWAGENS.map((w) => bestelperiodeVoorDatum(DEFAULT_CONTEXT, w.besteldatum).code),
    );
    expect(periodes.has("voor_07_2023")).toBe(true);
    expect(periodes.has("2023H2_2025")).toBe(true);
    expect(periodes.has("2026")).toBe(true);
  });

  it("laat de matrixwagens ook de randgevallen zien", () => {
    // Zonder een wagen zonder uitstoot op het attest en zonder een wagen boven
    // 200 g/km blijft het forfait van 40% een bewering in een voetnoot.
    expect(MATRIXWAGENS.some((w) => w.co2 === null)).toBe(true);
    expect(MATRIXWAGENS.some((w) => (w.co2 ?? 0) >= 200)).toBe(true);
    expect(MATRIXWAGENS.some((w) => w.aandrijving === "BEV")).toBe(true);
  });

  it("bestrijkt met de matrixjaren de vier trappen van de uitdoofkalender", () => {
    expect([...MATRIXJAREN]).toEqual([2025, 2026, 2027, 2028]);
  });

  it("gebruikt voor de kostensoorten een plug-inhybride", () => {
    // Alleen daar lopen de wagen, de laadstroom en het brandstofdeel uiteen.
    expect(KOSTENWAGEN.aandrijving).toBe("PHEV");
  });
});
