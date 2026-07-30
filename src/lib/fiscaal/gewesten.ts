import { bundelBronnen, laagsteZekerheid } from "./bronnen";
import type { Bron, GemarkeerdBedrag } from "./bronnen";
import type { Brandstof, Euronorm, Gewest } from "./types";

/**
 * De gewestelijke autobelastingen: de belasting op de inverkeerstelling (BIV)
 * en de jaarlijkse verkeersbelasting.
 *
 * Dit blok werkt anders dan de rest van de rekenkern, en dat is met opzet. De
 * federale parameters staan tot op de cent in het Staatsblad; de gewestelijke
 * barema's zijn versnipperd over drie administraties, worden op verschillende
 * data geïndexeerd en zijn niet volledig als tabel gepubliceerd. Een cijfer
 * verzinnen waar het barema ontbreekt zou hier het makkelijkst zijn en het
 * schadelijkst: de gebruiker ziet een bedrag en gelooft het.
 *
 * Daarom geeft elke functie hier een `GemarkeerdBedrag` terug. Het bedrag mag
 * null zijn wanneer de nodige barema-waarde niet bekend is, en elk resultaat
 * draagt zijn zekerheid en zijn bronnen mee. De interface toont dat als een
 * badge en verwijst voor een bindend bedrag door naar de simulator van het
 * gewest.
 */

const BRON_VLABEL: Bron = { wet: "Vlaamse Codex Fiscaliteit art. 2.3.4.1.2", zekerheid: "bevestigd" };
const BRON_VLABEL_BAREMA: Bron = {
  wet: "VLABEL-barema (secundaire bron, te toetsen bij de VLABEL-simulator)",
  zekerheid: "teVerifieren",
};
const BRON_WALLONIE: Bron = {
  wet: "Code wallon des taxes assimilées, TMC vanaf 1/7/2025",
  zekerheid: "bevestigd",
};
const BRON_BRUSSEL: Bron = { wet: "Brussel Fiscaliteit, barema fiscale pk", zekerheid: "teVerifieren" };

/* ------------------------------------------------------------------ *
 * Fiscale pk
 * ------------------------------------------------------------------ */

/**
 * Fiscale pk van een elektrische wagen in Vlaanderen: 0,013 × kW + 0,5,
 * afgerond, met een maximum van 5. Voor verbrandingswagens hangt de fiscale pk
 * af van cilinderinhoud én vermogen; die staat op het inschrijvingsbewijs en
 * wordt hier als invoer verwacht.
 */
export function fiscalePkElektrisch(kW: number): number {
  return Math.min(5, Math.max(1, Math.round(0.013 * Math.max(0, kW) + 0.5)));
}

/* ------------------------------------------------------------------ *
 * BIV Vlaanderen
 * ------------------------------------------------------------------ */

/** Technologische correctiefactor q, per aanslagjaar. */
export const VLAANDEREN_CORRECTIEFACTOR: Record<number, number> = {
  2025: 1.24,
  2026: 1.245,
};

/**
 * Brandstoffactor f in de Vlaamse BIV-formule. De waarden komen uit een
 * secundaire bron en zijn te toetsen bij VLABEL vóór ze bindend gebruikt worden.
 */
export const VLAANDEREN_BRANDSTOFFACTOR: Record<Brandstof, number> = {
  diesel: 1.0,
  benzine: 0.744,
  lpg: 0.88,
  cng: 0.93,
  elektrisch: 0,
};

/**
 * Luchtcomponent c per brandstof en euronorm. Alleen de combinaties die uit een
 * publieke bron bekend zijn, staan hier. Een ontbrekende combinatie geeft geen
 * geraden bedrag maar een leeg resultaat.
 */
export const VLAANDEREN_LUCHTCOMPONENT: Partial<Record<`${Brandstof}-${Euronorm}`, number>> = {
  "benzine-euro6": 28.54,
  "lpg-euro6": 28.54,
  "cng-euro6": 28.54,
};

