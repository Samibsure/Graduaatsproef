import { laadCatalogus, bewaarWagen } from "./data";
import { catalogNaarWagen } from "./fiscaal/catalog";

/**
 * De drie modellen waarmee een nieuw bedrijf kan starten. Bewust gekozen zodat
 * de fiscale kloof meteen zichtbaar is: een BEV die zijn aftrek behoudt, een
 * plug-in hybride en een diesel die zijn aftrek de komende jaren verliest. Wie
 * de wizard doorloopt ziet daardoor op de vergelijkingspagina onmiddellijk waar
 * de tool voor dient, in plaats van een lege tabel.
 */
const START_MODELLEN = [
  { merk: "Tesla", model: "Model Y" },
  { merk: "BMW", model: "330e" },
  { merk: "BMW", model: "320d" },
];

/**
 * Zet de voorbeeldvloot klaar voor het huidige bedrijf. Het company_id komt uit
 * de kolomdefault in de database, dus dit werkt alleen voor wie is aangemeld.
 * Geeft het aantal effectief toegevoegde wagens terug.
 */
export async function maakVoorbeeldvloot(): Promise<number> {
  const catalogus = await laadCatalogus();

  const gekozen = START_MODELLEN.map(({ merk, model }) =>
    catalogus.find((c) => c.merk === merk && c.model === model),
  ).filter((c) => c !== undefined);

  // Valt een model weg uit de catalogus, dan vullen we aan met de populairste
  // modellen die nog niet gekozen zijn: de wizard mag daar niet op stuklopen.
  const aanvulling = catalogus
    .filter((c) => !gekozen.some((g) => g.id === c.id))
    .slice(0, START_MODELLEN.length - gekozen.length);

  const wagens = [...gekozen, ...aanvulling];
  for (const car of wagens) {
    await bewaarWagen(catalogNaarWagen(car));
  }
  return wagens.length;
}
