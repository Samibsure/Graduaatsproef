import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WagensPagina from "./page";
import { rendermetIntl } from "@/test/render";
import { DEFAULT_CONTEXT } from "@/lib/fiscaal/defaults";

/**
 * De valse-hybridetoets in het formulier.
 *
 * De rekenregel zelf staat vast in hybride.test.ts. Wat hier bewaakt wordt, is
 * de terugkoppeling: zonder uitleg ziet de gebruiker alleen dat het
 * aftrekpercentage verspringt zodra hij een batterijcapaciteit invult, en dat
 * is precies de vergissing die het rapport aanwijst als duurste.
 */

const laadWagens = vi.fn();
const laadCatalogus = vi.fn();
const laadFiscaleContext = vi.fn();

vi.mock("@/lib/data", () => ({
  laadWagens: (...a: unknown[]) => laadWagens(...a),
  laadCatalogus: (...a: unknown[]) => laadCatalogus(...a),
  laadFiscaleContext: (...a: unknown[]) => laadFiscaleContext(...a),
  bewaarWagen: vi.fn(),
  verwijderWagen: vi.fn(),
}));

vi.mock("@/components/SessieProvider", () => ({
  useSessie: () => ({ rol: "beheerder" }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  laadWagens.mockResolvedValue([]);
  laadCatalogus.mockResolvedValue([]);
  laadFiscaleContext.mockResolvedValue(DEFAULT_CONTEXT);
});

/** Opent het formulier en zet het voertuigtype op plug-inhybride. */
async function openPhevFormulier(gebruiker: ReturnType<typeof userEvent.setup>) {
  rendermetIntl(<WagensPagina />);
  await waitFor(() => expect(laadFiscaleContext).toHaveBeenCalled());

  await gebruiker.click(await screen.findByRole("button", { name: /Nieuwe wagen/i }));
  await gebruiker.selectOptions(screen.getByRole("combobox", { name: /Type aandrijving/i }), "PHEV");
}

describe("wagenformulier: de valse-hybridetoets", () => {
  it("verschijnt alleen voor een plug-inhybride", async () => {
    const gebruiker = userEvent.setup();
    rendermetIntl(<WagensPagina />);
    await gebruiker.click(await screen.findByRole("button", { name: /Nieuwe wagen/i }));

    expect(screen.queryByText("Toets op de valse hybride")).toBeNull();

    await gebruiker.selectOptions(screen.getByRole("combobox", { name: /Type aandrijving/i }), "PHEV");
    expect(screen.getByText("Toets op de valse hybride")).toBeTruthy();
  });

  it("zegt dat de batterijtoets niet uitgevoerd is zolang de gegevens ontbreken", async () => {
    const gebruiker = userEvent.setup();
    await openPhevFormulier(gebruiker);
    expect(screen.getByText(/batterijtoets is niet uitgevoerd/i)).toBeTruthy();
  });

  it("wijst een te kleine batterij aan als valse hybride", async () => {
    const gebruiker = userEvent.setup();
    await openPhevFormulier(gebruiker);

    await gebruiker.type(screen.getByRole("spinbutton", { name: /Batterijcapaciteit/i }), "7");
    await gebruiker.type(screen.getByRole("spinbutton", { name: /Wagengewicht/i }), "2100");

    // 7 kWh op 2.100 kg is 0,33 kWh per 100 kg, onder de vereiste 0,5.
    await waitFor(() => expect(screen.getByText(/0.33 kWh per 100 kg/)).toBeTruthy());
  });

  it("laat een ruime batterij als echte plug-inhybride staan", async () => {
    const gebruiker = userEvent.setup();
    await openPhevFormulier(gebruiker);

    await gebruiker.type(screen.getByRole("spinbutton", { name: /Batterijcapaciteit/i }), "18");
    await gebruiker.type(screen.getByRole("spinbutton", { name: /Wagengewicht/i }), "1900");

    await waitFor(() => expect(screen.getByText(/Echte plug-inhybride/i)).toBeTruthy());
  });
});

describe("wagenformulier: kosten met een eigen regime", () => {
  it("biedt een veld voor verkeersboetes met de reden erbij", async () => {
    const gebruiker = userEvent.setup();
    rendermetIntl(<WagensPagina />);
    await gebruiker.click(await screen.findByRole("button", { name: /Nieuwe wagen/i }));

    expect(screen.getByRole("spinbutton", { name: /Verkeersboetes per jaar/i })).toBeTruthy();
    expect(screen.getByText(/Nooit aftrekbaar/i)).toBeTruthy();
  });

  it("biedt euronorm en gewest aan, met een expliciete keuze voor onbekend", async () => {
    const gebruiker = userEvent.setup();
    rendermetIntl(<WagensPagina />);
    await gebruiker.click(await screen.findByRole("button", { name: /Nieuwe wagen/i }));

    const euronorm = screen.getByRole("combobox", { name: /Euronorm/i }) as HTMLSelectElement;
    expect(euronorm.value).toBe("");
    expect(screen.getByRole("combobox", { name: /Gewest van de titularis/i })).toBeTruthy();
  });
});
