import { restwaardeVoor } from "./kosten";
import type {
  Aandrijving,
  Brandstof,
  Carrosserie,
  CatalogCar,
  Onderhoudsklasse,
  Voertuigtype,
  Modelzekerheid,
} from "./types";

/**
 * De ingebouwde wagencatalogus.
 *
 * Waarom in de broncode en niet in de databank? De 25 modellen die er voordien
 * waren, bestonden uitsluitend als rijen in het productieproject: niet in deze
 * repository, niet in een migratie, niet in de git-geschiedenis. Uitbreiden ging
 * alleen door met de hand rijen te typen in de Table Editor, een fout was niet
 * terug te draaien, en viel de databank weg dan viel de hele catalogus weg. De
 * fiscale parameters staan al sinds het begin als DEFAULT_CONTEXT in defaults.ts;
 * dit is dezelfde keuze voor dezelfde reden.
 *
 * ## Wat hier vaststaat en wat berekend wordt
 *
 * De cijfers hieronder zijn **opgezochte** gegevens per model en modeljaar:
 * cataloguswaarde, CO₂ (WLTP), verbruik, batterij, actieradius, koffervolume en
 * trekgewicht. Ze komen uit publieke fabrikants- en WLTP-gegevens voor de
 * Belgische markt. Ze zijn richtinggevend, niet contractueel: uitrusting, opties
 * en bandenmaat verschuiven de cataloguswaarde en de CO₂, en prijzen wijzigen.
 * Controleer voor een echte beslissing altijd de offerte.
 *
 * Alles wat daaruit **volgt**, rekent de applicatie zelf uit: energie, onderhoud,
 * verzekering, verkeersbelasting, afschrijving (kosten.ts), en daarbovenop het
 * voordeel van alle aard, de verworpen uitgaven, de RSZ-bijdrage en de TCO
 * (engine.ts). Er staat dus nergens een ingetypte kostprijs.
 *
 * ## Geverifieerd of raming
 *
 * Van deze lijst zijn negen modellen tegen een genoemde bron gelegd; de rest niet.
 * Dat verschil staat per model in `zekerheid`, en de catalogus toont standaard
 * alleen de geverifieerde. De ramingen blijven hier staan in plaats van geschrapt
 * te worden: ze hebben de goede orde van grootte, en promoveren is straks één
 * woord per regel in plaats van alle cijfers opnieuw intikken.
 *
 * Waar de bron een vork geeft, neemt dit bestand de **hoogste** waarde. Een hoger
 * CO₂-cijfer betekent een hoger VAA, een hogere RSZ-bijdrage en een grotere kans
 * dat de valse-hybridetoets kantelt: wie zich vergist, hoort zich naar de veilige
 * kant te vergissen.
 *
 * ## Wat er bewust niet in staat
 *
 * Lichte vracht. Een bestelwagen die als lichte vracht is ingeschreven, valt
 * buiten de aftrekbeperking van artikel 66 WIB92: de rekenkern hier zou er een
 * percentage op plakken dat niet geldt. Zolang die uitzondering niet in de
 * rekenkern zit, hoort een bestelwagen niet in deze lijst.
 *
 * Een correctie is één regel in dit bestand, en catalogusdata.test.ts bewaakt de
 * interne samenhang (unieke sleutels, CO₂ die bij het voertuigtype past, waarden
 * binnen de grenzen van wagenSchema).
 */

const RAMING = "Fabrikantopgave WLTP, Belgische prijslijst — raming, niet nagekeken";

interface Gedeeld {
  slug: string;
  merk: string;
  model: string;
  uitv?: string;
  carrosserie: Carrosserie;
  segment: string;
  jaar?: number;
  tot?: number;
  kw: number;
  prijs: number;
  koffer: number;
  zit?: number;
  trek?: number;
  aandr?: Aandrijving;
  extra?: string[];
  foto?: string;
  /** Gezet zodra een genoemde bron de fiscaal beslissende velden dekt. */
  bron?: string;
  /**
   * Bron voor een déél van de specificaties, zonder dat het model daarmee
   * geverifieerd is. Een batterij en een actieradius uit de Belgische
   * fabrikantssite zijn winst, maar bij een elektrische wagen hangt de hele
   * fiscale berekening aan de cataloguswaarde: is die niet nagekeken, dan is het
   * model dat ook niet.
   */
  bronDeels?: string;
  /** Sleutel onder `catalogus.voorbehoud_*` in messages/*.json. */
  voorbehoud?: string;
}

let volgnummer = 0;

function basis(
  g: Gedeeld,
  onderhoud: Onderhoudsklasse,
  voertuigtype: Voertuigtype,
  brandstof: Brandstof,
): Omit<CatalogCar, "voertuigtype" | "brandstof" | "co2"> {
  volgnummer += 1;
  const zekerheid: Modelzekerheid = g.bron ? "geverifieerd" : "raming";
  return {
    id: volgnummer,
    slug: g.slug,
    merk: g.merk,
    model: g.model,
    uitvoering: g.uitv ?? null,
    carrosserie: g.carrosserie,
    segment: g.segment,
    modeljaar: g.jaar ?? 2026,
    modeljaar_tot: g.tot ?? null,
    bron: g.bron ?? g.bronDeels ?? RAMING,
    zekerheid,
    voorbehoud: g.voorbehoud ?? null,
    aandrijving: g.aandr ?? "voor",
    vermogen_kw: g.kw,
    cataloguswaarde: g.prijs,
    zitplaatsen: g.zit ?? 5,
    koffer_liter: g.koffer,
    trekgewicht_kg: g.trek ?? 0,
    restwaarde_pct_4j: restwaardeVoor(voertuigtype, brandstof),
    onderhoudsklasse: onderhoud,
    uitrusting: g.extra ?? [],
    populariteit_rang: volgnummer,
    opmerking: null,
    image_url: g.foto ?? null,
    batterij_kwh: null,
    actieradius_km: null,
    laadvermogen_dc_kw: null,
    verbruik: null,
  };
}

/** Volledig elektrisch: geen uitstoot, verbruik in kWh/100 km. */
function bev(g: Gedeeld & { kwh: number; radius: number; dc: number; verbruik: number }): CatalogCar {
  return {
    ...basis(g, "laag", "BEV", "elektrisch"),
    voertuigtype: "BEV",
    brandstof: "elektrisch",
    co2: 0,
    batterij_kwh: g.kwh,
    actieradius_km: g.radius,
    laadvermogen_dc_kw: g.dc,
    verbruik: g.verbruik,
  };
}

/** Plug-in hybride: uitstoot en brandstofverbruik, plus een elektrisch bereik. */
function phev(
  g: Gedeeld & {
    co2: number;
    verbruik: number;
    kwh: number;
    radius: number;
    dc?: number;
    brandstof?: "benzine" | "diesel";
  },
): CatalogCar {
  return {
    ...basis(g, "midden", "PHEV", g.brandstof ?? "benzine"),
    voertuigtype: "PHEV",
    brandstof: g.brandstof ?? "benzine",
    co2: g.co2,
    batterij_kwh: g.kwh,
    actieradius_km: g.radius,
    laadvermogen_dc_kw: g.dc ?? null,
    verbruik: g.verbruik,
  };
}

/** Zelfopladende hybride: geen stekker, dus geen actieradius en geen laadvermogen. */
function hev(g: Gedeeld & { co2: number; verbruik: number }): CatalogCar {
  return {
    ...basis(g, "midden", "HEV", "benzine"),
    voertuigtype: "HEV",
    brandstof: "benzine",
    co2: g.co2,
    verbruik: g.verbruik,
  };
}

/** Enkel verbranding. */
function fossiel(
  g: Gedeeld & { co2: number; verbruik: number; brandstof: "diesel" | "benzine"; zwaar?: boolean },
): CatalogCar {
  return {
    ...basis(g, g.zwaar ? "hoog" : "midden", "fossiel", g.brandstof),
    voertuigtype: "fossiel",
    brandstof: g.brandstof,
    co2: g.co2,
    verbruik: g.verbruik,
  };
}

/* ------------------------------------------------------------------ elektrisch */

