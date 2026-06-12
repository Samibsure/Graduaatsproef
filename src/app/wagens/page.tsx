"use client";

import { useEffect, useState } from "react";
import { bewaarWagen, laadFiscaleContext, laadWagens, verwijderWagen } from "@/lib/data";
import { berekenJaar } from "@/lib/fiscaal/engine";
import type { Brandstof, FiscaleContext, Vehicle, Voertuigtype } from "@/lib/fiscaal/types";
import { euro, pct } from "@/lib/format";

const EVALUATIEJAAR = 2026;

type Formulier = Omit<Vehicle, "id"> & { id?: string };

const leegFormulier: Formulier = {
  omschrijving: "",
  werknemer: "",
  kenteken: "",
  voertuigtype: "BEV",
  brandstof: "elektrisch",
  besteldatum: "2026-01-01",
  eerste_ingebruikname: "2026-03-01",
  co2: 0,
  cataloguswaarde: 45000,
  jaarlijkse_autokosten: 8500,
  aankoopprijs: null,
  tankkaart: true,
  beroepsgebruik_pct: 100,
  thuislaadpunt: false,
  km_per_jaar: 25000,
  flex_score: 7,
  restwaarde_score: 5,
};

export default function WagensPagina() {
  const [ctx, setCtx] = useState<FiscaleContext | null>(null);
  const [wagens, setWagens] = useState<Vehicle[]>([]);
  const [formulier, setFormulier] = useState<Formulier | null>(null);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  const herlaad = () => laadWagens().then(setWagens);

  useEffect(() => {
    Promise.all([laadFiscaleContext(), laadWagens()])
      .then(([c, w]) => {
        setCtx(c);
        setWagens(w);
      })
      .catch((e) => setFout(e instanceof Error ? e.message : String(e)));
  }, []);

  const zet = <K extends keyof Formulier>(veld: K, waarde: Formulier[K]) =>
    setFormulier((f) => (f ? { ...f, [veld]: waarde } : f));

  async function bewaar() {
    if (!formulier) return;
    setBezig(true);
    setFout(null);
    try {
      await bewaarWagen({
        ...formulier,
        werknemer: formulier.werknemer || null,
        kenteken: formulier.kenteken || null,
      });
      setFormulier(null);
      await herlaad();
    } catch (e) {
      setFout(e instanceof Error ? e.message : String(e));
    } finally {
      setBezig(false);
    }
  }

  async function verwijder(id: string) {
    if (!confirm("Deze wagen verwijderen?")) return;
    setFout(null);
    try {
      await verwijderWagen(id);
      await herlaad();
    } catch (e) {
      setFout(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Invoer per wagen</h1>
          <p className="mt-1 text-sm text-slate-500">
            Identificatie, technische gegevens, financieel en beleid — cf. Bijlage 4 (tabblad 2) van
            het rapport. Berekende cijfers gelden voor gebruiksjaar {EVALUATIEJAAR}.
          </p>
        </div>
        <button
          onClick={() => setFormulier({ ...leegFormulier })}
          className="rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
        >
          + Nieuwe wagen
        </button>
      </div>

      {fout && <p className="rounded-md bg-rose-50 px-4 py-3 text-sm text-rose-700">{fout}</p>}

      {formulier && (
        <section className="rounded-xl border border-blue-200 bg-white p-5">
          <h2 className="font-semibold">
            {formulier.id ? "Wagen bewerken" : "Nieuwe wagen toevoegen"}
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Veld label="Omschrijving">
              <input
                className={invoer}
                value={formulier.omschrijving}
                onChange={(e) => zet("omschrijving", e.target.value)}
                placeholder="bv. BEV-offerte leasingmaatschappij"
              />
            </Veld>
            <Veld label="Werknemer">
              <input
                className={invoer}
                value={formulier.werknemer ?? ""}
                onChange={(e) => zet("werknemer", e.target.value)}
              />
            </Veld>
            <Veld label="Kenteken">
              <input
                className={invoer}
                value={formulier.kenteken ?? ""}
                onChange={(e) => zet("kenteken", e.target.value)}
              />
            </Veld>
            <Veld label="Type aandrijving">
              <select
                className={invoer}
                value={formulier.voertuigtype}
                onChange={(e) => zet("voertuigtype", e.target.value as Voertuigtype)}
              >
                <option value="BEV">BEV (volledig elektrisch)</option>
                <option value="PHEV">PHEV (plug-in hybride)</option>
                <option value="HEV">HEV (hybride)</option>
                <option value="fossiel">Fossiel (diesel/benzine)</option>
              </select>
            </Veld>
            <Veld label="Brandstof (voor gramformule en referentie-CO₂)">
              <select
                className={invoer}
                value={formulier.brandstof}
                onChange={(e) => zet("brandstof", e.target.value as Brandstof)}
              >
                <option value="elektrisch">Elektrisch</option>
                <option value="diesel">Diesel</option>
                <option value="benzine">Benzine</option>
                <option value="lpg">LPG</option>
                <option value="cng">CNG</option>
              </select>
            </Veld>
            <Veld label="CO₂-uitstoot (g/km)">
              <input
                type="number"
                className={invoer}
                value={formulier.co2}
                onChange={(e) => zet("co2", Number(e.target.value))}
              />
            </Veld>
            <Veld label="Besteldatum (bepalend voor het regime)">
              <input
                type="date"
                className={invoer}
                value={formulier.besteldatum}
                onChange={(e) => zet("besteldatum", e.target.value)}
              />
            </Veld>
            <Veld label="Eerste ingebruikname">
              <input
                type="date"
                className={invoer}
                value={formulier.eerste_ingebruikname}
                onChange={(e) => zet("eerste_ingebruikname", e.target.value)}
              />
            </Veld>
            <Veld label="Cataloguswaarde (€)">
              <input
                type="number"
                className={invoer}
                value={formulier.cataloguswaarde}
                onChange={(e) => zet("cataloguswaarde", Number(e.target.value))}
              />
            </Veld>
            <Veld label="Jaarlijkse autokosten (€)">
              <input
                type="number"
                className={invoer}
                value={formulier.jaarlijkse_autokosten}
                onChange={(e) => zet("jaarlijkse_autokosten", Number(e.target.value))}
              />
            </Veld>
            <Veld label="Aankoop-/leasingprijs (€)">
              <input
                type="number"
                className={invoer}
                value={formulier.aankoopprijs ?? ""}
                onChange={(e) =>
                  zet("aankoopprijs", e.target.value === "" ? null : Number(e.target.value))
                }
              />
            </Veld>
            <Veld label="Verwacht jaarlijks kilometeraantal">
              <input
                type="number"
                className={invoer}
                value={formulier.km_per_jaar ?? ""}
                onChange={(e) =>
                  zet("km_per_jaar", e.target.value === "" ? null : Number(e.target.value))
                }
              />
            </Veld>
            <Veld label="Beroepsgebruik (%)">
              <input
                type="number"
                min={0}
                max={100}
                className={invoer}
                value={formulier.beroepsgebruik_pct}
                onChange={(e) => zet("beroepsgebruik_pct", Number(e.target.value))}
              />
            </Veld>
            <Veld label="Score operationele flexibiliteit (1-10)">
              <input
                type="number"
                min={1}
                max={10}
                className={invoer}
                value={formulier.flex_score}
                onChange={(e) => zet("flex_score", Number(e.target.value))}
              />
            </Veld>
            <Veld label="Score restwaarde na 4 jaar (1-10)">
              <input
                type="number"
                min={1}
                max={10}
                className={invoer}
                value={formulier.restwaarde_score}
                onChange={(e) => zet("restwaarde_score", Number(e.target.value))}
              />
            </Veld>
            <div className="flex items-end gap-6 pb-1">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formulier.tankkaart}
                  onChange={(e) => zet("tankkaart", e.target.checked)}
                />
                Tank-/laadkaart (40% VAA naar VU)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formulier.thuislaadpunt}
                  onChange={(e) => zet("thuislaadpunt", e.target.checked)}
                />
                Thuislaadinfrastructuur
              </label>
            </div>
          </div>
          <div className="mt-5 flex gap-3">
            <button
              onClick={bewaar}
              disabled={bezig || !formulier.omschrijving}
              className="rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
            >
              {bezig ? "Bezig…" : "Bewaren"}
            </button>
            <button
              onClick={() => setFormulier(null)}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Annuleren
            </button>
          </div>
        </section>
      )}

      <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5">Wagen</th>
              <th className="px-4 py-2.5">Type</th>
              <th className="px-4 py-2.5">Besteld</th>
              <th className="px-4 py-2.5 text-right">CO₂</th>
              <th className="px-4 py-2.5 text-right">Catalogus</th>
              <th className="px-4 py-2.5 text-right">Aftrek {EVALUATIEJAAR}</th>
              <th className="px-4 py-2.5 text-right">VAA</th>
              <th className="px-4 py-2.5 text-right">VU</th>
              <th className="px-4 py-2.5 text-right">RSZ/jaar</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {wagens.map((w) => {
              const r = ctx ? berekenJaar(ctx, w, EVALUATIEJAAR) : null;
              return (
                <tr key={w.id}>
                  <td className="px-4 py-2.5">
                    <span className="font-medium">{w.omschrijving}</span>
                    {w.werknemer && <span className="block text-xs text-slate-400">{w.werknemer}</span>}
                  </td>
                  <td className="px-4 py-2.5">{w.voertuigtype}</td>
                  <td className="px-4 py-2.5">{w.besteldatum}</td>
                  <td className="px-4 py-2.5 text-right">{w.co2} g</td>
                  <td className="px-4 py-2.5 text-right">{euro(w.cataloguswaarde)}</td>
                  <td className="px-4 py-2.5 text-right">{r ? pct(r.aftrekPct) : "…"}</td>
                  <td className="px-4 py-2.5 text-right">{r ? euro(r.vaa) : "…"}</td>
                  <td className="px-4 py-2.5 text-right font-medium">
                    {r ? euro(r.verworpenUitgaven) : "…"}
                  </td>
                  <td className="px-4 py-2.5 text-right">{r ? euro(r.rszJaar) : "…"}</td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    <button
                      onClick={() => setFormulier({ ...w })}
                      className="mr-3 text-sm font-medium text-blue-700 hover:underline"
                    >
                      Bewerk
                    </button>
                    <button
                      onClick={() => verwijder(w.id)}
                      className="text-sm font-medium text-rose-600 hover:underline"
                    >
                      Verwijder
                    </button>
                  </td>
                </tr>
              );
            })}
            {wagens.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-6 text-center text-slate-400">
                  Nog geen wagens ingevoerd.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

const invoer =
  "w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none";

function Veld({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      {children}
    </label>
  );
}
