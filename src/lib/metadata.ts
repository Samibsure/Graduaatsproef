import { TAALTAG, routing, type Locale } from "@/i18n/routing";
import { voorvoegsel } from "@/lib/taalpad";

/**
 * De canonieke URL en de taalvarianten van één pagina.
 *
 * Dit stond alleen in de layout, en daar is `alternates.languages` vast bedraad
 * op "/", "/fr" en "/en". Next erft niet-overschreven metadata uit de layout,
 * dus élke pagina verklaarde dat haar Franse en Engelse tegenhanger de
 * *startpagina* is. `/fr/catalogus` zei zo dat hij de vertaling van de Franse
 * homepage was. De sitemap doet het wél per pagina; de twee spraken elkaar tegen.
 *
 * Er was bovendien nergens een `canonical`, terwijl de simulator zijn keuzes
 * bewust in de queryreeks schrijft: zonder canonical is elke combinatie van
 * keuzes een aparte URL met dezelfde inhoud.
 *
 * `pad` is het pad zónder taalvoorvoegsel, zoals de routes in navigatie.ts:
 * "" voor de startpagina, "/catalogus", "/fiscaal-kader".
 */
export function paginaAlternates(locale: Locale, pad: string) {
  return {
    canonical: `${voorvoegsel(locale)}${pad}` || "/",
    languages: Object.fromEntries(
      routing.locales.map((l) => [TAALTAG[l], `${voorvoegsel(l)}${pad}` || "/"]),
    ),
  };
}
