import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Logomerk } from "@/components/Brand";
import { Badge, Card } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

const CONTACT = "contact@autofiscaliteit.com";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "over" });
  return { title: t("titel"), description: t("metaBeschrijving") };
}

export default async function OverPagina({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <OverInhoud />;
}

function OverInhoud() {
  const t = useTranslations("over");

  const wat = [
    { naam: t("watCatalogusNaam"), tekst: t("watCatalogus") },
    { naam: t("watWagensNaam"), tekst: t("watWagens") },
    { naam: t("watVergelijkingNaam"), tekst: t("watVergelijking") },
    { naam: t("watKaderNaam"), tekst: t("watKader") },
  ];

  return (
    <div className="mx-auto max-w-[1100px] space-y-8 px-6 py-12">
      <section className="bg-ink-gradient relative overflow-hidden rounded-3xl px-6 py-10 text-white sm:px-10">
        <div className="absolute -right-8 -top-8 opacity-20">
          <Logomerk size={150} />
        </div>
        <div className="relative max-w-3xl">
          <Badge tint="gold">{t("badge")}</Badge>
          <h1 className="mt-4 text-3xl font-bold tracking-tight">{t("kop")}</h1>
          <p className="mt-4 leading-relaxed text-white/80">{t("heroTekst")}</p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { label: t("wieLabel"), naam: t("wieNaam"), sub: t("wieSub") },
          { label: t("herkomstLabel"), naam: t("herkomstNaam"), sub: t("herkomstSub") },
          { label: t("kostLabel"), naam: t("kostNaam"), sub: t("kostSub") },
        ].map((kaart) => (
          <Card key={kaart.label} className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
              {kaart.label}
            </p>
            <p className="mt-1 font-semibold text-ink">{kaart.naam}</p>
            <p className="text-sm text-ink-500">{kaart.sub}</p>
          </Card>
        ))}
      </section>

      <Card className="p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-ink">{t("verhaalTitel")}</h2>
        <div className="mt-3 space-y-4 text-sm leading-relaxed text-ink-700">
          <p>{t("verhaal1")}</p>
          <p>{t("verhaal2")}</p>
          <p>{t("verhaal3")}</p>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-ink">{t("gratisTitel")}</h2>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-ink-700">
            <p>{t("gratis1")}</p>
            <p>{t("gratis2")}</p>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-ink">{t("watTitel")}</h2>
          <ul className="mt-3 space-y-2 text-sm text-ink-700">
            {wat.map((item) => (
              <li key={item.naam}>
                <span className="font-medium text-ink">{item.naam}</span>: {item.tekst}
              </li>
            ))}
          </ul>
          <Link
            href="/registreren"
            className="mt-5 inline-block rounded-xl bg-gold px-4 py-2 text-sm font-semibold text-white hover:bg-gold-hover"
          >
            {t("startKnop")}
          </Link>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-ink">{t("contactTitel")}</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-700">
          {t.rich("contact1", {
            mail: () => (
              <a
                href={`mailto:${CONTACT}`}
                className="font-medium text-ink underline underline-offset-2"
              >
                {CONTACT}
              </a>
            ),
          })}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-ink-700">
          {t.rich("contact2", {
            privacy: (chunks) => (
              <Link href="/privacy" className="font-medium text-ink underline underline-offset-2">
                {chunks}
              </Link>
            ),
            voorwaarden: (chunks) => (
              <Link
                href="/voorwaarden"
                className="font-medium text-ink underline underline-offset-2"
              >
                {chunks}
              </Link>
            ),
          })}
        </p>
      </Card>
    </div>
  );
}
