import { describe, expect, it } from "vitest";
import { vignetAftrekbaarheid, vignettarief } from "./wegenvignet";

/**
 * Het wegenvignet mag nooit als een vaststaand cijfer uit de tool komen. Deze
 * tests bewaken vooral dat: elke uitkomst draagt de vlag "voorlopig".
 */

describe("wegenvignet", () => {
  it("markeert elk tarief als voorlopig", () => {
    const r = vignettarief({ voertuigtype: "fossiel", euronorm: "euro6" }, "jaar");
    expect(r.zekerheid).toBe("voorlopig");
    expect(r.toelichting.join(" ")).toMatch(/niet definitief/i);
  });

  it("deelt in op elektrisch, schoon en hoog", () => {
    expect(vignettarief({ voertuigtype: "BEV" }, "jaar").bedrag).toBe(90);
    expect(vignettarief({ voertuigtype: "fossiel", euronorm: "euro6" }, "jaar").bedrag).toBe(100);
    expect(vignettarief({ voertuigtype: "fossiel", euronorm: "euro3" }, "jaar").bedrag).toBe(125);
  });

  it("veronderstelt het hoogste tarief zonder euronorm", () => {
    const r = vignettarief({ voertuigtype: "fossiel" }, "jaar");
    expect(r.categorie).toBe("hoog");
    expect(r.toelichting.join(" ")).toMatch(/Zonder euronorm/);
  });

  it("geeft geen bedrag voor een duur die niet bekendgemaakt is", () => {
    expect(vignettarief({ voertuigtype: "BEV" }, "maand").bedrag).toBeNull();
  });

  it("is alleen voor lichte vracht een bevestigde aftrek", () => {
    expect(vignetAftrekbaarheid(true).zekerheid).toBe("bevestigd");
    expect(vignetAftrekbaarheid(false).zekerheid).toBe("voorlopig");
  });
});