const ELEKTRISCH: CatalogCar[] = [
  bev({ slug: "tesla-model-y", merk: "Tesla", model: "Model Y", uitv: "Long Range AWD", carrosserie: "suv", segment: "SUV middenklasse", kw: 274, prijs: 53990, kwh: 75, radius: 629, dc: 250, verbruik: 15.9, koffer: 854, trek: 1600, aandr: "vierwiel", extra: ["warmtepomp", "trekhaak", "adaptieve cruise"], foto: "/cars/tesla-model-y.jpg", bron: "autogids.be 2026 (prijs, CO₂, vermogen); ev-database.org (bruikbare batterij)", voorbehoud: "teslaModelY" }),
  bev({ slug: "tesla-model-3", merk: "Tesla", model: "Model 3", uitv: "Long Range RWD", carrosserie: "berline", segment: "Berline middenklasse", kw: 209, prijs: 44990, kwh: 75, radius: 702, dc: 250, verbruik: 12.5, koffer: 594, trek: 1000, aandr: "achter", extra: ["warmtepomp", "adaptieve cruise"], foto: "/cars/tesla-model-3.jpg" }),
  bev({ slug: "kia-ev3", merk: "Kia", model: "EV3", uitv: "Long Range", carrosserie: "suv", segment: "SUV compact", kw: 150, prijs: 42290, kwh: 81.4, radius: 600, dc: 128, verbruik: 14.9, koffer: 460, trek: 1000, extra: ["warmtepomp", "V2L"], foto: "/cars/kia-ev3.jpg", bronDeels: "kia.com/be (netto batterij, actieradius); prijs niet gesourcet", voorbehoud: "prijsNietGesourcet" }),
  bev({ slug: "skoda-elroq", merk: "Škoda", model: "Elroq", uitv: "85", carrosserie: "suv", segment: "SUV compact", kw: 210, prijs: 44490, kwh: 77, radius: 581, dc: 175, verbruik: 15.1, koffer: 470, trek: 1200, aandr: "achter", extra: ["warmtepomp", "trekhaak"], foto: "/cars/skoda-elroq.jpg" }),
  bev({ slug: "bmw-ix1", merk: "BMW", model: "iX1", uitv: "eDrive20", carrosserie: "suv", segment: "SUV compact premium", kw: 150, prijs: 48950, kwh: 64, radius: 474, dc: 130, verbruik: 15.5, koffer: 490, trek: 1200, extra: ["warmtepomp", "adaptieve cruise"], foto: "/cars/bmw-ix1.jpg", voorbehoud: "bmwIx1Uitvoering" }),
  bev({ slug: "skoda-enyaq", merk: "Škoda", model: "Enyaq", uitv: "85", carrosserie: "suv", segment: "SUV middenklasse", kw: 210, prijs: 48690, kwh: 77, radius: 581, dc: 175, verbruik: 15.4, koffer: 585, trek: 1400, aandr: "achter", extra: ["warmtepomp", "trekhaak"], foto: "/cars/skoda-enyaq.jpg" }),
  bev({ slug: "volvo-ex30", merk: "Volvo", model: "EX30", uitv: "Extended Range", carrosserie: "suv", segment: "SUV compact premium", kw: 200, prijs: 41990, kwh: 64, radius: 476, dc: 153, verbruik: 15.0, koffer: 318, trek: 1600, aandr: "achter", extra: ["warmtepomp", "trekhaak"], foto: "/cars/volvo-ex30.jpg" }),
  bev({ slug: "audi-q4-etron", merk: "Audi", model: "Q4 e-tron", uitv: "45", carrosserie: "suv", segment: "SUV middenklasse premium", kw: 210, prijs: 57900, kwh: 77, radius: 562, dc: 175, verbruik: 15.8, koffer: 520, trek: 1200, aandr: "achter", extra: ["warmtepomp", "trekhaak", "matrix-led"], foto: "/cars/audi-q4-etron.jpg", bron: "autogids.be 2026 (prijs 82 kWh SUV); audi.be (CO₂); ev-database.org (bruikbare batterij)", voorbehoud: "audiQ4Facelift" }),
  bev({ slug: "vw-id4", merk: "Volkswagen", model: "ID.4", uitv: "Pro", carrosserie: "suv", segment: "SUV middenklasse", kw: 210, prijs: 47990, kwh: 77, radius: 573, dc: 175, verbruik: 15.6, koffer: 543, trek: 1200, aandr: "achter", extra: ["warmtepomp", "trekhaak"], foto: "/cars/vw-id4.jpg" }),
  bev({ slug: "vw-id3", merk: "Volkswagen", model: "ID.3", uitv: "Pro S", carrosserie: "hatchback", segment: "Compacte hatchback", kw: 170, prijs: 42990, kwh: 77, radius: 559, dc: 175, verbruik: 15.0, koffer: 385, trek: 0, aandr: "achter", extra: ["warmtepomp"], foto: "/cars/vw-id3.jpg" }),
  bev({ slug: "kia-ev6", merk: "Kia", model: "EV6", uitv: "Long Range RWD", carrosserie: "suv", segment: "SUV middenklasse", kw: 168, prijs: 49990, kwh: 84, radius: 582, dc: 258, verbruik: 15.7, koffer: 490, trek: 1600, aandr: "achter", extra: ["warmtepomp", "V2L", "800V-architectuur"], foto: "/cars/kia-ev6.jpg" }),
  bev({ slug: "volvo-ex40", merk: "Volvo", model: "EX40", uitv: "Extended Range", carrosserie: "suv", segment: "SUV compact premium", kw: 185, prijs: 49900, kwh: 79, radius: 573, dc: 200, verbruik: 15.9, koffer: 419, trek: 1800, aandr: "achter", extra: ["warmtepomp", "trekhaak"], foto: "/cars/volvo-ex40.jpg" }),
  bev({ slug: "hyundai-kona-electric", merk: "Hyundai", model: "Kona Electric", uitv: "65 kWh", carrosserie: "suv", segment: "SUV compact", kw: 160, prijs: 41490, kwh: 65, radius: 514, dc: 102, verbruik: 14.7, koffer: 466, trek: 750, extra: ["warmtepomp", "V2L"], foto: "/cars/hyundai-kona-electric.jpg" }),
  bev({ slug: "renault-megane-etech", merk: "Renault", model: "Mégane E-Tech", uitv: "EV60", carrosserie: "hatchback", segment: "Compacte hatchback", kw: 160, prijs: 39990, kwh: 60, radius: 470, dc: 130, verbruik: 15.2, koffer: 440, trek: 900, extra: ["warmtepomp"], foto: "/cars/renault-megane-etech.jpg" }),
  bev({ slug: "cupra-born", merk: "Cupra", model: "Born", uitv: "58 kWh", carrosserie: "hatchback", segment: "Compacte hatchback", kw: 170, prijs: 40990, kwh: 58, radius: 425, dc: 165, verbruik: 15.3, koffer: 385, trek: 0, aandr: "achter", extra: ["warmtepomp"], foto: "/cars/cupra-born.jpg" }),
  bev({ slug: "mercedes-eqa", merk: "Mercedes-Benz", model: "EQA", uitv: "250+", carrosserie: "suv", segment: "SUV compact premium", kw: 140, prijs: 52400, kwh: 71, radius: 560, dc: 112, verbruik: 15.1, koffer: 340, trek: 750, extra: ["warmtepomp"], foto: "/cars/mercedes-eqa.jpg" }),
  bev({ slug: "peugeot-e3008", merk: "Peugeot", model: "e-3008", uitv: "73 kWh", carrosserie: "suv", segment: "SUV middenklasse", kw: 157, prijs: 46850, kwh: 73, radius: 527, dc: 160, verbruik: 15.9, koffer: 520, trek: 1250, extra: ["warmtepomp", "trekhaak"], foto: "/cars/peugeot-e3008.jpg" }),
  bev({ slug: "bmw-i4", merk: "BMW", model: "i4", uitv: "eDrive40", carrosserie: "berline", segment: "Berline premium", kw: 250, prijs: 60800, kwh: 81, radius: 590, dc: 205, verbruik: 15.5, koffer: 470, trek: 1600, aandr: "achter", extra: ["warmtepomp", "adaptieve cruise", "trekhaak"], foto: "/cars/bmw-i4.jpg", bron: "bmw.be fiscale prijslijst (excl. btw €50.247,93); CO₂ bmw.be", voorbehoud: "bmwI4Btw" }),
  bev({ slug: "polestar-2", merk: "Polestar", model: "2", uitv: "Long Range Single Motor", carrosserie: "berline", segment: "Berline middenklasse", kw: 220, prijs: 51500, kwh: 79, radius: 655, dc: 205, verbruik: 14.5, koffer: 405, trek: 1500, aandr: "achter", extra: ["warmtepomp", "trekhaak"], foto: "/cars/polestar-2.jpg" }),
  bev({ slug: "vw-id7", merk: "Volkswagen", model: "ID.7", uitv: "Pro S", carrosserie: "berline", segment: "Berline hogere middenklasse", kw: 210, prijs: 57990, kwh: 86, radius: 702, dc: 200, verbruik: 13.9, koffer: 532, trek: 1200, aandr: "achter", extra: ["warmtepomp", "trekhaak", "matrix-led"], bronDeels: "volkswagen.be (CO₂); ev-database.org (bruikbare batterij 86 van 91 kWh bruto); prijs niet gesourcet", voorbehoud: "prijsNietGesourcet", foto: "/cars/vw-id7.jpg" }),
  bev({ slug: "vw-id7-tourer", merk: "Volkswagen", model: "ID.7 Tourer", uitv: "Pro S", carrosserie: "break", segment: "Break hogere middenklasse", kw: 210, prijs: 60490, kwh: 86, radius: 685, dc: 200, verbruik: 14.3, koffer: 605, trek: 1200, aandr: "achter", extra: ["warmtepomp", "trekhaak"], foto: "/cars/vw-id7-tourer.jpg" }),
  bev({ slug: "vw-id5", merk: "Volkswagen", model: "ID.5", uitv: "Pro", carrosserie: "suv", segment: "SUV coupé middenklasse", kw: 210, prijs: 51490, kwh: 77, radius: 566, dc: 175, verbruik: 15.4, koffer: 549, trek: 1200, aandr: "achter", extra: ["warmtepomp"], foto: "/cars/vw-id5.jpg" }),
  bev({ slug: "vw-id-buzz", merk: "Volkswagen", model: "ID. Buzz", uitv: "Pro", carrosserie: "mpv", segment: "Ruimtewagen", kw: 210, prijs: 58990, kwh: 79, radius: 461, dc: 185, verbruik: 19.8, koffer: 1121, zit: 5, trek: 1000, aandr: "achter", extra: ["warmtepomp", "trekhaak", "schuifdeuren"], foto: "/cars/vw-id-buzz.jpg" }),
  bev({ slug: "skoda-enyaq-coupe", merk: "Škoda", model: "Enyaq Coupé", uitv: "85", carrosserie: "suv", segment: "SUV coupé middenklasse", kw: 210, prijs: 50990, kwh: 77, radius: 591, dc: 175, verbruik: 15.1, koffer: 570, trek: 1400, aandr: "achter", extra: ["warmtepomp", "trekhaak"], foto: "/cars/skoda-enyaq-coupe.jpg" }),
  bev({ slug: "audi-q6-etron", merk: "Audi", model: "Q6 e-tron", uitv: "quattro", carrosserie: "suv", segment: "SUV hogere middenklasse premium", kw: 285, prijs: 74900, kwh: 94, radius: 625, dc: 270, verbruik: 17.0, koffer: 526, trek: 2400, aandr: "vierwiel", extra: ["warmtepomp", "trekhaak", "matrix-led", "luchtvering"], foto: "/cars/audi-q6-etron.jpg" }),
  bev({ slug: "audi-a6-etron", merk: "Audi", model: "A6 e-tron", uitv: "performance", carrosserie: "berline", segment: "Berline hogere middenklasse premium", kw: 270, prijs: 72900, kwh: 94, radius: 756, dc: 270, verbruik: 14.0, koffer: 502, trek: 1200, aandr: "achter", extra: ["warmtepomp", "matrix-led"], foto: "/cars/audi-a6-etron.jpg" }),
  bev({ slug: "audi-q8-etron", merk: "Audi", model: "Q8 e-tron", uitv: "55 quattro", carrosserie: "suv", segment: "Grote SUV premium", kw: 300, prijs: 85900, kwh: 106, radius: 582, dc: 170, verbruik: 20.8, koffer: 569, trek: 1800, aandr: "vierwiel", extra: ["warmtepomp", "trekhaak", "luchtvering"], foto: "/cars/audi-q8-etron.jpg" }),
  bev({ slug: "cupra-tavascan", merk: "Cupra", model: "Tavascan", uitv: "Endurance", carrosserie: "suv", segment: "SUV coupé middenklasse", kw: 210, prijs: 50990, kwh: 77, radius: 568, dc: 135, verbruik: 15.6, koffer: 540, trek: 1200, aandr: "achter", extra: ["warmtepomp"], foto: "/cars/cupra-tavascan.jpg" }),
  bev({ slug: "bmw-ix2", merk: "BMW", model: "iX2", uitv: "eDrive20", carrosserie: "suv", segment: "SUV coupé compact premium", kw: 150, prijs: 51500, kwh: 64, radius: 478, dc: 130, verbruik: 15.4, koffer: 525, trek: 1200, extra: ["warmtepomp", "adaptieve cruise"], foto: "/cars/bmw-ix2.jpg" }),
  bev({ slug: "bmw-ix3", merk: "BMW", model: "iX3", uitv: "50 xDrive", carrosserie: "suv", segment: "SUV middenklasse premium", kw: 345, prijs: 72900, kwh: 108, radius: 805, dc: 400, verbruik: 15.1, koffer: 520, trek: 2000, aandr: "vierwiel", extra: ["warmtepomp", "trekhaak", "800V-architectuur"], voorbehoud: "bmwIx3Generatie", foto: "/cars/bmw-ix3.jpg" }),
  bev({ slug: "bmw-i5", merk: "BMW", model: "i5", uitv: "eDrive40", carrosserie: "berline", segment: "Berline hogere middenklasse premium", kw: 250, prijs: 76500, kwh: 84, radius: 582, dc: 205, verbruik: 15.9, koffer: 490, trek: 1500, aandr: "achter", extra: ["warmtepomp", "trekhaak", "adaptieve cruise"], foto: "/cars/bmw-i5.jpg" }),
  bev({ slug: "bmw-i5-touring", merk: "BMW", model: "i5 Touring", uitv: "eDrive40", carrosserie: "break", segment: "Break hogere middenklasse premium", kw: 250, prijs: 79500, kwh: 84, radius: 560, dc: 205, verbruik: 16.5, koffer: 570, trek: 2000, aandr: "achter", extra: ["warmtepomp", "trekhaak"], foto: "/cars/bmw-i5-touring.jpg" }),
  bev({ slug: "bmw-ix", merk: "BMW", model: "iX", uitv: "xDrive45", carrosserie: "suv", segment: "Grote SUV premium", kw: 300, prijs: 89900, kwh: 95, radius: 602, dc: 175, verbruik: 17.5, koffer: 500, trek: 2500, aandr: "vierwiel", extra: ["warmtepomp", "trekhaak", "luchtvering"], foto: "/cars/bmw-ix.jpg" }),
  bev({ slug: "mercedes-eqb", merk: "Mercedes-Benz", model: "EQB", uitv: "250+", carrosserie: "suv", segment: "SUV compact premium", kw: 140, prijs: 55600, kwh: 71, radius: 536, dc: 112, verbruik: 16.2, koffer: 495, zit: 7, trek: 1700, extra: ["warmtepomp", "trekhaak", "derde zitrij"], foto: "/cars/mercedes-eqb.jpg" }),
  bev({ slug: "mercedes-cla-ev", merk: "Mercedes-Benz", model: "CLA", uitv: "250+ EQ", carrosserie: "berline", segment: "Berline compact premium", kw: 200, prijs: 55900, kwh: 85, radius: 792, dc: 320, verbruik: 12.2, koffer: 405, trek: 1400, aandr: "achter", extra: ["warmtepomp", "800V-architectuur"], foto: "/cars/mercedes-cla-ev.jpg" }),
  bev({ slug: "mercedes-eqe", merk: "Mercedes-Benz", model: "EQE", uitv: "350+", carrosserie: "berline", segment: "Berline hogere middenklasse premium", kw: 215, prijs: 79800, kwh: 90, radius: 657, dc: 170, verbruik: 15.9, koffer: 430, trek: 750, aandr: "achter", extra: ["warmtepomp", "luchtvering"], foto: "/cars/mercedes-eqe.jpg" }),
  bev({ slug: "mercedes-eqe-suv", merk: "Mercedes-Benz", model: "EQE SUV", uitv: "350+", carrosserie: "suv", segment: "Grote SUV premium", kw: 215, prijs: 88900, kwh: 90, radius: 596, dc: 170, verbruik: 17.4, koffer: 520, trek: 1800, aandr: "achter", extra: ["warmtepomp", "trekhaak", "luchtvering"], foto: "/cars/mercedes-eqe-suv.jpg" }),
  bev({ slug: "volvo-ec40", merk: "Volvo", model: "EC40", uitv: "Extended Range", carrosserie: "suv", segment: "SUV coupé compact premium", kw: 185, prijs: 51900, kwh: 79, radius: 582, dc: 200, verbruik: 15.7, koffer: 404, trek: 1800, aandr: "achter", extra: ["warmtepomp", "trekhaak"], foto: "/cars/volvo-ec40.jpg" }),
  bev({ slug: "volvo-ex90", merk: "Volvo", model: "EX90", uitv: "Twin Motor", carrosserie: "suv", segment: "Grote SUV premium", kw: 300, prijs: 93500, kwh: 107, radius: 614, dc: 250, verbruik: 19.8, koffer: 655, zit: 7, trek: 2200, aandr: "vierwiel", extra: ["warmtepomp", "trekhaak", "luchtvering", "derde zitrij"], foto: "/cars/volvo-ex90.jpg" }),
  bev({ slug: "volvo-es90", merk: "Volvo", model: "ES90", uitv: "Single Motor Extended", carrosserie: "berline", segment: "Berline hogere middenklasse premium", kw: 245, prijs: 75900, kwh: 102, radius: 700, dc: 350, verbruik: 15.6, koffer: 424, trek: 1500, aandr: "achter", extra: ["warmtepomp", "800V-architectuur"], foto: "/cars/volvo-es90.jpg" }),
  bev({ slug: "polestar-3", merk: "Polestar", model: "3", uitv: "Long Range Single Motor", carrosserie: "suv", segment: "Grote SUV premium", kw: 220, prijs: 79900, kwh: 107, radius: 706, dc: 250, verbruik: 17.4, koffer: 484, trek: 1500, aandr: "achter", extra: ["warmtepomp", "trekhaak", "luchtvering"], foto: "/cars/polestar-3.jpg" }),
  bev({ slug: "polestar-4", merk: "Polestar", model: "4", uitv: "Long Range Single Motor", carrosserie: "suv", segment: "SUV coupé hogere middenklasse", kw: 200, prijs: 66900, kwh: 94, radius: 620, dc: 200, verbruik: 17.0, koffer: 526, trek: 1500, aandr: "achter", extra: ["warmtepomp", "trekhaak"], foto: "/cars/polestar-4.jpg" }),
  bev({ slug: "kia-ev9", merk: "Kia", model: "EV9", uitv: "Long Range RWD", carrosserie: "suv", segment: "Grote SUV", kw: 150, prijs: 74990, kwh: 99, radius: 563, dc: 233, verbruik: 20.2, koffer: 333, zit: 7, trek: 2500, aandr: "achter", extra: ["warmtepomp", "V2L", "trekhaak", "derde zitrij", "800V-architectuur"], foto: "/cars/kia-ev9.jpg" }),
  bev({ slug: "kia-niro-ev", merk: "Kia", model: "Niro EV", uitv: "64,8 kWh", carrosserie: "suv", segment: "SUV compact", kw: 150, prijs: 41990, kwh: 65, radius: 460, dc: 80, verbruik: 16.2, koffer: 475, trek: 750, extra: ["warmtepomp", "V2L"], foto: "/cars/kia-niro-ev.jpg" }),
  bev({ slug: "hyundai-ioniq5", merk: "Hyundai", model: "Ioniq 5", uitv: "84 kWh RWD", carrosserie: "suv", segment: "SUV middenklasse", kw: 168, prijs: 49990, kwh: 84, radius: 570, dc: 233, verbruik: 16.4, koffer: 520, trek: 1600, aandr: "achter", extra: ["warmtepomp", "V2L", "trekhaak", "800V-architectuur"], foto: "/cars/hyundai-ioniq5.jpg" }),
  bev({ slug: "hyundai-ioniq6", merk: "Hyundai", model: "Ioniq 6", uitv: "84 kWh RWD", carrosserie: "berline", segment: "Berline middenklasse", kw: 168, prijs: 49490, kwh: 84, radius: 614, dc: 233, verbruik: 14.3, koffer: 401, trek: 750, aandr: "achter", extra: ["warmtepomp", "V2L", "800V-architectuur"], foto: "/cars/hyundai-ioniq6.jpg" }),
  bev({ slug: "hyundai-inster", merk: "Hyundai", model: "Inster", uitv: "Long Range", carrosserie: "hatchback", segment: "Stadswagen", kw: 84, prijs: 28990, kwh: 49, radius: 370, dc: 85, verbruik: 15.1, koffer: 280, zit: 4, trek: 0, extra: ["V2L"], foto: "/cars/hyundai-inster.jpg" }),
  bev({ slug: "renault-scenic-etech", merk: "Renault", model: "Scenic E-Tech", uitv: "Long Range", carrosserie: "suv", segment: "SUV middenklasse", kw: 160, prijs: 44990, kwh: 87, radius: 622, dc: 150, verbruik: 16.5, koffer: 545, trek: 1100, extra: ["warmtepomp", "trekhaak"], foto: "/cars/renault-scenic-etech.jpg" }),
  bev({ slug: "renault-5-etech", merk: "Renault", model: "5 E-Tech", uitv: "Comfort Range", carrosserie: "hatchback", segment: "Stadswagen", kw: 110, prijs: 32990, kwh: 52, radius: 410, dc: 100, verbruik: 14.5, koffer: 326, trek: 500, extra: ["warmtepomp", "V2L"], foto: "/cars/renault-5-etech.jpg" }),
  bev({ slug: "renault-4-etech", merk: "Renault", model: "4 E-Tech", uitv: "Comfort Range", carrosserie: "suv", segment: "SUV compact", kw: 110, prijs: 35990, kwh: 52, radius: 409, dc: 100, verbruik: 15.2, koffer: 420, trek: 750, extra: ["warmtepomp", "V2L"], foto: "/cars/renault-4-etech.jpg" }),
  bev({ slug: "peugeot-e208", merk: "Peugeot", model: "e-208", uitv: "51 kWh", carrosserie: "hatchback", segment: "Stadswagen", kw: 115, prijs: 35100, kwh: 51, radius: 433, dc: 100, verbruik: 13.2, koffer: 352, trek: 0, extra: ["warmtepomp"], foto: "/cars/peugeot-e208.jpg" }),
  bev({ slug: "peugeot-e2008", merk: "Peugeot", model: "e-2008", uitv: "54 kWh", carrosserie: "suv", segment: "SUV compact", kw: 115, prijs: 39250, kwh: 54, radius: 406, dc: 100, verbruik: 15.3, koffer: 434, trek: 0, extra: ["warmtepomp"], foto: "/cars/peugeot-e2008.jpg" }),
  bev({ slug: "peugeot-e308", merk: "Peugeot", model: "e-308", uitv: "54 kWh", carrosserie: "hatchback", segment: "Compacte hatchback", kw: 115, prijs: 42600, kwh: 54, radius: 416, dc: 100, verbruik: 14.1, koffer: 361, trek: 0, extra: ["warmtepomp"], foto: "/cars/peugeot-e308.jpg" }),
  bev({ slug: "peugeot-e5008", merk: "Peugeot", model: "e-5008", uitv: "73 kWh", carrosserie: "suv", segment: "Grote SUV", kw: 157, prijs: 50850, kwh: 73, radius: 502, dc: 160, verbruik: 16.8, koffer: 748, zit: 7, trek: 1250, extra: ["warmtepomp", "trekhaak", "derde zitrij"], foto: "/cars/peugeot-e5008.jpg" }),
  bev({ slug: "citroen-ec3", merk: "Citroën", model: "ë-C3", uitv: "44 kWh", carrosserie: "hatchback", segment: "Stadswagen", kw: 83, prijs: 24990, kwh: 44, radius: 326, dc: 100, verbruik: 15.0, koffer: 310, trek: 0, foto: "/cars/citroen-ec3.jpg" }),
  bev({ slug: "citroen-ec4", merk: "Citroën", model: "ë-C4", uitv: "54 kWh", carrosserie: "hatchback", segment: "Compacte hatchback", kw: 115, prijs: 37490, kwh: 54, radius: 420, dc: 100, verbruik: 14.5, koffer: 380, trek: 0, extra: ["warmtepomp"], foto: "/cars/citroen-ec4.jpg" }),
  bev({ slug: "citroen-ec5-aircross", merk: "Citroën", model: "ë-C5 Aircross", uitv: "73 kWh", carrosserie: "suv", segment: "SUV middenklasse", kw: 157, prijs: 44990, kwh: 73, radius: 520, dc: 160, verbruik: 16.1, koffer: 651, trek: 1200, extra: ["warmtepomp", "trekhaak"], foto: "/cars/citroen-ec5-aircross.jpg" }),
  bev({ slug: "opel-corsa-electric", merk: "Opel", model: "Corsa Electric", uitv: "51 kWh", carrosserie: "hatchback", segment: "Stadswagen", kw: 115, prijs: 34450, kwh: 51, radius: 405, dc: 100, verbruik: 13.6, koffer: 309, trek: 0, extra: ["warmtepomp"], foto: "/cars/opel-corsa-electric.jpg" }),
  bev({ slug: "opel-mokka-electric", merk: "Opel", model: "Mokka Electric", uitv: "54 kWh", carrosserie: "suv", segment: "SUV compact", kw: 115, prijs: 38650, kwh: 54, radius: 403, dc: 100, verbruik: 15.4, koffer: 310, trek: 0, extra: ["warmtepomp"], foto: "/cars/opel-mokka-electric.jpg" }),
  bev({ slug: "opel-astra-electric", merk: "Opel", model: "Astra Electric", uitv: "54 kWh", carrosserie: "hatchback", segment: "Compacte hatchback", kw: 115, prijs: 41900, kwh: 54, radius: 418, dc: 100, verbruik: 14.2, koffer: 352, trek: 0, extra: ["warmtepomp"], foto: "/cars/opel-astra-electric.jpg" }),
  bev({ slug: "opel-grandland-electric", merk: "Opel", model: "Grandland Electric", uitv: "73 kWh", carrosserie: "suv", segment: "SUV middenklasse", kw: 157, prijs: 45900, kwh: 73, radius: 523, dc: 160, verbruik: 16.0, koffer: 550, trek: 1250, extra: ["warmtepomp", "trekhaak"], foto: "/cars/opel-grandland-electric.jpg" }),
  bev({ slug: "ford-explorer-ev", merk: "Ford", model: "Explorer", uitv: "Extended Range RWD", carrosserie: "suv", segment: "SUV middenklasse", kw: 210, prijs: 47500, kwh: 77, radius: 602, dc: 135, verbruik: 14.6, koffer: 470, trek: 1200, aandr: "achter", extra: ["warmtepomp", "trekhaak"], foto: "/cars/ford-explorer-ev.jpg" }),
  bev({ slug: "ford-capri-ev", merk: "Ford", model: "Capri", uitv: "Extended Range RWD", carrosserie: "suv", segment: "SUV coupé middenklasse", kw: 210, prijs: 49500, kwh: 77, radius: 627, dc: 135, verbruik: 14.3, koffer: 572, trek: 1000, aandr: "achter", extra: ["warmtepomp"], foto: "/cars/ford-capri-ev.jpg" }),
  bev({ slug: "ford-mustang-mach-e", merk: "Ford", model: "Mustang Mach-E", uitv: "Extended Range RWD", carrosserie: "suv", segment: "SUV hogere middenklasse", kw: 216, prijs: 56900, kwh: 91, radius: 600, dc: 150, verbruik: 16.5, koffer: 502, trek: 750, aandr: "achter", extra: ["warmtepomp"], foto: "/cars/ford-mustang-mach-e.jpg" }),
  bev({ slug: "toyota-bz4x", merk: "Toyota", model: "bZ4X", uitv: "73 kWh", carrosserie: "suv", segment: "SUV middenklasse", kw: 165, prijs: 45990, kwh: 73, radius: 573, dc: 150, verbruik: 15.4, koffer: 452, trek: 750, extra: ["warmtepomp"], foto: "/cars/toyota-bz4x.jpg" }),
  bev({ slug: "toyota-urban-cruiser", merk: "Toyota", model: "Urban Cruiser", uitv: "61 kWh", carrosserie: "suv", segment: "SUV compact", kw: 128, prijs: 38990, kwh: 61, radius: 428, dc: 67, verbruik: 15.8, koffer: 306, trek: 750, extra: ["warmtepomp"], foto: "/cars/toyota-urban-cruiser.jpg" }),
  bev({ slug: "nissan-ariya", merk: "Nissan", model: "Ariya", uitv: "87 kWh", carrosserie: "suv", segment: "SUV middenklasse", kw: 178, prijs: 51990, kwh: 87, radius: 533, dc: 130, verbruik: 17.8, koffer: 468, trek: 750, extra: ["warmtepomp"], foto: "/cars/nissan-ariya.jpg" }),
  bev({ slug: "nissan-leaf", merk: "Nissan", model: "Leaf", uitv: "75 kWh", carrosserie: "hatchback", segment: "Compacte hatchback", kw: 160, prijs: 37990, kwh: 75, radius: 604, dc: 150, verbruik: 13.9, koffer: 437, trek: 0, extra: ["warmtepomp", "V2L"], foto: "/cars/nissan-leaf.jpg" }),
  bev({ slug: "mg-mg4", merk: "MG", model: "MG4", uitv: "Comfort 64 kWh", carrosserie: "hatchback", segment: "Compacte hatchback", kw: 150, prijs: 32990, kwh: 64, radius: 435, dc: 140, verbruik: 16.0, koffer: 363, trek: 500, aandr: "achter", extra: ["warmtepomp"], foto: "/cars/mg-mg4.jpg" }),
  bev({ slug: "mg-mgs5", merk: "MG", model: "MGS5 EV", uitv: "Long Range", carrosserie: "suv", segment: "SUV compact", kw: 170, prijs: 35990, kwh: 62, radius: 480, dc: 139, verbruik: 15.2, koffer: 453, trek: 500, aandr: "achter", foto: "/cars/mg-mgs5.jpg" }),
  bev({ slug: "byd-seal", merk: "BYD", model: "Seal", uitv: "Design AWD", carrosserie: "berline", segment: "Berline middenklasse", kw: 390, prijs: 48990, kwh: 82, radius: 520, dc: 150, verbruik: 18.2, koffer: 400, trek: 750, aandr: "vierwiel", extra: ["warmtepomp", "V2L"], foto: "/cars/byd-seal.jpg" }),
  bev({ slug: "byd-sealion-7", merk: "BYD", model: "Sealion 7", uitv: "Comfort", carrosserie: "suv", segment: "SUV hogere middenklasse", kw: 230, prijs: 44990, kwh: 83, radius: 482, dc: 150, verbruik: 19.5, koffer: 500, trek: 1500, aandr: "achter", extra: ["warmtepomp", "trekhaak", "V2L"], foto: "/cars/byd-sealion-7.jpg" }),
  bev({ slug: "byd-dolphin", merk: "BYD", model: "Dolphin", uitv: "Comfort", carrosserie: "hatchback", segment: "Stadswagen", kw: 150, prijs: 30990, kwh: 60, radius: 427, dc: 88, verbruik: 15.9, koffer: 345, trek: 0, extra: ["warmtepomp", "V2L"], foto: "/cars/byd-dolphin.jpg" }),
  bev({ slug: "byd-atto-3", merk: "BYD", model: "Atto 3", uitv: "Comfort", carrosserie: "suv", segment: "SUV compact", kw: 150, prijs: 37990, kwh: 60, radius: 420, dc: 88, verbruik: 16.0, koffer: 440, trek: 750, extra: ["warmtepomp", "V2L"], foto: "/cars/byd-atto-3.jpg" }),
  bev({ slug: "fiat-500e", merk: "Fiat", model: "500e", uitv: "42 kWh", carrosserie: "hatchback", segment: "Stadswagen", kw: 87, prijs: 30990, kwh: 42, radius: 320, dc: 85, verbruik: 14.4, koffer: 185, zit: 4, trek: 0, foto: "/cars/fiat-500e.jpg" }),
  bev({ slug: "fiat-600e", merk: "Fiat", model: "600e", uitv: "54 kWh", carrosserie: "suv", segment: "SUV compact", kw: 115, prijs: 36990, kwh: 54, radius: 409, dc: 100, verbruik: 15.2, koffer: 360, trek: 0, extra: ["warmtepomp"], foto: "/cars/fiat-600e.jpg" }),
  bev({ slug: "fiat-grande-panda", merk: "Fiat", model: "Grande Panda", uitv: "44 kWh", carrosserie: "hatchback", segment: "Stadswagen", kw: 83, prijs: 25990, kwh: 44, radius: 320, dc: 100, verbruik: 15.1, koffer: 361, trek: 0, foto: "/cars/fiat-grande-panda.jpg" }),
  bev({ slug: "jeep-avenger-ev", merk: "Jeep", model: "Avenger", uitv: "54 kWh", carrosserie: "suv", segment: "SUV compact", kw: 115, prijs: 37990, kwh: 54, radius: 400, dc: 100, verbruik: 15.6, koffer: 355, trek: 0, extra: ["warmtepomp"], foto: "/cars/jeep-avenger-ev.jpg" }),
  bev({ slug: "alfa-junior-elettrica", merk: "Alfa Romeo", model: "Junior Elettrica", uitv: "54 kWh", carrosserie: "suv", segment: "SUV compact premium", kw: 115, prijs: 39500, kwh: 54, radius: 410, dc: 100, verbruik: 15.0, koffer: 400, trek: 0, extra: ["warmtepomp"], foto: "/cars/alfa-junior-elettrica.jpg" }),
  bev({ slug: "ds-3-etense", merk: "DS", model: "DS 3 E-Tense", uitv: "54 kWh", carrosserie: "suv", segment: "SUV compact premium", kw: 115, prijs: 41900, kwh: 54, radius: 404, dc: 100, verbruik: 15.3, koffer: 350, trek: 0, extra: ["warmtepomp"], foto: "/cars/ds-3-etense.jpg" }),
  bev({ slug: "mini-cooper-e", merk: "MINI", model: "Cooper E", uitv: "40,7 kWh", carrosserie: "hatchback", segment: "Stadswagen premium", kw: 135, prijs: 34900, kwh: 41, radius: 305, dc: 75, verbruik: 14.3, koffer: 210, zit: 4, trek: 0, foto: "/cars/mini-cooper-e.jpg" }),
  bev({ slug: "mini-countryman-e", merk: "MINI", model: "Countryman E", uitv: "66 kWh", carrosserie: "suv", segment: "SUV compact premium", kw: 150, prijs: 44900, kwh: 66, radius: 462, dc: 130, verbruik: 15.7, koffer: 460, trek: 1200, extra: ["warmtepomp", "trekhaak"], foto: "/cars/mini-countryman-e.jpg" }),
  bev({ slug: "smart-1", merk: "smart", model: "#1", uitv: "Pro+", carrosserie: "suv", segment: "SUV compact", kw: 200, prijs: 39900, kwh: 62, radius: 440, dc: 150, verbruik: 16.8, koffer: 411, trek: 1600, aandr: "achter", extra: ["warmtepomp", "trekhaak"], foto: "/cars/smart-1.jpg" }),
  bev({ slug: "smart-3", merk: "smart", model: "#3", uitv: "Pro+", carrosserie: "suv", segment: "SUV coupé compact", kw: 200, prijs: 41900, kwh: 62, radius: 455, dc: 150, verbruik: 16.3, koffer: 370, trek: 1600, aandr: "achter", extra: ["warmtepomp", "trekhaak"], foto: "/cars/smart-3.jpg" }),
  bev({ slug: "porsche-macan-ev", merk: "Porsche", model: "Macan", uitv: "4 Electric", carrosserie: "suv", segment: "SUV premium sportief", kw: 300, prijs: 89400, kwh: 95, radius: 613, dc: 270, verbruik: 18.8, koffer: 540, trek: 2000, aandr: "vierwiel", extra: ["warmtepomp", "trekhaak", "luchtvering", "800V-architectuur"], foto: "/cars/porsche-macan-ev.jpg" }),
  bev({ slug: "porsche-taycan", merk: "Porsche", model: "Taycan", uitv: "RWD", carrosserie: "berline", segment: "Berline premium sportief", kw: 300, prijs: 105500, kwh: 89, radius: 590, dc: 320, verbruik: 17.9, koffer: 407, trek: 0, aandr: "achter", extra: ["warmtepomp", "luchtvering", "800V-architectuur"], foto: "/cars/porsche-taycan.jpg" }),
  bev({ slug: "lexus-rz", merk: "Lexus", model: "RZ", uitv: "350e", carrosserie: "suv", segment: "SUV middenklasse premium", kw: 165, prijs: 62900, kwh: 77, radius: 568, dc: 150, verbruik: 15.6, koffer: 522, trek: 750, extra: ["warmtepomp"], foto: "/cars/lexus-rz.jpg" }),
  bev({ slug: "mazda-6e", merk: "Mazda", model: "6e", uitv: "Long Range", carrosserie: "berline", segment: "Berline middenklasse", kw: 180, prijs: 45990, kwh: 80, radius: 552, dc: 90, verbruik: 16.6, koffer: 466, trek: 0, aandr: "achter", extra: ["warmtepomp"], foto: "/cars/mazda-6e.jpg" }),
  bev({ slug: "xpeng-g6", merk: "XPENG", model: "G6", uitv: "Long Range", carrosserie: "suv", segment: "SUV hogere middenklasse", kw: 210, prijs: 45990, kwh: 87, radius: 570, dc: 280, verbruik: 17.5, koffer: 571, trek: 1500, aandr: "achter", extra: ["warmtepomp", "trekhaak", "800V-architectuur"], foto: "/cars/xpeng-g6.jpg" }),
  bev({ slug: "honda-eny1", merk: "Honda", model: "e:Ny1", uitv: "68,8 kWh", carrosserie: "suv", segment: "SUV compact", kw: 150, prijs: 42500, kwh: 69, radius: 412, dc: 78, verbruik: 18.2, koffer: 344, trek: 750, extra: ["warmtepomp"], foto: "/cars/honda-eny1.jpg" }),
  bev({ slug: "subaru-solterra", merk: "Subaru", model: "Solterra", uitv: "AWD", carrosserie: "suv", segment: "SUV middenklasse", kw: 165, prijs: 51990, kwh: 73, radius: 494, dc: 150, verbruik: 17.4, koffer: 452, trek: 750, aandr: "vierwiel", extra: ["warmtepomp"], foto: "/cars/subaru-solterra.jpg" }),
  bev({ slug: "leapmotor-c10", merk: "Leapmotor", model: "C10", uitv: "BEV", carrosserie: "suv", segment: "SUV hogere middenklasse", kw: 160, prijs: 37990, kwh: 70, radius: 420, dc: 84, verbruik: 19.0, koffer: 581, trek: 1500, aandr: "achter", extra: ["warmtepomp", "trekhaak"], foto: "/cars/leapmotor-c10.jpg" }),
  bev({ slug: "leapmotor-t03", merk: "Leapmotor", model: "T03", uitv: "37,3 kWh", carrosserie: "hatchback", segment: "Stadswagen", kw: 70, prijs: 18900, kwh: 37, radius: 265, dc: 48, verbruik: 15.9, koffer: 210, zit: 4, trek: 0, foto: "/cars/leapmotor-t03.jpg" }),
];

