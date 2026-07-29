import { getTranslations, setRequestLocale } from "next-intl/server";
import FiscaalVoorbeeld, { Kerncijfers } from "./_start/FiscaalVoorbeeld";
import UitgelichteWagens from "./_start/UitgelichteWagens";
import Icon from "@/components/Icon";
import { Container, Eyebrow, knopKlassen } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { START_HIER_HREF } from "@/lib/navigatie";

/**
 * De startpagina.
 *
 * Servercomponent, en dat is een bewuste wijziging: dit was een clientcomponent
 * die zijn gegevens in een useEffect ophaalde, dus de belangrijkste pagina van
 * de site verfde eerst puntjes en gaf een zoekmachine een lege hero te lezen.
 * De tekst en de knoppen staan nu meteen in het antwoord; alleen de blokken die
 * echt cijfers nodig hebben, zijn clienteilanden.
 */
export default async function Startpagina({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "dashboard" });

  const stappen = [
    { nummer: "01", icoon: "car", titel: t("stap1Titel"), tekst: t("stap1Tekst") },
    { nummer: "02", icoon: "calculator", titel: t("stap2Titel"), tekst: t("stap2Tekst") },
    { nummer: "03", icoon: "scale", titel: t("stap3Titel"), tekst: t("stap3Tekst") },
  ];

  return (
    <div>
      {/* HERO */}
      <section className="overflow-hidden border-b border-line bg-paper">
        <Container className="grid items-center gap-14 py-[72px] lg:grid-cols-[1.1fr_0.9fr]">
          <div className="bs-rise">
            <Eyebrow dash>{t("eyebrow")}</Eyebrow>
            <h1 className="m-0 mb-5 text-[clamp(38px,5.2vw,60px)] font-bold leading-[1.05] tracking-[-0.022em] text-ink">
              {t("kop1")}
              <br />
              <span className="text-accent">{t("kop2")}</span>
            </h1>
            <p className="m-0 mb-8 max-w-[30em] text-[19px] leading-relaxed text-ink-700">
              {t("intro")}
            </p>

            <div className="flex flex-wrap gap-3.5">
              <Link href={START_HIER_HREF} className={knopKlassen("primair", "lg")}>
                {t("ctaStartHier")}
                <Icon name="arrow-right" size={18} />
              </Link>
              <Link href="/catalogus" className={knopKlassen("secundair", "lg")}>
                {t("ctaCatalogus")}
              </Link>
            </div>

            {/* De belangrijkste zin van de pagina: hij haalt de drempel weg die
                "Gratis starten" juist opwierp. */}
            <p className="m-0 mt-4 flex items-center gap-2 text-[14.5px] text-ink-500">
              <Icon name="check" size={16} />
              {t("ctaGeenAccount")}
            </p>
          </div>

          <div className="bs-rise" style={{ animationDelay: ".08s" }}>
            <FiscaalVoorbeeld />
          </div>
        </Container>
      </section>

      {/* KERNCIJFERS */}
      <section>
        <Container className="py-14">
          <Kerncijfers />
        </Container>
      </section>

      {/* ZO WERKT HET */}
      <section className="border-y border-line bg-paper">
        <Container className="py-[68px]">
          <div className="mx-auto mb-12 max-w-[640px] text-center">
            <div className="mb-3.5 text-[12px] font-bold uppercase tracking-[0.16em] text-accent">
              {t("zoWerktHet")}
            </div>
            <h2 className="m-0 mb-4 text-[clamp(28px,3.4vw,40px)] font-bold tracking-[-0.02em] text-ink">
              {t("zoWerktKop")}
            </h2>
            <p className="m-0 text-[17px] text-ink-700">{t("zoWerktIntro")}</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {stappen.map((s) => (
              <div key={s.nummer} className="rounded-[14px] border border-line bg-white p-[30px]">
                <div className="mb-5 flex items-center justify-between">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-[12px] bg-accent-soft text-ink">
                    <Icon name={s.icoon} size={23} />
                  </span>
                  <span className="text-[40px] font-bold leading-none text-line">{s.nummer}</span>
                </div>
                <h3 className="m-0 mb-2.5 text-[20px] font-bold text-ink">{s.titel}</h3>
                <p className="m-0 text-[15px] leading-relaxed text-ink-700">{s.tekst}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link href="/handleiding" className={knopKlassen("stil", "md")}>
              <Icon name="info" size={17} /> {t("leesHandleiding")}
            </Link>
          </div>
        </Container>
      </section>

      {/* UITGELICHT */}
      <section>
        <Container className="py-[68px]">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
            <div>
              <Eyebrow>{t("uitCatalogus")}</Eyebrow>
              <h2 className="m-0 text-[clamp(28px,3.4vw,40px)] font-bold tracking-[-0.02em] text-ink">
                {t("uitgelichtKop")}
              </h2>
            </div>
            <Link href="/catalogus" className={knopKlassen("stil", "md", "whitespace-nowrap")}>
              {t("bekijkCatalogus")} <Icon name="arrow-right" size={17} />
            </Link>
          </div>

          <UitgelichteWagens />
        </Container>
      </section>

      {/* AFSLUITENDE OPROEP
          Voorheen eindigde de pagina op het wagenraster en stond er in het hele
          document precies één conversielink, in de hero. Wie tot hier leest, is
          juist degene die overtuigd is. */}
      <section className="bg-ink-gradient">
        <Container className="py-[72px] text-center">
          <h2 className="m-0 mx-auto mb-4 max-w-[18em] text-[clamp(26px,3.2vw,38px)] font-bold leading-[1.15] tracking-[-0.02em] text-white">
            {t("slotKop")}
          </h2>
          <p className="m-0 mx-auto mb-8 max-w-[38em] text-[17px] leading-relaxed text-white/[0.78]">
            {t("slotTekst")}
          </p>
          <div className="flex flex-wrap justify-center gap-3.5">
            <Link href={START_HIER_HREF} className={knopKlassen("primair", "lg")}>
              {t("ctaStartHier")}
              <Icon name="arrow-right" size={18} />
            </Link>
            <Link
              href="/registreren"
              className={knopKlassen(
                "stil",
                "lg",
                "border-white/[0.28] bg-transparent text-white hover:border-white hover:bg-white/[0.08] hover:text-white",
              )}
            >
              {t("slotRegistreren")}
            </Link>
          </div>
        </Container>
      </section>
    </div>
  );
}
