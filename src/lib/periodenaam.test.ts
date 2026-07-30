import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_CONTEXT } from "./fiscaal/defaults";
import { PERIODE_SLEUTELS, periodenaam } from "./periodenaam";
import { PARAM_VELDEN } from "./parameterVelden";

const TALEN = ["nl", "fr", "en"] as const;

function naamruimte(taal: string, naam: string): Record<string, string> {
  const pad = join(process.cwd(), "messages", `${taal}.json`);
  return JSON.parse(readFileSync(pad, "utf8"))[naam];
}

/** Doet wat next-intl doet met een plaatshouder, genoeg om de vorm te toetsen. */
function vertaal(teksten: Record<string, string>) {
  return (sleutel: string, waarden: Record<string, string> = {}) =>
    Object.entries(waarden).reduce(
      (tekst, [k, v]) => tekst.replaceAll(`{${k}}`, v),
      teksten[sleutel] ?? sleutel,
    );
}

describe("periodenaam", () => {
  it.each(TALEN)("heeft in %s alle vier de sleutels", (taal) => {
    const teksten = naamruimte(taal, "regimes");
    expect(PERIODE_SLEUTELS.filter((s) => !teksten[s])).toEqual([]);
  });

  it("kiest per soort grens de juiste vorm", () => {
    const t = vertaal(naamruimte("nl", "regimes"));
    const datum = (iso: string) => `[${iso}]`;

    expect(periodenaam({ van: null, tot: "2023-06-30" }, t, datum)).toContain("[2023-06-30]");
    expect(periodenaam({ van: "2031-01-01", tot: null }, t, datum)).toContain("[2031-01-01]");
    const tussen = periodenaam({ van: "2023-07-01", tot: "2025-12-31" }, t, datum);
    expect(tussen).toContain("[2023-07-01]");
    expect(tussen).toContain("[2025-12-31]");
  });

  it("laat geen plaatshouder onvervuld staan voor de echte bestelperiodes", () => {
    // Een sleutel met de verkeerde plaatshouder zou hier als "{van}" in de tekst
    // blijven staan, en dan leest de bezoeker dat letterlijk op de pagina.
    for (const taal of TALEN) {
      const t = vertaal(naamruimte(taal, "regimes"));
      for (const periode of DEFAULT_CONTEXT.periodes) {
        const naam = periodenaam(periode, t, (iso) => iso);
        expect(naam).not.toMatch(/\{|\}/);
      }
    }
  });
});

describe("parameters: elk veld heeft een uitleg", () => {
  it.each(TALEN)("in %s", (taal) => {
    const teksten = naamruimte(taal, "parameters");
    // Zonder deze controle staat er weer een raster van zestien cijfers zonder
    // dat er ergens staat wat ze doen.
    const ontbreekt = PARAM_VELDEN.filter(
      ({ sleutel }) => !teksten[sleutel] || !teksten[`${sleutel}Uitleg`],
    ).map(({ sleutel }) => sleutel);
    expect(ontbreekt).toEqual([]);
  });

  it("verwijst voor elk veld naar een anker dat op /fiscaal-kader bestaat", async () => {
    const { SECTIES } = await import("./fiscaalKaderIndeling");
    const ankers = new Set(SECTIES.map((s) => s.id));
    const onbekend = PARAM_VELDEN.map((v) => v.anker)
      .filter((a): a is string => Boolean(a))
      .filter((a) => !ankers.has(a));
    expect([...new Set(onbekend)]).toEqual([]);
  });
});
