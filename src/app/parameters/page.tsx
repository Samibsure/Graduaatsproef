"use client";

import { useEffect, useState } from "react";
import {
  bewaarAftrekRegel,
  bewaarMultiplicator,
  bewaarParameters,
  herstelStandaardwaarden,
  laadFiscaleContext,
} from "@/lib/data";
import type { DeductionRule, FiscaleContext, TaxParameters, Voertuigtype } from "@/lib/fiscaal/types";

const TYPES: Voertuigtype[] = ["BEV", "PHEV", "HEV", "fossiel"];

const PARAM_VELDEN: Array<{ veld: keyof TaxParameters; label: string }> = [
  { veld: "vaa_minimum", label: "Minimum VAA (€/jaar)" },
  { veld: "ref_co2_benzine", label: "Referentie-CO₂ benzine/LPG/CNG (g/km)" },
  { veld: "ref_co2_diesel", label: "Referentie-CO₂ diesel (g/km)" },
  { veld: "co2_pct_min", label: "Minimum CO₂-percentage (%)" },
  { veld: "co2_pct_max", label: "Maximum CO₂-percentage (%)" },
  { veld: "co2_pct_basis", label: "Basis CO₂-percentage (%)" },
  { veld: "co2_pct_per_gram", label: "Stijging per gram (%)" },
  { veld: "rsz_index", label: "RSZ-indexatiecoëfficiënt" },
  { veld: "rsz_min_maand", label: "RSZ-minimum vanaf 1/7/2023 (€/maand)" },
  { veld: "rsz_min_basis", label: "RSZ-basisminimum / BEV (€/maand)" },
  { veld: "rsz_multiplicator", label: "RSZ-multiplicator (vanaf 1/7/2023)" },
  { veld: "venb_tarief", label: "VenB-tarief (%)" },
  { veld: "kmo_tarief", label: "Verlaagd KMO-tarief (%)" },
  { veld: "kmo_min_bezoldiging", label: "Minimumbezoldiging KMO-tarief (€)" },
  { veld: "vu_pct_met_kaart", label: "VAA → VU met tank-/laadkaart (%)" },
  { veld: "vu_pct_zonder_kaart", label: "VAA → VU zonder kaart (%)" },
];

