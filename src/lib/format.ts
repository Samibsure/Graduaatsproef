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

  return {
    euro: (n: number) => euroFmt.format(n),
    euroCent: (n: number) => euroCentFmt.format(n),
    getal: (n: number) => getalFmt.format(n),
    pct: (n: number) => `${getalFmt.format(n)}%`,
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
