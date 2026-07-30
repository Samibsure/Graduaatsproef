import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import Icon from "@/components/Icon";
import Regimematrix from "@/components/Regimematrix";
import Uitfaseringblok from "@/components/Uitfaseringblok";
import { Badge, Melding, Tabel } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { ZEKERHEID_TINT } from "@/lib/fiscaal/bronnen";
import { DEFAULT_CONTEXT } from "@/lib/fiscaal/defaults";
import {
  AFTREK_HOGE_UITSTOOT,
  GRAMFORMULE_COEFF,
  HOGE_UITSTOOT_VANAF,
  berekenJaar,
  co2Percentage,
  leeftijdscorrectie,
  parametersVoorJaar,
  rszBijdrageMaand,
  voordeelAlleAard,
} from "@/lib/fiscaal/engine";
import {
  aftrekMatrix,
  aftrekPerKostensoort,
  gramdrempels,
  regimebanden,
  type Matrixcel,
} from "@/lib/fiscaal/regimes";
import type { Vehicle } from "@/lib/fiscaal/types";
import { berekenUitfasering } from "@/lib/fiscaal/uitfasering";
import {
  ASSEN,
  BUITEN,
  GRAMBRANDSTOFFEN,
  KOSTENSOORTEN,
  KOSTENWAGEN,
  MATRIXJAREN,
  MATRIXWAGENS,
  SECTIES,
  ZEKERHEDEN,
} from "@/lib/fiscaalKaderIndeling";
import { formatters } from "@/lib/format";

/**
 * Het fiscaal kader.
 *
 * Deze pagina had vier korte secties, één tabel met drie rijen en cellen als
 * "CO₂-formule, in uitdoof", en een voetnoot die beweerde dat de percentages
 * indicatief waren. Dat laatste was precies omgekeerd: de rekenkern rekent tot op
 * de tiende van een procentpunt, het was de tabel die vaag was. Wie hier kwam met
 * een bestelbon in de hand, vond niet welk percentage voor hém gold.
 *
 * Nu volgt elke sectie hetzelfde stramien: wat het is, de formule, de parameters,
 * en een uitgewerkt voorbeeld. Alle percentages en bedragen worden hier berekend
 * door dezelfde functies die de simulator gebruikt. Er staat geen enkel getal met
 * de hand ingetypt, dus de pagina kan niet stil verouderen zoals de vorige deed.
 *
 * Servercomponent op `DEFAULT_CONTEXT`, en dat is een keuze. Deze pagina legt uit
 * wat gepubliceerd is; `/parameters` toont met welke waarden de applicatie op dit
 * moment rekent en laadt daarvoor de databank. Beide pagina's zeggen dat verschil
 * in één zin en linken naar elkaar. Zo blijft dit een statisch document dat een
 * zoekmachine volledig kan lezen.
 */

const ctx = DEFAULT_CONTEXT;
const PEILJAAR = 2026;

/** De twee referentiewagens. Dezelfde waarop engine.test.ts zijn cijfers vastpint. */
const BEV: Vehicle = {
  id: "kader-bev",
  omschrijving: "kader-bev",
  werknemer: null,
  kenteken: null,
  categorie: "kandidaat",
  merk: null,
  model: null,
  catalog_id: null,
  voertuigtype: "BEV",
  brandstof: "elektrisch",
  besteldatum: "2026-01-15",
  eerste_ingebruikname: "2026-03-01",
  co2: 0,
  cataloguswaarde: 45000,
  jaarlijkse_autokosten: 8500,
  aankoopprijs: 45000,
  tankkaart: true,
  beroepsgebruik_pct: 100,
  thuislaadpunt: true,
  km_per_jaar: 25000,
  flex_score: 7,
  restwaarde_score: 6,
};

const DIESEL: Vehicle = {
  ...BEV,
  id: "kader-diesel",
  omschrijving: "kader-diesel",
  voertuigtype: "fossiel",
  brandstof: "diesel",
  besteldatum: "2024-03-01",
  eerste_ingebruikname: "2024-06-01",
  co2: 135,
  cataloguswaarde: 38000,
  jaarlijkse_autokosten: 9200,
  aankoopprijs: 38000,
  thuislaadpunt: false,
  flex_score: 8,
};

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
  return <FiscaalKaderInhoud locale={locale} />;
}

