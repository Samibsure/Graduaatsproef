import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { laadFotobronnen, leesFotobronnen } from "./fotobronnen";

/**
 * De naamsvermelding is geen nettigheid maar een licentievoorwaarde: 155 van de
 * 159 foto's staan onder CC BY of CC BY-SA. Een foto zonder vermelding op de
 * site is een licentie-inbreuk, en die valt met het blote oog niet op.
 */
describe("fotobronnen", () => {
  const bronnen = laadFotobronnen();
  const bestanden = readdirSync(join(process.cwd(), "public", "cars")).filter((f) =>
    f.endsWith(".jpg"),
  );

  it("vermeldt elke foto die in public/cars staat", () => {
    const vermeld = new Set(bronnen.map((b) => b.bestand));
    expect(bestanden.filter((f) => !vermeld.has(f))).toEqual([]);
  });

  it("vermeldt geen foto die er niet meer is", () => {
    const aanwezig = new Set(bestanden);
    expect(bronnen.filter((b) => !aanwezig.has(b.bestand)).map((b) => b.bestand)).toEqual([]);
  });

  it("geeft bij elke foto een auteur, een licentie en een bronlink", () => {
    const onvolledig = bronnen.filter(
      (b) => !b.auteur.trim() || !b.licentie.trim() || !b.url.startsWith("https://"),
    );
    expect(onvolledig).toEqual([]);
  });

  it("noemt bij elke CC BY- of CC BY-SA-foto een echte auteur", () => {
    // Bij CC0 en publiek domein mag "onbekend" staan; bij BY en BY-SA niet.
    const metNaamsplicht = bronnen.filter((b) => /^CC BY/.test(b.licentie));
    expect(metNaamsplicht.length).toBeGreaterThan(100);
    expect(metNaamsplicht.filter((b) => /^(onbekend|unknown|-)$/i.test(b.auteur))).toEqual([]);
  });

  it("leest een regel met alle vier de velden", () => {
    expect(
      leesFotobronnen("| `bmw-i4.jpg` | Jan | CC BY-SA 4.0 | [Titel.jpg](https://x.be/a) |"),
    ).toEqual([
      {
        bestand: "bmw-i4.jpg",
        auteur: "Jan",
        licentie: "CC BY-SA 4.0",
        titel: "Titel.jpg",
        url: "https://x.be/a",
      },
    ]);
  });

  it("negeert de kop en de scheidingsregel van de tabel", () => {
    expect(leesFotobronnen("| Bestand | Auteur | Licentie | Bron |\n| --- | --- | --- | --- |")).toEqual(
      [],
    );
  });
});
