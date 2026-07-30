import { fiscaleCo2 } from "./hybride";
import type {
  Bestelperiode,
  Brandstof,
  FiscaleContext,
  JaarResultaat,
  Kostenverdeling,
  Projectie,
  TaxParameters,
  Vehicle,
  Voertuigtype,
} from "./types";

/** Standaard BTW-tarief op autokosten in België. */
const BTW_TARIEF_STANDAARD = 21;

/** De BTW-aftrek op autokosten is wettelijk begrensd op 50%. */
const BTW_AFTREK_PLAFOND = 50;

/** Forfaitair beroepsgebruik wanneer de onderneming voor het 35%-forfait kiest. */
const BTW_FORFAIT = 35;

/**
 * Rekenkern van Autofiscaliteit. De formules volgen de Belgische wetgeving:
 * de aftrekkalender en het voordeel van alle aard uit het WIB 92, de
 * uitdoofregeling uit de programmawet van 2023 en de CO2-solidariteitsbijdrage
 * uit de RSZ-instructies.
 */

/**
 * Coëfficiënt in de gramformule per brandstoftype (FOD Financiën, 2025).
 *
 * Geëxporteerd zodat /fiscaal-kader hem kan tonen. De coëfficiënt uit de formule
 * terugrekenen leek eerst eleganter, maar dat werkt op hele grammen en gaf voor
 * CNG 0,91 in plaats van 0,9.
 */
export const GRAMFORMULE_COEFF: Record<Brandstof, number> = {
  diesel: 1,
  benzine: 0.95,
  lpg: 0.95,
  elektrisch: 0.95,
  cng: 0.9,
};

/** Aftrektrekterm in de RSZ-CO₂-formule per brandstoftype (RSZ-instructies). */
const RSZ_CONSTANTE: Record<Brandstof, number> = {
  diesel: 600,
  benzine: 768,
  cng: 768,
  lpg: 990,
  elektrisch: 768,
};

/** Datum vanaf wanneer het verhoogde RSZ-regime (hoger minimum + multiplicator) geldt. */
const RSZ_VERHOGING_VANAF = "2023-07-01";

/**
 * Forfaitaire uitstoot voor de RSZ-bijdrage wanneer de CO2-waarde ontbreekt.
 * De RSZ-instructies noemen 182 g/km voor benzine en 165 g/km voor diesel; LPG
 * en CNG volgen het benzinespoor.
 */
const RSZ_CO2_FORFAIT: Record<Brandstof, number> = {
  diesel: 165,
  benzine: 182,
  lpg: 182,
  cng: 182,
  elektrisch: 182,
};

/** Uitstoot vanaf wanneer de aftrek forfaitair op 40% wordt afgetopt. */
export const HOGE_UITSTOOT_VANAF = 200;

/** Aftrekpercentage bij een uitstoot van 200 g/km of meer, en bij onbekende uitstoot. */
export const AFTREK_HOGE_UITSTOOT = 40;

/**
 * Laatste gebruiksjaar waarin het overgangsregime nog een minimumaftrek van 50%
 * kent. Vanaf aanslagjaar 2026 (belastbaar tijdperk vanaf 1/1/2025) valt dat
 * minimum weg en telt enkel nog het dalende maximumplafond.
 */
export const LAATSTE_JAAR_MET_MINIMUMAFTREK = 2024;

/** Plafond op het brandstofdeel van een plug-inhybride (art. 66 §1 WIB92). */
export const PHEV_BRANDSTOF_PLAFOND = 50;

/** Vanaf dit gebruiksjaar is het brandstofdeel van elke PHEV niet meer aftrekbaar. */
export const PHEV_BRANDSTOF_NUL_VANAF = 2028;

export function parametersVoorJaar(ctx: FiscaleContext, jaar: number): TaxParameters {
  const exact = ctx.parameters.find((p) => p.year === jaar);
  if (exact) return exact;
  // Buiten de gekende jaren: neem het dichtstbijzijnde gekende jaar.
  const gesorteerd = [...ctx.parameters].sort((a, b) => a.year - b.year);
  if (jaar < gesorteerd[0].year) return gesorteerd[0];
  return gesorteerd[gesorteerd.length - 1];
}

