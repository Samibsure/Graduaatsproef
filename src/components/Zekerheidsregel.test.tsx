import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import Zekerheidsregel from "./Zekerheidsregel";
import { rendermetIntl } from "@/test/render";
import { catalogusPerSlug } from "@/lib/fiscaal/catalogusdata";
import type { CatalogCar } from "@/lib/fiscaal/types";

/**
 * Deze component draagt de belofte die tot voor kort als vinkje in de hero stond:
 * elk cijfer met zijn bron. Ze staat nu op twee plaatsen -- de catalogiskaarten en
 * de voorbeeldkaart op de startpagina -- en op allebei is een verdwenen bronregel
 * onzichtbaar voor het blote oog.
 */
const modelY = catalogusPerSlug("tesla-model-y") as CatalogCar;

describe("Zekerheidsregel", () => {
  it("toont bij een nagekeken model de badge en de bron", () => {
    rendermetIntl(<Zekerheidsregel car={modelY} />);
    expect(screen.getByText("Nagekeken")).toBeTruthy();
    expect(screen.getByText(/autogids\.be/)).toBeTruthy();
  });

  it("toont bij een raming dat het een raming is", () => {
    const raming = { ...modelY, zekerheid: "raming", bron: "Fabrikantopgave WLTP" } as CatalogCar;
    rendermetIntl(<Zekerheidsregel car={raming} />);
    expect(screen.getByText("Raming")).toBeTruthy();
  });

  it("laat het voorbehoud weg in de compacte variant, de bron niet", () => {
    // De hero-kaart is te smal voor een alinea voorbehoud; de bron blijft staan,
    // want dat is het hele punt van de regel.
    const { container } = rendermetIntl(<Zekerheidsregel car={modelY} compact />);
    expect(screen.getByText(/autogids\.be/)).toBeTruthy();
    expect(container.textContent).not.toContain("Voorbehoud:");
  });

  it("rendert niets wanneer er geen bron en geen voorbehoud is", () => {
    const kaal = { ...modelY, bron: "", voorbehoud: null } as unknown as CatalogCar;
    const { container } = rendermetIntl(<Zekerheidsregel car={kaal} />);
    expect(container.firstChild).toBeNull();
  });
});