/** Kop van een sectie, met het anker waar de inhoudsopgave naar springt. */
function Sectie({ id, titel, tekst, children }: {
  id: string;
  titel: string;
  tekst: string;
  children?: ReactNode;
}) {
  return (
    <section id={id} className="mt-12 scroll-mt-[92px] first:mt-0">
      <h2 className="m-0 mb-3.5 text-[26px] font-bold tracking-[-0.01em]">{titel}</h2>
      <p className="m-0 text-[16px] leading-[1.7] text-ink-700">{tekst}</p>
      {children}
    </section>
  );
}

/** De formule zelf, als tekst. Geen afbeelding: dit hoort selecteerbaar te zijn. */
function Formule({ label, formule }: { label: string; formule: string }) {
  return (
    <figure className="m-0 mt-5 overflow-x-auto rounded-[12px] border border-accent-line bg-accent-soft px-5 py-4">
      <figcaption className="mb-1.5 text-[11.5px] font-bold uppercase tracking-[0.14em] text-accent">
        {label}
      </figcaption>
      <code className="block whitespace-nowrap text-[15px] font-bold text-ink">{formule}</code>
    </figure>
  );
}

/** Kleine kop binnen een sectie, voor een tabel of een uitwerking. */
function Subkop({ children, intro }: { children: ReactNode; intro?: string }) {
  return (
    <>
      <h3 className="m-0 mb-2 mt-9 text-[18px] font-bold text-ink">{children}</h3>
      {intro && <p className="m-0 mb-4 text-[15px] leading-[1.65] text-ink-700">{intro}</p>}
    </>
  );
}

