/**
 * Het federaal mobiliteitsbudget (wet van 17 maart 2019) naast de bedrijfswagen.
 *
 * De tool gaat verder dan "welke wagen": voor een deel van de werknemers is het
 * eerlijke antwoord dat er beter géén wagen komt. Dit blok rekent die drie
 * alternatieven door, elk met hun eigen fiscale en parafiscale behandeling.
 *
 * De regels, in het kort:
 *
 * - **Pijler 1, een milieuvriendelijke bedrijfswagen.** Wordt behandeld als een
 *   gewone bedrijfswagen: voordeel van alle aard, verworpen uitgaven en de
 *   CO2-solidariteitsbijdrage. Die berekening zit al in engine.ts en wordt hier
 *   niet overgedaan.
 * - **Pijler 2, duurzame vervoermiddelen en huisvesting.** Vrijgesteld van
 *   belasting én van sociale bijdragen. Voor de werknemer is een euro hier een
 *   volle euro.
 * - **Pijler 3, het saldo in cash.** Vrij van personenbelasting, maar
 *   onderworpen aan een bijzondere werknemersbijdrage van 38,07%.
 *
 * Voor de werkgever is het volledige budget een aftrekbare beroepskost, zonder
 * aftrekbeperking en zonder verworpen uitgaven. Dat is precies het verschil met
 * de bedrijfswagen.
 */

/** Bijzondere werknemersbijdrage op het saldo in cash (pijler 3). */
export const PIJLER3_BIJDRAGE_PCT = 38.07;

/**
 * De grenzen van het budget (bedragen 2026, geïndexeerd).
 *
 * Het budget is niet vrij te kiezen: het ligt tussen een absoluut minimum en het
 * laagste van twintig procent van het brutojaarloon en een absoluut maximum.
 * Wie een goedkope wagen vervangt, moet dus toch het minimum toekennen, en wie
 * een dure wagen vervangt, ziet het budget afgetopt.
 */
export const BUDGETGRENZEN = {
  minimum: 3233,
  maximumAbsoluut: 17_244,
  /** Aandeel van het brutojaarloon dat het maximum mee bepaalt. */
  aandeelBrutoloon: 0.2,
};

/** Vanaf wanneer werkgevers met bedrijfswagens het budget moeten aanbieden. */
export const AANBODPLICHT_VANAF = "2027-01-01";

export interface BudgetgrenzenResultaat {
  /** Het budget na toepassing van de grenzen. */
  budget: number;
  /** De bovengrens die van toepassing was. */
  maximum: number;
  /** Werd het budget opgetrokken tot het minimum? */
  opgetrokken: boolean;
  /** Werd het budget afgetopt? */
  afgetopt: boolean;
  toelichting: string;
}

/**
 * Brengt een berekende total cost of ownership binnen de wettelijke grenzen.
 * De TCO van de wagen die de werknemer inruilt, is het vertrekpunt; wat eruit
 * komt, is het budget dat effectief toegekend mag worden.
 */
export function begrensBudget(tco: number, brutojaarloon: number): BudgetgrenzenResultaat {
  const maximum = Math.min(
    BUDGETGRENZEN.maximumAbsoluut,
    Math.max(0, brutojaarloon) * BUDGETGRENZEN.aandeelBrutoloon,
  );
  const vertrek = Math.max(0, tco);

  if (vertrek < BUDGETGRENZEN.minimum) {
    return {
      budget: BUDGETGRENZEN.minimum,
      maximum,
      opgetrokken: true,
      afgetopt: false,
      toelichting: `De TCO ligt onder het wettelijke minimum; het budget wordt opgetrokken tot € ${BUDGETGRENZEN.minimum}.`,
    };
  }
  if (vertrek > maximum) {
    return {
      budget: maximum,
      maximum,
      opgetrokken: false,
      afgetopt: true,
      toelichting: `Afgetopt op € ${Math.round(maximum)}: het laagste van twintig procent van het brutojaarloon en € ${BUDGETGRENZEN.maximumAbsoluut}.`,
    };
  }
  return {
    budget: vertrek,
    maximum,
    opgetrokken: false,
    afgetopt: false,
    toelichting: "De TCO valt binnen de wettelijke grenzen en wordt volledig toegekend.",
  };
}