/**
 * Leeftijdscorrectie LC op de BIV: 100% in het eerste jaar, daarna tien
 * procentpunt per begonnen jaar tot 60% in het vijfde. Het verdere verloop tot
 * nul op vijftien jaar is trager en niet als tabel gepubliceerd; die jaren
 * geven daarom null.
 */
export function vlaamseLeeftijdscorrectie(leeftijdInJaren: number): number | null {
  const jaar = Math.floor(Math.max(0, leeftijdInJaren));
  if (jaar <= 4) return 1 - jaar * 0.1;
  if (jaar >= 15) return 0;
  return null;
}

/** Vast BIV-bedrag voor elektrische wagens en waterstofwagens in Vlaanderen. */
export const VLAANDEREN_BIV_EV = 61.5;

/** Vanaf deze inschrijvingsdatum betaalt een EV in Vlaanderen het forfait. */
export const VLAANDEREN_BIV_EV_VANAF = "2026-01-01";

export interface BivInvoer {
  gewest: Gewest;
  brandstof: Brandstof;
  co2: number;
  euronorm?: Euronorm | null;
  /** Datum van eerste inschrijving in België. */
  inschrijvingsdatum: string;
  /** Leeftijd van het voertuig in jaren op het moment van inschrijving. */
  leeftijdInJaren?: number;
  /** Aanslagjaar waarvan de correctiefactor gebruikt wordt. */
  aanslagjaar?: number;
  /** Luchtcomponent c, wanneer die niet uit de tabel af te leiden is. */
  luchtcomponent?: number | null;
  /** Wallonië: montant de base uit het barema per kW en leeftijd. */
  montantDeBase?: number | null;
  /** Wallonië: maximaal toegelaten massa in kg (vak F1). */
  mma?: number | null;
  /** Wallonië: is de CO2-waarde een WLTP-waarde? Bepaalt de referentie. */
  wltp?: boolean;
  /** Brussel: bedrag uit het barema op fiscale pk en cilinderinhoud. */
  baremabedrag?: number | null;
}

function leeg(toelichting: string, bronnen: Bron[]): GemarkeerdBedrag {
  return { bedrag: null, zekerheid: laagsteZekerheid(bronnen.map((b) => b.zekerheid)), bronnen, toelichting: [toelichting] };
}

/**
 * BIV Vlaanderen voor een niet-leasingpersonenwagen:
 * (((CO2 × f × q) / 246)^6 × 4.500 + c) × LC.
 *
 * Elektrische wagens en waterstofwagens vallen buiten de formule: sinds
 * 1 januari 2026 betalen ze een vast bedrag van € 61,50. Wie vóór die datum is
 * ingeschreven, blijft vrijgesteld zolang de wagen niet van eigenaar wisselt.
 */
