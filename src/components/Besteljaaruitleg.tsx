"use client";

import { useTranslations } from "next-intl";
import Icon from "@/components/Icon";
import type { Besteljaardrijvers, Besteljaarrij } from "@/lib/fiscaal/besteljaar";
import { DRIJVERS } from "@/lib/simulatorflow";
import type { Formatters } from "@/lib/format";

/**
 * Waarom dit besteljaar dit kost.
 *
 * De besteljaartabel toonde vijf rijen met zes getallen en één slotzin met het
 * verschil erin. Dat laat zien dát uitstellen duurder is, maar nergens waardoor:
 * niet onder welk regime een jaar valt, niet hoe het aftrekpercentage ontstaat, en
 * niet langs welke weg dat percentage in euro's op de eindrekening belandt. Wie de
 * regel niet kent, ziet dus alleen een getal dat hij moet geloven.
 *
 * Deze uitleg loopt de causale keten af in de volgorde waarin ze werkt: regime,
 * dan percentage, dan het pad over de gebruiksjaren, dan de drie posten waaruit
 * het verschil bestaat. Die drie posten zijn geen benadering; ze sommeren exact
 * tot de kolom Verschil (zie de opmerking bij vergelijkBesteljaren).
 */
export default function Besteljaaruitleg({
  rij,
  besteJaar,
  formatters,
}: {
  rij: Besteljaarrij;
  besteJaar: number;
  formatters: Pick<Formatters, "euro" | "pct" | "getal">;
}) {
  const t = useTranslations("besteljaar");
  const tRegimes = useTranslations("regimes");
  const { euro, pct, getal } = formatters;
  const { opbouw } = rij;

  const isBeste = rij.jaar === besteJaar;
  const grootste = Math.max(
    ...DRIJVERS.map((d) => Math.abs(rij.drijversVerschil[d])),
    1,
  );

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-5">
        <section>
          <h4 className="m-0 mb-1.5 text-[13px] font-bold uppercase tracking-wide text-ink-500">
            {t("regimeTitel")}
          </h4>
          <p className="m-0 text-[14px] leading-relaxed text-ink-700">
            {tRegimes(opbouw.periode.code)}
          </p>
        </section>

        <section>
          <h4 className="m-0 mb-1.5 text-[13px] font-bold uppercase tracking-wide text-ink-500">
            {t("herkomstTitel")}
          </h4>
          <p className="m-0 text-[14px] leading-relaxed text-ink-700">
            {opbouw.herkomst === "gramformule"
              ? t("herkomst_gramformule", {
                  coefficient: getal(opbouw.gramCoefficient),
                  co2: getal(opbouw.gerekendeCo2 ?? 0),
                  pct: pct(opbouw.pct),
                })
              : opbouw.herkomst === "levenslang_nul"
                ? t("herkomst_levenslang_nul")
                : t("herkomst_kalenderplafond", { pct: pct(opbouw.pct) })}
            {/*
              Wanneer de kalender de formule aftopt, is het percentage niet te
              begrijpen uit één van de twee alleen. Beide getallen horen er dan te
              staan, met wie won.
            */}
            {opbouw.herkomst === "kalenderplafond" &&
              opbouw.gramformulePct !== null &&
              opbouw.plafondPct !== null && (
                <>
                  {" "}
                  {t("herkomstAfgetopt", {
                    gram: pct(opbouw.gramformulePct),
                    plafond: pct(opbouw.plafondPct),
                  })}
                </>
              )}
            {opbouw.metMinimum && <> {t("herkomstMinimum")}</>}
          </p>
        </section>

        <section>
          <h4 className="m-0 mb-2 text-[13px] font-bold uppercase tracking-wide text-ink-500">
            {t("padTitel")}
          </h4>
          <ol className="m-0 flex list-none gap-1.5 p-0">
            {rij.aftrekPad.map((p, i) => (
              <li key={i} className="min-w-0 flex-1">
                <div className="relative h-10 overflow-hidden rounded-[6px] bg-paper">
                  {/* Minstens drie procent hoogte, anders is nul niet te zien. */}
                  <div
                    className={`absolute bottom-0 left-0 right-0 ${
                      p === 0 ? "bg-danger" : "bg-accent"
                    }`}
                    style={{ height: `${Math.max(3, p)}%` }}
                  />
                </div>
                <div className="mt-1 text-center text-[11px] font-bold text-ink">{pct(p)}</div>
                <div className="text-center text-[10.5px] text-ink-500">{rij.jaar + i}</div>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <section>
        {!isBeste && (
          <h4 className="m-0 mb-2 text-[13px] font-bold uppercase tracking-wide text-ink-500">
            {t("verschilTitel", { jaar: besteJaar })}
          </h4>
        )}

        {isBeste ? (
          <p className="m-0 flex items-start gap-2 rounded-[10px] border border-success/25 bg-success-soft px-3.5 py-3 text-[13.5px] leading-relaxed text-success">
            <span className="mt-0.5 shrink-0">
              <Icon name="shield-check" size={16} />
            </span>
            <span>{t("verschilGeen")}</span>
          </p>
        ) : (
          <>
            <ul className="m-0 list-none space-y-2.5 p-0">
              {DRIJVERS.map((sleutel) => {
                const bedrag = rij.drijversVerschil[sleutel as keyof Besteljaardrijvers];
                return (
                  <li key={sleutel}>
                    <div className="flex items-baseline justify-between gap-3 text-[13.5px]">
                      <span className="text-ink-700">{t(`drijver_${sleutel}`)}</span>
                      <span
                        className={`shrink-0 font-bold ${
                          bedrag > 0 ? "text-danger" : bedrag < 0 ? "text-success" : "text-ink-500"
                        }`}
                      >
                        {bedrag > 0 ? "+ " : ""}
                        {euro(bedrag)}
                      </span>
                    </div>
                    <div className="mt-1 h-[6px] overflow-hidden rounded-full bg-paper">
                      <div
                        className={`h-full rounded-full ${
                          bedrag < 0 ? "bg-success" : "bg-danger"
                        }`}
                        style={{ width: `${(Math.abs(bedrag) / grootste) * 100}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-line pt-3">
              <span className="text-[14px] font-bold text-ink">{t("drijverSamen")}</span>
              <span className="text-[15px] font-bold text-danger">
                + {euro(rij.meerkostTegenoverBeste)}
              </span>
            </div>
            <p className="m-0 mt-2.5 text-[12.5px] leading-relaxed text-ink-500">
              {t("drijverUitleg")}
            </p>
          </>
        )}
      </section>
    </div>
  );
}