/* ------------------------------------------------------------ plug-in hybride */

const PLUGIN: CatalogCar[] = [
  phev({ slug: "bmw-330e", merk: "BMW", model: "330e", uitv: "Berline", carrosserie: "berline", segment: "Berline premium", kw: 220, prijs: 57900, co2: 25, verbruik: 1.1, kwh: 19.5, radius: 101, koffer: 375, trek: 1500, aandr: "achter", extra: ["adaptieve cruise", "trekhaak"], foto: "/cars/bmw-330e.jpg", bron: "bmw.be technische gegevens (Euro 6e-bis, 19–25 g/km); batterij ekris.nl (netto)" }),
  phev({ slug: "mercedes-glc-300e", merk: "Mercedes-Benz", model: "GLC 300 e", uitv: "4MATIC", carrosserie: "suv", segment: "SUV middenklasse premium", kw: 230, prijs: 72400, co2: 15, verbruik: 0.6, kwh: 23.4, radius: 130, dc: 60, koffer: 470, trek: 2000, aandr: "vierwiel", extra: ["trekhaak", "luchtvering"], foto: "/cars/mercedes-glc-300e.jpg", bron: "media.mercedes-benz.nl (gewogen CO₂ 12–15 g/km); mercedesblog (bruikbare batterij 23,4 van 31,2 kWh bruto)", voorbehoud: "buitenlandseBron" }),
  phev({ slug: "volvo-xc60-t6", merk: "Volvo", model: "XC60", uitv: "T6 AWD Plug-in", carrosserie: "suv", segment: "SUV hogere middenklasse premium", kw: 257, prijs: 71500, co2: 81, verbruik: 1.0, kwh: 14.7, radius: 80, koffer: 468, trek: 2100, aandr: "vierwiel", extra: ["trekhaak", "luchtvering"], foto: "/cars/volvo-xc60-t6.jpg", bron: "volvocars.com DE (gewogen CO₂ 61–81 g/km); motorandauto.nl (bruikbare batterij)", voorbehoud: "valseHybrideGrensgeval" }),
  phev({ slug: "bmw-530e", merk: "BMW", model: "530e", uitv: "Berline", carrosserie: "berline", segment: "Berline hogere middenklasse premium", kw: 215, prijs: 72900, co2: 41, verbruik: 1.8, kwh: 20, radius: 61, koffer: 415, trek: 2000, aandr: "achter", extra: ["adaptieve cruise", "trekhaak"], bron: "bmw.be fiscale prijslijst (30–41 g/km)", voorbehoud: "bmw530eGeneratie", foto: "/cars/bmw-530e.jpg" }),
  phev({ slug: "bmw-x1-30e", merk: "BMW", model: "X1", uitv: "xDrive30e", carrosserie: "suv", segment: "SUV compact premium", kw: 240, prijs: 57500, co2: 64, verbruik: 2.8, kwh: 17, radius: 83, koffer: 490, trek: 1800, aandr: "vierwiel", extra: ["trekhaak"], bron: "bmw.be technische gegevens (55–64 g/km)", voorbehoud: "valseHybrideGrensgeval", foto: "/cars/bmw-x1-30e.jpg" }),
  phev({ slug: "bmw-x3-30e", merk: "BMW", model: "X3", uitv: "30e xDrive", carrosserie: "suv", segment: "SUV middenklasse premium", kw: 215, prijs: 69900, co2: 57, verbruik: 2.5, kwh: 19, radius: 50, koffer: 460, trek: 2000, aandr: "vierwiel", extra: ["trekhaak"], bron: "bmw.be fiscale prijslijst (45–57 g/km)", voorbehoud: "valseHybrideGrensgeval", foto: "/cars/bmw-x3-30e.jpg" }),
  phev({ slug: "bmw-x5-50e", merk: "BMW", model: "X5", uitv: "xDrive50e", carrosserie: "suv", segment: "Grote SUV premium", kw: 360, prijs: 99900, co2: 29, verbruik: 1.3, kwh: 26, radius: 110, koffer: 500, trek: 2700, aandr: "vierwiel", extra: ["trekhaak", "luchtvering"], voorbehoud: "bmwX5Ontbreekt", foto: "/cars/bmw-x5-50e.jpg" }),
  phev({ slug: "mercedes-c300e", merk: "Mercedes-Benz", model: "C 300 e", uitv: "Berline", carrosserie: "berline", segment: "Berline premium", kw: 230, prijs: 63900, co2: 13, verbruik: 0.6, kwh: 26, radius: 111, dc: 55, koffer: 315, trek: 1800, aandr: "achter", extra: ["trekhaak"], foto: "/cars/mercedes-c300e.jpg" }),
  phev({ slug: "mercedes-e300e", merk: "Mercedes-Benz", model: "E 300 e", uitv: "Berline", carrosserie: "berline", segment: "Berline hogere middenklasse premium", kw: 230, prijs: 76900, co2: 14, verbruik: 0.6, kwh: 26, radius: 116, dc: 60, koffer: 370, trek: 2100, aandr: "achter", extra: ["trekhaak", "luchtvering"], foto: "/cars/mercedes-e300e.jpg" }),
  phev({ slug: "mercedes-a250e", merk: "Mercedes-Benz", model: "A 250 e", uitv: "Hatchback", carrosserie: "hatchback", segment: "Compacte hatchback premium", kw: 160, prijs: 48900, co2: 27, verbruik: 1.2, kwh: 16, radius: 82, koffer: 310, trek: 1600, extra: ["trekhaak"], foto: "/cars/mercedes-a250e.jpg" }),
  phev({ slug: "mercedes-gle-350de", merk: "Mercedes-Benz", model: "GLE 350 de", uitv: "4MATIC", carrosserie: "suv", segment: "Grote SUV premium", kw: 245, prijs: 98500, co2: 19, verbruik: 0.7, kwh: 31, radius: 108, dc: 60, koffer: 490, trek: 3500, aandr: "vierwiel", brandstof: "diesel", extra: ["trekhaak", "luchtvering"], foto: "/cars/mercedes-gle-350de.jpg" }),
  phev({ slug: "volvo-xc90-t8", merk: "Volvo", model: "XC90", uitv: "T8 AWD Plug-in", carrosserie: "suv", segment: "Grote SUV premium", kw: 335, prijs: 91500, co2: 23, verbruik: 1.0, kwh: 19, radius: 71, koffer: 302, zit: 7, trek: 2400, aandr: "vierwiel", extra: ["trekhaak", "luchtvering", "derde zitrij"], foto: "/cars/volvo-xc90-t8.jpg" }),
  phev({ slug: "volvo-v60-t6", merk: "Volvo", model: "V60", uitv: "T6 AWD Plug-in", carrosserie: "break", segment: "Break hogere middenklasse premium", kw: 258, prijs: 67900, co2: 19, verbruik: 0.8, kwh: 19, radius: 81, koffer: 519, trek: 2000, aandr: "vierwiel", extra: ["trekhaak"], foto: "/cars/volvo-v60-t6.jpg" }),
  phev({ slug: "audi-a3-tfsie", merk: "Audi", model: "A3", uitv: "40 TFSI e", carrosserie: "hatchback", segment: "Compacte hatchback premium", kw: 200, prijs: 48900, co2: 9, verbruik: 0.4, kwh: 20, radius: 141, dc: 50, koffer: 335, trek: 1500, extra: ["trekhaak"], foto: "/cars/audi-a3-tfsie.jpg" }),
  phev({ slug: "audi-q3-tfsie", merk: "Audi", model: "Q3", uitv: "45 TFSI e", carrosserie: "suv", segment: "SUV compact premium", kw: 200, prijs: 54900, co2: 11, verbruik: 0.5, kwh: 20, radius: 119, dc: 50, koffer: 425, trek: 1800, extra: ["trekhaak"], foto: "/cars/audi-q3-tfsie.jpg" }),
  phev({ slug: "audi-q5-tfsie", merk: "Audi", model: "Q5", uitv: "50 TFSI e quattro", carrosserie: "suv", segment: "SUV middenklasse premium", kw: 220, prijs: 71900, co2: 15, verbruik: 0.7, kwh: 21, radius: 100, koffer: 465, trek: 2000, aandr: "vierwiel", extra: ["trekhaak"], foto: "/cars/audi-q5-tfsie.jpg" }),
  phev({ slug: "audi-a6-tfsie", merk: "Audi", model: "A6", uitv: "50 TFSI e", carrosserie: "berline", segment: "Berline hogere middenklasse premium", kw: 220, prijs: 74900, co2: 17, verbruik: 0.8, kwh: 25, radius: 105, koffer: 360, trek: 2000, aandr: "voor", extra: ["trekhaak"], foto: "/cars/audi-a6-tfsie.jpg" }),
  phev({ slug: "vw-golf-ehybrid", merk: "Volkswagen", model: "Golf", uitv: "eHybrid", carrosserie: "hatchback", segment: "Compacte hatchback", kw: 150, prijs: 42900, co2: 8, verbruik: 0.4, kwh: 20, radius: 143, dc: 50, koffer: 273, trek: 1600, extra: ["trekhaak"], foto: "/cars/vw-golf-ehybrid.jpg" }),
  phev({ slug: "vw-passat-ehybrid", merk: "Volkswagen", model: "Passat", uitv: "eHybrid", carrosserie: "break", segment: "Break hogere middenklasse", kw: 150, prijs: 51900, co2: 9, verbruik: 0.4, kwh: 20, radius: 138, dc: 50, koffer: 510, trek: 1600, extra: ["trekhaak"], foto: "/cars/vw-passat-ehybrid.jpg" }),
  phev({ slug: "vw-tiguan-ehybrid", merk: "Volkswagen", model: "Tiguan", uitv: "eHybrid", carrosserie: "suv", segment: "SUV middenklasse", kw: 150, prijs: 49900, co2: 9, verbruik: 0.4, kwh: 20, radius: 133, dc: 50, koffer: 490, trek: 1800, extra: ["trekhaak"], foto: "/cars/vw-tiguan-ehybrid.jpg" }),
  phev({ slug: "skoda-superb-iv", merk: "Škoda", model: "Superb", uitv: "iV", carrosserie: "break", segment: "Break hogere middenklasse", kw: 150, prijs: 48900, co2: 9, verbruik: 0.4, kwh: 20, radius: 137, dc: 50, koffer: 510, trek: 1600, extra: ["trekhaak"], foto: "/cars/skoda-superb-iv.jpg" }),
  phev({ slug: "skoda-kodiaq-iv", merk: "Škoda", model: "Kodiaq", uitv: "iV", carrosserie: "suv", segment: "Grote SUV", kw: 150, prijs: 50900, co2: 10, verbruik: 0.4, kwh: 20, radius: 123, dc: 50, koffer: 745, trek: 1800, extra: ["trekhaak"], foto: "/cars/skoda-kodiaq-iv.jpg" }),
  phev({ slug: "cupra-formentor-ehybrid", merk: "Cupra", model: "Formentor", uitv: "e-Hybrid", carrosserie: "suv", segment: "SUV compact sportief", kw: 200, prijs: 47900, co2: 9, verbruik: 0.4, kwh: 20, radius: 122, dc: 50, koffer: 345, trek: 1600, extra: ["trekhaak"], voorbehoud: "co2NietGevonden", foto: "/cars/cupra-formentor-ehybrid.jpg" }),
  phev({ slug: "cupra-leon-ehybrid", merk: "Cupra", model: "Leon", uitv: "e-Hybrid", carrosserie: "hatchback", segment: "Compacte hatchback sportief", kw: 200, prijs: 45900, co2: 9, verbruik: 0.4, kwh: 20, radius: 133, dc: 50, koffer: 270, trek: 1600, foto: "/cars/cupra-leon-ehybrid.jpg" }),
  phev({ slug: "peugeot-308-hybrid", merk: "Peugeot", model: "308", uitv: "Hybrid 195", carrosserie: "hatchback", segment: "Compacte hatchback", kw: 143, prijs: 43900, co2: 24, verbruik: 1.1, kwh: 12, radius: 61, koffer: 361, trek: 1200, extra: ["trekhaak"], foto: "/cars/peugeot-308-hybrid.jpg" }),
  phev({ slug: "peugeot-408-hybrid", merk: "Peugeot", model: "408", uitv: "Hybrid 225", carrosserie: "suv", segment: "SUV coupé middenklasse", kw: 165, prijs: 48900, co2: 26, verbruik: 1.1, kwh: 12, radius: 64, koffer: 471, trek: 1200, extra: ["trekhaak"], foto: "/cars/peugeot-408-hybrid.jpg" }),
  phev({ slug: "toyota-rav4-phev", merk: "Toyota", model: "RAV4", uitv: "Plug-in Hybrid AWD", carrosserie: "suv", segment: "SUV middenklasse", kw: 225, prijs: 54900, co2: 22, verbruik: 1.0, kwh: 18, radius: 75, koffer: 520, trek: 1500, aandr: "vierwiel", extra: ["trekhaak"], voorbehoud: "co2NietGevonden", foto: "/cars/toyota-rav4-phev.jpg" }),
  phev({ slug: "toyota-chr-phev", merk: "Toyota", model: "C-HR", uitv: "Plug-in Hybrid", carrosserie: "suv", segment: "SUV compact", kw: 164, prijs: 45900, co2: 19, verbruik: 0.8, kwh: 14, radius: 66, koffer: 310, trek: 750, foto: "/cars/toyota-chr-phev.jpg" }),
  phev({ slug: "toyota-prius-phev", merk: "Toyota", model: "Prius", uitv: "Plug-in Hybrid", carrosserie: "hatchback", segment: "Compacte hatchback", kw: 164, prijs: 44900, co2: 11, verbruik: 0.5, kwh: 14, radius: 86, koffer: 284, trek: 0, foto: "/cars/toyota-prius-phev.jpg" }),
  phev({ slug: "kia-sportage-phev", merk: "Kia", model: "Sportage", uitv: "Plug-in Hybrid AWD", carrosserie: "suv", segment: "SUV middenklasse", kw: 195, prijs: 48900, co2: 25, verbruik: 1.1, kwh: 14, radius: 70, koffer: 540, trek: 1350, aandr: "vierwiel", extra: ["trekhaak"], foto: "/cars/kia-sportage-phev.jpg" }),
  phev({ slug: "hyundai-tucson-phev", merk: "Hyundai", model: "Tucson", uitv: "Plug-in Hybrid AWD", carrosserie: "suv", segment: "SUV middenklasse", kw: 185, prijs: 47900, co2: 27, verbruik: 1.2, kwh: 14, radius: 70, koffer: 558, trek: 1350, aandr: "vierwiel", extra: ["trekhaak"], foto: "/cars/hyundai-tucson-phev.jpg" }),
  phev({ slug: "hyundai-santa-fe-phev", merk: "Hyundai", model: "Santa Fe", uitv: "Plug-in Hybrid AWD", carrosserie: "suv", segment: "Grote SUV", kw: 185, prijs: 59900, co2: 33, verbruik: 1.5, kwh: 14, radius: 58, koffer: 628, zit: 7, trek: 1110, aandr: "vierwiel", extra: ["trekhaak", "derde zitrij"], foto: "/cars/hyundai-santa-fe-phev.jpg" }),
  phev({ slug: "ford-kuga-phev", merk: "Ford", model: "Kuga", uitv: "Plug-in Hybrid", carrosserie: "suv", segment: "SUV middenklasse", kw: 180, prijs: 44900, co2: 20, verbruik: 0.9, kwh: 15, radius: 69, koffer: 412, trek: 1200, extra: ["trekhaak"], foto: "/cars/ford-kuga-phev.jpg" }),
  phev({ slug: "mazda-cx60-phev", merk: "Mazda", model: "CX-60", uitv: "PHEV AWD", carrosserie: "suv", segment: "SUV hogere middenklasse premium", kw: 241, prijs: 57900, co2: 33, verbruik: 1.5, kwh: 17, radius: 63, koffer: 570, trek: 2500, aandr: "vierwiel", extra: ["trekhaak"], foto: "/cars/mazda-cx60-phev.jpg" }),
  phev({ slug: "byd-seal-u-dmi", merk: "BYD", model: "Seal U", uitv: "DM-i Comfort", carrosserie: "suv", segment: "SUV middenklasse", kw: 160, prijs: 39990, co2: 25, verbruik: 1.1, kwh: 18, radius: 80, koffer: 425, trek: 1500, extra: ["trekhaak"], foto: "/cars/byd-seal-u-dmi.jpg" }),
];