function bivVlaanderen(invoer: BivInvoer): GemarkeerdBedrag {
  const bronnen: Bron[] = [BRON_VLABEL];

  if (invoer.brandstof === "elektrisch") {
    const forfait = invoer.inschrijvingsdatum >= VLAANDEREN_BIV_EV_VANAF;
    return {
      bedrag: forfait ? VLAANDEREN_BIV_EV : 0,
      zekerheid: "bevestigd",
      bronnen,
      toelichting: [
        forfait
          ? `Elektrisch, ingeschreven vanaf ${VLAANDEREN_BIV_EV_VANAF}: vast tarief van € ${VLAANDEREN_BIV_EV.toFixed(2)}.`
          : "Elektrisch, ingeschreven vóór 1 januari 2026: vrijgesteld zolang de wagen niet van eigenaar wisselt.",
      ],
    };
  }

  const aanslagjaar = invoer.aanslagjaar ?? new Date(invoer.inschrijvingsdatum).getFullYear();
  const q = VLAANDEREN_CORRECTIEFACTOR[aanslagjaar];
  if (q === undefined) {
    return leeg(
      `De technologische correctiefactor voor ${aanslagjaar} is nog niet gepubliceerd.`,
      [...bronnen, BRON_VLABEL_BAREMA],
    );
  }

  const lucht =
    invoer.luchtcomponent ??
    (invoer.euronorm ? VLAANDEREN_LUCHTCOMPONENT[`${invoer.brandstof}-${invoer.euronorm}`] : undefined);
  if (lucht === undefined) {
    return leeg(
      "De luchtcomponent voor deze combinatie van brandstof en euronorm is niet gekend. Vul ze in of gebruik de VLABEL-simulator.",
      [...bronnen, BRON_VLABEL_BAREMA],
    );
  }

  const lc = vlaamseLeeftijdscorrectie(invoer.leeftijdInJaren ?? 0);
  if (lc === null) {
    return leeg(
      "De leeftijdscorrectie tussen vijf en vijftien jaar is niet als tabel gepubliceerd. Gebruik de VLABEL-simulator.",
      [...bronnen, BRON_VLABEL_BAREMA],
    );
  }

  const f = VLAANDEREN_BRANDSTOFFACTOR[invoer.brandstof];
  const co2component = Math.pow((invoer.co2 * f * q) / 246, 6) * 4500;
  const bedrag = (co2component + lucht) * lc;

  return {
    bedrag,
    zekerheid: "teVerifieren",
    bronnen: bundelBronnen([...bronnen, BRON_VLABEL_BAREMA]),
    toelichting: [
      `CO2-component: ((${invoer.co2} × ${f} × ${q}) / 246)^6 × 4.500 = € ${co2component.toFixed(2)}.`,
      `Luchtcomponent: € ${lucht.toFixed(2)}.`,
      `Leeftijdscorrectie: ${(lc * 100).toFixed(0)}%.`,
      "De brandstoffactor f komt uit een secundaire bron; toets het bedrag bij de VLABEL-simulator.",
    ],
  };
}

/* ------------------------------------------------------------------ *
 * TMC Wallonië
 * ------------------------------------------------------------------ */

/** Referentie-CO2 van het Waalse wagenpark, per meetmethode. */
export const WALLONIE_REFERENTIE_CO2 = { wltp: 136, nedc: 115 };

/** Gemiddelde referentiemassa in kg (oefening 2025-2026). */
export const WALLONIE_REFERENTIEMASSA = 1838;

/** Ondergrens en bovengrens van de TMC. */
export const WALLONIE_TMC_GRENZEN = { plancher: 50, plafond: 9000 };

/**
 * Energiecoëfficiënt C. Eén voor alle courante brandstoffen; voor emissievrije
 * aandrijvingen ligt ze lager en wordt ze als invoer verwacht.
 */
export const WALLONIE_ENERGIECOEFFICIENT: Record<Brandstof, number> = {
  diesel: 1,
  benzine: 1,
  lpg: 1,
  cng: 1,
  elektrisch: 0.01,
};

/**
 * TMC Wallonië sinds 1 juli 2025:
 * MB × (CO2 / X) × (MMA / Y) × C, tussen € 50 en € 9.000.
 *
 * Een elektrische wagen valt buiten de CO2-factor en betaalt MB × (MMA/Y) × C.
 * Het montant de base hangt af van vermogen en leeftijd en staat in een barema
 * dat niet in deze rekenkern zit; zonder dat bedrag is er geen uitkomst.
 */
