"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { Badge, Card, Container, PageHead } from "@/components/ui";
import { laadFiscaleContext } from "@/lib/data";
import { ZEKERHEID_TINT } from "@/lib/fiscaal/bronnen";
import type { Zekerheid } from "@/lib/fiscaal/bronnen";
import {
  BRUSSEL_BIV_EV,
  VLAANDEREN_BIV_EV,
  VLAANDEREN_CORRECTIEFACTOR,
  VLAANDEREN_JVB_EV,
  VLAANDEREN_JVB_MINIMUM,
  VLAANDEREN_OPDECIEM,
  VLAAMSE_HERVORMING_2027,
  WALLONIE_BRUSSEL_JVB_MINIMUM,
  WALLONIE_TMC_GRENZEN,
} from "@/lib/fiscaal/gewesten";
import { CREG_TARIEVEN } from "@/lib/fiscaal/laadinfra";
import { BUDGETGRENZEN } from "@/lib/fiscaal/mobiliteit";
import type { FiscaleContext, Gewest, Voertuigtype } from "@/lib/fiscaal/types";
import {
  FIETSPARAMETERS_2026,
  KILOMETERVERGOEDING,
  PROFESSIONELE_DIESEL,
  VERZEKERINGSTAKS_PCT,
} from "@/lib/fiscaal/vergoedingen";
import { WEGENVIGNET_TARIEVEN, WEGENVIGNET_VANAF } from "@/lib/fiscaal/wegenvignet";
import { formatters } from "@/lib/format";
import { PARAM_VELDEN } from "@/lib/parameterVelden";

const TYPES: Voertuigtype[] = ["BEV", "PHEV", "HEV", "fossiel"];

const GEWESTEN: Gewest[] = ["vlaanderen", "brussel", "wallonie"];

const ZEKERHEDEN: Zekerheid[] = ["bevestigd", "teVerifieren", "voorlopig"];

/** Kop van een tabelkolom, in de stijl die deze pagina al gebruikt. */
function Kop({ children, rechts = false }: { children: React.ReactNode; rechts?: boolean }) {
  return (
    <th
      scope="col"
      className={`px-3 py-2 ${rechts ? "text-right" : ""}`}
    >
      {children}
    </th>
  );
}

function StatusBadge({ zekerheid, label }: { zekerheid: Zekerheid; label: string }) {
  return <Badge tint={ZEKERHEID_TINT[zekerheid]}>{label}</Badge>;
}


