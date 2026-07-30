/**
 * De naam van een bestelperiode, uit haar grensdatums.
 *
 * `Bestelperiode.label` in de databank draagt een Nederlandse tekst mee
 * ("Vóór 1 juli 2023 (gramformule)"), en die werd rechtstreeks gerenderd. Op
 * `/fr` en `/en` stond daar dus Nederlands. De grensdatums zelf zijn taalneutraal;
 * alleen hun opmaak verschilt per taal, en dat doet de datumformatter.
 *
 * Het ruwe label blijft in de databank staan voor de beheerpagina: daar kijkt een
 * beheerder naar de rij zoals ze opgeslagen is.
 */

export interface Periodegrenzen {
  /** Eerste besteldag, of null bij een open begin. */
  van: string | null;
  /** Laatste besteldag, of null bij een open einde. */
  tot: string | null;
}

/**
 * De vier sleutels die deze functie kan gebruiken. Uitgeschreven zodat een test
 * kan nakijken of ze in alle drie de talen bestaan.
 */
export const PERIODE_SLEUTELS = [
  "periodeTot",
  "periodeVanaf",
  "periodeTussen",
  "periodeAltijd",
] as const;

export function periodenaam(
  grenzen: Periodegrenzen,
  t: (sleutel: string, waarden?: Record<string, string>) => string,
  datum: (iso: string) => string,
): string {
  const { van, tot } = grenzen;
  if (van === null && tot !== null) return t("periodeTot", { tot: datum(tot) });
  if (tot === null && van !== null) return t("periodeVanaf", { van: datum(van) });
  if (van !== null && tot !== null) return t("periodeTussen", { van: datum(van), tot: datum(tot) });
  return t("periodeAltijd");
}