/** Bepaalt onder welke bestelperiode (en dus welk regime) een besteldatum valt. */
export function bestelperiodeVoorDatum(ctx: FiscaleContext, besteldatum: string): Bestelperiode {
  const d = besteldatum;
  const match = ctx.periodes.find(
    (p) => (p.van === null || d >= p.van) && (p.tot === null || d <= p.tot),
  );
  if (!match) throw new Error(`Geen bestelperiode gevonden voor datum ${besteldatum}`);
  return match;
}

/**
 * Gramformule (art. 66 WIB92): 120% − (0,5% × coëfficiënt × CO₂).
 *
 * Twee begrenzingen horen bij de formule zelf. Bovenaan 100%, en vanaf 200 g/km
 * of bij een onbekende uitstoot een aftopping op 40%. Onderaan geldt een
 * minimum van 50%, maar dat minimum verdwijnt in het overgangsregime vanaf
 * aanslagjaar 2026; daarvoor dient `metMinimum`.
 */
export function gramformule(
  brandstof: Brandstof,
  co2: number | null,
  opties: { metMinimum?: boolean } = {},
): number {
  // Zonder waarde op het attest is er geen formule om toe te passen; de wet
  // legt dan het forfait op, ook wanneer de ondergrens niet meer geldt.
  if (co2 === null) return AFTREK_HOGE_UITSTOOT;

  const pct = 120 - 0.5 * GRAMFORMULE_COEFF[brandstof] * co2;
  const plafond = co2 >= HOGE_UITSTOOT_VANAF ? AFTREK_HOGE_UITSTOOT : 100;
  const ondergrens = (opties.metMinimum ?? true) ? 50 : 0;
  return Math.min(plafond, Math.max(ondergrens, pct));
}

/**
 * Het overgangsregime: wagens besteld tussen 1 juli 2023 en 31 december 2025.
 * Wordt afgeleid uit de periodegrenzen zelf, zodat de code niet vasthangt aan
 * de codenaam van een rij in de databank.
 *
 * Geëxporteerd omdat `regimes.ts` de matrix voor de uitlegpagina's hierop bouwt:
 * of de gramformule nog meespeelt, is precies wat die pagina's moeten vertellen,
 * en dat elders nabouwen zou een tweede waarheid maken.
 */
export function isOvergangsregime(periode: Bestelperiode): boolean {
  return (
    periode.van !== null &&
    periode.van >= "2023-07-01" &&
    periode.tot !== null &&
    periode.tot <= "2025-12-31"
  );
}

/** Een plafond uit de aftrekkalender, met de herkomst van dat getal erbij. */
interface Kalenderplafond {
  pct: number;
  /**
   * True wanneer dit percentage niet van het gebruiksjaar afhangt: een regel voor
   * de hele gebruiksduur, of geen regel (en dan levenslang nul). Dat verschil is
   * geen finesse maar de kern van de uitleg: "0% levenslang omdat je vanaf 2026
   * besteld hebt" is een ander verhaal dan "0% omdat de uitdoofkalender in 2028
   * op nul staat".
   */
  levenslang: boolean;
}

/**
 * Het maximumplafond uit de aftrekkalender voor deze wagen en dit gebruiksjaar.
 * Voor een elektrische wagen is dat meteen het definitieve percentage; voor een
 * verbrandingswagen in het overgangsregime is het enkel een bovengrens.
 *
 * Geëxporteerd om dezelfde reden als `isOvergangsregime`: het onderscheid tussen
 * "dit is het percentage" en "dit is enkel een plafond" is wat de uitlegpagina's
 * vandaag verzwijgen, en het hoort uit één bron te komen.
 */
