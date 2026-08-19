import { describe, expect, it } from "vitest";
import { ROLLEN, magBeheren, magSchrijven, minstensRol, type Bedrijfsrol, type Sessie } from "./rollen";

/**
 * Deze drie functies bepalen wat een lezer, lid, fiscalist of beheerder in de
 * interface te zien krijgt. Ze hadden geen enkele test, terwijl zes pagina's
 * erop leunen om schrijfknoppen te verbergen.
 *
 * Ze zijn niet de beveiligingsgrens -- dat zijn de RLS-policies -- maar wel het
 * verschil tussen "die knop staat er niet" en "die knop faalt met een rauwe
 * databankfout".
 */
function sessie(rol: Bedrijfsrol): Sessie {
  return {
    gebruikerId: "u",
    email: "u@x.be",
    volledigeNaam: null,
    rol,
    isPlatformAdmin: false,
    bedrijf: {} as Sessie["bedrijf"],
  };
}

describe("magSchrijven", () => {
  it("laat niemand schrijven zonder sessie", () => {
    expect(magSchrijven(null)).toBe(false);
  });

  it("sluit de lezer uit en laat de rest door", () => {
    expect(magSchrijven(sessie("lezer"))).toBe(false);
    expect(magSchrijven(sessie("lid"))).toBe(true);
    expect(magSchrijven(sessie("fiscalist"))).toBe(true);
    expect(magSchrijven(sessie("beheerder"))).toBe(true);
  });
});

describe("magBeheren", () => {
  it("laat alleen de beheerder door", () => {
    expect(magBeheren(null)).toBe(false);
    expect(magBeheren(sessie("lezer"))).toBe(false);
    expect(magBeheren(sessie("lid"))).toBe(false);
    expect(magBeheren(sessie("fiscalist"))).toBe(false);
    expect(magBeheren(sessie("beheerder"))).toBe(true);
  });
});

describe("minstensRol", () => {
  it("is waar voor de rol zelf en voor alles erboven", () => {
    for (const drempel of ROLLEN) {
      for (const rol of ROLLEN) {
        const verwacht = ROLLEN.indexOf(rol) >= ROLLEN.indexOf(drempel);
        expect(minstensRol(rol, drempel)).toBe(verwacht);
      }
    }
  });

  it("legt de volgorde vast waarop de rest steunt", () => {
    // De volgorde van ROLLEN is betekenisvol; hem wijzigen verschuift stil de
    // rechten van iedereen.
    expect([...ROLLEN]).toEqual(["lezer", "lid", "fiscalist", "beheerder"]);
    expect(minstensRol("lid", "beheerder")).toBe(false);
    expect(minstensRol("beheerder", "lezer")).toBe(true);
  });
});
