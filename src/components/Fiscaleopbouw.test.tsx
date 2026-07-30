import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import Fiscaleopbouw from "./Fiscaleopbouw";
import Kostenopbouwtabel from "./Kostenopbouwtabel";
import { rendermetIntl } from "@/test/render";
import { catalogPreview } from "@/lib/fiscaal/catalog";
import { catalogusPerSlug } from "@/lib/fiscaal/catalogusdata";
import { DEFAULT_CONTEXT } from "@/lib/fiscaal/defaults";
import { berekenJaar } from "@/lib/fiscaal/engine";
import { STANDAARD_GEBRUIK, berekenKosten } from "@/lib/fiscaal/kosten";

const euro = (n: number) => `€ ${Math.round(n)}`;
const pct = (n: number) => `${n}%`;

const diesel = catalogusPerSlug("bmw-320d")!;
const wagen = catalogPreview(diesel, 2026);
const resultaat = berekenJaar(DEFAULT_CONTEXT, wagen, 2026);

describe("Fiscaleopbouw", () => {
  it("toont de trap van autokost naar totale kost", () => {
    rendermetIntl(
      <Fiscaleopbouw
        jaar={2026}
        autokosten={wagen.jaarlijkse_autokosten}
        resultaat={resultaat}
        tariefPct={25}
        vuPct={40}
        euro={euro}
        pct={pct}
      />,
    );
    expect(screen.getByText("Autokosten")).toBeTruthy();
    expect(screen.getByText("Verworpen uitgaven")).toBeTruthy();
    expect(screen.getByText("Fiscale meerkost")).toBeTruthy();
    expect(screen.getByText("Totale kost in 2026")).toBeTruthy();
  });

  it("zet de percentages in de regels zelf en niet in een voetnoot", () => {
    rendermetIntl(
      <Fiscaleopbouw
        jaar={2026}
        autokosten={wagen.jaarlijkse_autokosten}
        resultaat={resultaat}
        tariefPct={25}
        vuPct={40}
        euro={euro}
        pct={pct}
      />,
    );
    // "Niet aftrekbaar deel" zegt niets; met het percentage erbij is het getal
    // herleidbaar.
    expect(screen.getByText(`Niet aftrekbaar deel, bij ${pct(resultaat.aftrekPct)} aftrek`)).toBeTruthy();
    expect(screen.getByText("Verworpen uitgave uit het voordeel, 40%")).toBeTruthy();
    expect(screen.getByText("Extra vennootschapsbelasting, 25%")).toBeTruthy();
  });

  it("laat de eigen bijdrage weg wanneer er geen is", () => {
    rendermetIntl(
      <Fiscaleopbouw
        jaar={2026}
        autokosten={wagen.jaarlijkse_autokosten}
        resultaat={resultaat}
        tariefPct={25}
        vuPct={40}
        euro={euro}
        pct={pct}
      />,
    );
    expect(screen.queryByText("Eigen bijdrage werknemer")).toBeNull();
  });

  it("toont de eigen bijdrage als vermindering wanneer ze er is", () => {
    const metBijdrage = berekenJaar(
      DEFAULT_CONTEXT,
      { ...wagen, eigen_bijdrage_maand: 100 },
      2026,
    );
    rendermetIntl(
      <Fiscaleopbouw
        jaar={2026}
        autokosten={wagen.jaarlijkse_autokosten}
        resultaat={metBijdrage}
        tariefPct={25}
        vuPct={40}
        euro={euro}
        pct={pct}
      />,
    );
    expect(screen.getByText("Eigen bijdrage werknemer")).toBeTruthy();
    // Een bedrag dat de kost verlaagt, hoort met een minteken te staan.
    expect(screen.getByText(euro(-1200))).toBeTruthy();
  });
});

describe("Kostenopbouwtabel", () => {
  const opbouw = berekenKosten(diesel, STANDAARD_GEBRUIK);

  it("toont de zes posten en het totaal", () => {
    rendermetIntl(<Kostenopbouwtabel opbouw={opbouw} voorbehoud={null} euro={euro} />);
    for (const naam of [
      "Energie",
      "Onderhoud",
      "Banden",
      "Verzekering",
      "Verkeersbelasting",
      "Afschrijving",
      "Totaal per jaar",
    ]) {
      expect(screen.getByText(naam)).toBeTruthy();
    }
    expect(screen.getByText(euro(opbouw.totaal))).toBeTruthy();
  });

  it("zwijgt over het voorbehoud wanneer er geen is", () => {
    rendermetIntl(<Kostenopbouwtabel opbouw={opbouw} voorbehoud={null} euro={euro} />);
    expect(screen.queryByText(/Voorbehoud bij de verkeersbelasting/)).toBeNull();
  });

  it("zet een betwist bedrag op het scherm in plaats van in een totaal", () => {
    rendermetIntl(
      <Kostenopbouwtabel opbouw={opbouw} voorbehoud="bevWallonieBrussel" euro={euro} />,
    );
    expect(screen.getByText(/Voorbehoud bij de verkeersbelasting/)).toBeTruthy();
    expect(screen.getByText(/de bronnen spreken elkaar tegen/)).toBeTruthy();
  });
});
