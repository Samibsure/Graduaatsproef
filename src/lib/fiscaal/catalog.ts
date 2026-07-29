import type { CatalogCar, Vehicle } from "./types";

/**
 * Indicatieve raming van de jaarlijkse autokosten (leasing/afschrijving, energie,
 * onderhoud, verzekering en taks) op basis van de cataloguswaarde. Dient enkel als
 * vertrekpunt voor de catalogus-preview en bij snel toevoegen; de gebruiker past de
 * werkelijke kosten per offerte aan.
 */
export function geschatteAutokosten(cataloguswaarde: number, voertuigtype: string): number {
  // BEV's hebben lagere energie- en onderhoudskosten dan verbrandingswagens.
  const factor = voertuigtype === "BEV" ? 0.17 : voertuigtype === "fossiel" ? 0.21 : 0.19;
  return Math.round((cataloguswaarde * factor) / 50) * 50;
}

/**
 * Zet een catalogusmodel om naar een (niet-bewaard) Vehicle met realistische
 * standaardwaarden, zodat de rekenkern er meteen op kan werken.
 */
export function catalogNaarWagen(car: CatalogCar, jaar = 2026): Omit<Vehicle, "id"> {
  return {
    omschrijving: car.uitvoering
      ? `${car.merk} ${car.model} ${car.uitvoering}`
      : `${car.merk} ${car.model}`,
    werknemer: null,
    kenteken: null,
    categorie: "kandidaat",
    merk: car.merk,
    model: car.model,
    // Bewust null voor een model uit de ingebouwde catalogus. De kolom
    // vehicles.catalog_id verwijst naar de tabel car_catalog, die nog maar
    // vijfentwintig rijen telt; een volgnummer uit de broncode wegschrijven
    // zou die vreemde sleutel schenden. Terugvinden gebeurt op merk en model.
    catalog_id: car.slug ? null : car.id,
    voertuigtype: car.voertuigtype,
    brandstof: car.brandstof,
    besteldatum: `${jaar}-01-15`,
    eerste_ingebruikname: `${jaar}-03-01`,
    co2: car.co2,
    cataloguswaarde: car.cataloguswaarde,
    jaarlijkse_autokosten: geschatteAutokosten(car.cataloguswaarde, car.voertuigtype),
    aankoopprijs: car.cataloguswaarde,
    tankkaart: true,
    beroepsgebruik_pct: 100,
    thuislaadpunt: car.voertuigtype === "BEV",
    km_per_jaar: 25000,
    flex_score: car.voertuigtype === "BEV" ? 7 : 8,
    restwaarde_score: car.voertuigtype === "BEV" ? 6 : 5,
  };
}

/** Volledig Vehicle-object met tijdelijk id, handig voor preview-berekeningen. */
export function catalogPreview(car: CatalogCar, jaar = 2026): Vehicle {
  return { id: `catalog-${car.slug ?? car.id}`, ...catalogNaarWagen(car, jaar) };
}

/**
 * Zoekt het catalogusmodel dat bij een bewaarde wagen hoort, voor de foto en de
 * specificaties.
 *
 * Merk en model gaan voor op `catalog_id`. Dat volgnummer verwees naar de tabel
 * car_catalog, die maar vijfentwintig rijen telde; wagens die daarvoor bewaard
 * zijn, dragen een nummer dat nu naar een ander model zou wijzen. Merk en model
 * staan wél in de wagen zelf en blijven kloppen.
 */
export function zoekCatalogusmodel(
  catalogus: CatalogCar[],
  wagen: Pick<Vehicle, "merk" | "model" | "catalog_id">,
): CatalogCar | null {
  const merk = wagen.merk?.trim().toLowerCase();
  const model = wagen.model?.trim().toLowerCase();

  if (merk && model) {
    const opNaam = catalogus.find(
      (c) => c.merk.toLowerCase() === merk && c.model.toLowerCase() === model,
    );
    if (opNaam) return opNaam;
  }

  if (wagen.catalog_id !== null) {
    // Alleen aanvaarden wanneer ook het merk klopt: een oud volgnummer dat
    // toevallig bestaat, mag geen foto van een vreemde wagen opleveren.
    const opId = catalogus.find((c) => c.id === wagen.catalog_id);
    if (opId && (!merk || opId.merk.toLowerCase() === merk)) return opId;
  }

  return null;
}
