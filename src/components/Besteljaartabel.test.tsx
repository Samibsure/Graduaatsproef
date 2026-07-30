import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Besteljaartabel from "./Besteljaartabel";
import { rendermetIntl } from "@/test/render";
import { catalogPreview } from "@/lib/fiscaal/catalog";
import { catalogusPerSlug } from "@/lib/fiscaal/catalogusdata";
import { DEFAULT_CONTEXT } from "@/lib/fiscaal/defaults";
import { vergelijkBesteljaren } from "@/lib/fiscaal/besteljaar";

const euro = (n: number) => `€ ${Math.round(n)}`;
const pct = (n: number) => `${n}%`;
const getal = (n: number) => String(n);

function vergelijking(slug: string, jaren: number[]) {
  const model = catalogusPerSlug(slug)!;
  return vergelijkBesteljaren(DEFAULT_CONTEXT, catalogPreview(model, 2026), jaren);
}

describe("Besteljaartabel", () => {
  it("toont één rij per besteljaar, oplopend", () => {
    rendermetIntl(
      <Besteljaartabel
        vergelijking={vergelijking("bmw-320d", [2025, 2026, 2027])}
        formatters={{ euro, pct, getal }}
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
        formatters={{ euro, pct, getal }}
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
        formatters={{ euro, pct, getal }}
      />,
    );
    expect(screen.getByText(/Bestellen in 2025 levert nog aftrek op/)).toBeTruthy();
  });

  it("meldt het wanneer geen enkel getoond jaar nog aftrek oplevert", () => {
    rendermetIntl(
      <Besteljaartabel
        vergelijking={vergelijking("bmw-320d", [2026, 2027, 2028])}
        formatters={{ euro, pct, getal }}
      />,
    );
    expect(screen.getByText(/In geen enkel getoond jaar/)).toBeTruthy();
  });

  it("rendert niets zonder jaren, in plaats van een lege tabel", () => {
    const { container } = rendermetIntl(
      <Besteljaartabel vergelijking={vergelijking("bmw-320d", [])} formatters={{ euro, pct, getal }} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("geeft elke kolomkop een scope, zodat een schermlezer de tabel kan lezen", () => {
    rendermetIntl(
      <Besteljaartabel
        vergelijking={vergelijking("tesla-model-3", [2026, 2027])}
        formatters={{ euro, pct, getal }}
      />,
    );
    for (const kop of screen.getAllByRole("columnheader")) {
      expect(kop.getAttribute("scope")).toBe("col");
    }
  });

  it("noemt de looptijd in de kolomkop in plaats van vier jaar aan te nemen", () => {
    rendermetIntl(
      <Besteljaartabel
        vergelijking={vergelijkBesteljaren(
          DEFAULT_CONTEXT,
          catalogPreview(catalogusPerSlug("tesla-model-3")!, 2026),
          [2026, 2027],
          5,
        )}
        formatters={{ euro, pct, getal }}
      />,
    );
    expect(screen.getByText("Totale kost 5 jaar")).toBeTruthy();
  });
});

describe("Besteljaartabel zonder uitleg", () => {
  it("laat de catalogus ongemoeid: geen uitlegknop en geen regimestrook", () => {
    // De catalogus toont deze tabel in een smal paneel onder het raster. Zou de
    // uitleg daar standaard aan staan, dan verandert die pagina mee zonder dat
    // iemand daarom vroeg.
    rendermetIntl(
      <Besteljaartabel
        vergelijking={vergelijking("bmw-320d", [2024, 2025, 2026])}
        formatters={{ euro, pct, getal }}
      />,
    );
    expect(screen.queryByRole("button", { name: /Uitleg bij besteljaar/ })).toBeNull();
    expect(screen.queryByText("De regimes in dit bereik")).toBeNull();
  });
});

describe("Besteljaartabel met uitleg", () => {
  const metUitleg = (slug: string, jaren: number[]) =>
    rendermetIntl(
      <Besteljaartabel
        vergelijking={vergelijking(slug, jaren)}
        formatters={{ euro, pct, getal }}
        metUitleg
      />,
    );

  it("groepeert de getoonde jaren per fiscaal regime", () => {
    // Zonder deze strook is de sprong tussen 2025 en 2026 een raadsel in plaats
    // van een regelgrens.
    metUitleg("bmw-320d", [2024, 2025, 2026, 2027]);
    expect(screen.getByText("De regimes in dit bereik")).toBeTruthy();
    expect(screen.getByText("2024 tot 2025")).toBeTruthy();
    expect(screen.getByText("Besteld tussen 1 juli 2023 en 31 december 2025")).toBeTruthy();
    expect(screen.getByText("Besteld in 2026")).toBeTruthy();
  });

  it("geeft elke rij een uitlegknop die dicht begint", () => {
    metUitleg("bmw-320d", [2025, 2026, 2027]);
    const knoppen = screen.getAllByRole("button", { name: /Uitleg bij besteljaar/ });
    expect(knoppen).toHaveLength(3);
    for (const k of knoppen) {
      expect(k.getAttribute("aria-expanded")).toBe("false");
    }
  });

  it("klapt de uitleg open en weer dicht", async () => {
    metUitleg("bmw-320d", [2025, 2026]);
    const knop = screen.getByRole("button", { name: "Uitleg bij besteljaar 2026" });

    expect(screen.queryByText("Hoe het percentage ontstaat")).toBeNull();
    await userEvent.click(knop);
    expect(knop.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("Hoe het percentage ontstaat")).toBeTruthy();

    await userEvent.click(knop);
    expect(knop.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("Hoe het percentage ontstaat")).toBeNull();
  });

  it("houdt maar één uitleg tegelijk open", async () => {
    metUitleg("bmw-320d", [2025, 2026, 2027]);
    await userEvent.click(screen.getByRole("button", { name: "Uitleg bij besteljaar 2026" }));
    await userEvent.click(screen.getByRole("button", { name: "Uitleg bij besteljaar 2027" }));
    expect(screen.getAllByText("Hoe het percentage ontstaat")).toHaveLength(1);
  });

  it("laat de uitleg de volle tabelbreedte innemen", async () => {
    const { container } = metUitleg("bmw-320d", [2025, 2026]);
    await userEvent.click(screen.getByRole("button", { name: "Uitleg bij besteljaar 2026" }));
    const cel = container.querySelector("td[colspan]");
    // Zes gegevenskolommen plus de kolom met de knop.
    expect(cel?.getAttribute("colspan")).toBe("7");
  });

  it("verbindt de knop met het paneel dat ze opent", async () => {
    const { container } = metUitleg("bmw-320d", [2025, 2026]);
    const knop = screen.getByRole("button", { name: "Uitleg bij besteljaar 2026" });
    await userEvent.click(knop);
    const id = knop.getAttribute("aria-controls");
    expect(id).toBeTruthy();
    expect(container.querySelector(`#${id}`)).toBeTruthy();
  });
});
