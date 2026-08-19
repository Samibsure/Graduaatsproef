import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CatalogusPagina from "./CatalogusInhoud";
import { rendermetIntl } from "@/test/render";
import { DEFAULT_CONTEXT } from "@/lib/fiscaal/defaults";
import { catalogusPerSlug } from "@/lib/fiscaal/catalogusdata";

/**
 * De toestanden waar de audit de meeste fouten vond: laden, fout en leeg.
 *
 * Tot nu toe raakte geen enkele test React, en juist daar zaten de gebreken. Een
 * lijst die "leeg" toont terwijl de gegevens onderweg zijn, of een skelet dat na
 * een fout eeuwig blijft draaien, is voor een unittest op de rekenkern
 * onzichtbaar.
 */

const laadCatalogus = vi.fn();
const laadFiscaleContext = vi.fn();
const laadEigenModellen = vi.fn();

vi.mock("@/lib/data", () => ({
  laadCatalogus: (...a: unknown[]) => laadCatalogus(...a),
  laadFiscaleContext: (...a: unknown[]) => laadFiscaleContext(...a),
  bewaarWagen: vi.fn(),
}));

vi.mock("@/lib/eigenModellen", () => ({
  laadEigenModellen: (...a: unknown[]) => laadEigenModellen(...a),
}));

vi.mock("@/components/SessieProvider", () => ({ useSessie: () => null }));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  Link: ({ children, ...rest }: { children: React.ReactNode }) => <a {...rest}>{children}</a>,
  usePathname: () => "/catalogus",
}));

/**
 * Twee nagekeken modellen en twee ramingen.
 *
 * De catalogus toont standaard alleen wat tegen een genoemde bron gelegd is, dus
 * een testset van uitsluitend ramingen zou een lege pagina opleveren en zou de
 * schakelaar nooit raken.
 */
const modellen = ["bmw-i4", "bmw-330e", "bmw-320d", "kia-ev9"].map((s) => catalogusPerSlug(s)!);

beforeEach(() => {
  vi.clearAllMocks();
  laadFiscaleContext.mockResolvedValue(DEFAULT_CONTEXT);
  laadCatalogus.mockResolvedValue(modellen);
  laadEigenModellen.mockResolvedValue({ modellen: [], nogNietBeschikbaar: false });
});

describe("catalogus: laden, fout en leeg", () => {
  it("toont een skelet zolang de gegevens onderweg zijn, geen lege staat", async () => {
    // Nooit oplossen: dat is precies de situatie tijdens het laden.
    laadCatalogus.mockReturnValue(new Promise(() => {}));
    const { container } = rendermetIntl(<CatalogusPagina />);

    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
    expect(screen.queryByText("Geen model gevonden")).toBeNull();
  });

  it("toont de nagekeken modellen zodra ze binnen zijn, en de ramingen niet", async () => {
    rendermetIntl(<CatalogusPagina />);
    await waitFor(() => expect(screen.getByText("BMW i4")).toBeTruthy());
    expect(screen.getByText("BMW 330e")).toBeTruthy();
    // Deze twee zijn ramingen: plausibele cijfers die niemand nakeek. Ze horen
    // niet zonder meer in een fiscale berekening te belanden.
    expect(screen.queryByText("BMW 320d")).toBeNull();
    expect(screen.queryByText("Kia EV9")).toBeNull();
  });

  it("toont een foutmelding en geen eeuwig skelet wanneer het laden faalt", async () => {
    laadCatalogus.mockRejectedValue(new Error("netwerk onbereikbaar"));
    const { container } = rendermetIntl(<CatalogusPagina />);

    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("netwerk"));
    // Dit was de fout: de melding verscheen, maar het skelet bleef draaien.
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(0);
  });

  it("toont een echte lege staat bij nul zoekresultaten, met een uitweg", async () => {
    const gebruiker = userEvent.setup();
    rendermetIntl(<CatalogusPagina />);
    await waitFor(() => expect(screen.getByText("BMW i4")).toBeTruthy());

    await gebruiker.type(screen.getByRole("textbox"), "bestaatniet");

    // Voorheen bleef hier een volledig leeg raster achter, zonder enige uitleg.
    await waitFor(() => expect(screen.getByText("Geen model gevonden")).toBeTruthy());
    expect(screen.getByRole("button", { name: "Filters wissen" })).toBeTruthy();
  });

  it("wist met die knop alle filters, zodat de lijst weer vult", async () => {
    const gebruiker = userEvent.setup();
    rendermetIntl(<CatalogusPagina />);
    await waitFor(() => expect(screen.getByText("BMW i4")).toBeTruthy());

    await gebruiker.type(screen.getByRole("textbox"), "bestaatniet");
    await waitFor(() => expect(screen.getByText("Geen model gevonden")).toBeTruthy());

    await gebruiker.click(screen.getByRole("button", { name: "Filters wissen" }));
    await waitFor(() => expect(screen.getByText("BMW i4")).toBeTruthy());
  });
});