/* ------------------------------------------------------------------- hybride */

const HYBRIDE: CatalogCar[] = [
  hev({ slug: "toyota-corolla", merk: "Toyota", model: "Corolla", uitv: "Hybrid 140", carrosserie: "hatchback", segment: "Compacte hatchback", kw: 103, prijs: 33900, co2: 102, verbruik: 4.5, koffer: 361, trek: 750, foto: "/cars/23-toyota-corolla.jpg" }),
  hev({ slug: "toyota-corolla-ts", merk: "Toyota", model: "Corolla Touring Sports", uitv: "Hybrid 140", carrosserie: "break", segment: "Compacte break", kw: 103, prijs: 35900, co2: 105, verbruik: 4.6, koffer: 596, trek: 750, extra: ["trekhaak"], foto: "/cars/toyota-corolla-ts.jpg" }),
  hev({ slug: "toyota-yaris", merk: "Toyota", model: "Yaris", uitv: "Hybrid 130", carrosserie: "hatchback", segment: "Stadswagen", kw: 96, prijs: 28900, co2: 94, verbruik: 4.2, koffer: 286, trek: 0, foto: "/cars/toyota-yaris.jpg" }),
  hev({ slug: "toyota-yaris-cross", merk: "Toyota", model: "Yaris Cross", uitv: "Hybrid 130", carrosserie: "suv", segment: "SUV compact", kw: 96, prijs: 32900, co2: 105, verbruik: 4.7, koffer: 397, trek: 750, foto: "/cars/toyota-yaris-cross.jpg" }),
  hev({ slug: "toyota-chr-hev", merk: "Toyota", model: "C-HR", uitv: "Hybrid 140", carrosserie: "suv", segment: "SUV compact", kw: 103, prijs: 38900, co2: 105, verbruik: 4.7, koffer: 388, trek: 750, foto: "/cars/toyota-chr-hev.jpg" }),
  hev({ slug: "toyota-rav4-hev", merk: "Toyota", model: "RAV4", uitv: "Hybrid AWD-i", carrosserie: "suv", segment: "SUV middenklasse", kw: 163, prijs: 48900, co2: 131, verbruik: 5.8, koffer: 580, trek: 1650, aandr: "vierwiel", extra: ["trekhaak"], foto: "/cars/toyota-rav4-hev.jpg" }),
  hev({ slug: "renault-clio-etech", merk: "Renault", model: "Clio", uitv: "E-Tech 145", carrosserie: "hatchback", segment: "Stadswagen", kw: 105, prijs: 28500, co2: 96, verbruik: 4.2, koffer: 301, trek: 0, foto: "/cars/renault-clio-etech.jpg" }),
  hev({ slug: "renault-captur-etech", merk: "Renault", model: "Captur", uitv: "E-Tech 145", carrosserie: "suv", segment: "SUV compact", kw: 105, prijs: 32500, co2: 105, verbruik: 4.7, koffer: 326, trek: 750, foto: "/cars/renault-captur-etech.jpg" }),
  hev({ slug: "renault-symbioz-etech", merk: "Renault", model: "Symbioz", uitv: "E-Tech 145", carrosserie: "suv", segment: "SUV compact", kw: 105, prijs: 36900, co2: 105, verbruik: 4.7, koffer: 492, trek: 750, extra: ["trekhaak"], foto: "/cars/renault-symbioz-etech.jpg" }),
  hev({ slug: "honda-civic-ehev", merk: "Honda", model: "Civic", uitv: "e:HEV", carrosserie: "hatchback", segment: "Compacte hatchback", kw: 135, prijs: 40900, co2: 108, verbruik: 4.8, koffer: 410, trek: 0, foto: "/cars/honda-civic-ehev.jpg" }),
  hev({ slug: "honda-crv-ehev", merk: "Honda", model: "CR-V", uitv: "e:HEV AWD", carrosserie: "suv", segment: "SUV middenklasse", kw: 135, prijs: 52900, co2: 151, verbruik: 6.7, koffer: 587, trek: 750, aandr: "vierwiel", foto: "/cars/honda-crv-ehev.jpg" }),
  hev({ slug: "kia-niro-hev", merk: "Kia", model: "Niro", uitv: "Hybrid", carrosserie: "suv", segment: "SUV compact", kw: 104, prijs: 34900, co2: 108, verbruik: 4.8, koffer: 451, trek: 1300, extra: ["trekhaak"], foto: "/cars/kia-niro-hev.jpg" }),
  hev({ slug: "hyundai-tucson-hev", merk: "Hyundai", model: "Tucson", uitv: "Hybrid", carrosserie: "suv", segment: "SUV middenklasse", kw: 158, prijs: 41900, co2: 127, verbruik: 5.6, koffer: 616, trek: 1650, extra: ["trekhaak"], foto: "/cars/hyundai-tucson-hev.jpg" }),
];

