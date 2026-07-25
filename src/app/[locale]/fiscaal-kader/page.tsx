import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Icon from "@/components/Icon";
import { Eyebrow } from "@/components/ui";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "fiscaalKader" });
  return { title: t("titel"), description: t("metaBeschrijving") };
}

export default async function FiscaalKaderPagina({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <FiscaalKaderInhoud />;
}

function FiscaalKaderInhoud() {
  const t = useTranslations("fiscaalKader");

  const toc = [
    { id: "fk-aftrek", label: t("aftrekTitel") },
    { id: "fk-vaa", label: t("vaaTitel") },
    { id: "fk-co2", label: t("co2Titel") },
    { id: "fk-tco", label: t("tcoTitel") },
  ];

  const aftrekRijen = [
    [t("rijElektrisch"), t("rijElektrischAftrek"), t("rijElektrischTendens")],
    [t("rijPhev"), t("rijPhevAftrek"), t("rijPhevTendens")],
    [t("rijFossiel"), t("rijFossielAftrek"), t("rijFossielTendens")],
  ];

  const vaaItems = [
    [t("vaaCatalogusTitel"), t("vaaCatalogus")],
    [t("vaaCo2Titel"), t("vaaCo2")],
    [t("vaaLeeftijdTitel"), t("vaaLeeftijd")],
  ];

  return (
    <div className="mx-auto grid max-w-[1100px] items-start gap-14 px-6 pb-[90px] pt-[52px] lg:grid-cols-[220px_1fr]">
      <aside className="sticky top-[92px] hidden lg:block">
        <div className="mb-4 text-[11.5px] font-bold uppercase tracking-[0.14em] text-ink-500">
          {t("opDezePagina")}
        </div>
        <nav className="flex flex-col gap-0.5 border-l border-line">
          {toc.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="bs-toc-link -ml-px py-2 pl-4 text-[14px] transition-colors"
            >
              {item.label}
            </a>
          ))}
        </nav>
      </aside>

      <article className="max-w-[720px]">
        <Eyebrow>{t("eyebrow")}</Eyebrow>
        <h1 className="m-0 mb-[18px] text-[clamp(30px,4vw,46px)] font-bold tracking-[-0.02em]">
          {t("kop")}
        </h1>
        <p className="m-0 mb-4 text-[18px] leading-relaxed text-ink-700">{t("intro")}</p>
        <div className="inline-flex items-center gap-2 text-[13px] text-ink-500">
          <Icon name="calendar" size={15} /> {t("bijgewerkt")}
        </div>

        <section id="fk-aftrek" className="mt-12 scroll-mt-[92px]">
          <h2 className="m-0 mb-3.5 text-[26px] font-bold tracking-[-0.01em]">{t("aftrekTitel")}</h2>
          <p className="m-0 mb-[18px] text-[16px] leading-[1.7] text-ink-700">{t("aftrekTekst")}</p>
          <div className="mb-3.5 overflow-hidden rounded-[12px] border border-line">
            <table className="w-full border-collapse text-[15px]">
              <thead>
                <tr className="bg-paper">
                  {[t("kolomAandrijving"), t("kolomAftrek"), t("kolomTendens")].map((h) => (
                    <th
                      key={h}
                      className="border-b border-line px-[18px] py-[13px] text-left text-[12px] font-bold uppercase tracking-[0.08em] text-ink-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {aftrekRijen.map((r) => (
                  <tr key={r[0]} className="border-b border-line last:border-0">
                    <td className="px-[18px] py-3.5 font-bold text-ink">{r[0]}</td>
                    <td className="px-[18px] py-3.5 text-ink-700">{r[1]}</td>
                    <td className="px-[18px] py-3.5 text-ink-700">{r[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="m-0 text-[13.5px] leading-[1.6] text-ink-500">{t("aftrekVoetnoot")}</p>
        </section>

        <section id="fk-vaa" className="mt-11 scroll-mt-[92px]">
          <h2 className="m-0 mb-3.5 text-[26px] font-bold tracking-[-0.01em]">{t("vaaTitel")}</h2>
          <p className="m-0 mb-[18px] text-[16px] leading-[1.7] text-ink-700">{t("vaaTekst")}</p>
          <div className="grid gap-px overflow-hidden rounded-[12px] border border-line bg-line">
            {vaaItems.map(([titel, tekst]) => (
              <div key={titel} className="flex items-start gap-3.5 bg-white px-[18px] py-4">
                <span className="mt-px flex-none text-gold">
                  <Icon name="circle-dot" size={17} />
                </span>
                <div>
                  <div className="mb-0.5 font-bold text-ink">{titel}</div>
                  <div className="text-[14.5px] leading-[1.55] text-ink-700">{tekst}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="fk-co2" className="mt-11 scroll-mt-[92px]">
          <h2 className="m-0 mb-3.5 text-[26px] font-bold tracking-[-0.01em]">{t("co2Titel")}</h2>
          <p className="m-0 text-[16px] leading-[1.7] text-ink-700">{t("co2Tekst")}</p>
        </section>

        <section id="fk-tco" className="mt-11 scroll-mt-[92px]">
          <h2 className="m-0 mb-3.5 text-[26px] font-bold tracking-[-0.01em]">{t("tcoTitel")}</h2>
          <p className="m-0 mb-[18px] text-[16px] leading-[1.7] text-ink-700">{t("tcoTekst")}</p>
          <div className="flex items-start gap-4 rounded-[14px] bg-ink px-[26px] py-6">
            <span className="mt-0.5 flex-none text-gold">
              <Icon name="lightbulb" size={22} />
            </span>
            <div>
              <div className="mb-1.5 text-[16px] font-bold text-white">{t("tcoKaderTitel")}</div>
              <p className="m-0 text-[14.5px] leading-[1.6] text-white/[0.74]">{t("tcoKader")}</p>
            </div>
          </div>
        </section>
      </article>
    </div>
  );
}
