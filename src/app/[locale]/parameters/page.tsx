"use client";

import { useEffect, useState } from "react";
import { Card, Container, PageHead } from "@/components/ui";
import { laadFiscaleContext } from "@/lib/data";
import type { FiscaleContext, TaxParameters, Voertuigtype } from "@/lib/fiscaal/types";
import { getal } from "@/lib/format";

const TYPES: Voertuigtype[] = ["BEV", "PHEV", "HEV", "fossiel"];

const PARAM_VELDEN: Array<{ veld: keyof TaxParameters; label: string; eenheid?: string }> = [
  { veld: "vaa_minimum", label: "Minimum VAA", eenheid: "€/jaar" },
  { veld: "ref_co2_benzine", label: "Referentie-CO₂ benzine/LPG/CNG", eenheid: "g/km" },
  { veld: "ref_co2_diesel", label: "Referentie-CO₂ diesel", eenheid: "g/km" },
  { veld: "co2_pct_min", label: "Minimum CO₂-percentage", eenheid: "%" },
  { veld: "co2_pct_max", label: "Maximum CO₂-percentage", eenheid: "%" },
  { veld: "co2_pct_basis", label: "Basis CO₂-percentage", eenheid: "%" },
  { veld: "co2_pct_per_gram", label: "Stijging per gram", eenheid: "%" },
  { veld: "rsz_index", label: "RSZ-indexatiecoëfficiënt" },
  { veld: "rsz_min_maand", label: "RSZ-minimum vanaf 1/7/2023", eenheid: "€/maand" },
  { veld: "rsz_min_basis", label: "RSZ-basisminimum / BEV", eenheid: "€/maand" },
  { veld: "rsz_multiplicator", label: "RSZ-multiplicator (vanaf 1/7/2023)" },
  { veld: "venb_tarief", label: "VenB-tarief", eenheid: "%" },
  { veld: "kmo_tarief", label: "Verlaagd KMO-tarief", eenheid: "%" },
  { veld: "kmo_min_bezoldiging", label: "Minimumbezoldiging KMO-tarief", eenheid: "€" },
  { veld: "vu_pct_met_kaart", label: "VAA → VU met tank-/laadkaart", eenheid: "%" },
  { veld: "vu_pct_zonder_kaart", label: "VAA → VU zonder kaart", eenheid: "%" },
];

export default function ParametersPagina() {
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
        eyebrow="Referentie"
        title="Fiscale parameters"
        sub="De cijfers waarmee Autofiscaliteit rekent, per kalenderjaar. Ze gelden voor heel België en worden centraal bijgewerkt na het federale begrotingsakkoord — daarom zijn ze niet per bedrijf aan te passen."
      />

      {fout && <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{fout}</p>}

      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="m-0 text-[18px] font-bold text-ink">Parameters per jaar</h2>
          <label className="text-sm text-ink-500">
            Kalenderjaar{" "}
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
            {PARAM_VELDEN.map(({ veld, label, eenheid }) => (
              <div key={veld} className="flex items-baseline justify-between gap-3 border-b border-line pb-2.5">
                <dt className="text-[13.5px] text-ink-700">{label}</dt>
                <dd className="m-0 shrink-0 text-[14.5px] font-bold text-ink">
                  {getal(params[veld] as number)}
                  {eenheid && <span className="ml-1 font-normal text-ink-500">{eenheid}</span>}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="m-0 text-[18px] font-bold text-ink">RSZ-multiplicator per bestelperiode</h2>
        <p className="mt-1.5 text-[14.5px] text-ink-700">
          De solidariteitsbijdrage voor niet-elektrische wagens loopt op naargelang de periode
          waarin de wagen besteld werd.
        </p>
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
        <h2 className="m-0 text-[18px] font-bold text-ink">Aftrekkalender</h2>
        <p className="mt-1.5 text-[14.5px] text-ink-700">
          Aftrekbaarheid in de vennootschapsbelasting per voertuigtype en bestelperiode. “Hele
          gebruiksduur” geldt voor elk gebruiksjaar; bestellingen vóór 1 juli 2023 volgen
          automatisch de gramformule.
        </p>

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
                      <th className="px-3 py-2">Bestelperiode</th>
                      <th className="px-3 py-2">Gebruiksjaar</th>
                      <th className="px-3 py-2 text-right">Aftrek</th>
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
                          {r.gebruiksjaar ?? "Hele gebruiksduur"}
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

      <p className="text-[13px] leading-relaxed text-ink-500">
        Deze cijfers zijn een weergave van de federale regelgeving zoals gekend bij de laatste
        bijwerking. Ze vormen geen fiscaal advies: toets elke beslissing bij je boekhouder of
        belastingadviseur.
      </p>
    </Container>
  );
}