export function plafondUitKalender(
  ctx: FiscaleContext,
  voertuigtype: Voertuigtype,
  periode: Bestelperiode,
  gebruiksjaar: number,
): Kalenderplafond {
  const regels = ctx.regels.filter(
    (r) => r.voertuigtype === voertuigtype && r.bestelperiode === periode.code,
  );
  const exact = regels.find((r) => r.gebruiksjaar === gebruiksjaar);
  if (exact) return { pct: exact.aftrek_pct, levenslang: false };
  const levenslang = regels.find((r) => r.gebruiksjaar === null);
  if (levenslang) return { pct: levenslang.aftrek_pct, levenslang: true };
  // Uitdoofkalender: vóór het eerste kalenderjaar geldt de hoogste trap,
  // na het laatste kalenderjaar de laagste (0%).
  const perJaar = regels
    .filter((r) => r.gebruiksjaar !== null)
    .sort((a, b) => (a.gebruiksjaar as number) - (b.gebruiksjaar as number));
  if (perJaar.length === 0) return { pct: 0, levenslang: true };
  if (gebruiksjaar < (perJaar[0].gebruiksjaar as number)) {
    return { pct: perJaar[0].aftrek_pct, levenslang: false };
  }
  return { pct: perJaar[perJaar.length - 1].aftrek_pct, levenslang: false };
}

/** Waar het aftrekpercentage vandaan komt. */
export type Aftrekherkomst = "gramformule" | "kalenderplafond" | "levenslang_nul";

/**
 * Het aftrekpercentage mét de weg ernaartoe.
 *
 * `aftrekPct` gaf alleen het getal terug, en daarmee viel de enige vraag die de
 * gebruiker echt stelt buiten de rekenkern: waaróm is het dit percentage? Het
 * antwoord zat er al in (welk regime, welk plafond, of de formule of de kalender
 * bond) maar werd bij het teruggeven weggegooid, waardoor de interface het zou
 * moeten naspelen. Twee formules die hetzelfde horen te zeggen lopen uiteen; deze
 * struct houdt het bij één.
 */
export interface Aftrekopbouw {
  pct: number;
  herkomst: Aftrekherkomst;
  periode: Bestelperiode;
  /**
   * Uitkomst van de gramformule, of null wanneer ze niet van toepassing is: bij
   * een elektrische wagen en buiten het overgangsregime speelt ze niet mee.
   */
  gramformulePct: number | null;
  /** Plafond uit de aftrekkalender, of null onder het regime van vóór juli 2023. */
  plafondPct: number | null;
  /** De CO₂ waarmee gerekend is, dus na de valse-hybridecorrectie. */
  gerekendeCo2: number | null;
  /** Coëfficiënt van de gramformule voor deze brandstof: diesel 1, benzine 0,95, cng 0,9. */
  gramCoefficient: number;
  /** True wanneer de wettelijke ondergrens van 50% in dit gebruiksjaar nog gold. */
  metMinimum: boolean;
}

/**
 * Aftrekbaarheid in de vennootschapsbelasting voor een wagen in een bepaald
 * gebruiksjaar. Drie regimes, allemaal opgehangen aan de aanschaffingsdatum,
 * dat wil zeggen de datum van de bestelbon of van het leasecontract.
 *
 * - Besteld vóór 1 juli 2023: de gramformule, levenslang behouden.
 * - Besteld tussen 1 juli 2023 en 31 december 2025: nog steeds de gramformule,
 *   maar afgetopt op een plafond dat per aanslagjaar zakt van 75% naar 0%. Dat
 *   de formule blijft meetellen is geen detail: een benzinewagen van 120 g komt
 *   op 63% uit en zit daarmee in aanslagjaar 2026 onder het plafond van 75%.
 * - Besteld vanaf 1 januari 2026: verbrandingswagens vallen op 0%, elektrische
 *   wagens houden levenslang het percentage van hun besteljaar.
 */
