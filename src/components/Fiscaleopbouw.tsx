"use client";

import { useTranslations } from "next-intl";
import { Tabel } from "@/components/ui";
import type { JaarResultaat } from "@/lib/fiscaal/types";

/**
 * De trap van autokost naar totale kost, regel per regel.
 *
 * De vier kerncijfers stonden al op het scherm, maar los van elkaar: vier
 * bedragen zonder de weg ertussen. Wie wil weten waaróm de fiscale meerkost
 * zoveel is, kon dat nergens nalezen. Deze tabel is exact de berekening uit
 * berekenJaar(), in dezelfde volgorde, zodat elk bedrag herleidbaar is tot het
 * bedrag erboven.
 *
 * De percentages staan in de regels zelf en niet in een voetnoot. "Niet aftrekbaar
 * deel" zegt niets; "niet aftrekbaar deel, bij 50% aftrek" zegt waar het getal
 * vandaan komt.
 */
export default function Fiscaleopbouw({
  jaar,
  autokosten,
  resultaat,
  tariefPct,
  vuPct,
  euro,
  pct,
}: {
  jaar: number;
  /** De autokosten vóór btw-recuperatie, zoals de bezoeker ze kent. */
  autokosten: number;
  resultaat: JaarResultaat;
  /** Het toegepaste tarief in de vennootschapsbelasting. */
  tariefPct: number;
  /** Het deel van het voordeel dat een verworpen uitgave wordt: 40% of 17%. */
  vuPct: number;
  euro: (n: number) => string;
  pct: (n: number) => string;
}) {
  const t = useTranslations("simulator");
  const r = resultaat;

  type Regel = {
    naam: string;
    bedrag: number;
    soort: "post" | "vermindering" | "subtotaal" | "totaal" | "context";
  };

  const regels: Regel[] = [
    { naam: t("opbouwAutokosten"), bedrag: autokosten, soort: "post" },
    // De btw-recuperatie is geen kost meer en gaat er dus af. Nul betekent dat er
    // geen methode gekozen is; die regel weglaten is dan duidelijker dan "€ 0".
    ...(r.btwTeruggevorderd > 0
      ? [
          {
            naam: t("opbouwBtw"),
            bedrag: -r.btwTeruggevorderd,
            soort: "vermindering" as const,
          },
        ]
      : []),
    {
      naam: t("opbouwNietAftrekbaar", { pct: pct(r.aftrekPct) }),
      bedrag: r.nietAftrekbaar,
      soort: "post",
    },
    // Het voordeel van alle aard is geen post in deze som maar de grondslag
    // waarop de regel eronder rekent. Daarom staat het er lichter bij: zonder dat
    // cijfer valt de volgende regel uit de lucht.
    { naam: t("opbouwVaa"), bedrag: r.vaa, soort: "context" },
    {
      naam: t("opbouwVuUitVaa", { pct: pct(vuPct) }),
      bedrag: r.vuUitVaa,
      soort: "post",
    },
    { naam: t("opbouwVu"), bedrag: r.verworpenUitgaven, soort: "subtotaal" },
    {
      naam: t("opbouwVenB", { pct: pct(tariefPct) }),
      bedrag: r.extraVenB,
      soort: "post",
    },
    { naam: t("opbouwRsz"), bedrag: r.rszJaar, soort: "post" },
    { naam: t("opbouwMeerkost"), bedrag: r.fiscaleMeerkost, soort: "subtotaal" },
    ...(r.eigenBijdrageJaar > 0
      ? [
          {
            naam: t("opbouwBijdrage"),
            bedrag: -r.eigenBijdrageJaar,
            soort: "vermindering" as const,
          },
        ]
      : []),
    { naam: t("opbouwTotaal", { jaar }), bedrag: r.totaleKost, soort: "totaal" },
  ];

  return (
    <Tabel
      minBreedte={380}
      bijschrift={t("opbouwTitel")}
      className="rounded-[12px] border border-line"
    >
      <tbody className="divide-y divide-line">
        {regels.map((regel) => {
          const zwaar = regel.soort === "subtotaal" || regel.soort === "totaal";
          return (
            <tr
              key={regel.naam}
              className={zwaar ? "bg-paper" : undefined}
            >
              <th
                scope="row"
                className={`px-4 text-left ${regel.soort === "totaal" ? "py-3.5" : "py-2.5"} ${
                  zwaar
                    ? "font-bold text-ink"
                    : regel.soort === "context"
                      ? "font-normal text-ink-500"
                      : "font-normal text-ink-700"
                }`}
              >
                {regel.naam}
              </th>
              <td
                className={`px-4 text-right ${regel.soort === "totaal" ? "py-3.5" : "py-2.5"} ${
                  regel.soort === "totaal"
                    ? "text-[17px] font-bold text-ink"
                    : regel.soort === "subtotaal"
                      ? "font-bold text-ink"
                      : regel.soort === "vermindering"
                        ? "text-success"
                        : regel.soort === "context"
                          ? "text-ink-500"
                          : "text-ink-700"
                }`}
              >
                {euro(regel.bedrag)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </Tabel>
  );
}
