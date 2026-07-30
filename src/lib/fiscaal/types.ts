export type Voertuigtype = "BEV" | "PHEV" | "HEV" | "fossiel";
export type Brandstof = "elektrisch" | "diesel" | "benzine" | "lpg" | "cng";

/**
 * Methode voor de BTW-aftrek op autokosten (circulaire E.T. 119.650).
 * `geen` betekent dat er geen BTW teruggevorderd wordt; dat is de standaard,
 * zodat een bestaande wagen zonder deze keuze exact hetzelfde blijft rekenen.
 */
export type BtwMethode = "geen" | "forfait35" | "werkelijk";

/**
 * Hoe de wagen gefinancierd wordt. Fiscaal maakt dit één belangrijk verschil:
 * de financieringskosten (de intrest) vallen buiten de aftrekbeperking van
 * artikel 66 WIB92 en blijven dus volledig aftrekbaar.
 */
export type Financieringsvorm =
  | "operationele_leasing"
  | "financiele_leasing"
  | "renting"
  | "aankoop";

/** Fiscale parameters per kalenderjaar (tabel tax_parameters). */
export interface TaxParameters {
  year: number;
  vaa_minimum: number;
  ref_co2_benzine: number;
  ref_co2_diesel: number;
  co2_pct_min: number;
  co2_pct_max: number;
  co2_pct_basis: number;
  co2_pct_per_gram: number;
  rsz_index: number;
  rsz_min_maand: number;
  /** Basisminimum RSZ-bijdrage (wagens besteld vóór 1/7/2023 en alle BEV). */
  rsz_min_basis: number;
  /** RSZ-multiplicator voor niet-BEV besteld vanaf 1/7/2023, per bijdragejaar. */
  rsz_multiplicator: number;
  venb_tarief: number;
  kmo_tarief: number;
  kmo_min_bezoldiging: number;
  vu_pct_met_kaart: number;
  vu_pct_zonder_kaart: number;
}

/** Bestelperiode met bijhorende RSZ-multiplicator (tabel bestelperiodes). */
export interface Bestelperiode {
  code: string;
  label: string;
  van: string | null;
  tot: string | null;
  rsz_multiplicator: number;
  volgorde: number;
}

/** Eén regel uit de aftrekkalender (tabel deduction_rules). gebruiksjaar null = hele gebruiksduur. */
export interface DeductionRule {
  voertuigtype: Voertuigtype;
  bestelperiode: string;
  gebruiksjaar: number | null;
  aftrek_pct: number;
}

export type Categorie = "vloot" | "kandidaat";

/** Invoer per wagen (tabel vehicles, cf. Bijlage 4 tabblad 2 van het rapport). */
export interface Vehicle {
  id: string;
  omschrijving: string;
  werknemer: string | null;
  kenteken: string | null;
  categorie: Categorie;
  merk: string | null;
  model: string | null;
  catalog_id: number | null;
  voertuigtype: Voertuigtype;
  brandstof: Brandstof;
  besteldatum: string;
  eerste_ingebruikname: string;
  co2: number;
  cataloguswaarde: number;
  jaarlijkse_autokosten: number;
  aankoopprijs: number | null;
  tankkaart: boolean;
  beroepsgebruik_pct: number;
  thuislaadpunt: boolean;
  km_per_jaar: number | null;
  flex_score: number;
  restwaarde_score: number;

  /**
   * De velden hieronder zijn optioneel en defaulten allemaal naar "verandert
   * niets". Een wagen die ze niet invult, rekent exact zoals voordien. Dat is
   * bewust: de referentietests in engine.test.ts valideren tegen een uitgewerkt
   * dossier en mogen niet van uitkomst wijzigen door een uitbreiding.
   */

  /** Deel van de jaarlijkse autokosten dat intrest is. Volledig aftrekbaar. */
  kosten_financiering?: number | null;
  financieringsvorm?: Financieringsvorm | null;

  /** BTW-aftrek op de autokosten. Zonder keuze wordt er niets teruggevorderd. */
  btw_methode?: BtwMethode | null;
  /** BTW-tarief op de autokosten, in procent. Standaard 21. */
  btw_tarief?: number | null;

  /** Maandelijkse eigen bijdrage van de werknemer. Verlaagt het VAA. */
  eigen_bijdrage_maand?: number | null;

  /** Jaarkost van een laadpunt. Valt buiten de aftrekbeperking voor wagens. */
  laadpaal_jaarkost?: number | null;
  /** Terugbetaalde laadstroom per jaar. Volgt de aftrekbaarheid van de wagen. */
  laadstroom_jaar?: number | null;

  /** Einde van het lease- of financieringscontract, voor de vervangplanner. */
  einde_contract?: string | null;
}

/** Carrosserievorm. Bepaalt mee het praktische nut en de illustratie. */
export type Carrosserie =
  | "hatchback"
  | "berline"
  | "break"
  | "suv"
  | "mpv"
  | "coupe"
  | "bestelwagen";

export type Aandrijving = "voor" | "achter" | "vierwiel";

/** Ruwe indeling van de onderhoudskost, van elektrisch tot zware verbranding. */
export type Onderhoudsklasse = "laag" | "midden" | "hoog";