export default function ParametersPagina() {
  const [ctx, setCtx] = useState<FiscaleContext | null>(null);
  const [jaar, setJaar] = useState(2026);
  const [melding, setMelding] = useState<string | null>(null);
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);

  const herlaad = () => laadFiscaleContext().then(setCtx);

  useEffect(() => {
    herlaad().catch((e) => setFout(String(e)));
  }, []);

  const params = ctx?.parameters.find((p) => p.year === jaar) ?? null;

  function zetParam(veld: keyof TaxParameters, waarde: number) {
    if (!ctx) return;
    setCtx({
      ...ctx,
      parameters: ctx.parameters.map((p) => (p.year === jaar ? { ...p, [veld]: waarde } : p)),
    });
  }

  function zetRegel(regel: DeductionRule, waarde: number) {
    if (!ctx) return;
    setCtx({
      ...ctx,
      regels: ctx.regels.map((r) =>
        r.voertuigtype === regel.voertuigtype &&
        r.bestelperiode === regel.bestelperiode &&
        r.gebruiksjaar === regel.gebruiksjaar
          ? { ...r, aftrek_pct: waarde }
          : r,
      ),
    });
  }

  function zetMultiplicator(code: string, waarde: number) {
    if (!ctx) return;
    setCtx({
      ...ctx,
      periodes: ctx.periodes.map((p) =>
        p.code === code ? { ...p, rsz_multiplicator: waarde } : p,
      ),
    });
  }

  async function doe(actie: () => Promise<void>, succes: string) {
    setBezig(true);
    setFout(null);
    setMelding(null);
    try {
      await actie();
      setMelding(succes);
    } catch (e) {
      setFout(e instanceof Error ? e.message : String(e));
    } finally {
      setBezig(false);
    }
  }

  async function bewaarAlles() {
    if (!ctx || !params) return;
    await doe(async () => {
      await bewaarParameters(params);
      for (const p of ctx.periodes) {
        await bewaarMultiplicator(p.code, p.rsz_multiplicator);
      }
      for (const r of ctx.regels) {
        await bewaarAftrekRegel(r);
      }
    }, "Parameters bewaard.");
  }

  async function herstel() {
    if (!confirm("Alle parameters en de aftrekkalender terugzetten naar de waarden uit het rapport?"))
      return;
    await doe(async () => {
      await herstelStandaardwaarden();
      await herlaad();
    }, "Standaardwaarden hersteld.");
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-6 px-6 py-[52px]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="mb-3 text-[12px] font-bold uppercase tracking-[0.16em] text-gold">
            Parameters
          </div>
          <h1 className="m-0 text-[clamp(28px,4vw,44px)] font-bold tracking-[-0.02em] text-ink">
            Fiscale parameters
          </h1>
          <p className="mt-2.5 max-w-[44em] text-[16.5px] text-ink-700">
            Jaarlijks bij te werken na het federale begrotingsakkoord. Wijzigingen werken meteen
            door in alle berekeningen.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={bewaarAlles}
            disabled={bezig}
            className="inline-flex h-[46px] items-center rounded-[11px] bg-gold px-5 text-[14.5px] font-bold text-ink transition-colors hover:bg-gold-hover disabled:opacity-50"
          >
            {bezig ? "Bezig…" : "Bewaar wijzigingen"}
          </button>
          <button
            onClick={herstel}
            disabled={bezig}
            className="inline-flex h-[46px] items-center rounded-[11px] border-[1.5px] border-line px-5 text-[14.5px] font-bold text-ink transition-colors hover:bg-paper disabled:opacity-50"
          >
            Herstel standaardwaarden
          </button>
        </div>
      </div>

      {melding && (
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{melding}</p>
      )}
      {fout && <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{fout}</p>}

      <section className="rounded-xl border border-line bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Parameters per jaar</h2>
          <select
            className="rounded-lg border border-line px-2 py-1.5 text-sm"
            value={jaar}
            onChange={(e) => setJaar(Number(e.target.value))}
          >
            {ctx?.parameters.map((p) => (
              <option key={p.year} value={p.year}>
                {p.year}
              </option>
            ))}
          </select>
        </div>
        {params && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PARAM_VELDEN.map(({ veld, label }) => (
              <label key={veld} className="block text-sm">
                <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
                <input
                  type="number"
                  step="any"
                  className="w-full rounded-lg border border-line px-3 py-1.5 text-sm focus:border-gold focus:outline-none"
                  value={params[veld] as number}
                  onChange={(e) => zetParam(veld, Number(e.target.value))}
                />
              </label>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-line bg-white p-5">
        <h2 className="font-semibold">RSZ-multiplicator per bestelperiode (Tabel 3)</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ctx?.periodes.map((p) => (
            <label key={p.code} className="block text-sm">
              <span className="mb-1 block text-xs font-medium text-slate-500">{p.label}</span>
              <input
                type="number"
                step="any"
                className="w-full rounded-lg border border-line px-3 py-1.5 text-sm focus:border-gold focus:outline-none"
                value={p.rsz_multiplicator}
                onChange={(e) => zetMultiplicator(p.code, Number(e.target.value))}
              />
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-line bg-white p-5">
        <h2 className="font-semibold">Aftrekkalender (Tabel 1)</h2>
        <p className="mt-1 text-sm text-slate-500">
          Aftrekbaarheid in VenB per voertuigtype en bestelperiode. “Hele gebruiksduur” geldt voor
          elk gebruiksjaar; bestellingen vóór 1 juli 2023 volgen automatisch de gramformule.
        </p>
        {TYPES.map((type) => {
          const regels = ctx?.regels.filter((r) => r.voertuigtype === type) ?? [];
          if (regels.length === 0) return null;
          return (
            <div key={type} className="mt-4">
              <h3 className="text-sm font-semibold text-ink">{type}</h3>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-y border-line bg-paper text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Bestelperiode</th>
                      <th className="px-3 py-2">Gebruiksjaar</th>
                      <th className="px-3 py-2 text-right">Aftrek %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {regels.map((r) => (
                      <tr key={`${r.bestelperiode}-${r.gebruiksjaar ?? "alle"}`}>
                        <td className="px-3 py-1.5">
                          {ctx?.periodes.find((p) => p.code === r.bestelperiode)?.label ??
                            r.bestelperiode}
                        </td>
                        <td className="px-3 py-1.5">{r.gebruiksjaar ?? "Hele gebruiksduur"}</td>
                        <td className="px-3 py-1.5 text-right">
                          <input
                            type="number"
                            step="any"
                            min={0}
                            max={120}
                            className="w-24 rounded-lg border border-line px-2 py-1 text-right text-sm focus:border-gold focus:outline-none"
                            value={r.aftrek_pct}
                            onChange={(e) => zetRegel(r, Number(e.target.value))}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