function tmcWallonie(invoer: BivInvoer): GemarkeerdBedrag {
  const bronnen = [BRON_WALLONIE];
  const mb = invoer.montantDeBase ?? null;
  const mma = invoer.mma ?? null;

  if (mb === null || mma === null) {
    return leeg(
      "Voor de TMC zijn het montant de base (barema op vermogen en leeftijd) en de maximaal toegelaten massa nodig.",
      bronnen,
    );
  }

  const c = WALLONIE_ENERGIECOEFFICIENT[invoer.brandstof];
  const massafactor = mma / WALLONIE_REFERENTIEMASSA;
  const co2factor =
    invoer.brandstof === "elektrisch"
      ? 1
      : invoer.co2 / (invoer.wltp === false ? WALLONIE_REFERENTIE_CO2.nedc : WALLONIE_REFERENTIE_CO2.wltp);

  const ruw = mb * co2factor * massafactor * c;
  const bedrag = Math.min(WALLONIE_TMC_GRENZEN.plafond, Math.max(WALLONIE_TMC_GRENZEN.plancher, ruw));

  return {
    bedrag,
    zekerheid: "bevestigd",
    bronnen,
    toelichting: [
      `Montant de base: € ${mb.toFixed(2)}.`,
      invoer.brandstof === "elektrisch"
        ? "Elektrisch: geen CO2-factor."
        : `CO2-factor: ${invoer.co2} / ${invoer.wltp === false ? WALLONIE_REFERENTIE_CO2.nedc : WALLONIE_REFERENTIE_CO2.wltp}.`,
      `Massafactor: ${mma} / ${WALLONIE_REFERENTIEMASSA}.`,
      `Energiecoëfficiënt: ${c}.`,
      ruw < WALLONIE_TMC_GRENZEN.plancher
        ? `Opgetrokken tot de ondergrens van € ${WALLONIE_TMC_GRENZEN.plancher}.`
        : ruw > WALLONIE_TMC_GRENZEN.plafond
          ? `Afgetopt op € ${WALLONIE_TMC_GRENZEN.plafond}.`
          : "Binnen de grenzen van € 50 en € 9.000.",
    ],
  };
}

/* ------------------------------------------------------------------ *
 * BIV Brussel
 * ------------------------------------------------------------------ */

/** Minimumtarief BIV voor een elektrische wagen in Brussel (geïndexeerd). */
export const BRUSSEL_BIV_EV = 74.29;

/** Degressiviteit per begonnen jaar voor tweedehandswagens. */
export const BRUSSEL_DEGRESSIVITEIT = 0.1;

/**
 * BIV Brussel: een barema op fiscale pk en cilinderinhoud, met een
 * degressiviteit van tien procent per jaar voor tweedehandswagens. Het barema
 * zelf zit niet in deze rekenkern en wordt als invoer verwacht; voor een
 * elektrische wagen geldt het minimumtarief.
 */
function bivBrussel(invoer: BivInvoer): GemarkeerdBedrag {
  const bronnen = [BRON_BRUSSEL];

  if (invoer.brandstof === "elektrisch") {
    return {
      bedrag: BRUSSEL_BIV_EV,
      zekerheid: "teVerifieren",
      bronnen,
      toelichting: [`Elektrisch: het minimumtarief van € ${BRUSSEL_BIV_EV.toFixed(2)}.`],
    };
  }

  const basis = invoer.baremabedrag ?? null;
  if (basis === null) {
    return leeg(
      "Voor de Brusselse BIV is het baremabedrag op fiscale pk en cilinderinhoud nodig.",
      bronnen,
    );
  }

  const jaren = Math.floor(Math.max(0, invoer.leeftijdInJaren ?? 0));
  const factor = Math.max(0.1, 1 - jaren * BRUSSEL_DEGRESSIVITEIT);
  return {
    bedrag: Math.max(BRUSSEL_BIV_EV, basis * factor),
    zekerheid: "teVerifieren",
    bronnen,
    toelichting: [
      `Baremabedrag: € ${basis.toFixed(2)}.`,
      `Degressiviteit voor ${jaren} jaar: ${(factor * 100).toFixed(0)}%.`,
    ],
  };
}

/** BIV of TMC, naargelang het gewest van de titularis. */
export function berekenBiv(invoer: BivInvoer): GemarkeerdBedrag {
  switch (invoer.gewest) {
    case "vlaanderen":
      return bivVlaanderen(invoer);
    case "wallonie":
      return tmcWallonie(invoer);
    case "brussel":
      return bivBrussel(invoer);
  }
}