describe("catalogus: het besteljaar", () => {
  it("staat bovenaan en verandert het aftrekpercentage", async () => {
    const gebruiker = userEvent.setup();
    rendermetIntl(<CatalogusPagina />);
    await waitFor(() => expect(screen.getByText("BMW i4")).toBeTruthy());

    // Deze test heeft juist de diesel nodig, want daarop bijt de gramformule, en
    // de 320d is een raming: die staat standaard niet in het raster.
    await gebruiker.click(screen.getByRole("button", { name: /ramingen tonen/i }));
    await waitFor(() => expect(screen.getByText("BMW 320d")).toBeTruthy());

    const keuze = screen.getByRole("combobox", { name: /Besteljaar/i });
    expect((keuze as HTMLSelectElement).value).toBe("2026");

    // Besteld in 2026 is een diesel meteen 0% aftrekbaar; besteld in 2025 niet.
    // Dat verschil was tot nu toe volledig onzichtbaar op deze pagina. In het
    // overgangsregime van 2025 telt de gramformule: de 320d van 122 g komt op
    // 120 − 0,5 × 122 = 59% uit, ruim onder het plafond van 75% voor dat jaar.
    await gebruiker.selectOptions(keuze, "2025");
    await waitFor(() => expect(screen.getAllByText(/59%/).length).toBeGreaterThan(0));
  });
});

describe("catalogus: geverifieerd naast raming", () => {
  it("legt uit hoeveel modellen nagekeken zijn", async () => {
    rendermetIntl(<CatalogusPagina />);
    await waitFor(() => expect(screen.getByText("Alleen nagekeken modellen")).toBeTruthy());
    // Twee van de vier in deze testset.
    expect(screen.getByText(/2 van de 4 modellen/)).toBeTruthy();
  });

  it("zet de ramingen erbij op één klik, en weer weg", async () => {
    const gebruiker = userEvent.setup();
    rendermetIntl(<CatalogusPagina />);
    await waitFor(() => expect(screen.getByText("BMW i4")).toBeTruthy());

    const schakelaar = screen.getByRole("button", { name: /ramingen tonen/i });
    expect(schakelaar.getAttribute("aria-pressed")).toBe("false");

    await gebruiker.click(schakelaar);
    await waitFor(() => expect(screen.getByText("BMW 320d")).toBeTruthy());
    expect(screen.getByText("Kia EV9")).toBeTruthy();

    await gebruiker.click(screen.getByRole("button", { name: /nagekeken modellen$/i }));
    await waitFor(() => expect(screen.queryByText("BMW 320d")).toBeNull());
  });

  it("draagt elke kaart haar label en haar bron", async () => {
    const gebruiker = userEvent.setup();
    rendermetIntl(<CatalogusPagina />);
    await waitFor(() => expect(screen.getByText("BMW i4")).toBeTruthy());

    expect(screen.getAllByText("Nagekeken").length).toBe(2);
    expect(screen.getAllByText(/bmw\.be/).length).toBeGreaterThan(0);

    await gebruiker.click(screen.getByRole("button", { name: /ramingen tonen/i }));
    await waitFor(() => expect(screen.getAllByText("Raming").length).toBe(2));
  });

  it("waarschuwt over de betwiste verkeersbelasting voor elektrische wagens", async () => {
    rendermetIntl(<CatalogusPagina />);
    // De BMW i4 is elektrisch, dus het betwiste bedrag zit in zijn jaarkost.
    await waitFor(() =>
      expect(screen.getByText(/102,96/)).toBeTruthy(),
    );
    expect(screen.getByText(/carvex\.be/)).toBeTruthy();
  });
});
