import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  Artikel,
  JuridischePagina,
  Lijst,
  interneLink,
  opmaak,
} from "@/components/Juridisch";
import type { Locale } from "@/i18n/routing";
import { paginaAlternates } from "@/lib/metadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "voorwaarden" });
  return {
    title: t("titel"),
    description: t("metaBeschrijving"),
    alternates: paginaAlternates(locale, "/voorwaarden"),
  };
}

export default async function VoorwaardenPagina({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <VoorwaardenInhoud />;
}

function VoorwaardenInhoud() {
  const t = useTranslations("voorwaarden");
  const tPrivacy = useTranslations("privacy");

  return (
    <JuridischePagina
      titel={t("titel")}
      intro={t("intro")}
      bijgewerkt={tPrivacy("bijgewerktLabel", { datum: t("bijgewerkt") })}
    >
      <Artikel titel={t("geenAdviesTitel")}>
        <p>{t("geenAdvies1")}</p>
        <p>{t.rich("geenAdvies2", opmaak)}</p>
      </Artikel>

      <Artikel titel={t("gratisTitel")}>
        <p>{t("gratis1")}</p>
        <p>{t("gratis2")}</p>
      </Artikel>

      <Artikel titel={t("cijfersTitel")}>
        <p>{t.rich("cijfers1", { parameters: interneLink("/parameters") })}</p>
        <p>{t("cijfers2")}</p>
      </Artikel>

      <Artikel titel={t("accountTitel")}>
        <Lijst items={[t("account1"), t("account2"), t("account3")]} />
      </Artikel>

      <Artikel titel={t("verwerkerTitel")}>
        <p>{t.rich("verwerker", { privacy: interneLink("/privacy") })}</p>
      </Artikel>

      <Artikel titel={t("aansprakelijkheidTitel")}>
        <p>{t("aansprakelijkheid1")}</p>
        <p>{t.rich("aansprakelijkheid2", opmaak)}</p>
      </Artikel>

      <Artikel titel={t("rechtTitel")}>
        <p>{t("recht")}</p>
      </Artikel>
    </JuridischePagina>
  );
}
