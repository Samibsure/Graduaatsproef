import { describe, expect, it } from "vitest";
import { metTaal, veiligPad, voorvoegsel } from "./taalpad";

describe("voorvoegsel", () => {
  it("geeft niets voor het Nederlands en voor een onbekende taal", () => {
    expect(voorvoegsel("nl")).toBe("");
    expect(voorvoegsel("de")).toBe("");
    expect(voorvoegsel(null)).toBe("");
  });

  it("geeft het taalpad voor Frans en Engels", () => {
    expect(voorvoegsel("fr")).toBe("/fr");
    expect(voorvoegsel("en")).toBe("/en");
  });
});

/**
 * Deze controle staat tussen een phishinglink naar het echte domein en een
 * gebruiker die net zijn wachtwoord heeft ingetikt. De backslash-varianten zijn
 * geen theorie: de URL-parser behandelt een backslash in een http(s)-adres als
 * een schuine streep, dus de vroegere tekencontrole liet ze door.
 */
describe("veiligPad", () => {
  it.each(["/wagens", "/fr/vergelijking", "/catalogus?merk=BMW"])(
    "laat het relatieve pad %s door",
    (pad) => {
      expect(veiligPad(pad)).toBe(pad);
    },
  );

  it.each([
    "//kwaadaardig.be",
    "/\\kwaadaardig.be",
    "/\\/kwaadaardig.be",
    "https://kwaadaardig.be",
    "javascript:alert(1)",
    "wagens",
    "",
    null,
    undefined,
  ])("weert %s", (pad) => {
    expect(veiligPad(pad)).toBe("/wagens");
  });

  it("laat nooit een oorsprong terugkomen", () => {
    for (const pad of ["/\\evil.com", "//evil.com", "/\\\\evil.com"]) {
      expect(new URL(veiligPad(pad), "https://autofiscaliteit.com").origin).toBe(
        "https://autofiscaliteit.com",
      );
    }
  });
});

describe("metTaal", () => {
  it("zet het taalvoorvoegsel voor een veilig pad", () => {
    expect(metTaal("/wagens", "fr")).toBe("/fr/wagens");
    expect(metTaal("/wagens", "nl")).toBe("/wagens");
  });

  it("voegt het voorvoegsel niet twee keer toe", () => {
    expect(metTaal("/fr/wagens", "fr")).toBe("/fr/wagens");
  });

  it("valt terug op de standaardbestemming bij een onveilig pad", () => {
    expect(metTaal("/\\kwaadaardig.be", "fr")).toBe("/fr/wagens");
    expect(metTaal("//kwaadaardig.be", null)).toBe("/wagens");
  });
});
