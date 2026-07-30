import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import Inlogwaarde from "./Inlogwaarde";
import { SessieProvider } from "./SessieProvider";
import { rendermetIntl } from "@/test/render";
import type { Sessie } from "@/lib/rollen";

const sessie = {
  gebruiker: { id: "u1", email: "iemand@bedrijf.be" },
  rol: "beheerder",
  isPlatformAdmin: false,
  bedrijf: {
    id: "b1",
    naam: "Testbedrijf",
    ondernemingsnummer: null,
    btw_nummer: null,
    adres: null,
    postcode: null,
    gemeente: null,
    logo_url: null,
    is_kmo: true,
    boekjaar_start_maand: 1,
    onboarding_voltooid: true,
  },
} as unknown as Sessie;

/** De vijf afgeschermde pagina's, elk met de mogelijkheid die ze echt biedt. */
const FUNCTIES = ["Vergelijking", "Vloot", "Wagens", "Eigen modellen", "Instellingen"];

describe("Inlogwaarde", () => {
  it("begint met wat er gratis is, en pas daarna met wat een account toevoegt", () => {
    const { container } = rendermetIntl(<Inlogwaarde />);
    const koppen = [...container.querySelectorAll("h2")].map((h) => h.textContent);
    // De volgorde is het argument: eerst leveren, dan vragen. Omgekeerd leest de
    // lijst als een betaalmuur, en die is er niet.
    expect(koppen[0]).toContain("Dit kreeg je zonder account");
    expect(koppen[1]).toContain("Wat een account toevoegt");
  });

  it("noemt elke afgeschermde pagina bij naam", () => {
    rendermetIntl(<Inlogwaarde />);
    for (const naam of FUNCTIES) {
      expect(screen.getByText(naam)).toBeTruthy();
    }
  });

  it("beschrijft per functie wat je er concreet mee kan", () => {
    rendermetIntl(<Inlogwaarde />);
    expect(screen.getByText(/gewogen score over zeven criteria/)).toBeTruthy();
    expect(screen.getByText(/doorgerekend tot 2031/)).toBeTruthy();
    expect(screen.getByText(/lezer, lid, fiscalist of beheerder/)).toBeTruthy();
  });

  it("zet de voorwaarden naast de knop voor wie nog geen account heeft", () => {
    rendermetIntl(<Inlogwaarde />);
    expect(screen.getByRole("link", { name: /Gratis account maken/ })).toBeTruthy();
    expect(screen.getByText(/geen betaalde versie/)).toBeTruthy();
    expect(screen.getByText(/alleen zichtbaar voor je eigen bedrijf/)).toBeTruthy();
  });

  it("wordt voor wie aangemeld is een lijst snelkoppelingen", () => {
    rendermetIntl(
      <SessieProvider sessie={sessie}>
        <Inlogwaarde />
      </SessieProvider>,
    );
    // Geen belofte meer maar navigatie: elke functienaam is dan een link.
    for (const naam of FUNCTIES) {
      expect(screen.getByRole("link", { name: naam })).toBeTruthy();
    }
    expect(screen.getByRole("link", { name: /Naar de vergelijking/ })).toBeTruthy();
    expect(screen.queryByText(/Gratis account maken/)).toBeNull();
  });
});
