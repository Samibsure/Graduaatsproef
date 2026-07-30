"use client";

import { useTranslations } from "next-intl";
import { Melding, Tabel } from "@/components/ui";
import type { Kostenopbouw } from "@/lib/fiscaal/kosten";

/**
 * De jaarkost, uitgesplitst per post.
 *
 * De simulator raamde de jaarkost tot nu toe als cataloguswaarde × 0,17. Dat is
 * geen model maar een vuistregel: ze weet niet of je 15.000 of 45.000 km rijdt,
 * niet of je thuis of publiek laadt, en niet in welk gewest de wagen staat.
 * kosten.ts rekende die posten al apart uit, alleen kwam niemand ze ooit te zien.
 *
 * Ze hier tonen doet twee dingen tegelijk: het maakt het totaal navolgbaar, en het
 * maakt zichtbaar dat de keuzes in de vorige stap er echt iets mee doen.
 */
export default function Kostenopbouwtabel({
  opbouw,
  voorbehoud,
  euro,
}: {
  opbouw: Kostenopbouw;
  /** Sleutel onder `kosten.voorbehoud_*`, of null wanneer er geen voorbehoud is. */
  voorbehoud: string | null;
  euro: (n: number) => string;
}) {
  const t = useTranslations("simulator");
  const tKosten = useTranslations("kosten");

  const posten: Array<[string, number]> = [
    [t("kostenEnergie"), opbouw.energie],
    [t("kostenOnderhoud"), opbouw.onderhoud],
    [t("kostenBanden"), opbouw.banden],
    [t("kostenVerzekering"), opbouw.verzekering],
    [t("kostenVerkeersbelasting"), opbouw.verkeersbelasting],
    [t("kostenAfschrijving"), opbouw.afschrijving],
  ];

  return (
    <div>
      <Tabel minBreedte={360} bijschrift={t("kostenTitel")} className="rounded-[12px] border border-line">
        <thead className="border-b border-line bg-paper text-left text-xs uppercase tracking-wide text-ink-500">
          <tr>
            <th scope="col" className="px-4 py-3">
              {t("kostenPost")}
            </th>
            <th scope="col" className="px-4 py-3 text-right">
              {t("kostenBedrag")}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {posten.map(([naam, bedrag]) => (
            <tr key={naam}>
              <th scope="row" className="px-4 py-2.5 text-left font-normal text-ink-700">
                {naam}
              </th>
              <td className="px-4 py-2.5 text-right text-ink-700">{euro(bedrag)}</td>
            </tr>
          ))}
          <tr className="bg-paper">
            <th scope="row" className="px-4 py-2.5 text-left font-bold text-ink">
              {t("kostenTotaal")}
            </th>
            <td className="px-4 py-2.5 text-right font-bold text-ink">{euro(opbouw.totaal)}</td>
          </tr>
        </tbody>
      </Tabel>

      {/*
        Een betwist bedrag hoort niet stil in een totaal te verdwijnen. Het staat
        hier omdat het één van de zes regels hierboven raakt, en nergens anders.
      */}
      {voorbehoud && (
        <Melding soort="let-op" className="mt-4">
          <span className="font-bold">{tKosten("voorbehoudTitel")}</span>{" "}
          {tKosten(`voorbehoud_${voorbehoud}`)}
        </Melding>
      )}
    </div>
  );
}