export function aftrekOpbouw(
  ctx: FiscaleContext,
  vehicle: Vehicle,
  gebruiksjaar: number,
): Aftrekopbouw {
  const periode = bestelperiodeVoorDatum(ctx, vehicle.besteldatum);
  const gerekendeCo2 = fiscaleCo2(vehicle).co2;
  const gramCoefficient = GRAMFORMULE_COEFF[vehicle.brandstof];

  if (periode.code === "voor_07_2023") {
    const pct = gramformule(vehicle.brandstof, gerekendeCo2);
    return {
      pct,
      herkomst: "gramformule",
      periode,
      gramformulePct: pct,
      plafondPct: null,
      gerekendeCo2,
      gramCoefficient,
      metMinimum: true,
    };
  }

  const plafond = plafondUitKalender(ctx, vehicle.voertuigtype, periode, gebruiksjaar);

  if (vehicle.voertuigtype === "BEV" || !isOvergangsregime(periode)) {
    return {
      pct: plafond.pct,
      herkomst: plafond.pct === 0 && plafond.levenslang ? "levenslang_nul" : "kalenderplafond",
      periode,
      gramformulePct: null,
      plafondPct: plafond.pct,
      gerekendeCo2,
      gramCoefficient,
      metMinimum: false,
    };
  }

  const metMinimum = gebruiksjaar <= LAATSTE_JAAR_MET_MINIMUMAFTREK;
  const gramformulePct = gramformule(vehicle.brandstof, gerekendeCo2, { metMinimum });

  return {
    pct: Math.min(plafond.pct, gramformulePct),
    // Bij gelijkspel wint de formule als verklaring: zij is de regel, het plafond
    // is er de begrenzing van.
    herkomst: gramformulePct <= plafond.pct ? "gramformule" : "kalenderplafond",
    periode,
    gramformulePct,
    plafondPct: plafond.pct,
    gerekendeCo2,
    gramCoefficient,
    metMinimum,
  };
}

/** Alleen het percentage. Zie `aftrekOpbouw` voor de weg ernaartoe. */
export function aftrekPct(ctx: FiscaleContext, vehicle: Vehicle, gebruiksjaar: number): number {
  return aftrekOpbouw(ctx, vehicle, gebruiksjaar).pct;
}

/**
 * Aftrekbaarheid van de elektriciteit om de wagen te laden.
 *
 * Laadstroom volgt niet de gramformule maar het afbouwpad van de elektrische
 * wagens, en dat geldt ook voor het elektrische deel van een plug-inhybride. Een
 * PHEV besteld in 2026 is zelf 0% aftrekbaar, maar zijn laadstroom blijft
 * volledig aftrekbaar. Voor andere wagens is er geen apart pad en volgt de
 * elektriciteit gewoon de wagen.
 */
export function aftrekPctElektriciteit(
  ctx: FiscaleContext,
  vehicle: Vehicle,
  gebruiksjaar: number,
): number {
  if (vehicle.voertuigtype !== "PHEV") return aftrekPct(ctx, vehicle, gebruiksjaar);
  const periode = bestelperiodeVoorDatum(ctx, vehicle.besteldatum);
  if (periode.code === "voor_07_2023") return aftrekPct(ctx, vehicle, gebruiksjaar);
  return plafondUitKalender(ctx, "BEV", periode, gebruiksjaar).pct;
}

/**
 * Aftrekbaarheid van het brandstofdeel van een plug-inhybride. Afgetopt op 50%
 * en vanaf gebruiksjaar 2028 nul, ook voor PHEV's die vóór 2026 besteld zijn.
 * De regeling is aangekondigd maar nog niet volledig uitgeklaard; ze is daarom
 * apart gehouden en niet in de gramformule verwerkt.
 */
export function aftrekPctBrandstofPhev(basisPct: number, gebruiksjaar: number): number {
  if (gebruiksjaar >= PHEV_BRANDSTOF_NUL_VANAF) return 0;
  return Math.min(PHEV_BRANDSTOF_PLAFOND, basisPct);
}

