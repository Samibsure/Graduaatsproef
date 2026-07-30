"use client";

import { useTranslations } from "next-intl";
import { useId, useMemo, useState } from "react";
import Besteljaaruitleg from "@/components/Besteljaaruitleg";
import Icon from "@/components/Icon";
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
 *
 * Met `metUitleg` komt daar de vraag bij die de tabel zelf niet beantwoordde:
 * waaróm kost dat jaar meer? Standaard staat dat uit, zodat de catalogus, waar de
 * tabel in een smal paneel onder het raster zit, ongewijzigd blijft.
 */
export default function Besteljaartabel({
  vergelijking,
  formatters,
  metUitleg = false,
}: {
  vergelijking: Besteljaarvergelijking;
  formatters: Pick<Formatters, "euro" | "pct" | "getal">;
  /** Toont de regimestrook en per rij een uitklapbare uitleg. */
  metUitleg?: boolean;
}) {
  const t = useTranslations("besteljaar");
  const tRegimes = useTranslations("regimes");
  const { euro, pct } = formatters;
  const { rijen, besteJaar, laatsteJaarMetAftrek, spreiding } = vergelijking;
  const [open, setOpen] = useState<number | null>(null);
  const paneelId = useId();

  /**
   * De getoonde jaren gegroepeerd per bestelperiode.
   *
   * Zonder deze strook is de sprong tussen twee opeenvolgende rijen een raadsel:
   * de tabel laat wél zien dat 2027 plots vierhonderd euro duurder is, maar niet
   * dat daar een regimegrens tussen ligt. Met die grens erbij is het geen
   * eigenaardigheid meer maar een regel.
   */
  const regimes = useMemo(() => {
    const groepen: Array<{ code: string; jaren: number[] }> = [];
    for (const r of rijen) {
      const laatste = groepen[groepen.length - 1];
      if (laatste && laatste.code === r.opbouw.periode.code) laatste.jaren.push(r.jaar);
      else groepen.push({ code: r.opbouw.periode.code, jaren: [r.jaar] });
    }
    return groepen;
  }, [rijen]);

  if (rijen.length === 0) return null;

  const kolommen = metUitleg ? 7 : 6;

  return (
    <div>
      <p className="m-0 mb-4 max-w-[46em] text-[14.5px] leading-relaxed text-ink-700">
        {t("intro")}
      </p>

      {metUitleg && regimes.length > 1 && (
        <div className="mb-4">
          <h3 className="m-0 mb-2 text-[13px] font-bold uppercase tracking-wide text-ink-500">
            {t("regimestrookTitel")}
          </h3>
          <ol className="m-0 flex list-none flex-wrap gap-2 p-0">
            {regimes.map((g) => (
              <li
                key={g.code}
                className="min-w-[12em] flex-1 rounded-[10px] border border-line bg-paper px-3 py-2"
              >
                <span className="block text-[13px] font-bold text-ink">
                  {g.jaren.length === 1
                    ? g.jaren[0]
                    : `${g.jaren[0]} tot ${g.jaren[g.jaren.length - 1]}`}
                </span>
                <span className="block text-[12px] leading-snug text-ink-500">
                  {tRegimes(g.code)}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <Tabel
        minBreedte={metUitleg ? 700 : 620}
        bijschrift={t("titel")}
        className="rounded-[12px] border border-line"
      >
        <thead className="border-b border-line bg-paper text-left text-xs uppercase tracking-wide text-ink-500">
          <tr>
            <th scope="col" className="px-4 py-3">{t("kolomJaar")}</th>
            <th scope="col" className="px-4 py-3 text-right">{t("kolomAftrek")}</th>
            <th scope="col" className="px-4 py-3 text-right">{t("kolomVu")}</th>
            <th scope="col" className="px-4 py-3 text-right">{t("kolomRsz")}</th>
            <th scope="col" className="px-4 py-3 text-right">
              {t("kolomTco", { jaren: vergelijking.looptijd })}
            </th>
            <th scope="col" className="px-4 py-3 text-right">{t("kolomMeerkost")}</th>
            {metUitleg && (
              <th scope="col" className="px-4 py-3 text-right">
                <span className="sr-only">{t("waarom")}</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rijen.flatMap((r) => {
            const isBeste = r.jaar === besteJaar;
            const isOpen = open === r.jaar;

            const hoofdrij = (
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
                <td className="px-4 py-2.5 text-right text-ink-700">
                  {euro(r.verworpenUitgaven)}
                </td>
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
                {metUitleg && (
                  <td className="px-4 py-2.5 text-right">
                    {/*
                      Een knop en geen <details>: dat element mag niet tussen een
                      <tr> en een <td> staan, en de uitleg hoort over de volle
                      tabelbreedte te openen in plaats van in één cel geperst te
                      worden.
                    */}
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={`${paneelId}-${r.jaar}`}
                      aria-label={t("waaromLabel", { jaar: r.jaar })}
                      onClick={() => setOpen(isOpen ? null : r.jaar)}
                      className="inline-flex items-center gap-1 whitespace-nowrap text-[13px] font-bold text-ink-500 hover:text-ink"
                    >
                      {t("waarom")}
                      <span
                        aria-hidden="true"
                        className={`inline-flex transition-transform ${isOpen ? "rotate-180" : ""}`}
                      >
                        <Icon name="chevron-down" size={15} />
                      </span>
                    </button>
                  </td>
                )}
              </tr>
            );

            if (!metUitleg || !isOpen) return [hoofdrij];

            return [
              hoofdrij,
              <tr key={`${r.jaar}-uitleg`} id={`${paneelId}-${r.jaar}`}>
                <td colSpan={kolommen} className="bg-paper px-4 py-5">
                  <Besteljaaruitleg rij={r} besteJaar={besteJaar} formatters={formatters} />
                </td>
              </tr>,
            ];
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
