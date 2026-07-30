import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import ParametersPagina from "./page";
import { rendermetIntl } from "@/test/render";
import { DEFAULT_CONTEXT } from "@/lib/fiscaal/defaults";

/**
 * De referentiepagina toont nu ook cijfers die niet uit het Staatsblad komen.
 * Precies daar zit het risico: een gewestelijk barema of een uitgelekt
 * vignettarief dat als vaststaand overkomt. Deze tests bewaken dat elk zo'n
 * cijfer met zijn status op het scherm staat.
 */

const laadFiscaleContext = vi.fn();

vi.mock("@/lib/data", () => ({
  laadFiscaleContext: (...a: unknown[]) => laadFiscaleContext(...a),
}));

beforeEach(() => {
  vi.clearAllMocks();
  laadFiscaleContext.mockResolvedValue(DEFAULT_CONTEXT);
});

describe("referentiepagina: gewestelijke tarieven", () => {
  it("toont het Vlaamse EV-forfait met de status bevestigd", async () => {
    rendermetIntl(<ParametersPagina />);
    const rij = await screen.findByText(/BIV elektrisch Vlaanderen/);
    const cellen = rij.closest("tr")!;
    expect(cellen.textContent).toContain("61,50");
    expect(cellen.textContent).toContain("Bevestigd");
  });

  it("markeert een tarief uit een secundaire bron als te verifiëren", async () => {
    rendermetIntl(<ParametersPagina />);
    const rij = (await screen.findByText(/Minimum verkeersbelasting Wallonië/)).closest("tr")!;
    expect(rij.textContent).toContain("Te verifiëren");
  });

  it("verwijst voor een bindend bedrag door naar de gewestelijke simulator", async () => {
    rendermetIntl(<ParametersPagina />);
    expect(await screen.findByText(/VLABEL voor Vlaanderen/)).toBeTruthy();
  });
});

describe("referentiepagina: CREG en vergoedingen", () => {
  it("toont het laadtarief in vier cijfers na de komma", async () => {
    // Met twee cijfers zou € 0,3132 tot € 0,31 herleid worden en zou het
    // verschil tussen de gewesten verdwijnen.
    rendermetIntl(<ParametersPagina />);
    expect(await screen.findByText(/0,3132/)).toBeTruthy();
  });

  it("zegt het wanneer de CREG voor een gewest niets publiceerde", async () => {
    rendermetIntl(<ParametersPagina />);
    await waitFor(() => expect(screen.getAllByText("niet gepubliceerd").length).toBeGreaterThan(0));
  });

  it("toont de tijdelijke maandtarieven van het voorjaar 2026 als zodanig", async () => {
    rendermetIntl(<ParametersPagina />);
    const rij = (await screen.findByText("2026-05")).closest("tr")!;
    expect(rij.textContent).toContain("tijdelijk maandtarief");
  });
});

describe("referentiepagina: wat nog niet vaststaat", () => {
  it("zet het wegenvignet apart onder een voorlopige status", async () => {
    rendermetIntl(<ParametersPagina />);
    const kop = await screen.findByText(/Aangekondigd, nog niet definitief/);
    expect(kop.parentElement!.textContent).toContain("Voorlopig");
  });

  it("legt de drie statussen uit", async () => {
    rendermetIntl(<ParametersPagina />);
    expect(await screen.findByText(/Gepubliceerd in het Belgisch Staatsblad/)).toBeTruthy();
    expect(screen.getByText(/Aangekondigd of uitgelekt/)).toBeTruthy();
  });
});