/**
 * De total cost of ownership volgens de werkelijke-kostenmethode
 * (KB 10/9/2023, circulaire 2024/C/16). Bij aankoop wordt twintig procent van
 * de aanschafwaarde per kalenderjaar afgeschreven; bij leasing telt de
 * leasefactuur. Alle fiscale en parafiscale lasten horen erbij: dat is precies
 * waar een zelfgemaakte TCO doorgaans te laag uitkomt.
 */
export interface TcoPosten {
  /** Leasekost, of 20% van de aanschafwaarde bij aankoop. */
  afschrijvingOfLease: number;
  brandstofOfStroom: number;
  verzekering: number;
  /** BIV, verkeersbelasting en de CO2-solidariteitsbijdrage samen. */
  fiscaleLasten: number;
  overige?: number;
}

/** Afschrijvingsritme voor een aangekochte wagen in de TCO-berekening. */
export const TCO_AFSCHRIJVING_PCT = 20;

export function berekenTco(posten: TcoPosten): number {
  return (
    Math.max(0, posten.afschrijvingOfLease) +
    Math.max(0, posten.brandstofOfStroom) +
    Math.max(0, posten.verzekering) +
    Math.max(0, posten.fiscaleLasten) +
    Math.max(0, posten.overige ?? 0)
  );
}

export interface BudgetVerdeling {
  /** Deel dat naar een milieuvriendelijke bedrijfswagen gaat. */
  pijler1: number;
  /** Deel dat naar duurzaam vervoer en huisvesting gaat. */
  pijler2: number;
  /** Deel dat als saldo wordt uitbetaald. */
  pijler3: number;
}

export interface MobiliteitsbudgetResultaat {
  budget: number;
  verdeling: BudgetVerdeling;
  /** Bijzondere bijdrage op pijler 3. */
  bijdragePijler3: number;
  /** Wat de werknemer netto overhoudt uit pijler 2 en 3 samen. */
  nettoVoorWerknemer: number;
  /** Kost voor de vennootschap: het volledige budget, volledig aftrekbaar. */
  kostVoorWerkgever: number;
  /** Verworpen uitgaven: nul, en dat is het hele punt. */
  verworpenUitgaven: number;
}

/**
 * Verdeelt een mobiliteitsbudget over de drie pijlers en rekent uit wat de
 * werknemer overhoudt en wat de vennootschap kost.
 *
 * De verdeling wordt genormaliseerd wanneer ze niet exact op het budget uitkomt,
 * zodat een schuifregelaar in de interface geen onmogelijke uitkomst kan geven.
 */
export function berekenMobiliteitsbudget(
  budget: number,
  verdeling: BudgetVerdeling,
): MobiliteitsbudgetResultaat {
  const veilig = Math.max(0, budget);
  const som = verdeling.pijler1 + verdeling.pijler2 + verdeling.pijler3;

  const genormaliseerd: BudgetVerdeling =
    som <= 0
      ? { pijler1: 0, pijler2: 0, pijler3: veilig }
      : {
          pijler1: (verdeling.pijler1 / som) * veilig,
          pijler2: (verdeling.pijler2 / som) * veilig,
          pijler3: (verdeling.pijler3 / som) * veilig,
        };

  const bijdragePijler3 = genormaliseerd.pijler3 * (PIJLER3_BIJDRAGE_PCT / 100);

  return {
    budget: veilig,
    verdeling: genormaliseerd,
    bijdragePijler3,
    // Pijler 1 is een wagen en geen geld, dus die telt hier niet mee.
    nettoVoorWerknemer: genormaliseerd.pijler2 + genormaliseerd.pijler3 - bijdragePijler3,
    kostVoorWerkgever: veilig,
    verworpenUitgaven: 0,
  };
}

/**
 * De fietsvergoeding. Vrijgesteld van belasting en sociale bijdragen zolang ze
 * onder het wettelijke maximum per kilometer blijft; het meerdere is gewoon
 * loon. Het bedrag per kilometer wordt jaarlijks geïndexeerd en staat daarom
 * als parameter en niet als constante in de code.
 */
export function berekenFietsvergoeding(
  kmPerDag: number,
  dagenPerJaar: number,
  eurPerKm: number,
  vrijgesteldMaxPerKm: number,
): { totaal: number; vrijgesteld: number; belastbaar: number } {
  const km = Math.max(0, kmPerDag) * Math.max(0, dagenPerJaar);
  const totaal = km * Math.max(0, eurPerKm);
  const vrijgesteld = km * Math.min(Math.max(0, eurPerKm), Math.max(0, vrijgesteldMaxPerKm));
  return { totaal, vrijgesteld, belastbaar: totaal - vrijgesteld };
}