export default function ParametersPagina() {
  const t = useTranslations("parameters");
  const locale = useLocale();
  const { getal, euro, euroCent } = formatters(locale);
  const [ctx, setCtx] = useState<FiscaleContext | null>(null);
  const [jaar, setJaar] = useState(2026);
  const [fout, setFout] = useState<string | null>(null);

  // De CREG-tarieven staan in tienden van een cent; de gewone opmaak met twee
  // cijfers zou € 0,3132 tot € 0,31 herleiden en het verschil tussen de
  // gewesten laten verdwijnen.
  const perKwh = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: 4,
        maximumFractionDigits: 4,
      }),
    [locale],
  );

  useEffect(() => {
    laadFiscaleContext()
      .then(setCtx)
      .catch((e) => setFout(String(e)));
  }, []);

  const params = ctx?.parameters.find((p) => p.year === jaar) ?? null;

  /**
   * De gewestelijke tarieven die wél als bedrag gepubliceerd zijn. De volledige
   * barema's op fiscale pk en cilinderinhoud staan hier bewust niet: die zijn
   * niet als tabel bekendgemaakt, en de rekenkern geeft er dan ook geen bedrag
   * voor terug.
   */
  const gewestrijen: Array<{ sleutel: string; waarde: string; zekerheid: Zekerheid }> = [
    { sleutel: "regelBivEvVlaanderen", waarde: euroCent(VLAANDEREN_BIV_EV), zekerheid: "bevestigd" },
    { sleutel: "regelBivEvBrussel", waarde: euroCent(BRUSSEL_BIV_EV), zekerheid: "teVerifieren" },
    {
      sleutel: "regelTmcGrenzen",
      waarde: `${euro(WALLONIE_TMC_GRENZEN.plancher)} - ${euro(WALLONIE_TMC_GRENZEN.plafond)}`,
      zekerheid: "bevestigd",
    },
    {
      sleutel: "regelJvbEvVlaanderen",
      waarde: `${euroCent(VLAANDEREN_JVB_EV.pk1)} - ${euroCent(VLAANDEREN_JVB_EV.pk5)}`,
      zekerheid: "bevestigd",
    },
    {
      sleutel: "regelJvbMinVlaanderen",
      waarde: euroCent(VLAANDEREN_JVB_MINIMUM),
      zekerheid: "bevestigd",
    },
    {
      sleutel: "regelJvbMinWalBru",
      waarde: euroCent(WALLONIE_BRUSSEL_JVB_MINIMUM),
      zekerheid: "teVerifieren",
    },
    {
      sleutel: "regelCorrectiefactor",
      waarde: getal(VLAANDEREN_CORRECTIEFACTOR[2026]),
      zekerheid: "bevestigd",
    },
    {
      sleutel: "regelOpdeciem",
      waarde: `+ ${getal((VLAANDEREN_OPDECIEM - 1) * 100)} %`,
      zekerheid: "bevestigd",
    },
  ];

  const overigeVergoedingen: Array<{ sleutel: string; waarde: string }> = [
    { sleutel: "veldFietsCao", waarde: `${euroCent(FIETSPARAMETERS_2026.cao164PerKm)} ${t("perKm")}` },
    {
      sleutel: "veldFietsVrij",
      waarde: `${euroCent(FIETSPARAMETERS_2026.vrijgesteldPerKm)} ${t("perKm")}`,
    },
    { sleutel: "veldFietsPlafond", waarde: euro(FIETSPARAMETERS_2026.vrijgesteldPerJaar) },
    { sleutel: "veldVerzekeringstaks", waarde: `${getal(VERZEKERINGSTAKS_PCT)} %` },
    {
      sleutel: "veldAccijns",
      waarde: `${perKwh.format(PROFESSIONELE_DIESEL[2026])} ${t("perLiter")}`,
    },
    { sleutel: "veldBudgetMin", waarde: euro(BUDGETGRENZEN.minimum) },
    { sleutel: "veldBudgetMax", waarde: euro(BUDGETGRENZEN.maximumAbsoluut) },
  ];

  return (
    <Container className="space-y-6 py-[52px]">
      <PageHead
        eyebrow={t("eyebrow")}
        title={t("titel")}
        sub={t("intro")}
      />

      {fout && <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{fout}</p>}

      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="m-0 text-[18px] font-bold text-ink">{t("perJaar")}</h2>
          <label className="text-sm text-ink-500">
            {t("kalenderjaar")}{" "}
            <select
              className="ml-1 rounded-lg border border-line px-2 py-1.5 text-sm text-ink"
              value={jaar}
              onChange={(e) => setJaar(Number(e.target.value))}
            >
              {ctx?.parameters.map((p) => (
                <option key={p.year} value={p.year}>
                  {p.year}
                </option>
              ))}
            </select>
          </label>
        </div>

        {params && (
          <dl className="mt-5 grid gap-x-8 gap-y-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {PARAM_VELDEN.map(({ veld, sleutel, eenheid }) => (
              <div key={veld} className="flex items-baseline justify-between gap-3 border-b border-line pb-2.5">
                <dt className="text-[13.5px] text-ink-700">{t(sleutel)}</dt>
                <dd className="m-0 shrink-0 text-[14.5px] font-bold text-ink">
                  {getal(params[veld] as number)}
                  {eenheid && <span className="ml-1 font-normal text-ink-500">{t(eenheid)}</span>}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="m-0 text-[18px] font-bold text-ink">{t("multiplicatorTitel")}</h2>
        <p className="mt-1.5 text-[14.5px] text-ink-700">{t("multiplicatorIntro")}</p>
        <dl className="mt-4 grid gap-x-8 gap-y-3.5 sm:grid-cols-2">
          {ctx?.periodes.map((p) => (
            <div key={p.code} className="flex items-baseline justify-between gap-3 border-b border-line pb-2.5">
              <dt className="text-[13.5px] text-ink-700">{p.label}</dt>
              <dd className="m-0 shrink-0 text-[14.5px] font-bold text-ink">
                × {getal(p.rsz_multiplicator)}
              </dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="m-0 text-[18px] font-bold text-ink">{t("kalenderTitel")}</h2>
        <p className="mt-1.5 text-[14.5px] text-ink-700">{t("kalenderIntro")}</p>

        {TYPES.map((type) => {
          const regels = ctx?.regels.filter((r) => r.voertuigtype === type) ?? [];
          if (regels.length === 0) return null;
          return (
            <div key={type} className="mt-5">
              <h3 className="text-[14.5px] font-bold text-ink">{type}</h3>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-y border-line bg-paper text-left text-xs uppercase tracking-wide text-ink-500">
                    <tr>
                      <th scope="col" className="px-3 py-2">{t("kolomBestelperiode")}</th>
                      <th scope="col" className="px-3 py-2">{t("kolomGebruiksjaar")}</th>
                      <th scope="col" className="px-3 py-2 text-right">{t("kolomAftrek")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {regels.map((r) => (
                      <tr key={`${r.bestelperiode}-${r.gebruiksjaar ?? "alle"}`}>
                        <td className="px-3 py-1.5 text-ink-700">
                          {ctx?.periodes.find((p) => p.code === r.bestelperiode)?.label ??
                            r.bestelperiode}
                        </td>
                        <td className="px-3 py-1.5 text-ink-700">
                          {r.gebruiksjaar ?? t("heleGebruiksduur")}
                        </td>
                        <td className="px-3 py-1.5 text-right font-bold text-ink">
                          {getal(r.aftrek_pct)} %
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="m-0 text-[18px] font-bold text-ink">{t("gewestTitel")}</h2>
        <p className="mt-1.5 text-[14.5px] text-ink-700">{t("gewestIntro")}</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-y border-line bg-paper text-left text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <Kop>{t("kolomRegeling")}</Kop>
                <Kop rechts>{t("kolomBedrag")}</Kop>
                <Kop>{t("kolomStatus")}</Kop>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {gewestrijen.map((r) => (
                <tr key={r.sleutel}>
                  <td className="px-3 py-2 text-ink-700">{t(r.sleutel)}</td>
                  <td className="px-3 py-2 text-right font-bold text-ink">{r.waarde}</td>
                  <td className="px-3 py-2">
                    <StatusBadge zekerheid={r.zekerheid} label={t(`zekerheid_${r.zekerheid}`)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3.5 text-[13px] leading-relaxed text-ink-500">{t("gewestVoetnoot")}</p>
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="m-0 text-[18px] font-bold text-ink">{t("cregTitel")}</h2>
        <p className="mt-1.5 text-[14.5px] text-ink-700">{t("cregIntro")}</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-y border-line bg-paper text-left text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <Kop>{t("kolomKwartaal")}</Kop>
                {GEWESTEN.map((g) => (
                  <th key={g} scope="col" className="px-3 py-2 text-right">
                    {t(`gewest_${g}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Object.entries(CREG_TARIEVEN).map(([kwartaal, tarieven]) => (
                <tr key={kwartaal}>
                  <td className="px-3 py-1.5 text-ink-700">{kwartaal}</td>
                  {GEWESTEN.map((g) => (
                    <td key={g} className="px-3 py-1.5 text-right font-bold text-ink">
                      {tarieven[g] === undefined ? (
                        <span className="font-normal text-ink-500">{t("nietGepubliceerd")}</span>
                      ) : (
                        perKwh.format(tarieven[g] as number)
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="m-0 text-[18px] font-bold text-ink">{t("vergoedingTitel")}</h2>
        <p className="mt-1.5 text-[14.5px] text-ink-700">{t("vergoedingIntro")}</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-y border-line bg-paper text-left text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <Kop>{t("kolomPeriode")}</Kop>
                <Kop rechts>{t("kolomPerKm")}</Kop>
                <Kop>{t("kolomSoort")}</Kop>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {KILOMETERVERGOEDING.map((k) => (
                <tr key={k.periode}>
                  <td className="px-3 py-1.5 text-ink-700">{k.periode}</td>
                  <td className="px-3 py-1.5 text-right font-bold text-ink">
                    {perKwh.format(k.eurPerKm)}
                  </td>
                  <td className="px-3 py-1.5 text-ink-500">{t(`soort_${k.soort}`)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <dl className="mt-5 grid gap-x-8 gap-y-3.5 sm:grid-cols-2">
          {overigeVergoedingen.map((r) => (
            <div
              key={r.sleutel}
              className="flex items-baseline justify-between gap-3 border-b border-line pb-2.5"
            >
              <dt className="text-[13.5px] text-ink-700">{t(r.sleutel)}</dt>
              <dd className="m-0 shrink-0 text-[14.5px] font-bold text-ink">{r.waarde}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="m-0 text-[18px] font-bold text-ink">{t("aangekondigdTitel")}</h2>
          <StatusBadge zekerheid="voorlopig" label={t("zekerheid_voorlopig")} />
        </div>
        <p className="mt-1.5 text-[14.5px] text-ink-700">{t("aangekondigdIntro")}</p>

        <h3 className="mt-5 text-[14.5px] font-bold text-ink">
          {t("vignetTitel", { datum: WEGENVIGNET_VANAF })}
        </h3>
        <dl className="mt-2 grid gap-x-8 gap-y-3.5 sm:grid-cols-3">
          {WEGENVIGNET_TARIEVEN.map((v) => (
            <div
              key={v.categorie}
              className="flex items-baseline justify-between gap-3 border-b border-line pb-2.5"
            >
              <dt className="text-[13.5px] text-ink-700">{t(`vignet_${v.categorie}`)}</dt>
              <dd className="m-0 shrink-0 text-[14.5px] font-bold text-ink">
                {v.tarieven.jaar === undefined ? t("nietGepubliceerd") : euro(v.tarieven.jaar)}
              </dd>
            </div>
          ))}
        </dl>

        <h3 className="mt-5 text-[14.5px] font-bold text-ink">
          {t("hervormingTitel", { datum: VLAAMSE_HERVORMING_2027.vanaf })}
        </h3>
        <ul className="mt-2 space-y-1.5 pl-5 text-[14px] leading-relaxed text-ink-700">
          {Array.from({ length: VLAAMSE_HERVORMING_2027.aantalKenmerken }, (_, i) => (
            <li key={i} className="list-disc">
              {t(`hervormingPunt${i + 1}`)}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="m-0 text-[18px] font-bold text-ink">{t("zekerheidTitel")}</h2>
        <p className="mt-1.5 text-[14.5px] text-ink-700">{t("zekerheidIntro")}</p>
        <dl className="mt-4 space-y-2.5">
          {ZEKERHEDEN.map((z) => (
            <div key={z} className="flex flex-wrap items-baseline gap-3">
              <dt className="shrink-0">
                <StatusBadge zekerheid={z} label={t(`zekerheid_${z}`)} />
              </dt>
              <dd className="m-0 text-[14px] text-ink-700">{t(`zekerheidUitleg_${z}`)}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <p className="text-[13px] leading-relaxed text-ink-500">{t("voetnoot")}</p>
    </Container>
  );
}
