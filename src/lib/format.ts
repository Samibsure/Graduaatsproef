import { INTL_LOCALE, routing, type Locale } from "@/i18n/routing";

/**
 * Bedragen en getallen volgen de gewoonten van de taal: nl-BE schrijft
 * € 1.234,56, fr-BE schrijft 1 234,56 €. De munteenheid blijft de euro.
 */
function maakFormatters(locale: Locale) {
  const intl = INTL_LOCALE[locale];
  const euroFmt = new Intl.NumberFormat(intl, {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });
  const euroCentFmt = new Intl.NumberFormat(intl, {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const getalFmt = new Intl.NumberFormat(intl, { maximumFractionDigits: 2 });
  const coefficientFmt = new Intl.NumberFormat(intl, { maximumFractionDigits: 4 });
  const datumFmt = new Intl.DateTimeFormat(intl, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return {
    euro: (n: number) => euroFmt.format(n),
    euroCent: (n: number) => euroCentFmt.format(n),
    getal: (n: number) => getalFmt.format(n),
    pct: (n: number) => `${getalFmt.format(n)}%`,
    /**
     * Coëfficiënten met vier decimalen. De gewone opmaak op twee cijfers maakt
     * van de RSZ-indexcoëfficiënt 1,6291 het getal 1,63, en dat is precies het
     * cijfer waarmee elke bijdrage vermenigvuldigd wordt.
     */
    coefficient: (n: number) => coefficientFmt.format(n),
    /**
     * Een ISO-datum uit de databank als "1 juli 2023".
     *
     * Dit bestaat voor de bestelperiodes. Die dragen in `defaults.ts` en in de
     * SQL-seed een Nederlands label mee ("Vóór 1 juli 2023"), en dat label werd
     * rechtstreeks gerenderd, dus stond er Nederlands op de Franse en Engelse
     * pagina. De grensdatums zelf zijn taalneutraal; alleen de opmaak verschilt.
     *
     * `timeZone: "UTC"` is geen detail: zonder die vaste zone schuift
     * "2026-01-01" in een westelijke zone een dag terug naar 31 december, en dan
     * toont de pagina precies de grens verkeerd die ze moet uitleggen.
     */
    datum: (iso: string) => datumFmt.format(new Date(`${iso}T00:00:00Z`)),
  };
}

export type Formatters = ReturnType<typeof maakFormatters>;

const cache = new Map<Locale, Formatters>();

export function formatters(locale: string): Formatters {
  const taal = (routing.locales as readonly string[]).includes(locale)
    ? (locale as Locale)
    : routing.defaultLocale;
  let f = cache.get(taal);
  if (!f) {
    f = maakFormatters(taal);
    cache.set(taal, f);
  }
  return f;
}

/**
 * Nederlandstalige formatters voor code buiten een taalcontext (tests,
 * hulpfuncties). Binnen een pagina hoort formatters(useLocale()) gebruikt te
 * worden, zodat de opmaak de gekozen taal volgt.
 */
const standaard = maakFormatters(routing.defaultLocale);
export const euro = standaard.euro;
export const euroCent = standaard.euroCent;
export const getal = standaard.getal;
export const pct = standaard.pct;
export const datum = standaard.datum;
