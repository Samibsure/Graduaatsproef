"use client";

import { useTranslations } from "next-intl";
import Icon from "@/components/Icon";
import type { Uitfasering } from "@/lib/fiscaal/uitfasering";

/**
 * De uitdoofkalender als tijdlijn.
 *
 * Dit is het inzicht waarvoor de tool bestaat: niet wat een wagen dit jaar
 * kost, maar wat hij kost zodra zijn aftrek wegvalt. De balk toont per
 * kalenderjaar de aftrekbaarheid, de dalingen zijn gemarkeerd, en eronder staat
 * in één zin wat het verschil in euro's is.
 *
 * De tabel eronder is geen dubbelop maar de toegankelijke tegenhanger van de
 * balken: schermlezers krijgen daar dezelfde cijfers in leesbare vorm.
 */
export default function Uitfaseringstijdlijn({
  uitfasering,
  euro,
  pct,
  compact = false,
}: {
  uitfasering: Uitfasering;
  euro: (n: number) => string;
  pct: (n: number) => string;
  compact?: boolean;
}) {
  const t = useTranslations("uitfasering");
  const { jaren, eersteDaling, eersteNulJaar, meerkostToename } = uitfasering;

  const heeftDaling = eersteDaling !== null;

  return (
    <div>
      <ol className="m-0 flex list-none gap-1.5 p-0">
        {jaren.map((j) => (
          <li key={j.jaar} className="min-w-0 flex-1">
            <div
              className="relative overflow-hidden rounded-[7px] bg-paper"
              style={{ height: compact ? 40 : 56 }}
            >
              <div
                className="absolute bottom-0 left-0 right-0 transition-[height]"
                style={{
                  height: `${Math.max(3, j.aftrekPct)}%`,
                  background:
                    j.aftrekPct === 0 ? "#ef4444" : j.daaltHier ? "#f59e0b" : "var(--gold, #AE9A64)",
                }}
              />
            </div>
            <div className="mt-1.5 text-center">
              <div className="text-[11.5px] font-bold text-ink">{j.aftrekPct}%</div>
              <div className="text-[10.5px] text-ink-500">{j.jaar}</div>
            </div>
          </li>
        ))}
      </ol>

      {/* Toegankelijke tegenhanger van de balken. */}
      <table className="sr-only">
        <caption>{t("tabelBijschrift")}</caption>
        <thead>
          <tr>
            <th scope="col">{t("kolomJaar")}</th>
            <th scope="col">{t("kolomAftrek")}</th>
            <th scope="col">{t("kolomMeerkost")}</th>
          </tr>
        </thead>
        <tbody>
          {jaren.map((j) => (
            <tr key={j.jaar}>
              <th scope="row">{j.jaar}</th>
              <td>{pct(j.aftrekPct)}</td>
              <td>{euro(j.fiscaleMeerkost)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {heeftDaling ? (
        <p
          role="note"
          className="mt-3 flex items-start gap-2 rounded-[10px] border border-amber-300/60 bg-amber-50 px-3.5 py-2.5 text-[13.5px] leading-relaxed text-amber-900"
        >
          <span className="mt-0.5 shrink-0">
            <Icon name="triangle-alert" size={16} />
          </span>
          <span>
            {eersteNulJaar !== null
              ? t("waarschuwingNul", { jaar: eersteNulJaar, bedrag: euro(meerkostToename) })
              : t("waarschuwingDaling", {
                  jaar: eersteDaling,
                  bedrag: euro(meerkostToename),
                })}
          </span>
        </p>
      ) : (
        <p
          role="note"
          className="mt-3 flex items-start gap-2 rounded-[10px] border border-emerald-600/25 bg-emerald-50 px-3.5 py-2.5 text-[13.5px] leading-relaxed text-emerald-900"
        >
          <span className="mt-0.5 shrink-0">
            <Icon name="shield-check" size={16} />
          </span>
          <span>{t("stabiel", { pct: pct(uitfasering.aftrekStart) })}</span>
        </p>
      )}
    </div>
  );
}
