import { describe, expect, it } from "vitest";
import { lezOverzicht, lezToegang } from "./lez";

describe("lage-emissiezones", () => {
  it("laat een elektrische wagen overal binnen", () => {
    const overzicht = lezOverzicht({ voertuigtype: "BEV", brandstof: "elektrisch" });
    expect(overzicht.every((t) => t.toegelaten && t.vrijgesteld)).toBe(true);
  });

  it("laat een diesel Euro 5 in Antwerpen en Gent, maar niet in Brussel", () => {
    const wagen = { voertuigtype: "fossiel" as const, brandstof: "diesel" as const, euronorm: "euro5" as const };
    expect(lezToegang(wagen, "antwerpen").toegelaten).toBe(true);
    expect(lezToegang(wagen, "gent").toegelaten).toBe(true);
    expect(lezToegang(wagen, "brussel").toegelaten).toBe(false);
  });

  it("weert een diesel Euro 4 overal", () => {
    const wagen = { voertuigtype: "fossiel" as const, brandstof: "diesel" as const, euronorm: "euro4" as const };
    expect(lezOverzicht(wagen).some((t) => t.toegelaten)).toBe(false);
  });

  it("laat een plug-inhybride onder 50 g overal binnen", () => {
    const wagen = { voertuigtype: "PHEV" as const, brandstof: "benzine" as const, co2: 38 };
    expect(lezOverzicht(wagen).every((t) => t.toegelaten)).toBe(true);
  });

  it("doet geen uitspraak zonder euronorm", () => {
    const wagen = { voertuigtype: "fossiel" as const, brandstof: "diesel" as const };
    const r = lezToegang(wagen, "brussel");
    expect(r.toegelaten).toBe(false);
    expect(r.reden).toMatch(/Zonder euronorm/);
  });

  it("houdt de Brusselse boete achter zolang de waarschuwingsperiode loopt", () => {
    const wagen = { voertuigtype: "fossiel" as const, brandstof: "diesel" as const, euronorm: "euro5" as const };
    expect(lezToegang(wagen, "brussel").boete).toBeNull();
    expect(lezToegang(wagen, "antwerpen").boete).toBe(150);
  });

  it("geeft de dagpasprijs voor een wagen die niet binnen mag", () => {
    const wagen = { voertuigtype: "fossiel" as const, brandstof: "diesel" as const, euronorm: "euro5" as const };
    expect(lezToegang(wagen, "brussel").dagpasPrijs).toBe(35);
  });
});
