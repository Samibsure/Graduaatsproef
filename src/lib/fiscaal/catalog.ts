import { STANDAARD_GEBRUIK, berekenKosten, type Gebruiksprofiel } from "./kosten";
import type { CatalogCar, Vehicle } from "./types";

/**
 * Ruwe raming van de jaarlijkse autokosten uit alleen de cataloguswaarde.
 *
 * Dit is de terugval voor een model zonder specificaties, bijvoorbeeld een rij
 * die nog uit de databank komt. Weet de catalogus wél wat de wagen verbruikt,
 * hoeveel vermogen hij heeft en wat hij na vier jaar nog waard is, dan rekent
 * autokostenVoorModel() met kosten.ts en is deze vuistregel niet nodig.
 */
export function geschatteAutokosten(cataloguswaarde: number, voertuigtype: string): number {
  // BEV's hebben lagere energie- en onderhoudskosten dan verbrandingswagens.
  const factor = voertuigtype === "BEV" ? 0.17 : voertuigtype === "fossiel" ? 0.21 : 0.19;
  return Math.round((cataloguswaarde * factor) / 50) * 50;
}

/** Heeft dit model genoeg specificaties om de kosten echt te berekenen? */
export function heeftSpecificaties(car: CatalogCar): boolean {
  return (
    typeof car.verbruik === "number" &&
    typeof car.vermogen_kw === "number" &&
    typeof car.restwaarde_pct_4j === "number"
  );
}

/**
 * De jaarlijkse autokosten van een catalogusmodel: berekend wanneer het kan,
 * geraamd wanneer het moet.
 */
export function autokostenVoorModel(
  car: CatalogCar,
  gebruik: Gebruiksprofiel = STANDAARD_GEBRUIK,
): number {
  if (!heeftSpecificaties(car)) {
    return geschatteAutokosten(car.cataloguswaarde, car.voertuigtype);
  }
  return berekenKosten(car, gebruik).totaal;
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
    jaarlijkse_autokosten: autokostenVoorModel(car),
    aankoopprijs: car.cataloguswaarde,
    tankkaart: true,
    beroepsgebruik_pct: 100,
    thuislaadpunt: car.voertuigtype === "BEV",
    km_per_jaar: STANDAARD_GEBRUIK.km_per_jaar,
    // Afgeleid uit de specificaties wanneer die er zijn; anders de oude vaste
    // waarden, zodat een model zonder gegevens niet zomaar hoger of lager scoort.
    flex_score: flexScore(car),
    restwaarde_score: restwaardeScore(car),
  };
}

/**
 * Operationele flexibiliteit, van 1 tot 10.
 *
 * Dit was een getal dat de gebruiker zelf moest intikken: "actieradius,
 * oplaadtijd en laadnetwerk, handmatige score per wagen". Wie tien kandidaten
 * vergelijkt, gokt dus tien keer. Met de actieradius en het laadvermogen in de
 * catalogus is het gewoon af te leiden.
 *
 * Een verbrandingswagen krijgt een hoge basisscore: tanken duurt vijf minuten en
 * kan overal. Een elektrische wagen klimt naar diezelfde hoogte naarmate zijn
 * bereik en zijn laadvermogen dat verschil kleiner maken.
 */
export function flexScore(car: CatalogCar): number {
  if (car.voertuigtype === "fossiel" || car.voertuigtype === "HEV") return 9;

  const radius = car.actieradius_km ?? null;
  const dc = car.laadvermogen_dc_kw ?? null;
  if (radius === null) return car.voertuigtype === "PHEV" ? 8 : 7;

  if (car.voertuigtype === "PHEV") {
    // Een plug-in tankt ook gewoon: het elektrische bereik is meegenomen, niet
    // beperkend. Meer bereik betekent vaker zonder tankbeurt.
    return klem(7.5 + radius / 60);
  }

  // 500 km bereik levert het grootste deel van de score; snelladen doet de rest.
  const bereikDeel = Math.min(5.5, (radius / 500) * 5.5);
  const laadDeel = dc === null ? 1 : Math.min(3.5, (dc / 250) * 3.5);
  return klem(1 + bereikDeel + laadDeel);
}

/** Restwaardescore uit het verwachte waardebehoud na vier jaar. */
export function restwaardeScore(car: CatalogCar): number {
  const pct = car.restwaarde_pct_4j;
  if (pct === null || pct === undefined) return car.voertuigtype === "BEV" ? 6 : 5;
  // 30% restwaarde is zwak, 55% is uitstekend; daartussen lineair.
  return klem(1 + ((pct - 30) / 25) * 9);
}

/**
 * Praktisch nut, van 1 tot 10: kan deze wagen de job doen?
 *
 * De zes criteria van de scoringsmatrix gaan bijna allemaal over geld en
 * fiscaliteit. Daardoor wint een kleine elektrische hatchback het van een break
 * of een zevenzitter op criteria die niets zeggen over de vraag of het gerief er
 * in past en of hij de aanhangwagen trekt. Dit criterium weegt dat mee.
 */
export function nutScore(car: CatalogCar): number {
  const koffer = car.koffer_liter ?? 400;
  const zit = car.zitplaatsen ?? 5;
  const trek = car.trekgewicht_kg ?? 0;

  // 250 l is krap, 750 l is ruim.
  const kofferDeel = Math.min(4.5, Math.max(0, (koffer - 250) / 500) * 4.5);
  const zitDeel = zit >= 7 ? 2 : zit >= 5 ? 1.2 : 0.4;
  const trekDeel = trek >= 2000 ? 2.5 : trek >= 1200 ? 1.8 : trek >= 750 ? 1 : 0;
  const trekhaak = (car.uitrusting ?? []).includes("trekhaak") ? 0.5 : 0;

  return klem(1 + kofferDeel + zitDeel + trekDeel + trekhaak);
}

const klem = (x: number) => Math.min(10, Math.max(1, Math.round(x * 10) / 10));

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