/* ------------------------------------------------------------------ *
 * Jaarlijkse verkeersbelasting
 * ------------------------------------------------------------------ */

/** Opdeciem: tien procent gemeentelijke opcentiemen op de Vlaamse basis. */
export const VLAANDEREN_OPDECIEM = 1.1;

/** Minimum jaarlijkse verkeersbelasting Vlaanderen, inclusief opdeciem. */
export const VLAANDEREN_JVB_MINIMUM = 58.55;

/** Minimumtarief in Wallonië en Brussel (aanslagjaar 1/7/2026-30/6/2027). */
export const WALLONIE_BRUSSEL_JVB_MINIMUM = 107.18;

/**
 * De twee gepubliceerde uiterste tarieven voor elektrische wagens in
 * Vlaanderen, van één tot vijf fiscale pk. De tussenliggende pk-waarden zijn
 * niet apart bekendgemaakt en worden lineair afgeleid.
 */
export const VLAANDEREN_JVB_EV = { pk1: 69.72, pk5: 87.24 };

/** Neutraal punt van de CO2-component, per meetmethode. */
export const VLAANDEREN_JVB_CO2_NEUTRAAL = { wltp: 122, nedc: 149 };

/** Correctie op de basis per gram afwijking van het neutrale punt. */
export const VLAANDEREN_JVB_PER_GRAM = 0.003;

export interface VerkeersbelastingInvoer {
  gewest: Gewest;
  brandstof: Brandstof;
  fiscalePk: number;
  co2: number;
  /** Is de CO2-waarde een WLTP-waarde? Bepaalt het neutrale punt. */
  wltp?: boolean;
  /** Basisbedrag uit het barema op fiscale pk, vóór CO2- en luchtcomponent. */
  basisbedrag?: number | null;
  /** Luchtcomponent op basis van euronorm en brandstof. */
  luchtcomponent?: number | null;
}

function jvbVlaanderen(invoer: VerkeersbelastingInvoer): GemarkeerdBedrag {
  if (invoer.brandstof === "elektrisch") {
    const pk = Math.min(5, Math.max(1, invoer.fiscalePk));
    const { pk1, pk5 } = VLAANDEREN_JVB_EV;
    const bedrag = pk1 + ((pk - 1) / 4) * (pk5 - pk1);
    const exact = pk === 1 || pk === 5;
    return {
      bedrag,
      zekerheid: exact ? "bevestigd" : "teVerifieren",
      bronnen: [
        {
          wet: "Vlaamse regering, persmededeling oktober 2025 (EV-tarief verkeersbelasting)",
          zekerheid: exact ? "bevestigd" : "teVerifieren",
        },
      ],
      toelichting: exact
        ? [`Gepubliceerd tarief voor ${pk} fiscale pk.`]
        : [
            `Alleen de tarieven voor 1 pk (€ ${pk1.toFixed(2)}) en 5 pk (€ ${pk5.toFixed(2)}) zijn gepubliceerd; ${pk} pk is daartussen afgeleid.`,
          ],
    };
  }

  const basis = invoer.basisbedrag ?? null;
  if (basis === null) {
    return leeg(
      "Het basisbedrag uit het barema op fiscale pk is nodig; het volledige barema is niet als tabel gepubliceerd.",
      [BRON_VLABEL_BAREMA],
    );
  }

  const neutraal =
    invoer.wltp === false ? VLAANDEREN_JVB_CO2_NEUTRAAL.nedc : VLAANDEREN_JVB_CO2_NEUTRAAL.wltp;
  const co2correctie = 1 + (invoer.co2 - neutraal) * VLAANDEREN_JVB_PER_GRAM;
  const lucht = invoer.luchtcomponent ?? 0;
  const voorOpdeciem = basis * Math.max(0, co2correctie) + lucht;
  const bedrag = Math.max(VLAANDEREN_JVB_MINIMUM, voorOpdeciem * VLAANDEREN_OPDECIEM);

  return {
    bedrag,
    zekerheid: "teVerifieren",
    bronnen: [BRON_VLABEL_BAREMA],
    toelichting: [
      `Basis op ${invoer.fiscalePk} fiscale pk: € ${basis.toFixed(2)}.`,
      `CO2-correctie: ${invoer.co2} g tegenover een neutraal punt van ${neutraal} g geeft ${(co2correctie * 100).toFixed(1)}%.`,
      lucht > 0 ? `Luchtcomponent: € ${lucht.toFixed(2)}.` : "Geen luchtcomponent ingevuld.",
      `Opdeciem: + ${((VLAANDEREN_OPDECIEM - 1) * 100).toFixed(0)}%.`,
    ],
  };
}

