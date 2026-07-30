import {
  AFTREK_HOGE_UITSTOOT,
  HOGE_UITSTOOT_VANAF,
  LAATSTE_JAAR_MET_MINIMUMAFTREK,
  aftrekPct,
  aftrekPctBrandstofPhev,
  aftrekPctElektriciteit,
  bestelperiodeVoorDatum,
  gramformule,
  isOvergangsregime,
  plafondUitKalender,
} from "./engine";
import { fiscaleCo2 } from "./hybride";
import type { Bestelperiode, Brandstof, FiscaleContext, Vehicle, Voertuigtype } from "./types";

/**
 * De aftrekregimes in een vorm die je kan tonen.
 *
 * Dit bestaat omdat de uitleg op de startpagina en op /fiscaal-kader met de hand
 * getypt was. Vier kaarten met "50 tot 100%", "Daalt naar 0%", "0% of 100%" en
 * "95% tot 67,5%": vier verschillende soorten uitspraken op dezelfde plek, geen
 * enkele verbonden met `defaults.ts`, en twee ervan onjuist. "0% of 100%" leest
 * als een muntworp terwijl het gewoon het verschil tussen verbranding en
 * elektrisch is, en "Daalt naar 0%" stelt de uitdoofkalender voor als de aftrek
 * zelf, terwijl die kalender in het overgangsregime alleen een *plafond* zet
 * waar de gramformule vaak al onder zit.
 *
 * Deze module rekent daarom zelf niets uit. Elke regel blijft in `engine.ts`
 * staan en wordt hier alleen opgevraagd. Wat hier wél gebeurt, is het
 * onderscheid expliciet maken dat de teksten verzwegen: is dit percentage een
 * vaste waarde, een plafond, of het resultaat van de gramformule.
 *
 * `regimes.test.ts` legt elke cel naast `aftrekPct` van een echte wagen. Loopt
 * de weergave ooit uit elkaar met de rekenkern, dan faalt die test.
 */

/** De drie kolommen die een lezer nodig heeft. HEV volgt fossiel, dus valt weg. */
export type Aandrijving = "BEV" | "PHEV" | "fossiel";

/** Representatieve brandstof per kolom, voor de gramformule. */
const BRANDSTOF_PER_AANDRIJVING: Record<Aandrijving, Brandstof> = {
  BEV: "elektrisch",
  PHEV: "benzine",
  fossiel: "diesel",
};

/**
 * Hoe het aftrekpercentage van een verbrandingswagen in deze periode tot stand
 * komt. Precies dit onderscheid ontbrak in de oude teksten.
 */
export type VerbrandingRegime =
  /** Eén percentage, de hele gebruiksduur. Zo staat 0% vanaf besteljaar 2026 erin. */
  | { soort: "vast"; pct: number }
  /**
   * De gramformule bepaalt het percentage en houdt het levenslang vast.
   * `ondergrens` en `bovengrens` spannen de band voor uitstoot onder 200 g/km;
   * `forfait` is de aftopping vanaf 200 g/km en bij onbekende uitstoot.
   */
  | { soort: "formule"; ondergrens: number; bovengrens: number; forfait: number }
  /**
   * Een plafond dat per gebruiksjaar zakt, met de gramformule eronder. Het
   * werkelijke percentage is het laagste van de twee, dus dit is een maximum.
   */
  | { soort: "plafondPerJaar"; stappen: Array<{ gebruiksjaar: number; plafond: number }> };

/** Eén bestelperiode, met wat ze voor elektrisch en voor verbranding betekent. */
export interface Regimeband {
  periodeCode: string;
  /** Eerste besteldag van de periode, of null bij een open begin. */
  van: string | null;
  /** Laatste besteldag van de periode, of null bij een open einde. */
  tot: string | null;
  /** Levenslang vast percentage voor een volledig elektrische wagen. */
  bev: number;
  verbranding: VerbrandingRegime;
  /** True voor de band waarin een bestelling van vandaag valt. */
  isVandaag: boolean;
}

