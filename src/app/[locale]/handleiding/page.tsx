import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Icon from "@/components/Icon";
import { SteunKnop } from "@/components/Steun";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { CONTACT } from "@/lib/contact";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "handleiding" });
  return { title: t("titel"), description: t("metaBeschrijving") };
}

export default async function HandleidingPagina({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <HandleidingInhoud />;
}

function HandleidingInhoud() {
  const t = useTranslations("handleiding");

  const stappen = [
    { n: "1", icon: "layout-grid", href: "/catalogus" as const, sleutel: "stap1" },
    { n: "2", icon: "car", href: "/wagens" as const, sleutel: "stap2" },
    { n: "3", icon: "bar-chart-3", href: "/vergelijking" as const, sleutel: "stap3" },
    { n: "4", icon: "award", href: "/vergelijking" as const, sleutel: "stap4" },
    { n: "5", icon: "sliders-horizontal", href: "/parameters" as const, sleutel: "stap5" },
  ];

  const woordenlijst = [
    [t("termVaa"), t("uitlegVaa")],
    [t("termVu"), t("uitlegVu")],
    [t("termAftrek"), t("uitlegAftrek")],
    [t("termRsz"), t("uitlegRsz")],
    [t("termTco"), t("uitlegTco")],
    [t("termUitdoof"), t("uitlegUitdoof")],
  ];

  return (
    <div className="mx-auto max-w-[1100px] px-6 py-[52px]">
      <section className="relative overflow-hidden rounded-[18px] bg-ink px-9 py-12 text-white">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 140% at 100% 0%, color-mix(in srgb, var(--gold) 26%, transparent), transparent 55%)",
          }}
        />
        <div className="relative">
          <h1 className="m-0 text-[clamp(30px,4vw,46px)] font-bold tracking-[-0.02em]">
            {t("kop")}
          </h1>
          <p className="mt-3 max-w-[44em] text-[17px] leading-relaxed text-white/[0.75]">
            {t("intro")}
          </p>
        </div>
      </section>

      <ol className="mt-8 space-y-4">
        {stappen.map((s) => (
          <li key={s.n}>
            <div className="flex flex-col gap-5 rounded-[14px] border border-line bg-white p-6 sm:flex-row sm:items-start">
              <div className="flex shrink-0 items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ink text-lg font-bold text-white">
                  {s.n}
                </span>
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-[12px] bg-gold-soft text-ink sm:hidden">
                  <Icon name={s.icon} size={22} />
                </span>
              </div>
              <div className="flex-1">
                <div className="mb-1.5 flex items-center gap-2.5">
                  <span className="hidden h-9 w-9 items-center justify-center rounded-[10px] bg-gold-soft text-ink sm:inline-flex">
                    <Icon name={s.icon} size={19} />
                  </span>
                  <h2 className="m-0 text-[19px] font-bold text-ink">{t(`${s.sleutel}Titel`)}</h2>
                </div>
                <p className="m-0 text-[15px] leading-relaxed text-ink-700">
                  {t(`${s.sleutel}Tekst`)}
                </p>
                <Link
                  href={s.href}
                  className="mt-3 inline-flex items-center gap-1.5 text-[14.5px] font-bold text-ink hover:text-gold"
                >
                  {t(`${s.sleutel}Link`)} <Icon name="arrow-right" size={16} />
                </Link>
              </div>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-8 rounded-[14px] border border-line bg-white p-6">
        <h2 className="m-0 text-[22px] font-bold text-ink">{t("woordenlijst")}</h2>
        <p className="mb-5 mt-1.5 text-[15px] text-ink-700">{t("woordenlijstIntro")}</p>
        <dl className="grid gap-x-10 gap-y-4 sm:grid-cols-2">
          {woordenlijst.map(([term, uitleg]) => (
            <div key={term}>
              <dt className="font-bold text-ink">{term}</dt>
              <dd className="m-0 text-[14.5px] leading-relaxed text-ink-700">{uitleg}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 text-[14px] text-ink-500">
          {t.rich("meerAchtergrond", {
            kader: (chunks) => (
              <Link href="/fiscaal-kader" className="font-bold text-ink hover:text-gold">
                {chunks}
              </Link>
            ),
          })}
        </p>
      </div>

      {/* Wie hier geraakt is, heeft de tool gebruikt: de juiste plek voor de
          vraag om te helpen, en meteen ook voor het adres waar een fout in de
          berekening gemeld kan worden. */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-5 rounded-[14px] border border-line bg-paper p-6">
        <div className="max-w-[42em]">
          <h2 className="m-0 text-[18px] font-bold text-ink">{t("hulpTitel")}</h2>
          <p className="m-0 mt-1.5 text-[14.5px] leading-relaxed text-ink-700">
            {t.rich("hulpTekst", {
              mail: () => (
                <a
                  href={`mailto:${CONTACT}`}
                  className="font-bold text-ink underline underline-offset-2 hover:text-accent"
                >
                  {CONTACT}
                </a>
              ),
            })}
          </p>
        </div>
        <SteunKnop />
      </div>
    </div>
  );
}
