import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import Besteljaaruitleg from "./Besteljaaruitleg";
import { rendermetIntl } from "@/test/render";
import { vergelijkBesteljaren } from "@/lib/fiscaal/besteljaar";
import { catalogPreview } from "@/lib/fiscaal/catalog";
import { catalogusPerSlug } from "@/lib/fiscaal/catalogusdata";
import { DEFAULT_CONTEXT } from "@/lib/fiscaal/defaults";

const euro = (n: number) => `€ ${Math.round(n)}`;
const pct = (n: number) => `${n}%`;
const getal = (n: number) => String(n);
const fmt = { euro, pct, getal };

function vergelijking(slug: string, jaren: number[]) {
  const model = catalogusPerSlug(slug)!;
  return vergelijkBesteljaren(DEFAULT_CONTEXT, catalogPreview(model, 2026), jaren);
}

describe("Besteljaaruitleg", () => {
  it("noemt het regime waaronder het besteljaar valt", () => {
    const v = vergelijking("bmw-320d", [2025, 2026]);
    const rij = v.rijen.find((r) => r.jaar === 2026)!;
    rendermetIntl(<Besteljaaruitleg rij={rij} besteJaar={v.besteJaar} formatters={fmt} />);
    expect(screen.getByText("Besteld in 2026")).toBeTruthy();
  });

  it("schrijft de gramformule uit met de cijfers van deze wagen", () => {
    // Een diesel besteld in 2025 valt onder het overgangsregime, en daar geldt de
    // gramformule nog. De uitleg hoort de som te tonen, niet alleen de uitkomst.
    const v = vergelijking("bmw-320d", [2025, 2026]);
    const rij = v.rijen.find((r) => r.jaar === 2025)!;
    rendermetIntl(<Besteljaaruitleg rij={rij} besteJaar={v.besteJaar} formatters={fmt} />);
    expect(screen.getByText(/120% min 0,5 × 1 × 122 g/)).toBeTruthy();
  });

  it("zegt bij een verbrandingswagen vanaf 2026 dat het levenslang nul is", () => {
    const v = vergelijking("bmw-320d", [2025, 2026]);
    const rij = v.rijen.find((r) => r.jaar === 2026)!;
    rendermetIntl(<Besteljaaruitleg rij={rij} besteJaar={v.besteJaar} formatters={fmt} />);
    expect(screen.getByText(/levenslang 0% aftrekbaar/)).toBeTruthy();
  });

  it("verwijst bij een elektrische wagen naar de aftrekkalender", () => {
    const v = vergelijking("tesla-model-3", [2026, 2028]);
    const rij = v.rijen.find((r) => r.jaar === 2028)!;
    rendermetIntl(<Besteljaaruitleg rij={rij} besteJaar={v.besteJaar} formatters={fmt} />);
    expect(screen.getByText(/aftrekkalender legt 90% vast/)).toBeTruthy();
  });

  it("toont het aftrekpad met één balk per gebruiksjaar", () => {
    const v = vergelijking("bmw-320d", [2025]);
    const rij = v.rijen[0];
    rendermetIntl(<Besteljaaruitleg rij={rij} besteJaar={v.besteJaar} formatters={fmt} />);
    // De vier gebruiksjaren staan onder de balkjes.
    for (const jaar of [2025, 2026, 2027, 2028]) {
      expect(screen.getByText(String(jaar))).toBeTruthy();
    }
  });

  it("toont de drie drijvers, en hun som is het bedrag uit de kolom Verschil", () => {
    const v = vergelijking("bmw-320d", [2025, 2026, 2027]);
    const duurste = v.rijen.reduce((a, b) =>
      a.meerkostTegenoverBeste > b.meerkostTegenoverBeste ? a : b,
    );
    rendermetIntl(<Besteljaaruitleg rij={duurste} besteJaar={v.besteJaar} formatters={fmt} />);

    expect(screen.getByText("Minder aftrekbaar")).toBeTruthy();
    expect(screen.getByText("Voordeel alle aard")).toBeTruthy();
    expect(screen.getByText("CO₂-bijdrage RSZ")).toBeTruthy();

    // Het totaal onder de balken is precies de meerkost tegenover het beste jaar.
    expect(screen.getByText(`+ ${euro(duurste.meerkostTegenoverBeste)}`)).toBeTruthy();
  });

  it("zegt bij het goedkoopste besteljaar dat er niets te vergelijken valt", () => {
    const v = vergelijking("bmw-320d", [2025, 2026]);
    const beste = v.rijen.find((r) => r.jaar === v.besteJaar)!;
    rendermetIntl(<Besteljaaruitleg rij={beste} besteJaar={v.besteJaar} formatters={fmt} />);
    expect(screen.getByText(/goedkoopste besteljaar van de vergelijking/)).toBeTruthy();
    expect(screen.queryByText("Minder aftrekbaar")).toBeNull();
  });
});
