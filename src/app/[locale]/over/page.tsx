import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Logomerk } from "@/components/Brand";
import Icon from "@/components/Icon";
import { SteunKaart } from "@/components/Steun";
import { Badge, Card } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { CONTACT } from "@/lib/contact";

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

  const tijdlijn = [
    { jaar: t("lijn1Jaar"), titel: t("lijn1Titel"), tekst: t("lijn1Tekst") },
    { jaar: t("lijn2Jaar"), titel: t("lijn2Titel"), tekst: t("lijn2Tekst") },
    { jaar: t("lijn3Jaar"), titel: t("lijn3Titel"), tekst: t("lijn3Tekst") },
    { jaar: t("lijn4Jaar"), titel: t("lijn4Titel"), tekst: t("lijn4Tekst") },
  ];

  const diensten = [
    { icon: "code", naam: t("ekoonWebNaam"), tekst: t("ekoonWeb") },
    { icon: "shield-check", naam: t("ekoonSupportNaam"), tekst: t("ekoonSupport") },
    { icon: "sparkles", naam: t("ekoonAutomatisatieNaam"), tekst: t("ekoonAutomatisatie") },
    { icon: "handshake", naam: t("ekoonAdviesNaam"), tekst: t("ekoonAdvies") },
  ];

  const mailLink = () => (
    <a href={`mailto:${CONTACT}`} className="font-medium text-ink underline underline-offset-2">
      {CONTACT}
    </a>
  );

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
          <p>{t("verhaal4")}</p>
          <p>{t("verhaal5")}</p>
        </div>
        <figure className="mt-6 border-l-[3px] border-gold bg-paper px-5 py-4">
          <blockquote className="m-0 text-[15px] font-medium leading-relaxed text-ink">
            {t("citaat")}
          </blockquote>
        </figure>
      </Card>

      <Card className="p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-ink">{t("lijnTitel")}</h2>
        <p className="mt-2 max-w-[52em] text-sm leading-relaxed text-ink-700">{t("lijnIntro")}</p>
        <ol className="mt-6 space-y-0">
          {tijdlijn.map((stap, i) => (
            <li key={stap.titel} className="flex gap-4">
              <div className="flex flex-col items-center">
                <span className="mt-1 h-3 w-3 shrink-0 rounded-full border-[2.5px] border-gold bg-white" />
                {i < tijdlijn.length - 1 && <span className="w-px flex-1 bg-line" />}
              </div>
              <div className={i < tijdlijn.length - 1 ? "pb-6" : ""}>
                <p className="m-0 text-[12px] font-bold uppercase tracking-[0.12em] text-gold">
                  {stap.jaar}
                </p>
                <p className="m-0 mt-1 text-[16px] font-bold text-ink">{stap.titel}</p>
                <p className="m-0 mt-1 text-sm leading-relaxed text-ink-700">{stap.tekst}</p>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-ink">{t("gratisTitel")}</h2>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-ink-700">
            <p>{t("gratis1")}</p>
            <p>{t("gratis2")}</p>
            <p>
              {t.rich("gratis3", {
                steunen: (chunks) => (
                  <Link
                    href="/steunen"
                    className="font-medium text-ink underline underline-offset-2"
                  >
                    {chunks}
                  </Link>
                ),
              })}
            </p>
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

      {/* WIE BOUWT EN ONDERHOUDT DIT */}
      <Card className="overflow-hidden">
        <div className="border-b border-line bg-paper px-6 py-5 sm:px-8">
          <p className="m-0 text-[12px] font-bold uppercase tracking-[0.14em] text-gold">
            {t("ekoonEyebrow")}
          </p>
          <h2 className="m-0 mt-1.5 text-[22px] font-bold tracking-[-0.01em] text-ink">
            {t("ekoonTitel")}
          </h2>
          <p className="m-0 mt-1.5 max-w-[52em] text-[15px] leading-relaxed text-ink-700">
            {t("ekoonPitch")}
          </p>
        </div>
        <div className="p-6 sm:p-8">
          <div className="space-y-4 text-sm leading-relaxed text-ink-700">
            <p>{t("ekoon1")}</p>
            <p>{t("ekoon2")}</p>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {diensten.map((d) => (
              <div key={d.naam} className="flex gap-3 rounded-[12px] border border-line p-4">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-gold-soft text-ink">
                  <Icon name={d.icon} size={18} />
                </span>
                <div>
                  <p className="m-0 text-[15px] font-bold text-ink">{d.naam}</p>
                  <p className="m-0 mt-0.5 text-[14px] leading-relaxed text-ink-700">{d.tekst}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <a
              href={`mailto:${CONTACT}`}
              className="inline-flex h-[46px] items-center gap-2 rounded-[11px] border-[1.5px] border-ink bg-white px-5 text-[15px] font-bold text-ink transition-colors hover:bg-ink hover:text-white"
            >
              <Icon name="mail" size={17} />
              {t("ekoonKnop")}
            </a>
            <p className="m-0 text-[13.5px] text-ink-500">{t("ekoonVoetnoot")}</p>
          </div>
        </div>
      </Card>

      <SteunKaart />

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-ink">{t("contactTitel")}</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-700">
          {t.rich("contact1", { mail: mailLink })}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-ink-700">
          {t.rich("contact3", { mail: mailLink })}
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
