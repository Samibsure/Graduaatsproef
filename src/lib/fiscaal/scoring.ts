import type { Projectie } from "./types";

/**
 * Scoringsmatrix uit het rapport (paragraaf 1.4.2): zes criteria met vaste
 * wegingen, scores van 1 tot 10, gewogen eindscore op 10 en een advies.
 */

export interface Criterium {
  code: string;
  naam: string;
  weging: number; // fractie, som = 1
  toelichting: string;
}

/**
 * De zes criteria uit het rapport. Dit blijft de referentie: de uitkomsten
 * ervan zijn met de hand nagerekend in het eindwerk en worden door
 * scoring.test.ts bewaakt. Wijzig hier niets zonder die tabel opnieuw na te
 * rekenen.
 */
export const CRITERIA: Criterium[] = [
  { code: "tco", naam: "TCO over 4 jaar", weging: 0.4, toelichting: "Totale kost over 4 gebruiksjaren (autokosten + extra VenB + RSZ-bijdrage), relatief t.o.v. de goedkoopste kandidaat." },
  { code: "aftrek", naam: "Aftrekbaarheid in VenB", weging: 0.2, toelichting: "Gemiddelde fiscale aftrekbaarheid over 4 gebruiksjaren." },
  { code: "vu", naam: "Verworpen uitgaven", weging: 0.15, toelichting: "Gemiddelde verworpen uitgaven t.o.v. de jaarlijkse autokosten." },
  { code: "flex", naam: "Operationele flexibiliteit", weging: 0.1, toelichting: "Actieradius, laadvermogen en laadduur, afgeleid uit de specificaties van het model." },
  { code: "co2", naam: "CO₂-impact en ESG", weging: 0.1, toelichting: "Score op basis van de CO₂-uitstoot van de wagen." },
  { code: "rest", naam: "Restwaarde na 4 jaar", weging: 0.05, toelichting: "Verwacht waardebehoud na vier jaar, afgeleid uit de restwaarde van het model." },
];

/**
 * Zeven criteria, met het praktische nut erbij.
 *
 * De zes hierboven gaan bijna allemaal over geld en fiscaliteit. Daardoor wint
 * een kleine elektrische hatchback het stelselmatig van een break of een
 * zevenzitter, op criteria die niets zeggen over de vraag of het gerief erin
 * past en of hij de aanhangwagen trekt. Voor een bedrijf dat materiaal
 * meesleept, is dat precies de verkeerde uitkomst.
 *
 * Dit profiel neemt gewicht weg bij de drie zwaarste geldcriteria en geeft het
 * aan bruikbaarheid. De applicatie gebruikt dit als standaard; de zes van het
 * rapport blijven beschikbaar voor wie de referentietabel wil reproduceren.
 */
export const CRITERIA_UITGEBREID: Criterium[] = [
  { code: "tco", naam: "TCO over 4 jaar", weging: 0.33, toelichting: CRITERIA[0].toelichting },
  { code: "aftrek", naam: "Aftrekbaarheid in VenB", weging: 0.18, toelichting: CRITERIA[1].toelichting },
  { code: "vu", naam: "Verworpen uitgaven", weging: 0.13, toelichting: CRITERIA[2].toelichting },
  { code: "nut", naam: "Praktisch nut", weging: 0.13, toelichting: "Koffervolume, zitplaatsen en trekgewicht: kan deze wagen de job doen?" },
  { code: "flex", naam: "Operationele flexibiliteit", weging: 0.09, toelichting: CRITERIA[3].toelichting },
  { code: "co2", naam: "CO₂-impact en ESG", weging: 0.09, toelichting: CRITERIA[4].toelichting },
  { code: "rest", naam: "Restwaarde na 4 jaar", weging: 0.05, toelichting: CRITERIA[5].toelichting },
];

export type Advies = "aanvaarden" | "overwegen" | "afwijzen";

export const ADVIES_GRENZEN = { aanvaarden: 7, overwegen: 4 };

export interface ScoreResultaat {
  vehicleId: string;
  omschrijving: string;
  scores: Record<string, number>;
  eindscore: number;
  advies: Advies;
}