/**
 * De gebruiksjaren waarover de uitdoofkalender iets zegt, uit de kalender zelf.
 * Hardcoderen zou de kalender een tweede keer opschrijven.
 */
function gebruiksjarenUitKalender(ctx: FiscaleContext, periodeCode: string): number[] {
  const jaren = ctx.regels
    .filter((r) => r.bestelperiode === periodeCode && r.gebruiksjaar !== null)
    .map((r) => r.gebruiksjaar as number);
  return [...new Set(jaren)].sort((a, b) => a - b);
}

/**
 * Het regime van een verbrandingswagen in deze periode, afgeleid uit de kalender.
 *
 * De volgorde van de drie gevallen volgt `aftrekPct`: eerst de oudste periode die
 * volledig op de formule loopt, dan het overgangsregime met zijn plafond, en pas
 * daarna de vaste percentages.
 */
function verbrandingsregime(
  ctx: FiscaleContext,
  periode: Bestelperiode,
  voertuigtype: Voertuigtype,
): VerbrandingRegime {
  const brandstof = voertuigtype === "PHEV" ? "benzine" : "diesel";

  // Besteld vóór 1 juli 2023: `aftrekPct` gaat rechtstreeks naar de gramformule
  // en behoudt daar de ondergrens van 50% voor de hele gebruiksduur.
  if (periode.code === "voor_07_2023") {
    return {
      soort: "formule",
      ondergrens: gramformule(brandstof, HOGE_UITSTOOT_VANAF - 1),
      bovengrens: gramformule(brandstof, 0),
      forfait: AFTREK_HOGE_UITSTOOT,
    };
  }

  const jaren = gebruiksjarenUitKalender(ctx, periode.code);
  if (isOvergangsregime(periode) && jaren.length > 0) {
    return {
      soort: "plafondPerJaar",
      stappen: jaren.map((gebruiksjaar) => ({
        gebruiksjaar,
        plafond: plafondUitKalender(ctx, voertuigtype, periode, gebruiksjaar),
      })),
    };
  }

  // Buiten het overgangsregime is het plafond meteen het percentage, en het
  // hangt niet van het gebruiksjaar af. Het eerste kalenderjaar uit de kalender
  // is dan een even goede vraag als elk ander.
  return {
    soort: "vast",
    pct: plafondUitKalender(ctx, voertuigtype, periode, jaren[0] ?? 2026),
  };
}

/**
 * Eén band per bestelperiode. Dit is de bron voor de tabel op de startpagina en
 * voor de matrix op /fiscaal-kader.
 *
 * `vandaag` is een parameter en geen `new Date()`: de startpagina wordt met ISR
 * gebouwd, en een testbare peildatum is hier belangrijker dan het gemak.
 */
export function regimebanden(ctx: FiscaleContext, vandaag: string): Regimeband[] {
  const huidige = bestelperiodeVoorDatum(ctx, vandaag);

  return [...ctx.periodes]
    .sort((a, b) => a.volgorde - b.volgorde)
    .map((periode) => ({
      periodeCode: periode.code,
      van: periode.van,
      tot: periode.tot,
      // Een elektrische wagen heeft geen gramformule nodig: bij 0 g/km loopt die
      // tegen het plafond van 100% aan, dus de kalender is het hele antwoord.
      bev:
        periode.code === "voor_07_2023"
          ? gramformule("elektrisch", 0)
          : plafondUitKalender(ctx, "BEV", periode, 2026),
      verbranding: verbrandingsregime(ctx, periode, "fossiel"),
      isVandaag: periode.code === huidige.code,
    }));
}

