import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Stappenbalk from "./Stappenbalk";
import { rendermetIntl } from "@/test/render";

const stappen = ["Wagen", "Besteljaar", "Gebruik", "Onderneming", "Resultaat"];

describe("Stappenbalk", () => {
  it("toont elke stap met zijn naam", () => {
    rendermetIntl(<Stappenbalk stappen={stappen} huidige={1} label="Voortgang" />);
    for (const naam of stappen) {
      expect(screen.getByText(naam)).toBeTruthy();
    }
    expect(screen.getByRole("list", { name: "Voortgang" })).toBeTruthy();
  });

  it("markeert alleen de actieve stap voor een schermlezer", () => {
    const { container } = rendermetIntl(
      <Stappenbalk stappen={stappen} huidige={3} label="Voortgang" />,
    );
    const huidig = container.querySelectorAll('[aria-current="step"]');
    expect(huidig).toHaveLength(1);
    expect(huidig[0].textContent).toContain("Gebruik");
  });

  it("maakt zonder onGa geen enkele stap aanklikbaar", () => {
    rendermetIntl(<Stappenbalk stappen={stappen} huidige={4} label="Voortgang" />);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("maakt alleen de afgelegde stappen aanklikbaar", async () => {
    // Vooruitspringen mag niet: de volgende stap heeft de keuze van de vorige
    // nodig. Terugspringen wel, en dát maakt het een flow in plaats van een
    // trechter.
    const onGa = vi.fn();
    rendermetIntl(<Stappenbalk stappen={stappen} huidige={3} label="Voortgang" onGa={onGa} />);
    const knoppen = screen.getAllByRole("button");
    expect(knoppen.map((k) => k.textContent?.trim())).toEqual(["Wagen", "Besteljaar"]);

    await userEvent.click(knoppen[1]);
    expect(onGa).toHaveBeenCalledWith(2);
  });

  it("heeft op de eerste stap niets om naar terug te gaan", () => {
    const onGa = vi.fn();
    rendermetIntl(<Stappenbalk stappen={stappen} huidige={1} label="Voortgang" onGa={onGa} />);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});