/** Leeftijdscorrectie VAA: 100% in het eerste jaar, −6% per jaar, minimum 70%. */
export function leeftijdscorrectie(gebruiksjaar: number, jaarIngebruikname: number): number {
  const verstreken = Math.max(0, gebruiksjaar - jaarIngebruikname);
  return Math.max(70, 100 - 6 * verstreken) / 100;
}

/**
 * CO₂-percentage voor de VAA-berekening: 5,5% bij de referentie-CO₂,
 * +0,1% per gram daarboven, begrensd tussen 4% en 18%.
 */
export function co2Percentage(params: TaxParameters, brandstof: Brandstof, co2: number): number {
  const referentie = brandstof === "diesel" ? params.ref_co2_diesel : params.ref_co2_benzine;
  const pct = params.co2_pct_basis + (co2 - referentie) * params.co2_pct_per_gram;
  return Math.min(params.co2_pct_max, Math.max(params.co2_pct_min, pct));
}

/** VAA = cataloguswaarde × 6/7 × leeftijdscorrectie × CO₂-percentage, met wettelijk minimum. */
export function voordeelAlleAard(
  ctx: FiscaleContext,
  vehicle: Vehicle,
  gebruiksjaar: number,
): number {
  const params = parametersVoorJaar(ctx, gebruiksjaar);
  const jaarIngebruikname = new Date(vehicle.eerste_ingebruikname).getFullYear();
  // Een valse hybride wordt ook hier met zijn gecorrigeerde uitstoot gewogen.
  // Ontbreekt de uitstoot volledig, dan blijft de waarde uit het dossier staan:
  // voor het VAA bestaat geen forfait, de waarde is verplicht op te zoeken.
  const co2 = fiscaleCo2(vehicle).co2 ?? vehicle.co2;
  const vaa =
    vehicle.cataloguswaarde *
    (6 / 7) *
    leeftijdscorrectie(gebruiksjaar, jaarIngebruikname) *
    (co2Percentage(params, vehicle.brandstof, co2) / 100);
  return Math.max(params.vaa_minimum, vaa);
}

/**
 * CO₂-solidariteitsbijdrage RSZ per maand:
 * ((CO₂ × 9 − constante) / 12) × indexcoëfficiënt × multiplicator,
 * met een minimumbijdrage als ondergrens. De constante hangt af van de
 * brandstof (diesel 600, benzine/CNG 768, LPG 990). Voor niet-emissievrije
 * wagens besteld vanaf 1/7/2023 geldt het verhoogde regime: een hogere
 * multiplicator (die per bijdragejaar oploopt) en een hoger minimum. Volledig
 * elektrische wagens en wagens besteld vóór 1/7/2023 vallen op het basisminimum
 * zonder multiplicator.
 */
export function rszBijdrageMaand(
  ctx: FiscaleContext,
  vehicle: Vehicle,
  gebruiksjaar: number,
): number {
  const params = parametersVoorJaar(ctx, gebruiksjaar);
  const verhoogdRegime =
    vehicle.voertuigtype !== "BEV" && vehicle.besteldatum >= RSZ_VERHOGING_VANAF;
  const multiplicator = verhoogdRegime ? params.rsz_multiplicator : 1;
  const minimum = verhoogdRegime ? params.rsz_min_maand : params.rsz_min_basis;
  // Zonder CO2-waarde legt de RSZ een forfait op. Dat forfait vervangt de
  // uitstoot in de formule; de valse-hybridecorrectie speelt hier niet, de RSZ
  // rekent met de waarde van het gelijkvormigheidsattest.
  const co2 = vehicle.co2_onbekend ? RSZ_CO2_FORFAIT[vehicle.brandstof] : vehicle.co2;
  const basis =
    ((co2 * 9 - RSZ_CONSTANTE[vehicle.brandstof]) / 12) * params.rsz_index * multiplicator;
  return Math.max(minimum, basis);
}

