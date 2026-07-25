"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Card, Container, PageHead } from "@/components/ui";
import { laadFiscaleContext } from "@/lib/data";
import type { FiscaleContext, Voertuigtype } from "@/lib/fiscaal/types";
import { formatters } from "@/lib/format";
import { PARAM_VELDEN } from "@/lib/parameterVelden";

const TYPES: Voertuigtype[] = ["BEV", "PHEV", "HEV", "fossiel"];


export default function ParametersPagina() {
  const t = useTranslations("parameters");
  const { getal } = formatters(useLocale());
  const [ctx, setCtx] = useState<FiscaleContext | null>(null);
  const [jaar, setJaar] = useState(2026);
  const [fout, setFout] = useState<string | null>(null);

  useEffect(() => {
    laadFiscaleContext()
      .then(setCtx)
      .catch((e) => setFout(String(e)));
  }, []);

  const params = ctx?.parameters.find((p) => p.year === jaar) ?? null;

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
                      <th className="px-3 py-2">{t("kolomBestelperiode")}</th>
                      <th className="px-3 py-2">{t("kolomGebruiksjaar")}</th>
                      <th className="px-3 py-2 text-right">{t("kolomAftrek")}</th>
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

      <p className="text-[13px] leading-relaxed text-ink-500">{t("voetnoot")}</p>
    </Container>
  );
}
