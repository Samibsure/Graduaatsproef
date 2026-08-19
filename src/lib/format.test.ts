import { describe, expect, it } from "vitest";
import { formatters } from "./format";

/**
 * Deze applicatie zet niets anders dan bedragen en CO2-cijfers naast elkaar. Als
 * hetzelfde teken binnen één scherm twee dingen betekent, is elk cijfer erop
 * onbetrouwbaar.
 *
 * Dat gebeurde op /en: `en-BE` combineert bij ICU de Engelse valutaopmaak met de
 * Belgische getalsymbolen, dus euro() schreef €45,123 en getal() 45.123,45.
 */
describe("getalopmaak per taal", () => {
  it.each(["nl", "fr", "en"] as const)(
    "gebruikt in %s hetzelfde decimaalteken voor bedragen en getallen",
    (taal) => {
      const { euroCent, getal } = formatters(taal);
      const decimaalIn = (tekst: string) => (tekst.includes(",45") ? "," : ".");
      expect(decimaalIn(euroCent(45123.45))).toBe(decimaalIn(getal(45123.45)));
    },
  );

  it("schrijft in het Nederlands € 45.123 en 45.123,45", () => {
    const { euro, getal } = formatters("nl");
    expect(euro(45123)).toContain("45.123");
    expect(getal(45123.45)).toBe("45.123,45");
  });

  it("schrijft in het Engels 45,123.45 met een punt als decimaalteken", () => {
    const { getal, pct } = formatters("en");
    expect(getal(45123.45)).toBe("45,123.45");
    expect(pct(52.5)).toBe("52.5%");
  });

  it("leest een ISO-datum in UTC, ook aan de jaargrens", () => {
    expect(formatters("nl").datum("2026-01-01")).toContain("2026");
    expect(formatters("nl").datum("2023-07-01")).toContain("juli");
  });
});
