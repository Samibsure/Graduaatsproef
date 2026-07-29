"use client";

import { useTranslations } from "next-intl";
import { Badge, Tabel } from "@/components/ui";
import type { Besteljaarvergelijking } from "@/lib/fiscaal/besteljaar";
import type { Formatters } from "@/lib/format";

/**
 * Dezelfde wagen, verschillende besteljaren, naast elkaar.
 *
 * Het besteljaar bepaalt onder welk regime een wagen valt, en dat is fiscaal het
 * zwaarste gegeven in de applicatie. Tot nu toe vulde de catalogus het stil in en
 * toonde ze het resultaat alsof het een eigenschap van de wagen was. Deze tabel
 * maakt zichtbaar wat er gebeurt met precies één beslissing: wanneer teken je.
 */
export default function Besteljaartabel({
  vergelijking,
  formatters,
}: {
  vergelijking: Besteljaarvergelijking;
  formatters: Pick<Formatters, "euro" | "pct">;
}) {
  const t = useTranslations("besteljaar");
  const { euro, pct } = formatters;
  const { rijen, besteJaar, laatsteJaarMetAftrek, spreiding } = vergelijking;

  if (rijen.length === 0) return null;

  return (
    <div>
      <p className="m-0 mb-4 max-w-[46em] text-[14.5px] leading-relaxed text-ink-700">
        {t("intro")}
      </p>

      <Tabel minBreedte={620} bijschrift={t("titel")} className="rounded-[12px] border border-line">
        <thead className="border-b border-line bg-paper text-left text-xs uppercase tracking-wide text-ink-500">
          <tr>
            <th scope="col" className="px-4 py-3">{t("kolomJaar")}</th>
            <th scope="col" className="px-4 py-3 text-right">{t("kolomAftrek")}</th>
            <th scope="col" className="px-4 py-3 text-right">{t("kolomVu")}</th>
            <th scope="col" className="px-4 py-3 text-right">{t("kolomRsz")}</th>
            <th scope="col" className="px-4 py-3 text-right">{t("kolomTco")}</th>
            <th scope="col" className="px-4 py-3 text-right">{t("kolomMeerkost")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rijen.map((r) => {
            const isBeste = r.jaar === besteJaar;
            return (
              <tr key={r.jaar} className={isBeste ? "bg-accent-soft/60" : undefined}>
                <th scope="row" className="px-4 py-2.5 text-left font-bold text-ink">
                  <span className="inline-flex items-center gap-2">
                    {r.jaar}
                    {isBeste && <Badge tint="gold">{t("beste")}</Badge>}
                  </span>
                </th>
                <td className="px-4 py-2.5 text-right">
                  {r.aftrekEerste === 0 ? (
                    <span className="font-bold text-danger">{pct(0)}</span>
                  ) : (
                    <span className="font-bold text-ink">{pct(r.aftrekEerste)}</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right text-ink-700">{euro(r.verworpenUitgaven)}</td>
                <td className="px-4 py-2.5 text-right text-ink-700">{euro(r.fiscaleMeerkost)}</td>
                <td className="px-4 py-2.5 text-right font-bold text-ink">{euro(r.totaleKost)}</td>
                <td className="px-4 py-2.5 text-right">
                  {r.meerkostTegenoverBeste === 0 ? (
                    <span className="text-ink-500">–</span>
                  ) : (
                    <span className="font-bold text-danger">
                      + {euro(r.meerkostTegenoverBeste)}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </Tabel>

      <p className="m-0 mt-4 text-[13.5px] leading-relaxed text-ink-500">
        {laatsteJaarMetAftrek === null
          ? t("geenEnkelJaar")
          : t("laatsteJaar", { jaar: laatsteJaarMetAftrek })}{" "}
        {spreiding > 0 && t("spreiding", { bedrag: euro(spreiding) })}
      </p>
    </div>
  );
}