/**
 * Percentage van de BTW op de autokosten dat teruggevorderd mag worden.
 *
 * De algemene regel (art. 45 §2 WBTW) begrenst de aftrek op **50%**, en nooit
 * meer dan het werkelijke beroepsgebruik. De onderneming kiest per wagen tussen
 * het 35%-forfait en het werkelijke beroepsgebruik; wie niets kiest, vordert
 * niets terug.
 */
export function btwAftrekPct(vehicle: Vehicle): number {
  switch (vehicle.btw_methode ?? "geen") {
    case "forfait35":
      return BTW_FORFAIT;
    case "werkelijk":
      return Math.min(BTW_AFTREK_PLAFOND, Math.max(0, vehicle.beroepsgebruik_pct));
    default:
      return 0;
  }
}

/**
 * Splitst de jaarlijkse kosten op naar het aftrekregime dat erop van toepassing
 * is. Niet elke autokost volgt hetzelfde percentage, en dat verschil loopt op.
 *
 * `jaarlijkse_autokosten` is inclusief BTW. Wat teruggevorderd wordt is geen
 * kost meer en gaat er dus eerst af. Van wat overblijft:
 *
 * - **intrest en laadpaal** vallen buiten de beperking van artikel 66 WIB92 en
 *   blijven volledig aftrekbaar;
 * - **laadstroom** volgt het afbouwpad van de elektrische wagens, niet de
 *   gramformule;
 * - het **brandstofdeel van een plug-inhybride** heeft een eigen plafond;
 * - **verkeersboetes** zijn nooit aftrekbaar (art. 53 WIB92);
 * - de rest volgt het aftrekpercentage van de wagen zelf.
 */
export function kostenBasis(vehicle: Vehicle): Kostenverdeling {
  const tarief = vehicle.btw_tarief ?? BTW_TARIEF_STANDAARD;
  const aftrek = btwAftrekPct(vehicle) / 100;
  // De autokosten zijn inclusief BTW, dus het BTW-deel is kosten × t/(100+t).
  const btwInKosten = vehicle.jaarlijkse_autokosten * (tarief / (100 + tarief));
  const btwTeruggevorderd = btwInKosten * aftrek;

  const financiering = Math.max(0, vehicle.kosten_financiering ?? 0);
  const laadpaal = Math.max(0, vehicle.laadpaal_jaarkost ?? 0);
  const laadstroom = Math.max(0, vehicle.laadstroom_jaar ?? 0);
  const boetes = Math.max(0, vehicle.kosten_boetes ?? 0);
  const brandstofPhev =
    vehicle.voertuigtype === "PHEV" ? Math.max(0, vehicle.kosten_brandstof ?? 0) : 0;

  const naBtw = vehicle.jaarlijkse_autokosten - btwTeruggevorderd;
  // De financierings- en brandstofkosten zitten in jaarlijkse_autokosten en
  // worden er hier uit gelicht; laadpaal, laadstroom en boetes komen erbovenop.
  const kostenVolledigAftrekbaar = Math.min(naBtw, financiering) + laadpaal;
  const rest = Math.max(0, naBtw - financiering);
  const kostenBrandstofPhev = Math.min(rest, brandstofPhev);
  const kostenWagen = rest - kostenBrandstofPhev;

  return {
    btwTeruggevorderd,
    kostenWagen,
    kostenElektriciteit: laadstroom,
    kostenBrandstofPhev,
    kostenVolledigAftrekbaar,
    kostenNietAftrekbaar: boetes,
    kostenOnderworpen: kostenWagen + laadstroom + kostenBrandstofPhev,
    kostenTotaal: kostenWagen + laadstroom + kostenBrandstofPhev + kostenVolledigAftrekbaar + boetes,
  };
}

