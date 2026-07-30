import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_CATALOGUS } from "./catalogusdata";

/**
 * De foto's van de catalogus staan lokaal in `public/cars`, en de verwijzing
 * ernaar staat als tekst in `catalogusdata.ts`. Tussen die twee kan niets de
 * samenhang bewaken: een hernoemd bestand of een tikfout in het pad geeft geen
 * bouwfout, maar een gebroken afbeelding op de catalogusrij van één model. Dat
 * valt bij 163 modellen niet meer met het oog op.
 *
 * De foto's zelf worden opgehaald door `scripts/wagenfotos.py`; de herkomst en
 * de licentie van elke foto staan in `public/cars/BRONNEN.md`.
 */

const PUBLIEK = join(process.cwd(), "public");

/** Maximaal gewicht per foto. De catalogus toont er dertig tegelijk. */
const MAX_KB = 400;

describe("catalogusfoto's", () => {
  const metFoto = DEFAULT_CATALOGUS.filter((c) => c.image_url);

  it("verwijst alleen naar bestanden die er ook zijn", () => {
    for (const car of metFoto) {
      const pad = join(PUBLIEK, car.image_url!.replace(/^\//, ""));
      expect(existsSync(pad), `${car.merk} ${car.model} -> ${car.image_url}`).toBe(true);
    }
  });

  it("gebruikt een pad onder /cars/ en geen externe bron", () => {
    // De CSP staat alleen 'self' toe voor afbeeldingen: een externe URL zou in
    // de browser stil geblokkeerd worden en een leeg kader achterlaten.
    for (const car of metFoto) {
      expect(car.image_url, `${car.merk} ${car.model}`).toMatch(/^\/cars\/[\w.-]+\.jpg$/);
    }
  });

  it("deelt geen enkel pad tussen twee modellen", () => {
    const perPad = new Map<string, string[]>();
    for (const car of metFoto) {
      const namen = perPad.get(car.image_url!) ?? [];
      namen.push(`${car.merk} ${car.model}`);
      perPad.set(car.image_url!, namen);
    }
    const gedeeld = [...perPad.entries()].filter(([, namen]) => namen.length > 1);
    expect(gedeeld.map(([pad, namen]) => `${pad}: ${namen.join(", ")}`)).toEqual([]);
  });

  it("deelt ook geen enkele afbeelding, ook niet onder twee namen", () => {
    // Twee paden met dezelfde inhoud passeren de vorige test wel: zo stonden
    // `20-bmw-330e.jpg` en `24-bmw-320d.jpg` byte voor byte gelijk, en toonde één
    // van beide dus de verkeerde wagen. Alleen de inhoud verraadt dat.
    const perSom = new Map<string, string[]>();
    for (const car of metFoto) {
      const som = createHash("sha1")
        .update(readFileSync(join(PUBLIEK, car.image_url!.replace(/^\//, ""))))
        .digest("hex");
      const namen = perSom.get(som) ?? [];
      namen.push(`${car.merk} ${car.model} (${car.image_url})`);
      perSom.set(som, namen);
    }
    const gedeeld = [...perSom.values()].filter((namen) => namen.length > 1);
    expect(gedeeld.map((namen) => namen.join(" == "))).toEqual([]);
  });

  it("houdt elke foto onder de 400 kB", () => {
    for (const car of metFoto) {
      const kb = statSync(join(PUBLIEK, car.image_url!.replace(/^\//, ""))).size / 1024;
      expect(Math.round(kb), `${car.merk} ${car.model}`).toBeLessThanOrEqual(MAX_KB);
    }
  });
});
