export type Voertuigtype = "BEV" | "PHEV" | "HEV" | "fossiel";
export type Brandstof = "elektrisch" | "diesel" | "benzine" | "lpg" | "cng";

/** De drie gewesten. Bepalen de BIV, de verkeersbelasting en het CREG-laadtarief. */
export type Gewest = "vlaanderen" | "wallonie" | "brussel";

/**
 * Euronorm van het voertuig. Bepaalt de luchtcomponent in de BIV, de toegang
 * tot de lage-emissiezones en de drempel voor een valse hybride.
 */
export type Euronorm =
  | "euro0"
  | "euro1"
  | "euro2"
  | "euro3"
  | "euro4"
  | "euro5"
  | "euro6"
  | "euro6d"
  | "euro6e"
  | "euro6e-bis"
  | "euro6e-ter"
  | "euro7";

/** Euronormen van oud naar nieuw. De index is de enige zinvolle ordening. */
export const EURONORMEN: Euronorm[] = [
  "euro0",
  "euro1",
  "euro2",
  "euro3",
  "euro4",
  "euro5",
  "euro6",
  "euro6d",
  "euro6e",
  "euro6e-bis",
  "euro6e-ter",
  "euro7",
];

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

  /**
   * Verkeersboetes over het jaar. Een verworpen uitgave (art. 53 WIB92): niet
   * aftrekbaar, ongeacht het aftrekpercentage van de wagen.
   */
  kosten_boetes?: number | null;

  /**
   * Brandstofkosten binnen de jaarlijkse autokosten. Enkel van belang bij een
   * plug-inhybride: dat deel kent een eigen plafond van 50%, en vanaf 2028 nul.
   */
  kosten_brandstof?: number | null;

  /**
   * De CO2-uitstoot staat niet op het gelijkvormigheidsattest. De gramformule
   * valt dan terug op 40% en de RSZ-bijdrage op de forfaitaire waarde.
   */
  co2_onbekend?: boolean | null;

  /** Energiecapaciteit van de batterij in kWh. Nodig voor de valse-hybridetoets. */
  batterij_kwh?: number | null;
  /** Wagengewicht in kg. Nodig voor de valse-hybridetoets (kWh per 100 kg). */
  wagengewicht?: number | null;
  /** Euronorm, voor de CO2-drempel bij PHEV's, de BIV en de lage-emissiezones. */
  euronorm?: Euronorm | null;
  /**
   * CO2 van het overeenstemmende niet-plug-in model. Wordt gebruikt wanneer de
   * wagen een valse hybride is; ontbreekt die waarde, dan geldt CO2 × 2,5.
   */
  co2_equivalent?: number | null;

  /** Gewest van de titularis. Bepaalt BIV, verkeersbelasting en laadtarief. */
  gewest?: Gewest | null;
  /** Fiscale pk, voor de verkeersbelasting en de Brusselse BIV. */
  fiscale_pk?: number | null;
}

/** Referentiemodel uit de wagencatalogus (tabel car_catalog). */
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
}

/** Alle referentiedata die de rekenkern nodig heeft. */
export interface FiscaleContext {
  parameters: TaxParameters[];
  periodes: Bestelperiode[];
  regels: DeductionRule[];
}

/**
 * De jaarlijkse kosten opgesplitst naar het aftrekregime dat erop van toepassing
 * is. Zie `kostenBasis` in engine.ts voor de regels per post.
 */
export interface Kostenverdeling {
  /** Teruggevorderde BTW op de autokosten. Geen kost meer, dus vooraf afgetrokken. */
  btwTeruggevorderd: number;
  /** Kosten die het aftrekpercentage van de wagen zelf volgen. */
  kostenWagen: number;
  /** Laadstroom. Volgt het afbouwpad van de elektrische wagens. */
  kostenElektriciteit: number;
  /** Brandstofdeel van een plug-inhybride. Eigen plafond van 50%, nul vanaf 2028. */
  kostenBrandstofPhev: number;
  /** Intrest en laadpaal: buiten de aftrekbeperking, dus volledig aftrekbaar. */
  kostenVolledigAftrekbaar: number;
  /** Verkeersboetes: nooit aftrekbaar. */
  kostenNietAftrekbaar: number;
  /** Alles waarop een aftrekbeperking speelt: wagen + laadstroom + PHEV-brandstof. */
  kostenOnderworpen: number;
  /** Alle kosten samen, na BTW-teruggave. */
  kostenTotaal: number;
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
  /** De volledige opsplitsing per kostensoort, voor de detailweergave. */
  kostenverdeling: Kostenverdeling;
  /** Aftrekpercentage op de laadstroom. Wijkt af bij een plug-inhybride. */
  aftrekPctElektriciteit: number;
  /** Aftrekpercentage op het brandstofdeel van een plug-inhybride. */
  aftrekPctBrandstof: number;
}

export interface Projectie {
  vehicle: Vehicle;
  jaren: JaarResultaat[];
  totaleKost: number;
  totaleVU: number;
  gemiddeldeAftrekPct: number;
}