/** Volledige fiscale berekening voor één gebruiksjaar (cf. Bijlage 1 van het rapport). */
export function berekenJaar(
  ctx: FiscaleContext,
  vehicle: Vehicle,
  gebruiksjaar: number,
  opties?: { kmoTarief?: boolean },
): JaarResultaat {
  const params = parametersVoorJaar(ctx, gebruiksjaar);
  const aftrek = aftrekPct(ctx, vehicle, gebruiksjaar);

  // De eigen bijdrage van de werknemer verlaagt het belastbare voordeel, maar
  // pas nádat het wettelijk minimum is toegepast. Ze kan het VAA niet onder nul
  // duwen.
  const vaaBruto = voordeelAlleAard(ctx, vehicle, gebruiksjaar);
  const eigenBijdrageJaar = Math.max(0, vehicle.eigen_bijdrage_maand ?? 0) * 12;
  const vaa = Math.max(0, vaaBruto - eigenBijdrageJaar);

  const verdeling = kostenBasis(vehicle);
  const { btwTeruggevorderd, kostenOnderworpen, kostenVolledigAftrekbaar, kostenTotaal } = verdeling;

  // Elke kostensoort met haar eigen percentage. Boetes tellen voor honderd
  // procent mee: ze zijn geen beperkte autokost maar een verworpen uitgave.
  const pctElektriciteit = aftrekPctElektriciteit(ctx, vehicle, gebruiksjaar);
  const pctBrandstofPhev = aftrekPctBrandstofPhev(aftrek, gebruiksjaar);
  const nietAftrekbaar =
    (1 - aftrek / 100) * verdeling.kostenWagen +
    (1 - pctElektriciteit / 100) * verdeling.kostenElektriciteit +
    (1 - pctBrandstofPhev / 100) * verdeling.kostenBrandstofPhev +
    verdeling.kostenNietAftrekbaar;
  const vuPct = vehicle.tankkaart ? params.vu_pct_met_kaart : params.vu_pct_zonder_kaart;
  const vuUitVaa = (vuPct / 100) * vaa;
  const verworpenUitgaven = nietAftrekbaar + vuUitVaa;
  const tarief = opties?.kmoTarief ? params.kmo_tarief : params.venb_tarief;
  const extraVenB = verworpenUitgaven * (tarief / 100);
  const rszMaand = rszBijdrageMaand(ctx, vehicle, gebruiksjaar);
  const rszJaar = rszMaand * 12;
  const fiscaleMeerkost = extraVenB + rszJaar;
  return {
    gebruiksjaar,
    aftrekPct: aftrek,
    vaa,
    nietAftrekbaar,
    vuUitVaa,
    verworpenUitgaven,
    extraVenB,
    rszMaand,
    rszJaar,
    fiscaleMeerkost,
    // De eigen bijdrage is een opbrengst voor de vennootschap en verlaagt dus
    // de werkelijke kost van de wagen.
    totaleKost: kostenTotaal + fiscaleMeerkost - eigenBijdrageJaar,
    vaaBruto,
    eigenBijdrageJaar,
    btwTeruggevorderd,
    kostenOnderworpen,
    kostenVolledigAftrekbaar,
    kostenverdeling: verdeling,
    aftrekPctElektriciteit: pctElektriciteit,
    aftrekPctBrandstof: pctBrandstofPhev,
  };
}

/** Meerjarenprojectie (standaard 4 gebruiksjaren) met toepassing van de uitdoofkalender. */
export function berekenProjectie(
  ctx: FiscaleContext,
  vehicle: Vehicle,
  startjaar: number,
  aantalJaren = 4,
  opties?: { kmoTarief?: boolean },
): Projectie {
  const eersteJaar = Math.max(startjaar, new Date(vehicle.eerste_ingebruikname).getFullYear());
  const jaren: JaarResultaat[] = [];
  for (let i = 0; i < aantalJaren; i++) {
    jaren.push(berekenJaar(ctx, vehicle, eersteJaar + i, opties));
  }
  return {
    vehicle,
    jaren,
    totaleKost: jaren.reduce((s, j) => s + j.totaleKost, 0),
    totaleVU: jaren.reduce((s, j) => s + j.verworpenUitgaven, 0),
    gemiddeldeAftrekPct: jaren.reduce((s, j) => s + j.aftrekPct, 0) / jaren.length,
  };
}
