import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Bewaakt dat de drie taalbestanden exact dezelfde sleutels bevatten.
 *
 * Een ontbrekende sleutel valt bij next-intl pas op wanneer iemand die pagina
 * in die taal opent, en dan met een harde fout. Bij het toevoegen van een
 * functie is precies dát het makkelijkst te vergeten. Deze test verplaatst die
 * ontdekking naar de testronde.
 *
 * De repository heeft bovendien bewust nergens em dashes; ook dat wordt hier
 * bewaakt, want de teksten zijn de plek waar ze terugsluipen.
 */

const TALEN = ["nl", "fr", "en"] as const;

function laadTaal(taal: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(process.cwd(), "messages", `${taal}.json`), "utf8"));
}

function sleutels(waarde: unknown, pad = ""): string[] {
  if (waarde !== null && typeof waarde === "object" && !Array.isArray(waarde)) {
    return Object.entries(waarde as Record<string, unknown>).flatMap(([k, v]) =>
      sleutels(v, pad ? `${pad}.${k}` : k),
    );
  }
  return [pad];
}

/** Alle bladeren als (pad, tekst)-paren, in één traversal. */
function paren(waarde: unknown, pad = ""): Array<[string, string]> {
  if (typeof waarde === "string") return [[pad, waarde]];
  if (waarde !== null && typeof waarde === "object" && !Array.isArray(waarde)) {
    return Object.entries(waarde as Record<string, unknown>).flatMap(([k, v]) =>
      paren(v, pad ? `${pad}.${k}` : k),
    );
  }
  return [];
}

describe("taalbestanden", () => {
  const perTaal = Object.fromEntries(TALEN.map((t) => [t, laadTaal(t)]));
  const nlSleutels = new Set(sleutels(perTaal.nl));

  it("bevat in het Nederlands een niet-triviaal aantal sleutels", () => {
    expect(nlSleutels.size).toBeGreaterThan(400);
  });

  it.each(["fr", "en"])("heeft in %s exact dezelfde sleutels als in het Nederlands", (taal) => {
    const andere = new Set(sleutels(perTaal[taal]));
    const ontbreekt = [...nlSleutels].filter((s) => !andere.has(s));
    const teveel = [...andere].filter((s) => !nlSleutels.has(s));
    expect({ ontbreekt, teveel }).toEqual({ ontbreekt: [], teveel: [] });
  });

  it.each(TALEN)("heeft in %s geen lege teksten", (taal) => {
    const leeg = paren(perTaal[taal])
      .filter(([, tekst]) => tekst.trim() === "")
      .map(([pad]) => pad);
    expect(leeg).toEqual([]);
  });

  it.each(TALEN)("gebruikt in %s geen em dashes", (taal) => {
    const met = paren(perTaal[taal])
      .filter(([, tekst]) => tekst.includes("—"))
      .map(([pad]) => pad);
    expect(met).toEqual([]);
  });

  it.each(["fr", "en"])("laat in %s geen tekst onvertaald staan", (taal) => {
    // Een vertaalbestand waar een blok gekopieerd is uit het Nederlands valt
    // hiermee op. Korte woorden mogen samenvallen (namen, afkortingen,
    // eenheden), langere zinnen niet.
    const nl = new Map(paren(perTaal.nl));
    const gelijk = paren(perTaal[taal])
      .filter(([pad, tekst]) => tekst.length > 40 && nl.get(pad) === tekst)
      .map(([pad]) => pad);
    expect(gelijk).toEqual([]);
  });
});