function Kop({ children, rechts = false }: { children: ReactNode; rechts?: boolean }) {
  return (
    <th
      scope="col"
      className={`border-b border-line px-3.5 py-3 text-[12px] font-bold uppercase tracking-[0.08em] text-ink-500 ${
        rechts ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

/** Lijstje met titel en tekst per item, het patroon dat de pagina al gebruikte. */
function Puntenlijst({
  items,
}: {
  items: Array<{ sleutel: string; titel: string; tekst: string }>;
}) {
  return (
    <div className="mt-5 grid gap-px overflow-hidden rounded-[12px] border border-line bg-line">
      {items.map((item) => (
        <div key={item.sleutel} className="flex items-start gap-3.5 bg-white px-[18px] py-4">
          <span className="mt-px flex-none text-accent">
            <Icon name="circle-dot" size={17} />
          </span>
          <div>
            <div className="mb-0.5 font-bold text-ink">{item.titel}</div>
            <div className="text-[14.5px] leading-[1.55] text-ink-700">{item.tekst}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Eén cel uit de aftrekmatrix: het percentage dat geldt, en eronder wat de
 * formule en het plafond apart zeggen. Dat tweede is het hele punt van de tabel.
 */
function Matrixwaarde({
  cel,
  pct,
  labels,
}: {
  cel: Matrixcel;
  pct: (n: number) => string;
  labels: { formule: string; plafond: string };
}) {
  const toon = cel.bindend !== "kalender" && cel.plafond !== null && cel.formule !== cel.plafond;
  return (
    <div className="text-right">
      <div className="font-bold text-ink">{pct(cel.aftrek)}</div>
      {toon && (
        <div className="mt-0.5 whitespace-nowrap text-[12px] text-ink-500">
          <span className={cel.bindend === "formule" ? "font-bold text-ink-700" : undefined}>
            {labels.formule} {pct(cel.formule as number)}
          </span>
          {" / "}
          <span className={cel.bindend === "plafond" ? "font-bold text-ink-700" : undefined}>
            {labels.plafond} {pct(cel.plafond as number)}
          </span>
        </div>
      )}
    </div>
  );
}

function FiscaalKaderInhoud({ locale }: { locale: Locale }) {
  const t = useTranslations("fiscaalKader");
  const opmaak = formatters(locale);
  const { euro, euroCent, getal, pct, datum, coefficient } = opmaak;

  const params = parametersVoorJaar(ctx, PEILJAAR);
  const banden = regimebanden(ctx, `${PEILJAAR}-07-01`);
  const matrix = aftrekMatrix(ctx, MATRIXWAGENS, MATRIXJAREN);
  const kostensoorten = aftrekPerKostensoort(ctx, KOSTENWAGEN, MATRIXJAREN);

  // De leeftijdscorrectie tot ze op haar ondergrens vlak gaat liggen.
  const leeftijden = [0, 1, 2, 3, 4, 5, 6].map((n) => ({
    n,
    correctie: leeftijdscorrectie(PEILJAAR + n, PEILJAAR),
  }));

  const dieselJaar = berekenJaar(ctx, DIESEL, PEILJAAR);
  const dieselZonderKaart = berekenJaar(ctx, { ...DIESEL, tankkaart: false }, PEILJAAR);
  const dieselOudRsz = rszBijdrageMaand(ctx, { ...DIESEL, besteldatum: "2023-03-01" }, PEILJAAR);

  const rekenblad = [
    { sleutel: "stapAftrek", label: t("stapAftrek") },
    { sleutel: "stapVaa", label: t("stapVaa") },
    { sleutel: "stapVu", label: t("stapVu") },
    { sleutel: "stapRsz", label: t("stapRsz") },
    { sleutel: "stapMeerkost", label: t("stapMeerkost") },
  ];

  /** Eén kolom van het rekenblad: dezelfde wagen, één gebruiksjaar. */
  function kolom(wagen: Vehicle, jaar: number) {
    const r = berekenJaar(ctx, wagen, jaar);
    return {
      stapAftrek: pct(r.aftrekPct),
      stapVaa: euro(voordeelAlleAard(ctx, wagen, jaar)),
      stapVu: euro(r.verworpenUitgaven),
      stapRsz: euro(rszBijdrageMaand(ctx, wagen, jaar) * 12),
      stapMeerkost: euro(r.fiscaleMeerkost),
    } as Record<string, string>;
  }

  const rekenbladKolommen = [
    { kop: t("wagen_bev"), jaren: [2026, 2029].map((j) => ({ jaar: j, waarden: kolom(BEV, j) })) },
    {
      kop: t("wagen_diesel"),
      jaren: [2026, 2029].map((j) => ({ jaar: j, waarden: kolom(DIESEL, j) })),
    },
  ];

  return (
    <div className="mx-auto grid max-w-[1100px] items-start gap-14 px-6 pb-[90px] pt-[52px] lg:grid-cols-[240px_1fr]">
      <aside className="sticky top-[92px] hidden lg:block">
        <div className="mb-4 text-[11.5px] font-bold uppercase tracking-[0.14em] text-ink-500">
          {t("opDezePagina")}
        </div>
        <nav className="flex flex-col gap-0.5 border-l border-line">
          {SECTIES.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="bs-toc-link -ml-px py-2 pl-4 text-[14px] transition-colors"
            >
              {t(`${s.sleutel}Titel`)}
            </a>
          ))}
        </nav>
      </aside>

      <article className="max-w-[760px]">
        <h1 className="m-0 mb-[18px] text-[clamp(30px,4vw,46px)] font-bold tracking-[-0.02em]">
          {t("kop")}
        </h1>
        <p className="m-0 mb-4 text-[18px] leading-relaxed text-ink-700">{t("intro")}</p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-ink-500">
          <span className="inline-flex items-center gap-2">
            <Icon name="calendar" size={15} /> {t("bijgewerkt")}
          </span>
          <Link href="/parameters" className="inline-flex items-center gap-1.5 text-accent">
            <Icon name="file-text" size={15} /> {t("naarParameters")}
          </Link>
        </div>

        {/* 1. HOE U DEZE PAGINA LEEST */}
        <div className="mt-12">
          <Sectie id={SECTIES[0].id} titel={t("lezenTitel")} tekst={t("lezenTekst")}>
            <Puntenlijst
              items={ASSEN.map((a) => ({
                sleutel: a,
                titel: t(`${a}Titel`),
                tekst: t(`${a}Tekst`),
              }))}
            />
            <Melding soort="info" className="mt-5">
              {t("lezenClamp")}
            </Melding>
          </Sectie>
        </div>

        {/* 2. WELK REGIME */}
        <Sectie id={SECTIES[1].id} titel={t("regimeTitel")} tekst={t("regimeTekst")}>
          <div className="mt-6">
            <Regimematrix banden={banden} formatters={{ pct, datum }} />
          </div>
          <Melding soort="let-op" className="mt-5">
            {t("regimeBewijs")}
          </Melding>
        </Sectie>

        {/* 3. AFTREKBAARHEID */}
        <Sectie id={SECTIES[2].id} titel={t("aftrekTitel")} tekst={t("aftrekTekst")}>
          <Formule label={t("formuleLabel")} formule={t("gramFormule")} />
          <p className="m-0 mt-4 text-[15px] leading-[1.7] text-ink-700">{t("gramGrenzen")}</p>
          <p className="m-0 mt-3 text-[15px] leading-[1.7] text-ink-700">{t("gramOndergrens")}</p>

          <Subkop intro={t("drempelsIntro")}>{t("drempelsTitel")}</Subkop>
          <div className="overflow-hidden rounded-[12px] border border-line">
            <Tabel minBreedte={560} bijschrift={t("drempelsTitel")}>
              <thead className="bg-paper">
                <tr>
                  <Kop>{t("kolomBrandstof")}</Kop>
                  <Kop rechts>{t("kolomCoefficient")}</Kop>
                  <Kop rechts>{t("kolomTot100")}</Kop>
                  <Kop rechts>{t("kolomVanaf50")}</Kop>
                  <Kop rechts>{t("kolomVanafNul")}</Kop>
                </tr>
              </thead>
              <tbody>
                {GRAMBRANDSTOFFEN.map((b) => {
                  const d = gramdrempels(b);
                  return (
                    <tr key={b} className="border-b border-line last:border-0">
                      <td className="px-3.5 py-3 font-bold text-ink">{t(`brandstof_${b}`)}</td>
                      <td className="px-3.5 py-3 text-right text-ink-700">
                        {getal(GRAMFORMULE_COEFF[b])}
                      </td>
                      <td className="px-3.5 py-3 text-right text-ink-700">
                        {getal(d.co2Tot100)} g/km
                      </td>
                      <td className="px-3.5 py-3 text-right text-ink-700">
                        {getal(d.co2Vanaf50)} g/km
                      </td>
                      <td className="px-3.5 py-3 text-right text-ink-700">
                        {getal(d.co2VanafNul)} g/km
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Tabel>
          </div>

          <Subkop intro={t("matrixIntro")}>{t("matrixTitel")}</Subkop>
          <div className="overflow-hidden rounded-[12px] border border-line">
            <Tabel minBreedte={700} bijschrift={t("matrixTitel")}>
              <thead className="bg-paper">
                <tr>
                  <Kop>{t("kolomWagen")}</Kop>
                  {MATRIXJAREN.map((j) => (
                    <Kop key={j} rechts>
                      {j}
                    </Kop>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.map((rij) => (
                  <tr key={rij.sleutel} className="border-b border-line last:border-0">
                    <td className="px-3.5 py-3 text-[14px] font-bold text-ink">
                      {t(`wagen_${rij.sleutel}`)}
                    </td>
                    {rij.cellen.map((cel) => (
                      <td key={cel.gebruiksjaar} className="px-3.5 py-3">
                        <Matrixwaarde
                          cel={cel}
                          pct={pct}
                          labels={{ formule: t("kortFormule"), plafond: t("kortPlafond") }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </Tabel>
          </div>
          <p className="m-0 mt-3 text-[13.5px] leading-[1.6] text-ink-500">{t("matrixLegende")}</p>
        </Sectie>

        {/* 4. KOSTENSOORTEN */}
        <Sectie id={SECTIES[3].id} titel={t("kostenTitel")} tekst={t("kostenTekst")}>
          <div className="mt-6 overflow-hidden rounded-[12px] border border-line">
            <Tabel minBreedte={620} bijschrift={t("kostenTitel")}>
              <thead className="bg-paper">
                <tr>
                  <Kop>{t("kolomKostensoort")}</Kop>
                  {MATRIXJAREN.map((j) => (
                    <Kop key={j} rechts>
                      {j}
                    </Kop>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { sleutel: "kostWagen", waarden: kostensoorten.map((r) => r.wagen) },
                  { sleutel: "kostLaadstroom", waarden: kostensoorten.map((r) => r.laadstroom) },
                  {
                    sleutel: "kostBrandstof",
                    waarden: kostensoorten.map((r) => r.brandstof ?? 0),
                  },
                  { sleutel: "kostIntrest", waarden: MATRIXJAREN.map(() => 100) },
                  { sleutel: "kostBoetes", waarden: MATRIXJAREN.map(() => 0) },
                ].map((rij) => (
                  <tr key={rij.sleutel} className="border-b border-line last:border-0">
                    <td className="px-3.5 py-3 text-[14px] font-bold text-ink">
                      {t(`${rij.sleutel}Titel`)}
                    </td>
                    {rij.waarden.map((w, i) => (
                      <td
                        key={MATRIXJAREN[i]}
                        className="px-3.5 py-3 text-right font-bold text-ink"
                      >
                        {pct(w)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </Tabel>
          </div>
          <p className="m-0 mt-3 text-[13.5px] leading-[1.6] text-ink-500">
            {t("kostenWagenNoot", { wagen: t(`wagen_${KOSTENWAGEN.sleutel}`) })}
          </p>

          <Puntenlijst
            items={KOSTENSOORTEN.map((k) => ({
              sleutel: k,
              titel: t(`${k}Titel`),
              tekst: t(`${k}Tekst`),
            }))}
          />
          <Melding soort="let-op" className="mt-5">
            {t("kostenAsymmetrie")}
          </Melding>
        </Sectie>

        {/* 5. VALSE HYBRIDE */}
        <Sectie id={SECTIES[4].id} titel={t("hybrideTitel")} tekst={t("hybrideTekst")}>
          <ul className="m-0 mt-5 flex list-none flex-col gap-2.5 p-0">
            {[t("hybrideBatterij"), t("hybrideUitstoot")].map((regel) => (
              <li key={regel} className="flex items-start gap-3 text-[15px] leading-[1.6] text-ink-700">
                <span className="mt-0.5 flex-none text-accent">
                  <Icon name="triangle-alert" size={17} />
                </span>
                {regel}
              </li>
            ))}
          </ul>
          <p className="m-0 mt-4 text-[15px] leading-[1.7] text-ink-700">{t("hybrideOntbreekt")}</p>
          <p className="m-0 mt-3 text-[15px] leading-[1.7] text-ink-700">{t("hybrideRsz")}</p>
        </Sectie>

        {/* 6. VOORDEEL ALLE AARD */}
        <Sectie id={SECTIES[5].id} titel={t("vaaTitel")} tekst={t("vaaTekst")}>
          <Formule label={t("formuleLabel")} formule={t("vaaFormule")} />
          <Puntenlijst
            items={["vaaCatalogus", "vaaCo2", "vaaLeeftijd"].map((k) => ({
              sleutel: k,
              titel: t(`${k}Titel`),
              tekst: t(`${k}Tekst`),
            }))}
          />

          <Subkop>{t("leeftijdTabelTitel")}</Subkop>
          <div className="overflow-hidden rounded-[12px] border border-line">
            <Tabel minBreedte={420} bijschrift={t("leeftijdTabelTitel")}>
              <thead className="bg-paper">
                <tr>
                  <Kop>{t("kolomJaarNa")}</Kop>
                  <Kop rechts>{t("kolomCorrectie")}</Kop>
                </tr>
              </thead>
              <tbody>
                {leeftijden.map((l) => (
                  <tr key={l.n} className="border-b border-line last:border-0">
                    <td className="px-3.5 py-2.5 text-ink-700">{l.n}</td>
                    <td className="px-3.5 py-2.5 text-right font-bold text-ink">
                      {pct(l.correctie * 100)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Tabel>
          </div>

          <p className="m-0 mt-4 text-[15px] leading-[1.7] text-ink-700">
            {t("vaaCo2Peil", {
              jaar: PEILJAAR,
              refBenzine: `${getal(params.ref_co2_benzine)} g/km`,
              refDiesel: `${getal(params.ref_co2_diesel)} g/km`,
              co2pct: pct(co2Percentage(params, "diesel", DIESEL.co2)),
            })}
          </p>
          <p className="m-0 mt-3 text-[15px] leading-[1.7] text-ink-700">{t("vaaGeenForfait")}</p>
          <p className="m-0 mt-3 text-[15px] leading-[1.7] text-ink-700">
            {t("vaaEigenBijdrage")}
          </p>
          <Melding soort="info" className="mt-5">
            {t("vaaVoorbeeld", {
              vaa: euroCent(voordeelAlleAard(ctx, DIESEL, PEILJAAR)),
              minimum: euro(params.vaa_minimum),
            })}
          </Melding>
        </Sectie>

        {/* 7. VERWORPEN UITGAVEN */}
        <Sectie id={SECTIES[6].id} titel={t("vuTitel")} tekst={t("vuTekst")}>
          <Formule label={t("formuleLabel")} formule={t("vuFormule")} />
          <p className="m-0 mt-4 text-[15px] leading-[1.7] text-ink-700">{t("vuKaart")}</p>
          <Melding soort="info" className="mt-5">
            {t("vuVoorbeeld", {
              metKaart: euroCent(dieselJaar.verworpenUitgaven),
              zonderKaart: euroCent(dieselZonderKaart.verworpenUitgaven),
              verschil: euroCent(
                dieselJaar.verworpenUitgaven - dieselZonderKaart.verworpenUitgaven,
              ),
            })}
          </Melding>
          <p className="m-0 mt-4 text-[15px] leading-[1.7] text-ink-700">{t("vuVenb")}</p>
        </Sectie>

        {/* 8. CO2-BIJDRAGE */}
        <Sectie id={SECTIES[7].id} titel={t("co2Titel")} tekst={t("co2Tekst")}>
          <Formule label={t("formuleLabel")} formule={t("co2Formule")} />
          <ul className="m-0 mt-5 flex list-none flex-col gap-2.5 p-0">
            {[
              t("co2Constanten"),
              t("co2Forfait"),
              t("co2Multiplicator"),
              t("co2Minimum"),
            ].map((regel) => (
              <li key={regel} className="flex items-start gap-3 text-[15px] leading-[1.6] text-ink-700">
                <span className="mt-px flex-none text-accent">
                  <Icon name="circle-dot" size={17} />
                </span>
                {regel}
              </li>
            ))}
          </ul>
          <p className="m-0 mt-4 text-[15px] leading-[1.7] text-ink-700">
            {t("co2Peil", {
              jaar: PEILJAAR,
              index: coefficient(params.rsz_index),
              multiplicator: getal(params.rsz_multiplicator),
              minimum: euroCent(params.rsz_min_maand),
              basis: euroCent(params.rsz_min_basis),
            })}
          </p>
          <Melding soort="info" className="mt-5">
            {t("co2Voorbeeld", {
              mnd2025: euroCent(rszBijdrageMaand(ctx, DIESEL, 2025)),
              mnd2026: euroCent(rszBijdrageMaand(ctx, DIESEL, 2026)),
              mnd2027: euroCent(rszBijdrageMaand(ctx, DIESEL, 2027)),
              mndOud: euroCent(dieselOudRsz),
            })}
          </Melding>
        </Sectie>

        {/* 9. TOTALE KOST */}
        <Sectie id={SECTIES[8].id} titel={t("tcoTitel")} tekst={t("tcoTekst")}>
          <Formule label={t("formuleLabel")} formule={t("tcoFormule")} />
          <p className="m-0 mt-4 text-[15px] leading-[1.7] text-ink-700">{t("tcoBtw")}</p>

          <Subkop intro={t("rekenbladIntro")}>{t("rekenbladTitel")}</Subkop>
          <div className="overflow-hidden rounded-[12px] border border-line">
            <Tabel minBreedte={620} bijschrift={t("rekenbladTitel")}>
              <thead className="bg-paper">
                {/* Twee koprijen: eerst welke wagen, dan welk gebruiksjaar. Zonder
                    die groepering staan er vier jaartallen zonder te zeggen bij
                    welke van de twee wagens ze horen. */}
                <tr>
                  <th scope="col" className="px-3.5 py-2.5" />
                  {rekenbladKolommen.map((k) => (
                    <th
                      key={k.kop}
                      scope="colgroup"
                      colSpan={k.jaren.length}
                      className="border-b border-line px-3.5 py-2.5 text-left text-[13px] font-bold text-ink"
                    >
                      {k.kop}
                    </th>
                  ))}
                </tr>
                <tr>
                  <th scope="col" className="border-b border-line px-3.5 pb-2.5" />
                  {rekenbladKolommen.flatMap((k) =>
                    k.jaren.map((j) => (
                      <Kop key={`${k.kop}-${j.jaar}`} rechts>
                        {j.jaar}
                      </Kop>
                    )),
                  )}
                </tr>
              </thead>
              <tbody>
                {rekenblad.map((stap) => (
                  <tr key={stap.sleutel} className="border-b border-line last:border-0">
                    <td className="px-3.5 py-3 text-[14px] font-bold text-ink">{stap.label}</td>
                    {rekenbladKolommen.flatMap((k) =>
                      k.jaren.map((j) => (
                        <td
                          key={`${k.kop}-${j.jaar}-${stap.sleutel}`}
                          className="whitespace-nowrap px-3.5 py-3 text-right text-ink-700"
                        >
                          {j.waarden[stap.sleutel]}
                        </td>
                      )),
                    )}
                  </tr>
                ))}
              </tbody>
            </Tabel>
          </div>

          <Subkop>{t("tijdlijnTitel")}</Subkop>
          <Uitfaseringblok uitfasering={berekenUitfasering(ctx, DIESEL, 2025, 2031)} />

          <div className="mt-8 flex items-start gap-4 rounded-[14px] bg-ink px-[26px] py-6">
            <span className="mt-0.5 flex-none text-gold">
              <Icon name="lightbulb" size={22} />
            </span>
            <div>
              <div className="mb-1.5 text-[16px] font-bold text-white">{t("tcoKaderTitel")}</div>
              <p className="m-0 text-[14.5px] leading-[1.6] text-white/[0.74]">{t("tcoKader")}</p>
            </div>
          </div>
        </Sectie>

        {/* 10. BUITEN BEREIK */}
        <Sectie id={SECTIES[9].id} titel={t("buitenTitel")} tekst={t("buitenTekst")}>
          <Puntenlijst
            items={BUITEN.map((b) => ({
              sleutel: b,
              titel: t(`${b}Titel`),
              tekst: t(`${b}Tekst`),
            }))}
          />
        </Sectie>

        {/* 11. BRONNEN */}
        <Sectie id={SECTIES[10].id} titel={t("bronnenTitel")} tekst={t("bronnenTekst")}>
          <div className="mt-5 grid gap-px overflow-hidden rounded-[12px] border border-line bg-line">
            {ZEKERHEDEN.map((z, i) => (
              <div key={z} className="bg-white px-[18px] py-4">
                <Badge tint={ZEKERHEID_TINT[(["bevestigd", "teVerifieren", "voorlopig"] as const)[i]]}>
                  {t(`${z}Titel`)}
                </Badge>
                <div className="mt-2 text-[14.5px] leading-[1.55] text-ink-700">
                  {t(`${z}Tekst`)}
                </div>
              </div>
            ))}
          </div>

          <Subkop>{t("bronnenRechtsbron")}</Subkop>
          <p className="m-0 text-[15px] leading-[1.7] text-ink-700">{t("bronnenLijst")}</p>
          <p className="m-0 mt-3 text-[15px] leading-[1.7] text-ink-700">
            {t("bronnenVoorbehoud")}
          </p>
          <Melding soort="let-op" className="mt-5">
            {t("voorlopigPhev")}
          </Melding>

          <p className="m-0 mt-6 text-[13.5px] leading-[1.6] text-ink-500">
            {t("liveVerschil")}{" "}
            <Link href="/parameters" className="font-bold text-accent">
              {t("naarParameters")}
            </Link>
          </p>
          <p className="m-0 mt-3 text-[13.5px] leading-[1.6] text-ink-500">
            {t("hogeUitstootNoot", {
              grens: `${getal(HOGE_UITSTOOT_VANAF)} g/km`,
              forfait: pct(AFTREK_HOGE_UITSTOOT),
            })}
          </p>
        </Sectie>
      </article>
    </div>
  );
}
