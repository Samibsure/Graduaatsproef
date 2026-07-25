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

/** De taalcode die Intl gebruikt: altijd de Belgische variant. */
export const INTL_LOCALE: Record<Locale, string> = {
  nl: "nl-BE",
  fr: "fr-BE",
  en: "en-BE",
};

export const TAALNAAM: Record<Locale, string> = {
  nl: "Nederlands",
  fr: "Français",
  en: "English",
};