/** Eén cel uit de gedetailleerde matrix: één wagen in één gebruiksjaar. */
export interface Matrixcel {
  gebruiksjaar: number;
  /** Het percentage dat de rekenkern werkelijk toepast. */
  aftrek: number;
  /** Wat de gramformule alleen zou geven, of null waar ze niet meespeelt. */
  formule: number | null;
  /** Wat de kalender als bovengrens zet, of null buiten het overgangsregime. */
  plafond: number | null;
  /**
   * Welke van de twee bindt. Zonder dit leest "75% in 2025" als het antwoord,
   * terwijl de formule voor de meeste wagens al lager uitkomt.
   */
  bindend: "formule" | "plafond" | "gelijk" | "kalender";
}

/** Eén rij van de matrix: één referentiewagen over de gebruiksjaren. */
export interface Matrixrij {
  /** Vertaalsleutel voor de omschrijving van de wagen, geen tekst. */
  sleutel: string;
  aandrijving: Aandrijving;
  brandstof: Brandstof;
  /** null betekent: geen waarde op het gelijkvormigheidsattest. */
  co2: number | null;
  besteldatum: string;
  periodeCode: string;
  cellen: Matrixcel[];
  /** True wanneer elk gebruiksjaar hetzelfde percentage geeft. */
  levenslangVast: boolean;
}

/** Wagen waarvoor de matrix een rij toont. */
export interface Referentiewagen {
  /** Vertaalsleutel, geen tekst: deze module bevat geen zichtbare taal. */
  sleutel: string;
  aandrijving: Aandrijving;
  co2: number | null;
  besteldatum: string;
  /** Alleen nodig wanneer de brandstof afwijkt van de kolomstandaard. */
  brandstof?: Brandstof;
}

/** Minimale wagen om de rekenkern te laten rekenen. Alleen fiscaal relevante velden. */
function proefwagen(wagen: Referentiewagen): Vehicle {
  const brandstof = wagen.brandstof ?? BRANDSTOF_PER_AANDRIJVING[wagen.aandrijving];
  return {
    id: wagen.sleutel,
    omschrijving: wagen.sleutel,
    werknemer: null,
    kenteken: null,
    categorie: "kandidaat",
    merk: null,
    model: null,
    catalog_id: null,
    voertuigtype: wagen.aandrijving,
    brandstof,
    besteldatum: wagen.besteldatum,
    eerste_ingebruikname: wagen.besteldatum,
    co2: wagen.co2 ?? 0,
    co2_onbekend: wagen.co2 === null,
    cataloguswaarde: 0,
    jaarlijkse_autokosten: 0,
    aankoopprijs: null,
    tankkaart: false,
    beroepsgebruik_pct: 0,
    thuislaadpunt: false,
    km_per_jaar: null,
    flex_score: 0,
    restwaarde_score: 0,
  };
}

/**
 * De volledige matrix: per referentiewagen het percentage per gebruiksjaar, met
 * de formule en het plafond ernaast zodat zichtbaar is welke van de twee bindt.
 */
export function aftrekMatrix(
  ctx: FiscaleContext,
  wagens: readonly Referentiewagen[],
  jaren: readonly number[],
): Matrixrij[] {
  return wagens.map((wagen) => {
    const vehicle = proefwagen(wagen);
    const periode = bestelperiodeVoorDatum(ctx, vehicle.besteldatum);
    const overgang = isOvergangsregime(periode);
    const oudsteRegime = periode.code === "voor_07_2023";

    const cellen: Matrixcel[] = jaren.map((gebruiksjaar) => {
      const aftrek = aftrekPct(ctx, vehicle, gebruiksjaar);

      if (wagen.aandrijving === "BEV" || (!overgang && !oudsteRegime)) {
        return { gebruiksjaar, aftrek, formule: null, plafond: null, bindend: "kalender" };
      }

      // Met de fiscale uitstoot en niet met de waarde uit het dossier. Bij een
      // valse hybride rekent `aftrekPct` met de gecorrigeerde uitstoot, en een
      // formulekolom die de ruwe waarde toont, zou naast de aftrek staan die ze
      // hoort te verklaren.
      const formule = gramformule(vehicle.brandstof, fiscaleCo2(vehicle).co2, {
        metMinimum: oudsteRegime || gebruiksjaar <= LAATSTE_JAAR_MET_MINIMUMAFTREK,
      });

      if (oudsteRegime) {
        return { gebruiksjaar, aftrek, formule, plafond: null, bindend: "formule" };
      }

      const plafond = plafondUitKalender(ctx, vehicle.voertuigtype, periode, gebruiksjaar);
      const bindend = formule === plafond ? "gelijk" : formule < plafond ? "formule" : "plafond";
      return { gebruiksjaar, aftrek, formule, plafond, bindend };
    });

    return {
      sleutel: wagen.sleutel,
      aandrijving: wagen.aandrijving,
      brandstof: vehicle.brandstof,
      co2: wagen.co2,
      besteldatum: wagen.besteldatum,
      periodeCode: periode.code,
      cellen,
      levenslangVast: cellen.every((c) => c.aftrek === cellen[0].aftrek),
    };
  });
}

