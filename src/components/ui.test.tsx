import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { render } from "@testing-library/react";
import { Button, Laadskelet, LegeStaat, Melding, Tabel, Veld, knopKlassen } from "./ui";

/**
 * De primitieven die de toestanden dragen waar de audit de meeste fouten vond:
 * laden, fout en leeg. Ze zijn nu op één plaats gedefinieerd, dus ook op één
 * plaats te bewaken.
 */
describe("Melding", () => {
  it("kondigt een fout aan als alert en de rest als status", () => {
    // Het verschil is niet cosmetisch: een schermlezer onderbreekt bij een alert
    // en niet bij een status.
    const { rerender } = render(<Melding soort="fout">Er ging iets mis</Melding>);
    expect(screen.getByRole("alert").textContent).toBe("Er ging iets mis");

    rerender(<Melding soort="ok">Bewaard</Melding>);
    expect(screen.getByRole("status").textContent).toBe("Bewaard");
  });

  it("valt terug op een neutrale melding bij een onbekende soort", () => {
    render(<Melding>Gewoon informatie</Melding>);
    expect(screen.getByRole("status")).toBeTruthy();
  });
});

describe("LegeStaat", () => {
  it("toont een titel, uitleg en een uitweg", () => {
    // De catalogus toonde bij nul zoekresultaten een volledig leeg raster: geen
    // titel, geen uitleg, geen manier om verder te gaan.
    render(
      <LegeStaat
        titel="Geen model gevonden"
        tekst="Verruim de selectie."
        actie={<Button>Filters wissen</Button>}
      />,
    );
    expect(screen.getByRole("heading", { name: "Geen model gevonden" })).toBeTruthy();
    expect(screen.getByText("Verruim de selectie.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Filters wissen" })).toBeTruthy();
  });
});

describe("Laadskelet", () => {
  it("blijft buiten de toegankelijkheidsboom", () => {
    // Pulserende grijze blokken zijn ruis voor een schermlezer.
    const { container } = render(<Laadskelet aantal={3} />);
    expect(container.firstElementChild?.getAttribute("aria-hidden")).toBe("true");
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(3);
  });
});

describe("Tabel", () => {
  it("legt een minimumbreedte op, zodat ze schuift in plaats van samen te persen", () => {
    // Zonder ondergrens knijpt een tabel met tien kolommen zich op een telefoon
    // tot onleesbaarheid samen; dat was de fout op /wagens.
    const { container } = render(
      <Tabel minBreedte={900} bijschrift="Wagens">
        <tbody>
          <tr>
            <td>rij</td>
          </tr>
        </tbody>
      </Tabel>,
    );
    const tabel = container.querySelector("table")!;
    expect(tabel.style.minWidth).toBe("900px");
    expect(container.firstElementChild?.className).toContain("overflow-x-auto");
    expect(screen.getByText("Wagens").tagName).toBe("CAPTION");
  });
});

describe("Veld", () => {
  it("koppelt het label aan de invoer via de omhullende label", () => {
    render(
      <Veld label="Cataloguswaarde" hint="In euro">
        <input />
      </Veld>,
    );
    expect(screen.getByLabelText(/Cataloguswaarde/)).toBeTruthy();
    expect(screen.getByText("In euro")).toBeTruthy();
  });

  it("toont een fout in plaats van de hint wanneer er een is", () => {
    render(
      <Veld label="CO₂" hint="In gram per kilometer" fout="mag niet negatief zijn">
        <input />
      </Veld>,
    );
    expect(screen.getByText("mag niet negatief zijn")).toBeTruthy();
    expect(screen.queryByText("In gram per kilometer")).toBeNull();
  });
});

describe("knopKlassen", () => {
  it("levert per variant en maat een andere reeks, en houdt de basis gelijk", () => {
    const primair = knopKlassen("primair", "md");
    const gevaar = knopKlassen("gevaar", "lg");
    expect(primair).toContain("bg-accent");
    expect(gevaar).toContain("bg-danger");
    // De basis staat in beide: dat is precies de reden dat deze functie bestaat.
    for (const reeks of [primair, gevaar]) {
      expect(reeks).toContain("inline-flex");
      expect(reeks).toContain("disabled:opacity-55");
    }
    expect(primair).not.toBe(gevaar);
  });

  it("valt terug op primair en middelgroot", () => {
    expect(knopKlassen()).toBe(knopKlassen("primair", "md"));
  });
});