const rond = (x: number, dec = 1) => Math.round(x * 10 ** dec) / 10 ** dec;
const klem = (x: number) => Math.min(10, Math.max(1, x));

/** TCO-score: goedkoopste kandidaat krijgt 10, de rest evenredig lager. */
function tcoScore(totaleKost: number, minKost: number): number {
  return klem(rond(10 * (minKost / totaleKost)));
}

/** Aftrek-score: lineair van 1 (0% aftrek) tot 10 (100% aftrek). */
function aftrekScore(gemiddeldeAftrekPct: number): number {
  return klem(rond(1 + 9 * (gemiddeldeAftrekPct / 100)));
}

/** VU-score: 10 bij 0% verworpen uitgaven, 1 wanneer de VU de autokosten evenaren. */
function vuScore(gemiddeldeVU: number, autokosten: number): number {
  if (autokosten <= 0) return 1;
  return klem(rond(10 - 9 * (gemiddeldeVU / autokosten)));
}

/** CO₂/ESG-score op basis van uitstootbanden. */
function co2Score(co2: number): number {
  if (co2 === 0) return 10;
  if (co2 <= 50) return 7;
  if (co2 <= 100) return 5;
  if (co2 <= 150) return 3;
  return 1;
}

export function adviesVoorScore(eindscore: number): Advies {
  if (eindscore >= ADVIES_GRENZEN.aanvaarden) return "aanvaarden";
  if (eindscore >= ADVIES_GRENZEN.overwegen) return "overwegen";
  return "afwijzen";
}

/** Gewogen eindscore. Standaard met de zes criteria van het rapport. */
export function gewogenEindscore(
  scores: Record<string, number>,
  criteria: Criterium[] = CRITERIA,
): number {
  const som = criteria.reduce((s, c) => s + c.weging * (scores[c.code] ?? 0), 0);
  return rond(som, 2);
}

export interface ScoreOpties {
  /** Welk wegingsprofiel. Standaard de zes criteria van het rapport. */
  criteria?: Criterium[];
  /**
   * Score voor praktisch nut per wagen-id, uit nutScore() in catalog.ts.
   * Staat los omdat koffervolume, zitplaatsen en trekgewicht eigenschappen van
   * het catalogusmodel zijn en niet van de bewaarde wagen.
   */
  nutPerWagen?: Record<string, number>;
}

/** Past de scoringsmatrix toe op een set kandidaat-wagens (max. 3 in de UI). */
export function scoreVergelijking(
  projecties: Projectie[],
  opties: ScoreOpties = {},
): ScoreResultaat[] {
  const criteria = opties.criteria ?? CRITERIA;
  const minKost = Math.min(...projecties.map((p) => p.totaleKost));

  return projecties.map((p) => {
    const gemiddeldeVU = p.totaleVU / p.jaren.length;
    const scores: Record<string, number> = {
      tco: tcoScore(p.totaleKost, minKost),
      aftrek: aftrekScore(p.gemiddeldeAftrekPct),
      vu: vuScore(gemiddeldeVU, p.vehicle.jaarlijkse_autokosten),
      flex: klem(p.vehicle.flex_score),
      co2: co2Score(p.vehicle.co2),
      rest: klem(p.vehicle.restwaarde_score),
    };

    // Alleen invullen wanneer het profiel er ook om vraagt, zodat de zes van het
    // rapport hun uitkomst houden.
    if (criteria.some((c) => c.code === "nut")) {
      // Zonder catalogusmodel is er niets te zeggen over de bruikbaarheid; een
      // neutrale middenscore is dan eerlijker dan een nul die de wagen afstraft.
      scores.nut = klem(opties.nutPerWagen?.[p.vehicle.id] ?? 5.5);
    }

    const eindscore = gewogenEindscore(scores, criteria);
    return {
      vehicleId: p.vehicle.id,
      omschrijving: p.vehicle.omschrijving,
      scores,
      eindscore,
      advies: adviesVoorScore(eindscore),
    };
  });
}
