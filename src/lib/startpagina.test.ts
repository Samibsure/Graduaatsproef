import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ONDERDELEN, samengesteldeSleutels } from "./startpagina";
import { EIGEN_LINKS, PUBLIEKE_LINKS, START_HIER_HREF, VOETTEKST_KOLOMMEN } from "./navigatie";

/**
 * De startpagina stelt haar vertaalsleutels samen uit een basis plus een
 * achtervoegsel. Die sleutels zijn dus met geen enkele zoekactie in de broncode
 * te vinden, en `i18n.test.ts` kan alleen bewaken dat de drie talen dezélfde
 * sleutels hebben, niet dat de sleutels die de pagina nodig heeft er zijn.
 *
 * Ontbreekt er één, dan gooit next-intl bij het openen van de pagina. Voor de
 * startpagina is dat de duurste plaats waar dat kan gebeuren.
 */

const TALEN = ["nl", "fr", "en"] as const;

function dashboard(taal: string): Record<string, string> {
  const pad = join(process.cwd(), "messages", `${taal}.json`);
  return JSON.parse(readFileSync(pad, "utf8")).dashboard;
}

describe("startpagina: de samengestelde vertaalsleutels", () => {
  it.each(TALEN)("bestaan allemaal in %s", (taal) => {
    const teksten = dashboard(taal);
    const ontbreekt = samengesteldeSleutels().filter((s) => !teksten[s]);
    expect(ontbreekt).toEqual([]);
  });

  it.each(TALEN)("zijn in %s geen loze plaatshouders", (taal) => {
    const teksten = dashboard(taal);
    // Een sleutel die per ongeluk gelijk is aan zijn eigen naam wijst op een
    // kopieerfout bij het toevoegen van een taal.
    const verdacht = samengesteldeSleutels().filter((s) => teksten[s] === s);
    expect(verdacht).toEqual([]);
  });
});

describe("startpagina: waar de onderdelen naartoe wijzen", () => {
  it("verwijst naar zes verschillende pagina's", () => {
    const paden = ONDERDELEN.map((o) => o.href);
    expect(new Set(paden).size).toBe(ONDERDELEN.length);
  });

  it("wijst alleen naar pagina's die de navigatie ook kent", () => {
    // Zonder deze controle blijft een kaart naar een verplaatste pagina wijzen
    // en loopt de bezoeker op de startpagina tegen een 404 aan.
    const bekend = new Set<string>([
      START_HIER_HREF,
      ...PUBLIEKE_LINKS.map((l) => l.href),
      ...EIGEN_LINKS.map((l) => l.href),
      ...VOETTEKST_KOLOMMEN.flatMap((k) => k.links.map((l) => l.href)),
    ]);
    const onbekend = ONDERDELEN.map((o) => o.href).filter((h) => !bekend.has(h));
    expect(onbekend).toEqual([]);
  });

  it("begint bij de simulator, want dat is wat zonder account werkt", () => {
    expect(ONDERDELEN[0].href).toBe(START_HIER_HREF);
  });
});
