/**
 * De datums in de rekenkern zijn ISO-strings uit de databank ("2026-01-15"),
 * geen Date-objecten. Dat is met opzet: een stringvergelijking op ISO-datums
 * loopt gelijk met de kalender en kent geen tijdzone.
 *
 * Voor het jaartal stond hier `new Date(iso).getFullYear()`, en dat is precies
 * de plek waar die tijdzone alsnog binnenkomt. `new Date("2026-01-01")` wordt
 * geparseerd als middernacht UTC, maar `getFullYear()` leest het jaar in de
 * lokale zone: in elke zone met een negatieve offset valt 1 januari terug naar
 * 31 december van het jaar ervoor. De simulator is een clientcomponent, dus dat
 * is de zone van de bezoeker. Een wagen die op 1 januari 2026 in gebruik werd
 * genomen kreeg zo een leeftijdscorrectie een trap te ver, en het VAA is het
 * bedrag dat op de loonfiche van de bestuurder terechtkomt.
 */
export function jaarUit(iso: string): number {
  const jaar = iso.slice(0, 4);
  // Een lege of onvolledige datum is geen jaar 0. `Number("")` geeft 0, en dat
  // rekende stilzwijgend door tot een geloofwaardig maar verzonnen bedrag; NaN
  // valt op. De databank staat geen lege datum toe, dus dit is een vangnet.
  return /^\d{4}$/.test(jaar) ? Number(jaar) : Number.NaN;
}