/* ------------------------------------------------------- benzine en diesel */

const VERBRANDING: CatalogCar[] = [
  fossiel({ slug: "bmw-320d", merk: "BMW", model: "320d", uitv: "Berline", carrosserie: "berline", segment: "Berline premium", kw: 145, prijs: 53900, co2: 122, verbruik: 4.6, brandstof: "diesel", koffer: 480, trek: 1800, aandr: "achter", extra: ["trekhaak", "adaptieve cruise"], foto: "/cars/bmw-320d.jpg" }),
  fossiel({ slug: "vw-golf", merk: "Volkswagen", model: "Golf", uitv: "1.5 eTSI", carrosserie: "hatchback", segment: "Compacte hatchback", kw: 110, prijs: 34900, co2: 126, verbruik: 5.6, brandstof: "benzine", koffer: 381, trek: 1500, extra: ["trekhaak"], foto: "/cars/vw-golf.jpg" }),
  fossiel({ slug: "bmw-520d", merk: "BMW", model: "520d", uitv: "Berline", carrosserie: "berline", segment: "Berline hogere middenklasse premium", kw: 145, prijs: 67900, co2: 130, verbruik: 4.9, brandstof: "diesel", koffer: 520, trek: 2000, aandr: "achter", extra: ["trekhaak"], zwaar: true, foto: "/cars/bmw-520d.jpg" }),
  fossiel({ slug: "bmw-x1-18d", merk: "BMW", model: "X1", uitv: "sDrive18d", carrosserie: "suv", segment: "SUV compact premium", kw: 110, prijs: 49900, co2: 132, verbruik: 5.0, brandstof: "diesel", koffer: 540, trek: 1600, extra: ["trekhaak"], foto: "/cars/bmw-x1-18d.jpg" }),
  fossiel({ slug: "bmw-x3-20d", merk: "BMW", model: "X3", uitv: "20d xDrive", carrosserie: "suv", segment: "SUV middenklasse premium", kw: 145, prijs: 65900, co2: 145, verbruik: 5.5, brandstof: "diesel", koffer: 570, trek: 2400, aandr: "vierwiel", extra: ["trekhaak"], zwaar: true, foto: "/cars/bmw-x3-20d.jpg" }),
  fossiel({ slug: "mercedes-c220d", merk: "Mercedes-Benz", model: "C 220 d", uitv: "Berline", carrosserie: "berline", segment: "Berline premium", kw: 145, prijs: 56900, co2: 124, verbruik: 4.7, brandstof: "diesel", koffer: 455, trek: 1800, aandr: "achter", extra: ["trekhaak"], foto: "/cars/mercedes-c220d.jpg" }),
  fossiel({ slug: "mercedes-e220d", merk: "Mercedes-Benz", model: "E 220 d", uitv: "Berline", carrosserie: "berline", segment: "Berline hogere middenklasse premium", kw: 145, prijs: 70900, co2: 130, verbruik: 4.9, brandstof: "diesel", koffer: 540, trek: 2100, aandr: "achter", extra: ["trekhaak"], zwaar: true, foto: "/cars/mercedes-e220d.jpg" }),
  fossiel({ slug: "mercedes-glc220d", merk: "Mercedes-Benz", model: "GLC 220 d", uitv: "4MATIC", carrosserie: "suv", segment: "SUV middenklasse premium", kw: 145, prijs: 68900, co2: 150, verbruik: 5.7, brandstof: "diesel", koffer: 620, trek: 2500, aandr: "vierwiel", extra: ["trekhaak"], zwaar: true, foto: "/cars/mercedes-glc220d.jpg" }),
  fossiel({ slug: "audi-a5-tdi", merk: "Audi", model: "A5", uitv: "35 TDI", carrosserie: "berline", segment: "Berline premium", kw: 120, prijs: 55900, co2: 128, verbruik: 4.9, brandstof: "diesel", koffer: 445, trek: 1800, extra: ["trekhaak"], foto: "/cars/audi-a5-tdi.jpg" }),
  fossiel({ slug: "audi-q5-tdi", merk: "Audi", model: "Q5", uitv: "35 TDI", carrosserie: "suv", segment: "SUV middenklasse premium", kw: 120, prijs: 63900, co2: 146, verbruik: 5.6, brandstof: "diesel", koffer: 520, trek: 2000, extra: ["trekhaak"], zwaar: true, foto: "/cars/audi-q5-tdi.jpg" }),
  fossiel({ slug: "vw-passat-tdi", merk: "Volkswagen", model: "Passat", uitv: "2.0 TDI", carrosserie: "break", segment: "Break hogere middenklasse", kw: 110, prijs: 46900, co2: 125, verbruik: 4.8, brandstof: "diesel", koffer: 690, trek: 2000, extra: ["trekhaak"], foto: "/cars/vw-passat-tdi.jpg" }),
  fossiel({ slug: "vw-tiguan-tdi", merk: "Volkswagen", model: "Tiguan", uitv: "2.0 TDI", carrosserie: "suv", segment: "SUV middenklasse", kw: 110, prijs: 45900, co2: 141, verbruik: 5.4, brandstof: "diesel", koffer: 652, trek: 2000, extra: ["trekhaak"], foto: "/cars/vw-tiguan-tdi.jpg" }),
  fossiel({ slug: "vw-t-roc", merk: "Volkswagen", model: "T-Roc", uitv: "1.5 eTSI", carrosserie: "suv", segment: "SUV compact", kw: 110, prijs: 37900, co2: 137, verbruik: 6.1, brandstof: "benzine", koffer: 465, trek: 1500, extra: ["trekhaak"], foto: "/cars/vw-t-roc.jpg" }),
  fossiel({ slug: "skoda-octavia-tdi", merk: "Škoda", model: "Octavia Combi", uitv: "2.0 TDI", carrosserie: "break", segment: "Compacte break", kw: 110, prijs: 39900, co2: 121, verbruik: 4.6, brandstof: "diesel", koffer: 640, trek: 1800, extra: ["trekhaak"], foto: "/cars/skoda-octavia-tdi.jpg" }),
  fossiel({ slug: "skoda-superb-tdi", merk: "Škoda", model: "Superb Combi", uitv: "2.0 TDI", carrosserie: "break", segment: "Break hogere middenklasse", kw: 110, prijs: 45900, co2: 126, verbruik: 4.8, brandstof: "diesel", koffer: 690, trek: 2000, extra: ["trekhaak"], foto: "/cars/skoda-superb-tdi.jpg" }),
  fossiel({ slug: "skoda-kamiq", merk: "Škoda", model: "Kamiq", uitv: "1.0 TSI", carrosserie: "suv", segment: "SUV compact", kw: 85, prijs: 29900, co2: 129, verbruik: 5.7, brandstof: "benzine", koffer: 400, trek: 1100, extra: ["trekhaak"], foto: "/cars/skoda-kamiq.jpg" }),
  fossiel({ slug: "volvo-xc60-b5", merk: "Volvo", model: "XC60", uitv: "B5 mild hybrid", carrosserie: "suv", segment: "SUV hogere middenklasse premium", kw: 184, prijs: 63900, co2: 168, verbruik: 7.4, brandstof: "benzine", koffer: 483, trek: 2000, extra: ["trekhaak"], zwaar: true, foto: "/cars/volvo-xc60-b5.jpg" }),
  fossiel({ slug: "volvo-v60-b4", merk: "Volvo", model: "V60", uitv: "B4 mild hybrid", carrosserie: "break", segment: "Break hogere middenklasse premium", kw: 145, prijs: 55900, co2: 154, verbruik: 6.8, brandstof: "benzine", koffer: 519, trek: 1800, extra: ["trekhaak"], foto: "/cars/volvo-v60-b4.jpg" }),
  fossiel({ slug: "peugeot-3008-hybrid136", merk: "Peugeot", model: "3008", uitv: "Hybrid 136", carrosserie: "suv", segment: "SUV middenklasse", kw: 100, prijs: 40900, co2: 124, verbruik: 5.5, brandstof: "benzine", koffer: 520, trek: 1200, extra: ["trekhaak"], foto: "/cars/peugeot-3008-hybrid136.jpg" }),
  fossiel({ slug: "dacia-duster", merk: "Dacia", model: "Duster", uitv: "TCe 130 mild hybrid", carrosserie: "suv", segment: "SUV compact", kw: 96, prijs: 26900, co2: 134, verbruik: 5.9, brandstof: "benzine", koffer: 517, trek: 1500, extra: ["trekhaak"], foto: "/cars/dacia-duster.jpg" }),
  fossiel({ slug: "ford-puma", merk: "Ford", model: "Puma", uitv: "1.0 EcoBoost mHEV", carrosserie: "suv", segment: "SUV compact", kw: 92, prijs: 30900, co2: 130, verbruik: 5.7, brandstof: "benzine", koffer: 456, trek: 1100, extra: ["trekhaak"], foto: "/cars/ford-puma.jpg" }),
  fossiel({ slug: "opel-astra-tsi", merk: "Opel", model: "Astra", uitv: "1.2 Turbo", carrosserie: "hatchback", segment: "Compacte hatchback", kw: 96, prijs: 33900, co2: 128, verbruik: 5.7, brandstof: "benzine", koffer: 422, trek: 1200, extra: ["trekhaak"], foto: "/cars/opel-astra-tsi.jpg" }),
];