/**
 * Hoe hard de cijfers van een catalogusmodel zijn.
 *
 * `geverifieerd` betekent dat de **fiscaal beslissende** velden tegen een
 * genoemde bron gelegd zijn: de cataloguswaarde bij een elektrische wagen (de
 * CO₂ is daar per definitie 0) en de CO₂ bij een plug-in hybride, want die twee
 * bepalen het VAA, de verworpen uitgaven en de RSZ-bijdrage.
 *
 * `raming` betekent: een plausibel fabrikantscijfer dat niemand nagekeken heeft.
 * Zo'n cijfer is niet waardeloos — het is de goede orde van grootte — maar het
 * hoort niet als vaststaand op het scherm te komen. Een fout cijfer is erger dan
 * een ontbrekend cijfer, en het onderscheid zichtbaar maken is het enige
 * alternatief voor het ene of het andere weglaten.
 */
export type Zekerheid = "geverifieerd" | "raming";

/**
 * Referentiemodel uit de wagencatalogus.
 *
 * De eerste elf velden komen overeen met de kolommen van de tabel `car_catalog`
 * en zijn altijd gevuld. Alles daaronder is optioneel en beschrijft de wagen
 * zelf: vermogen, verbruik, ruimte, trekgewicht. Optioneel is hier geen
 * slordigheid maar een noodzaak: rijen die nog uit de databank komen, hebben
 * die kolommen niet. De ingebouwde catalogus in catalogusdata.ts vult ze wel
 * allemaal in, en het kostenmodel in kosten.ts rekent ermee.
 */
export interface CatalogCar {
  id: number;
  merk: string;
  model: string;
  voertuigtype: Voertuigtype;
  brandstof: Brandstof;
  co2: number;
  cataloguswaarde: number;
  segment: string | null;
  populariteit_rang: number | null;
  opmerking: string | null;
  image_url: string | null;

  /** Stabiele sleutel, los van het volgnummer. */
  slug?: string;
  /** Motorisering of afwerking, bv. "Long Range AWD". */
  uitvoering?: string | null;

  /**
   * Het modeljaar waarop deze specificaties slaan. Zonder dit veld staat er
   * nergens uit welk bouwjaar de CO₂ en de cataloguswaarde komen, terwijl beide
   * per modeljaar verschillen. `modeljaar_tot` is null zolang het model loopt.
   */
  modeljaar?: number | null;
  modeljaar_tot?: number | null;
  /** Waar de cijfers vandaan komen, zodat ze na te kijken zijn. */
  bron?: string | null;
  /** Nagekeken tegen een bron, of niet. Zonder waarde: behandel als raming. */
  zekerheid?: Zekerheid | null;
  /**
   * Voorbehoud bij dit model, als sleutel onder `catalogus.voorbehoud_*` in
   * messages/*.json. Een sleutel en geen tekst, want dit hoort ook in het Frans
   * en het Engels te staan.
   */
  voorbehoud?: string | null;

  carrosserie?: Carrosserie | null;
  aandrijving?: Aandrijving | null;
  vermogen_kw?: number | null;

  /** l/100 km bij verbranding, kWh/100 km bij een elektrische wagen (WLTP). */
  verbruik?: number | null;
  /** Bruikbare batterijcapaciteit in kWh. */
  batterij_kwh?: number | null;
  /** Elektrische actieradius in km (WLTP). Bij een PHEV: het elektrische deel. */
  actieradius_km?: number | null;
  /** Piekvermogen snelladen in kW. */
  laadvermogen_dc_kw?: number | null;

  zitplaatsen?: number | null;
  koffer_liter?: number | null;
  /** Maximaal geremd trekgewicht in kg. 0 betekent: mag niet trekken. */
  trekgewicht_kg?: number | null;

  /** Verwachte restwaarde na vier jaar, in procent van de cataloguswaarde. */
  restwaarde_pct_4j?: number | null;
  onderhoudsklasse?: Onderhoudsklasse | null;
  /** Uitrusting die het praktisch nut bepaalt, bv. "trekhaak", "warmtepomp". */
  uitrusting?: string[];
}

/** Alle referentiedata die de rekenkern nodig heeft. */
export interface FiscaleContext {
  parameters: TaxParameters[];
  periodes: Bestelperiode[];
  regels: DeductionRule[];
}

/** Resultaat van de fiscale berekening voor één gebruiksjaar. */
export interface JaarResultaat {
  gebruiksjaar: number;
  aftrekPct: number;
  /** VAA na aftrek van de eigen bijdrage. Dit bedrag voedt de verworpen uitgaven. */
  vaa: number;
  nietAftrekbaar: number;
  vuUitVaa: number;
  verworpenUitgaven: number;
  extraVenB: number;
  rszMaand: number;
  rszJaar: number;
  /** extra VenB + RSZ-bijdrage */
  fiscaleMeerkost: number;
  /** autokosten na BTW-teruggave, plus de fiscale meerkost, min de eigen bijdrage */
  totaleKost: number;

  /** VAA vóór de eigen bijdrage van de werknemer. */
  vaaBruto: number;
  /** Eigen bijdrage van de werknemer over het jaar. */
  eigenBijdrageJaar: number;
  /** Teruggevorderde BTW op de autokosten. */
  btwTeruggevorderd: number;
  /** Kosten die onder de aftrekbeperking van artikel 66 WIB92 vallen. */
  kostenOnderworpen: number;
  /** Kosten die daarbuiten vallen en dus volledig aftrekbaar zijn. */
  kostenVolledigAftrekbaar: number;
}

export interface Projectie {
  vehicle: Vehicle;
  jaren: JaarResultaat[];
  totaleKost: number;
  totaleVU: number;
  gemiddeldeAftrekPct: number;
}
