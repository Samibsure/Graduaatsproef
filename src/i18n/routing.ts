import { defineRouting } from "next-intl/routing";

/**
 * België is drietalig en Autofiscaliteit richt zich op het hele land.
 * Nederlands is de standaardtaal en krijgt geen voorvoegsel in de URL, zodat
 * bestaande links blijven werken; Frans en Engels zitten onder /fr en /en.
 */
export const routing = defineRouting({
  locales: ["nl", "fr", "en"],
  defaultLocale: "nl",
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];

/**
 * De taalcode die Intl gebruikt.
 *
 * Nederlands en Frans krijgen de Belgische variant: die schrijven € 1.234,56 en
 * 1 234,56 €, precies zoals hier gebruikelijk is.
 *
 * Engels niet, en dat is geen slordigheid maar een reparatie. Bij `en-BE`
 * combineert ICU de Engelse valutaopmaak met de Belgische getalsymbolen, en dan
 * staat op één scherm:
 *
 *   euro(45123,45)  ->  €45,123      (komma = duizendtal)
 *   getal(45123,45) ->  45.123,45    (komma = decimaal)
 *
 * Dezelfde komma betekent dus twee dingen, in een applicatie die niets anders
 * doet dan bedragen en CO2-cijfers naast elkaar zetten. `en-IE` is Engelstalig,
 * rekent in euro en houdt beide op de Angelsaksische conventie: €45,123 en
 * 45,123.45. De datumopmaak blijft "1 July 2023".
 */
export const INTL_LOCALE: Record<Locale, string> = {
  nl: "nl-BE",
  fr: "fr-BE",
  en: "en-IE",
};

/**
 * De taalcode voor `<html lang>`, hreflang en og:locale.
 *
 * Dit is bewust niet dezelfde tabel als INTL_LOCALE. Die gaat over hoe een getal
 * eruitziet; deze over welke taal een pagina spreekt en op wie ze mikt. `en-IE`
 * als hreflang zou een zoekmachine vertellen dat de Engelse versie voor Ierland
 * bedoeld is, terwijl ze er is voor iedereen in Belgie die geen Nederlands of
 * Frans leest. Het gewone `en` zegt precies dat.
 */
export const TAALTAG: Record<Locale, string> = {
  nl: "nl-BE",
  fr: "fr-BE",
  en: "en",
};

export const TAALNAAM: Record<Locale, string> = {
  nl: "Nederlands",
  fr: "Français",
  en: "English",
};
