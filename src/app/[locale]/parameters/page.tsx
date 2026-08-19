import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { paginaAlternates } from "@/lib/metadata";
import ParametersInhoud from "./ParametersInhoud";

/**
 * Een dunne serverschil om de client component.
 *
 * De pagina was zelf een client component, en die kan per definitie geen
 * generateMetadata exporteren. Ze erfde daardoor de titel, de beschrijving en de
 * hreflang-varianten van de layout, en die wijzen naar de startpagina: deze
 * publieke pagina verklaarde zichzelf als vertaling van de homepage en had geen
 * eigen omschrijving in de zoekresultaten.
 */
export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "parameters" });
  return {
    title: t("titel"),
    description: t("metaBeschrijving"),
    alternates: paginaAlternates(locale, "/parameters"),
  };
}

export default async function Pagina({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ParametersInhoud />;
}