/**
 * Jaarlijkse verkeersbelasting. In Wallonië en Brussel is dat een barema op
 * fiscale pk; alleen het minimumtarief is hier bekend.
 */
export function berekenVerkeersbelasting(invoer: VerkeersbelastingInvoer): GemarkeerdBedrag {
  if (invoer.gewest === "vlaanderen") return jvbVlaanderen(invoer);

  const bron: Bron = {
    wet: invoer.gewest === "wallonie" ? "SPW Fiscalité, barema fiscale pk" : "Brussel Fiscaliteit, barema fiscale pk",
    zekerheid: "teVerifieren",
  };
  const basis = invoer.basisbedrag ?? null;
  if (basis === null) {
    return leeg("Het barema op fiscale pk voor dit gewest zit niet in deze rekenkern.", [bron]);
  }
  return {
    bedrag: Math.max(WALLONIE_BRUSSEL_JVB_MINIMUM, basis),
    zekerheid: "teVerifieren",
    bronnen: [bron],
    toelichting: [
      `Barema op ${invoer.fiscalePk} fiscale pk: € ${basis.toFixed(2)}.`,
      `Minimumtarief: € ${WALLONIE_BRUSSEL_JVB_MINIMUM.toFixed(2)}.`,
    ],
  };
}

/* ------------------------------------------------------------------ *
 * Vlaamse hervorming vanaf 1 mei 2027
 * ------------------------------------------------------------------ */

/**
 * De aangekondigde Vlaamse hervorming belast nieuwe wagens op gewicht en CO2 in
 * plaats van op fiscale pk. Ze is nog niet in werking en heeft Europees fiat
 * nodig; ze staat hier alleen als aankondiging, niet als rekenregel. Er is dus
 * bewust geen formule: zolang de tekst niet definitief is, zou elke uitkomst
 * een precisie voorwenden die er niet is.
 *
 * Wat aangekondigd is:
 * - de grondslag wordt maximaal toegelaten totaalgewicht plus CO2 in plaats van
 *   fiscale pk;
 * - een verhogende factor voor motoren vanaf 2.400 cc en diesels onder Euro 6;
 * - bestaande voertuigen kiezen tussen oud en nieuw, het nieuwe enkel wanneer
 *   het gunstiger uitvalt;
 * - leasingwagens blijven op fiscale pk;
 * - de verhoging is afgetopt op € 125 per jaar.
 *
 * Die opsomming staat voor de gebruiker in de taalbestanden, onder
 * `parameters.hervormingPunt1` tot `5`.
 */
export const VLAAMSE_HERVORMING_2027 = {
  vanaf: "2027-05-01",
  zekerheid: "voorlopig" as const,
  /** Aantal punten in de opsomming; de teksten staan in de taalbestanden. */
  aantalKenmerken: 5,
  bron: {
    wet: "Vlaamse regering, aangekondigde hervorming verkeersbelasting (Europees fiat nog nodig)",
    zekerheid: "voorlopig" as const,
  } satisfies Bron,
};
