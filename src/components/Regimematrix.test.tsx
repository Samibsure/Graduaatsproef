import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Regimematrix from "./Regimematrix";
import { DEFAULT_CONTEXT } from "@/lib/fiscaal/defaults";
import { regimebanden } from "@/lib/fiscaal/regimes";
import { datum, pct } from "@/lib/format";
import { rendermetIntl } from "@/test/render";

/**
 * De vier kaarten die deze component vervangt, beweerden "50 tot 100%", "Daalt
 * naar 0%", "0% of 100%" en "95% tot 67,5%". Deze test controleert dat wat er nu
 * staat de aftrekkalender volgt en dat de twee assen gescheiden blijven.
 */

const opmaak = { pct, datum };

function toon(vandaag = "2026-07-30", vouwVanaf?: string) {
  return rendermetIntl(
    <Regimematrix
      banden={regimebanden(DEFAULT_CONTEXT, vandaag)}
      formatters={opmaak}
      vouwVanaf={vouwVanaf}
    />,
  );
}

describe("Regimematrix", () => {
  it("noemt de exacte datumgrenzen in plaats van 'in 2023 tot 2025'", () => {
    toon();
    // De oude kaart zei "Besteld in 2023 tot 2025" en verzweeg dat de grens
    // midden in 2023 ligt.
    expect(screen.getByText(/1 juli 2023 tot en met 31 december 2025/)).toBeTruthy();
    expect(screen.getByText(/tot en met 30 juni 2023/)).toBeTruthy();
  });

  it("scheidt elektrisch en verbranding in twee benoemde kolommen", () => {
    toon();
    // "0% of 100%" las als een muntworp. Nu staat per periode welke aandrijving
    // welk percentage geeft, dus beide labels komen even vaak voor als er banden zijn.
    const banden = regimebanden(DEFAULT_CONTEXT, "2026-07-30");
    expect(screen.getAllByText("Volledig elektrisch")).toHaveLength(banden.length);
    expect(screen.getAllByText("Benzine, diesel of hybride")).toHaveLength(banden.length);
  });

  it("zegt bij het overgangsregime dat de ladder een plafond is", () => {
    toon();
    expect(screen.getByText("Hoogstens")).toBeTruthy();
    expect(screen.getByText(/Dit is een plafond, niet het percentage/)).toBeTruthy();
    // De jaartrappen staan er met hun gebruiksjaar erbij.
    for (const jaar of ["2025", "2026", "2027", "2028"]) {
      expect(screen.getByText(jaar)).toBeTruthy();
    }
  });

  it("noemt bij de oudste periode de aftopping van 40%", () => {
    toon();
    // "50 tot 100%" liet die aftopping weg, en dat was de fout in die kaart.
    expect(screen.getByText(/Afgetopt op 40% vanaf 200 g\/km/)).toBeTruthy();
    expect(screen.getByText("50% tot 100%")).toBeTruthy();
  });

  it("markeert precies één band als de band van vandaag", () => {
    toon("2026-07-30");
    expect(screen.getAllByText("Geldt vandaag")).toHaveLength(1);
  });

  it("vouwt de latere besteljaren samen achter een details", () => {
    toon("2026-07-30", "2027");
    // Elektrisch zakt van 95% naar 67,5% over de ingeklapte besteljaren.
    expect(screen.getByText(/Later besteld: elektrisch zakt van 95% naar 67,5%/)).toBeTruthy();
  });

  it("houdt de band van vandaag open in plaats van hem in te vouwen", () => {
    // Vouwen vanaf een periode die vandaag geldt, zou juist de rij verbergen
    // waarvoor de bezoeker de tabel opent.
    toon("2028-03-01", "2027");
    expect(screen.queryByText(/Later besteld/)).toBeNull();
    expect(screen.getAllByText("Geldt vandaag")).toHaveLength(1);
  });
});
