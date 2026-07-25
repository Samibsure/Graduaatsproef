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
