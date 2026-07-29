import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import Besteljaartabel from "./Besteljaartabel";
import { rendermetIntl } from "@/test/render";
import { catalogPreview } from "@/lib/fiscaal/catalog";
import { catalogusPerSlug } from "@/lib/fiscaal/catalogusdata";
import { DEFAULT_CONTEXT } from "@/lib/fiscaal/defaults";
import { vergelijkBesteljaren } from "@/lib/fiscaal/besteljaar";

const euro = (n: number) => `€ ${Math.round(n)}`;
const pct = (n: number) => `${n}%`;

function vergelijking(slug: string, jaren: number[]) {
  const model = catalogusPerSlug(slug)!;
  return vergelijkBesteljaren(DEFAULT_CONTEXT, catalogPreview(model, 2026), jaren);
}

describe("Besteljaartabel", () => {
  it("toont één rij per besteljaar, oplopend", () => {
    rendermetIntl(
      <Besteljaartabel
        vergelijking={vergelijking("bmw-320d", [2025, 2026, 2027])}
        formatters={{ euro, pct }}
      />,
    );
    const rijkoppen = screen.getAllByRole("rowheader");
    expect(rijkoppen.map((k) => k.textContent?.trim().slice(0, 4))).toEqual([
      "2025",
      "2026",
      "2027",
    ]);
  });

  it("markeert het goedkoopste besteljaar", () => {
    rendermetIntl(
      <Besteljaartabel
        vergelijking={vergelijking("bmw-320d", [2025, 2026])}
        formatters={{ euro, pct }}
      />,
    );
    // Uitstellen is voor een verbrandingswagen duurder, dus 2025 wint.
    const rij2025 = screen.getByRole("rowheader", { name: /2025/ });
    expect(within(rij2025).getByText("Goedkoopst")).toBeTruthy();
  });

  it("zegt in welk jaar bestellen nog aftrek oplevert", () => {
    rendermetIntl(
      <Besteljaartabel
        vergelijking={vergelijking("bmw-320d", [2024, 2025, 2026, 2027])}
        formatters={{ euro, pct }}
      />,
    );
    expect(screen.getByText(/Bestellen in 2025 levert nog aftrek op/)).toBeTruthy();
  });

  it("meldt het wanneer geen enkel getoond jaar nog aftrek oplevert", () => {
    rendermetIntl(
      <Besteljaartabel
        vergelijking={vergelijking("bmw-320d", [2026, 2027, 2028])}
        formatters={{ euro, pct }}
      />,
    );
    expect(screen.getByText(/In geen enkel getoond jaar/)).toBeTruthy();
  });

  it("rendert niets zonder jaren, in plaats van een lege tabel", () => {
    const { container } = rendermetIntl(
      <Besteljaartabel vergelijking={vergelijking("bmw-320d", [])} formatters={{ euro, pct }} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("geeft elke kolomkop een scope, zodat een schermlezer de tabel kan lezen", () => {
    rendermetIntl(
      <Besteljaartabel
        vergelijking={vergelijking("tesla-model-3", [2026, 2027])}
        formatters={{ euro, pct }}
      />,
    );
    for (const kop of screen.getAllByRole("columnheader")) {
      expect(kop.getAttribute("scope")).toBe("col");
    }
  });
});