/**
 * De volledige catalogus, gesorteerd zoals ze getoond wordt: elektrisch eerst,
 * dan plug-in, dan hybride, dan verbranding. Die volgorde is geen voorkeur maar
 * een afspiegeling van de aftrekkalender: wie vandaag bestelt, houdt bij de
 * eerste groep 100% aftrek en bij de laatste 0%.
 */
export const DEFAULT_CATALOGUS: CatalogCar[] = [
  ...ELEKTRISCH,
  ...PLUGIN,
  ...HYBRIDE,
  ...VERBRANDING,
];

/**
 * De modellen waarvan een genoemde bron de fiscaal beslissende velden dekt.
 *
 * Dit is wat de catalogus standaard toont. Afgeleid en niet met de hand
 * bijgehouden: wie hierboven een `bron` toevoegt, ziet het model meteen
 * verschijnen, en niemand kan de twee lijsten uit elkaar laten lopen.
 */
export const GEVERIFIEERDE_MODELLEN: CatalogCar[] = DEFAULT_CATALOGUS.filter(
  (c) => c.zekerheid === "geverifieerd",
);

/** Opzoeken op de stabiele sleutel in plaats van op het volgnummer. */
export function catalogusPerSlug(slug: string): CatalogCar | null {
  return DEFAULT_CATALOGUS.find((c) => c.slug === slug) ?? null;
}
