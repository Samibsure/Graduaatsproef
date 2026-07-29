import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Logomerk } from "@/components/Brand";
import IbanKopie from "@/components/IbanKopie";
import Icon from "@/components/Icon";
import { Badge, Card } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { CONTACT } from "@/lib/contact";
import {
  HEEFT_STEUNKANAAL,
  STEUN_BEGUNSTIGDE,
  STEUN_BIC,
  STEUN_IBAN,
  STEUN_MEDEDELING,
  STEUN_URL,
} from "@/lib/steun";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "steun" });
  return { title: t("titel"), description: t("metaBeschrijving") };
}

export default async function SteunenPagina({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <SteunenInhoud />;
}

function SteunenInhoud() {
  const t = useTranslations("steun");

  const kosten = [
    { icon: "zap", naam: t("kostHostingNaam"), tekst: t("kostHosting") },
    { icon: "shield-check", naam: t("kostDatabankNaam"), tekst: t("kostDatabank") },
    { icon: "mail", naam: t("kostDomeinNaam"), tekst: t("kostDomein") },
    { icon: "sliders-horizontal", naam: t("kostOnderhoudNaam"), tekst: t("kostOnderhoud") },
  ];

  const helpen = [
    { icon: "share-2", naam: t("helpDelenNaam"), tekst: t("helpDelen") },
    { icon: "triangle-alert", naam: t("helpFoutNaam"), tekst: t("helpFout") },
    { icon: "lightbulb", naam: t("helpIdeeNaam"), tekst: t("helpIdee") },
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
          <p className="mt-3 text-sm leading-relaxed text-white/60">{t("heroNadruk")}</p>
        </div>
      </section>

      <Card className="p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-ink">{t("waaromTitel")}</h2>
        <div className="mt-3 space-y-4 text-sm leading-relaxed text-ink-700">
          <p>{t("waarom1")}</p>
          <p>{t("waarom2")}</p>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {kosten.map((k) => (
            <div key={k.naam} className="flex gap-3 rounded-[12px] border border-line p-4">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-gold-soft text-ink">
                <Icon name={k.icon} size={18} />
              </span>
              <div>
                <p className="m-0 text-[15px] font-bold text-ink">{k.naam}</p>
                <p className="m-0 mt-0.5 text-[14px] leading-relaxed text-ink-700">{k.tekst}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* HOE BIJDRAGEN */}
      <section>
        <h2 className="text-[22px] font-bold tracking-[-0.01em] text-ink">{t("hoeTitel")}</h2>
        <p className="mb-5 mt-1.5 max-w-[52em] text-[15px] text-ink-700">{t("hoeIntro")}</p>

        {HEEFT_STEUNKANAAL ? (
          <div className="grid items-start gap-6 lg:grid-cols-2">
            {STEUN_URL && (
              <Card className="flex flex-col p-6">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-[11px] bg-gold-soft text-ink">
                    <Icon name="coffee" size={21} />
                  </span>
                  <h3 className="m-0 text-[18px] font-bold text-ink">{t("koffieTitel")}</h3>
                </div>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-700">{t("koffieTekst")}</p>
                <a
                  href={STEUN_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-flex h-[46px] items-center gap-2 self-start rounded-[11px] bg-gold px-6 text-[15px] font-bold text-white transition-colors hover:bg-gold-hover"
                >
                  <Icon name="coffee" size={17} />
                  {t("koffieKnop")}
                </a>
              </Card>
            )}

            {STEUN_IBAN && (
              <Card className="flex flex-col p-6">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-[11px] bg-gold-soft text-ink">
                    <Icon name="piggy-bank" size={21} />
                  </span>
                  <h3 className="m-0 text-[18px] font-bold text-ink">{t("overschrijvingTitel")}</h3>
                </div>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-700">
                  {t("overschrijvingTekst")}
                </p>
                <dl className="mt-5 space-y-3 rounded-[12px] border border-line bg-paper p-4">
                  <div>
                    <dt className="text-[12px] font-bold uppercase tracking-[0.1em] text-ink-500">
                      {t("ibanLabel")}
                    </dt>
                    <dd className="m-0 mt-1">
                      <IbanKopie iban={STEUN_IBAN} label={t("kopieerLabel")} />
                    </dd>
                  </div>
                  {STEUN_BEGUNSTIGDE && (
                    <div>
                      <dt className="text-[12px] font-bold uppercase tracking-[0.1em] text-ink-500">
                        {t("begunstigdeLabel")}
                      </dt>
                      <dd className="m-0 mt-0.5 text-[15px] text-ink">{STEUN_BEGUNSTIGDE}</dd>
                    </div>
                  )}
                  {STEUN_BIC && (
                    <div>
                      <dt className="text-[12px] font-bold uppercase tracking-[0.1em] text-ink-500">
                        {t("bicLabel")}
                      </dt>
                      <dd className="m-0 mt-0.5 text-[15px] text-ink">{STEUN_BIC}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-[12px] font-bold uppercase tracking-[0.1em] text-ink-500">
                      {t("mededelingLabel")}
                    </dt>
                    <dd className="m-0 mt-0.5 text-[15px] text-ink">{STEUN_MEDEDELING}</dd>
                  </div>
                </dl>
                <p className="m-0 mt-3 text-[13px] leading-relaxed text-ink-500">
                  {t("rekeningVoetnoot")}
                </p>
              </Card>
            )}
          </div>
        ) : (
          <Card className="p-6">
            <p className="m-0 text-sm leading-relaxed text-ink-700">
              {t.rich("geenKanaal", {
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
          </Card>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-ink">{t("gratisHelpenTitel")}</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-700">{t("gratisHelpenIntro")}</p>
          <ul className="mt-4 space-y-3">
            {helpen.map((h) => (
              <li key={h.naam} className="flex gap-3">
                <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-paper text-ink-500">
                  <Icon name={h.icon} size={16} />
                </span>
                <span className="text-sm leading-relaxed text-ink-700">
                  <span className="font-bold text-ink">{h.naam}</span>: {h.tekst}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-sm leading-relaxed text-ink-700">
            {t.rich("gratisHelpenMail", {
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
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-ink">{t("kleineLettersTitel")}</h2>
          <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-ink-700">
            <li className="flex gap-2.5">
              <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
              <span>{t("kleineLetters1")}</span>
            </li>
            <li className="flex gap-2.5">
              <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
              <span>{t("kleineLetters2")}</span>
            </li>
            <li className="flex gap-2.5">
              <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
              <span>{t("kleineLetters3")}</span>
            </li>
            <li className="flex gap-2.5">
              <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
              <span>{t("kleineLetters4")}</span>
            </li>
          </ul>
          <p className="mt-5 text-sm leading-relaxed text-ink-700">
            {t.rich("kleineLettersOver", {
              over: (chunks) => (
                <Link href="/over" className="font-medium text-ink underline underline-offset-2">
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </Card>
      </div>
    </div>
  );
}
