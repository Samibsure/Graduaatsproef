import { getTranslations, setRequestLocale } from "next-intl/server";
import FiscaalVoorbeeld, { Kerncijfers } from "./_start/FiscaalVoorbeeld";
import UitgelichteWagens from "./_start/UitgelichteWagens";
import Icon from "@/components/Icon";
import Regimematrix from "@/components/Regimematrix";
import { Container, knopKlassen } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { DEFAULT_CONTEXT } from "@/lib/fiscaal/defaults";
import { regimebanden } from "@/lib/fiscaal/regimes";
import { formatters } from "@/lib/format";
import { START_HIER_HREF } from "@/lib/navigatie";
import { ONDERDELEN, POSTEN, VRAGEN } from "@/lib/startpagina";

/**
 * De pagina wordt statisch gebouwd, dus "vandaag" moet uit de bouw komen en niet
 * uit een `new Date()` in de render: anders wijst de markering in de regimematrix
 * naar de bestelperiode van de dag waarop er toevallig gedeployd is.
 *
 * `revalidate` hieronder houdt die markering fris over een jaargrens heen. De
 * percentages zelf hebben dat niet nodig, die komen uit de aftrekkalender.
 */
export const revalidate = 86400;

/**
 * De startpagina.
 *
 * Servercomponent, en dat is een bewuste keuze: dit was ooit een clientcomponent
 * die zijn gegevens in een useEffect ophaalde, dus de belangrijkste pagina van
 * de site verfde eerst puntjes en gaf een zoekmachine een lege hero te lezen.
 * De tekst en de knoppen staan nu meteen in het antwoord; alleen de blokken die
 * echt cijfers nodig hebben, zijn clienteilanden.
 *
 * ## Wat deze pagina moet doen
 *
 * Ze deed tot nu toe één ding: overtuigen. Een hero met een belofte, drie
 * stappen en een raster wagens. Wat de applicatie eigenlijk kán, stond nergens,
 * en wat ze precies uitrekent evenmin. Een bezoeker die "bedrijfswagen fiscaal"
 * zoekt, landde op een pagina die hem vertelde dat het allemaal helder zou
 * worden, zonder hem één ding te tonen dat hij kon gebruiken.
 *
 * Daarom staat er nu, in deze volgorde: wat je krijgt (de zes onderdelen, elk
 * met een link), wat er berekend wordt (de acht fiscale posten), waarom het
 * dringt (de omslag van 2026), hoe het werkt, en de vragen die iemand stelt
 * vóór hij een rekentool vertrouwt.
 */
