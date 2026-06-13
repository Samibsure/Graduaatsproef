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
    omschrijving: `${car.merk} ${car.model}`,
    werknemer: null,
    kenteken: null,
    categorie: "kandidaat",
    merk: car.merk,
    model: car.model,
    catalog_id: car.id,
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
  return { id: `catalog-${car.id}`, ...catalogNaarWagen(car, jaar) };
}