/**
 * Hoe de aftrek per kostensoort uiteenloopt bij één wagen.
 *
 * Dit staat vandaag op geen enkele pagina, en het is de meest contra-intuïtieve
 * regel van de hele kern: de laadstroom van een plug-inhybride volgt het pad van
 * de elektrische wagens, niet dat van de wagen zelf. Een PHEV besteld in 2026 is
 * 0% aftrekbaar terwijl zijn laadstroom 100% blijft.
 */
export interface Kostensoortrij {
  gebruiksjaar: number;
  wagen: number;
  laadstroom: number;
  /** null buiten een plug-inhybride: alleen die heeft een apart brandstofplafond. */
  brandstof: number | null;
}

export function aftrekPerKostensoort(
  ctx: FiscaleContext,
  wagen: Referentiewagen,
  jaren: readonly number[],
): Kostensoortrij[] {
  const vehicle = proefwagen(wagen);
  return jaren.map((gebruiksjaar) => {
    const basis = aftrekPct(ctx, vehicle, gebruiksjaar);
    return {
      gebruiksjaar,
      wagen: basis,
      laadstroom: aftrekPctElektriciteit(ctx, vehicle, gebruiksjaar),
      brandstof:
        wagen.aandrijving === "PHEV" ? aftrekPctBrandstofPhev(basis, gebruiksjaar) : null,
    };
  });
}

/** De kantelpunten van de gramformule voor één brandstof. */
export interface Gramdrempels {
  brandstof: Brandstof;
  /** Hoogste uitstoot die nog 100% oplevert. */
  co2Tot100: number;
  /** Laagste uitstoot waar de oude ondergrens van 50% begint te binden. */
  co2Vanaf50: number;
  /** Laagste uitstoot die zonder ondergrens op 0% uitkomt. */
  co2VanafNul: number;
}

/**
 * De drempels worden gevonden door `gramformule` af te lopen, niet door de
 * formule algebraïsch om te keren. Dat is bewust: zo blijft de rekenkern de enige
 * plaats waar de coëfficiënten en de begrenzingen staan, en klopt deze tabel ook
 * nadat iemand daar een grens verlegt.
 */
export function gramdrempels(brandstof: Brandstof, maxCo2 = 400): Gramdrempels {
  let co2Tot100 = 0;
  let co2Vanaf50 = maxCo2;
  let co2VanafNul = maxCo2;
  let nulGevonden = false;
  let vijftigGevonden = false;

  for (let co2 = 0; co2 <= maxCo2; co2++) {
    if (gramformule(brandstof, co2) >= 100) co2Tot100 = co2;
    if (!vijftigGevonden && gramformule(brandstof, co2) <= 50) {
      co2Vanaf50 = co2;
      vijftigGevonden = true;
    }
    if (!nulGevonden && gramformule(brandstof, co2, { metMinimum: false }) <= 0) {
      co2VanafNul = co2;
      nulGevonden = true;
    }
  }

  return { brandstof, co2Tot100, co2Vanaf50, co2VanafNul };
}
