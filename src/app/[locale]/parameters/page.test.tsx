import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import ParametersPagina from "./page";
import { rendermetIntl } from "@/test/render";
import { DEFAULT_CONTEXT } from "@/lib/fiscaal/defaults";
import { PARAM_VELDEN } from "@/lib/parameterVelden";
import nl from "../../../../messages/nl.json";

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

// De pagina linkt per parameter door naar de formule op /fiscaal-kader. De
// routering van next-intl trekt `next/navigation` mee, en dat lost vitest in
// jsdom niet op; dezelfde schil als in catalogus/page.test.tsx.
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, ...rest }: { children: React.ReactNode }) => <a {...rest}>{children}</a>,
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

describe("referentiepagina: elk cijfer met zijn betekenis", () => {
  /**
   * De pagina was een raster van zestien label-waardeparen. "VAA → VU met
   * tank-/laadkaart: 40%" is een cijfer zonder betekenis: er stond nergens wat
   * het is of welke formule het voedt. Deze tests bewaken dat die uitleg blijft.
   */

  it("zet bij elk van de zestien parameters een uitlegzin", async () => {
    rendermetIntl(<ParametersPagina />);
    await screen.findByText("Minimum VAA");
    const teksten: Record<string, string> = nl.parameters;
    for (const { sleutel } of PARAM_VELDEN) {
      const rij = screen.getByText(teksten[sleutel]).closest("tr")!;
      expect(rij.textContent).toContain(teksten[`${sleutel}Uitleg`].slice(0, 40));
    }
  });

  it("verwijst per parameter door naar de formule op het fiscaal kader", async () => {
    rendermetIntl(<ParametersPagina />);
    const rij = (await screen.findByText("Minimum VAA")).closest("tr")!;
    expect(rij.querySelector('a[href="/fiscaal-kader#fk-vaa"]')).toBeTruthy();
  });

  it("toont de RSZ-index met vier decimalen en niet afgerond", async () => {
    // 1,63 in plaats van 1,6291 verliest precisie op het cijfer waarmee elke
    // bijdrage vermenigvuldigd wordt.
    rendermetIntl(<ParametersPagina />);
    const rij = (await screen.findByText(/RSZ-indexatiecoëfficiënt/)).closest("tr")!;
    expect(rij.textContent).toContain("1,6291");
  });

  it("toont de multiplicator per bestelperiode niet meer als aparte tabel", async () => {
    // Die tabel toonde waarden die rszBijdrageMaand nooit leest: de rekenkern
    // neemt de multiplicator van het bijdragejaar. De pagina zette er x6 vanaf
    // 2028 naast een x5,5 in de kaart erboven.
    rendermetIntl(<ParametersPagina />);
    await screen.findByText("Minimum VAA");
    expect(screen.queryByText("RSZ-multiplicator per bestelperiode")).toBeNull();
  });

  it("benoemt de bestelperiodes in de aftrekkalender met hun grensdatums", async () => {
    // Het label in de databank staat in het Nederlands en werd rechtstreeks
    // gerenderd, dus op /fr en /en stond daar Nederlands.
    rendermetIntl(<ParametersPagina />);
    // Eén rij per voertuigtype, dus meerdere treffers voor dezelfde periode.
    const rijen = await screen.findAllByText(/1 juli 2023 tot en met 31 december 2025/);
    expect(rijen.length).toBeGreaterThan(0);
    expect(screen.queryByText(/Vóór 1 juli 2023 \(gramformule\)/)).toBeNull();
  });
});
