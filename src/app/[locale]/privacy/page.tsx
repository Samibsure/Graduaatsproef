import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  Artikel,
  JuridischePagina,
  Lijst,
  interneLink,
  mailLink,
  opmaak,
} from "@/components/Juridisch";
import type { Locale } from "@/i18n/routing";
import { CONTACT } from "@/lib/contact";


export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "privacy" });
  return { title: t("titel"), description: t("metaBeschrijving") };
}

export default async function PrivacyPagina({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <PrivacyInhoud />;
}

function PrivacyInhoud() {
  const t = useTranslations("privacy");

  return (
    <JuridischePagina
      eyebrow={t("eyebrow")}
      titel={t("titel")}
      intro={t("intro")}
      bijgewerkt={t("bijgewerktLabel", { datum: t("bijgewerkt") })}
    >
      <Artikel titel={t("verantwoordelijkTitel")}>
        <p>{t.rich("verantwoordelijk", { mail: mailLink(CONTACT) })}</p>
      </Artikel>

      <Artikel titel={t("rollenTitel")}>
        <p>{t("rollen1")}</p>
        <p>{t.rich("rollen2", opmaak)}</p>
        <p>{t.rich("rollen3", opmaak)}</p>
      </Artikel>

      <Artikel titel={t("minimaTitel")}>
        <p>{t.rich("minima1", opmaak)}</p>
        <p>{t("minima2")}</p>
      </Artikel>

      <Artikel titel={t("welkeTitel")}>
        <Lijst
          items={[
            t.rich("welkeAccount", opmaak),
            t.rich("welkeBedrijf", opmaak),
            t.rich("welkeWagens", opmaak),
            t.rich("welkeEvaluaties", opmaak),
            t.rich("welkeTechnisch", opmaak),
          ]}
        />
      </Artikel>

      <Artikel titel={t("waarTitel")}>
        <p>{t("waar1")}</p>
        <p>{t("waar2")}</p>
      </Artikel>

      <Artikel titel={t("cookiesTitel")}>
        <p>{t("cookies")}</p>
      </Artikel>

      <Artikel titel={t("bewaartermijnTitel")}>
        <p>{t("bewaartermijn")}</p>
      </Artikel>

      <Artikel titel={t("rechtenTitel")}>
        <p>{t("rechten1")}</p>
        <p>{t.rich("rechten2", { instellingen: interneLink("/instellingen") })}</p>
        <p>{t("rechten3")}</p>
      </Artikel>

      <Artikel titel={t("beveiligingTitel")}>
        <p>{t("beveiliging1")}</p>
        <p>{t("beveiliging2")}</p>
      </Artikel>
    </JuridischePagina>
  );
}
