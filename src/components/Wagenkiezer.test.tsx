import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Wagenkiezer from "./Wagenkiezer";
import { rendermetIntl } from "@/test/render";
import { DEFAULT_CATALOGUS, catalogusPerSlug } from "@/lib/fiscaal/catalogusdata";
import { aftrekOpbouw } from "@/lib/fiscaal/engine";
import { DEFAULT_CONTEXT } from "@/lib/fiscaal/defaults";
import { catalogPreview } from "@/lib/fiscaal/catalog";
import type { CatalogCar } from "@/lib/fiscaal/types";

const euro = (n: number) => `€ ${Math.round(n)}`;
const pct = (n: number) => `${n}%`;

const model = (slug: string) => catalogusPerSlug(slug)!;

/** Echt doorgerekend, zodat de test ook de waarde bewaakt en niet enkel de opmaak. */
const aftrekVoor = (besteljaar: number) => (car: CatalogCar) =>
  aftrekOpbouw(DEFAULT_CONTEXT, catalogPreview(car, besteljaar), besteljaar).pct;

function toon(props: Partial<Parameters<typeof Wagenkiezer>[0]> = {}) {
  const onKies = vi.fn();
  const resultaat = rendermetIntl(
    <Wagenkiezer
      catalogus={DEFAULT_CATALOGUS}
      gekozenSleutel={null}
      onKies={onKies}
      aftrekVoor={aftrekVoor(2026)}
      maandkostVoor={() => 700}
      besteljaar={2026}
      euro={euro}
      pct={pct}
      {...props}
    />,
  );
  return { ...resultaat, onKies };
}

describe("Wagenkiezer", () => {
  it("selecteert niets vooraf", () => {
    // Dit is de kern van de klacht: de oude simulator koos het eerste
    // catalogusmodel voor je, waardoor er niets te kiezen viel.
    const { container } = toon();
    expect(container.querySelectorAll('[data-selected="true"]')).toHaveLength(0);
    for (const knop of screen.getAllByRole("button", { pressed: false })) {
      expect(knop.getAttribute("aria-pressed")).toBe("false");
    }
  });

  it("toont standaard alleen de nagekeken modellen", () => {
    // Een raming hoort niet als vaststaand op het scherm te komen wanneer er een
    // fiscale berekening op gebouwd wordt.
    toon();
    const nagekeken = DEFAULT_CATALOGUS.filter((c) => c.zekerheid === "geverifieerd");
    expect(screen.getAllByRole("button", { pressed: false }).length).toBeLessThanOrEqual(
      nagekeken.length,
    );
    expect(screen.queryByText("Raming")).toBeNull();
  });

  it("zet de ramingen erbij met hun label", async () => {
    toon();
    await userEvent.click(screen.getByRole("checkbox"));
    expect(screen.getAllByText("Raming").length).toBeGreaterThan(0);
  });

  it("zoekt op merk, model en uitvoering", async () => {
    toon();
    await userEvent.click(screen.getByRole("checkbox"));
    await userEvent.type(screen.getByRole("searchbox"), "320d");
    expect(screen.getByText("BMW 320d")).toBeTruthy();
    expect(screen.queryByText("Tesla Model 3")).toBeNull();
  });

  it("meldt het netjes wanneer er niets overblijft", async () => {
    toon();
    await userEvent.type(screen.getByRole("searchbox"), "bestaatnietxyz");
    expect(screen.getByText("Geen model gevonden")).toBeTruthy();
  });

  it("geeft de gekozen wagen door aan de aanroeper", async () => {
    const { onKies } = toon();
    await userEvent.click(screen.getByRole("checkbox"));
    await userEvent.type(screen.getByRole("searchbox"), "320d");
    await userEvent.click(screen.getByRole("button", { name: /BMW 320d/ }));
    expect(onKies).toHaveBeenCalledWith("bmw-320d");
  });

  it("markeert de gekozen wagen", async () => {
    const { container } = toon({ gekozenSleutel: "tesla-model-3" });
    expect(container.querySelectorAll('[data-selected="true"]')).toHaveLength(1);
    expect(screen.getByText("Gekozen")).toBeTruthy();
  });

  it("laat de gekozen raming staan wanneer de schakelaar weer uit gaat", async () => {
    // Anders verdwijnt de wagen waarop de hele flow rekent zodra iemand die
    // schakelaar aanraakt.
    const raming = DEFAULT_CATALOGUS.find((c) => c.zekerheid !== "geverifieerd")!;
    const { container } = toon({ gekozenSleutel: raming.slug ?? String(raming.id) });
    expect(container.querySelectorAll('[data-selected="true"]')).toHaveLength(1);
  });

  it("zet de aftrek van het gekozen besteljaar op elke kaart", async () => {
    // Het cijfer waar het om gaat, al bij het kiezen: een verbrandingswagen
    // besteld in 2026 hoort die 0% te tonen vóór je drie stappen verder bent.
    toon({ besteljaar: 2026 });
    await userEvent.click(screen.getByRole("checkbox"));
    await userEvent.type(screen.getByRole("searchbox"), "320d");
    const kaart = screen.getByRole("button", { name: /BMW 320d/ });
    expect(kaart.textContent).toContain("Aftrek in 2026");
    expect(kaart.textContent).toContain("0%");
  });

  it("volgt het besteljaar in dat percentage", async () => {
    toon({ besteljaar: 2025, aftrekVoor: aftrekVoor(2025) });
    await userEvent.click(screen.getByRole("checkbox"));
    await userEvent.type(screen.getByRole("searchbox"), "320d");
    const kaart = screen.getByRole("button", { name: /BMW 320d/ });
    // 122 g diesel in het overgangsregime: 120 − 0,5 × 1 × 122 = 59%.
    expect(kaart.textContent).toContain("59%");
  });

  it("filtert op aandrijving", async () => {
    toon();
    await userEvent.click(screen.getByRole("button", { name: /^Diesel \/ benzine/ }));
    expect(screen.queryByText(model("tesla-model-3").model)).toBeNull();
  });
});