export default async function Startpagina({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "dashboard" });
  const opmaak = formatters(locale);

  // Bij de bouw vastgezet en door `revalidate` dagelijks verversd, zodat de
  // markering "geldt vandaag" in de matrix niet op de deploydatum blijft staan.
  const peildatum = new Date().toISOString().slice(0, 10);

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
            <h1 className="m-0 mb-5 text-[clamp(38px,5.2vw,60px)] font-bold leading-[1.05] tracking-[-0.022em] text-ink">
              {t("kop1")}
              <br />
              <span className="text-accent">{t("kop2")}</span>
            </h1>
            <p className="m-0 mb-5 max-w-[32em] text-[19px] leading-relaxed text-ink-700">
              {t("intro")}
            </p>
            <p className="m-0 mb-8 max-w-[32em] text-[16.5px] leading-relaxed text-ink-700">
              {t("introTwee")}
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

            {/* De drie zinnen die de drempel wegnemen die "Gratis starten" juist
                opwierp: geen prijs, geen registratie, en cijfers met een bron. */}
            {/* Op een telefoon onder elkaar: naast elkaar liepen deze drie tegen
                de schermrand en tegen de meldknop rechtsonder aan. */}
            <ul className="m-0 mt-6 flex list-none flex-col gap-2 p-0 text-[14.5px] text-ink-500 sm:flex-row sm:flex-wrap sm:gap-x-6">
              {["troefGratis", "troefGeenAccount", "troefBronnen"].map((s) => (
                <li key={s} className="flex items-center gap-2">
                  <Icon name="check" size={16} className="text-accent" />
                  {t(s)}
                </li>
              ))}
            </ul>
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

      {/* WAT JE ERMEE KAN
          Dit blok is de kern van de herwerking: het beantwoordt de vraag "wat
          doet deze site eigenlijk" met zes antwoorden waar je meteen op kan
          klikken, in plaats van met een belofte. */}
      <section className="border-y border-line bg-paper">
        <Container className="py-[68px]">
          <div className="mx-auto mb-11 max-w-[680px] text-center">
            <h2 className="m-0 mb-4 text-[clamp(28px,3.4vw,40px)] font-bold tracking-[-0.02em] text-ink">
              {t("watKop")}
            </h2>
            <p className="m-0 text-[17px] leading-relaxed text-ink-700">{t("watIntro")}</p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {ONDERDELEN.map((o) => (
              <Link
                key={o.sleutel}
                href={o.href}
                className="group flex flex-col rounded-[14px] border border-line bg-white p-7 transition-shadow hover:shadow-diep"
              >
                <span className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-[11px] bg-accent-soft text-accent">
                  <Icon name={o.icoon} size={21} />
                </span>
                <h3 className="m-0 mb-2 text-[18.5px] font-bold text-ink">
                  {t(`${o.sleutel}Titel`)}
                </h3>
                <p className="m-0 mb-4 text-[15px] leading-relaxed text-ink-700">
                  {t(`${o.sleutel}Tekst`)}
                </p>
                <span className="mt-auto inline-flex items-center gap-1.5 text-[14.5px] font-bold text-accent">
                  {t(`${o.sleutel}Link`)}
                  <Icon name="arrow-right" size={16} />
                </span>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      {/* WAT ER BEREKEND WORDT
          De acht posten waar de rekenkern doorheen gaat. Zonder deze lijst weet
          een bezoeker niet of "fiscale impact" ook zijn RSZ-bijdrage, zijn
          BTW-aftrek of zijn gewestelijke verkeersbelasting omvat. */}
      <section>
        <Container className="py-[68px]">
          <div className="mb-11 max-w-[680px]">
            <h2 className="m-0 mb-4 text-[clamp(28px,3.4vw,40px)] font-bold tracking-[-0.02em] text-ink">
              {t("berekentKop")}
            </h2>
            <p className="m-0 text-[17px] leading-relaxed text-ink-700">{t("berekentIntro")}</p>
          </div>

          <dl className="m-0 grid gap-x-10 gap-y-7 sm:grid-cols-2">
            {POSTEN.map((p) => (
              <div key={p} className="flex gap-4">
                <span className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full bg-accent-soft text-accent">
                  <Icon name="check" size={17} />
                </span>
                <div>
                  <dt className="text-[16.5px] font-bold text-ink">{t(`${p}Titel`)}</dt>
                  <dd className="m-0 mt-1 text-[15px] leading-relaxed text-ink-700">
                    {t(`${p}Tekst`)}
                  </dd>
                </div>
              </div>
            ))}
          </dl>

          <div className="mt-10 flex flex-wrap gap-3.5">
            <Link href="/fiscaal-kader" className={knopKlassen("stil", "md")}>
              <Icon name="info" size={17} /> {t("naarKader")}
            </Link>
            <Link href="/parameters" className={knopKlassen("stil", "md")}>
              <Icon name="file-text" size={17} /> {t("naarParameters")}
            </Link>
          </div>
        </Container>
      </section>

      {/* DE OMSLAG
          Waarom dit nu telt. Hier stonden vier kaarten met handgetypte waarden
          ("50 tot 100%", "Daalt naar 0%", "0% of 100%", "95% tot 67,5%"). Vier
          verschillende soorten uitspraken op dezelfde plek, twee ervan onjuist, en
          geen enkele verbonden met de aftrekkalender. De matrix eronder leest die
          kalender uit, dus wat hier staat kan niet meer stil verouderen. */}
      <section className="border-y border-line bg-paper">
        <Container className="py-[68px]">
          <div className="mb-9 max-w-[680px]">
            <h2 className="m-0 mb-4 text-[clamp(28px,3.4vw,40px)] font-bold tracking-[-0.02em] text-ink">
              {t("omslagKop")}
            </h2>
            <p className="m-0 text-[17px] leading-relaxed text-ink-700">{t("omslagIntro")}</p>
          </div>

          <Regimematrix
            banden={regimebanden(DEFAULT_CONTEXT, peildatum)}
            formatters={{ pct: opmaak.pct, datum: opmaak.datum }}
            vouwVanaf="2027"
          />

          <p className="m-0 mt-7 flex max-w-[54em] items-start gap-2.5 text-[14.5px] leading-relaxed text-ink-700">
            <span className="mt-0.5 flex-none text-accent">
              <Icon name="triangle-alert" size={17} />
            </span>
            {t("omslagWaarschuwing")}
          </p>

          <div className="mt-7 flex flex-wrap gap-3.5">
            <Link href="/fiscaal-kader#fk-regime" className={knopKlassen("stil", "md")}>
              <Icon name="info" size={17} /> {t("omslagNaarKader")}
            </Link>
            <Link href={START_HIER_HREF} className={knopKlassen("stil", "md")}>
              <Icon name="calculator" size={17} /> {t("omslagNaarSimulator")}
            </Link>
          </div>
        </Container>
      </section>

      {/* ZO WERKT HET */}
      <section>
        <Container className="py-[68px]">
          <div className="mx-auto mb-12 max-w-[640px] text-center">
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
      <section className="border-y border-line bg-paper">
        <Container className="py-[68px]">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-[44em]">
              <h2 className="m-0 mb-3 text-[clamp(28px,3.4vw,40px)] font-bold tracking-[-0.02em] text-ink">
                {t("uitgelichtKop")}
              </h2>
              <p className="m-0 text-[16.5px] leading-relaxed text-ink-700">
                {t("uitgelichtIntro")}
              </p>
            </div>
            <Link href="/catalogus" className={knopKlassen("stil", "md", "whitespace-nowrap")}>
              {t("bekijkCatalogus")} <Icon name="arrow-right" size={17} />
            </Link>
          </div>

          <UitgelichteWagens />
        </Container>
      </section>

      {/* VEELGESTELDE VRAGEN
          Native details/summary: dit hoort te werken zonder JavaScript, en een
          zoekmachine leest de antwoorden dan gewoon mee. */}
      <section>
        <Container className="py-[68px]">
          <div className="mx-auto max-w-[760px]">
            <h2 className="m-0 mb-9 text-center text-[clamp(28px,3.4vw,40px)] font-bold tracking-[-0.02em] text-ink">
              {t("vragenKop")}
            </h2>

            <div className="overflow-hidden rounded-[14px] border border-line bg-white">
              {VRAGEN.map((v, i) => (
                <details
                  key={v}
                  className="group border-line [&:not(:last-child)]:border-b"
                  open={i === 0}
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-4 px-6 py-5 text-[16.5px] font-bold text-ink marker:content-none">
                    {t(`${v}Vraag`)}
                    <span className="flex-none text-ink-500 transition-transform group-open:rotate-180">
                      <Icon name="chevron-down" size={19} />
                    </span>
                  </summary>
                  <p className="m-0 max-w-[62em] px-6 pb-6 text-[15.5px] leading-relaxed text-ink-700">
                    {t(`${v}Antwoord`)}
                  </p>
                </details>
              ))}
            </div>
          </div>
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
