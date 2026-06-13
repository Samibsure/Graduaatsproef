"use client";

import { useEffect, useState } from "react";
import { Badge, Card, SectionTitle, TypeDot } from "@/components/ui";
import {
  bewaarWagen,
  laadCatalogus,
  laadFiscaleContext,
  laadWagens,
  verwijderWagen,
} from "@/lib/data";
import { catalogNaarWagen } from "@/lib/fiscaal/catalog";
import { berekenJaar } from "@/lib/fiscaal/engine";
import type {
  Brandstof,
  CatalogCar,
  Categorie,
  FiscaleContext,
  Vehicle,
  Voertuigtype,
} from "@/lib/fiscaal/types";
import { euro, pct } from "@/lib/format";

const EVALUATIEJAAR = 2026;

type Formulier = Omit<Vehicle, "id"> & { id?: string };

const leegFormulier: Formulier = {
  omschrijving: "",
  werknemer: "",
  kenteken: "",
  categorie: "kandidaat",
  merk: "",
  model: "",
  catalog_id: null,
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
  const [catalogus, setCatalogus] = useState<CatalogCar[]>([]);
  const [formulier, setFormulier] = useState<Formulier | null>(null);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  const herlaad = () => laadWagens().then(setWagens);

  useEffect(() => {
    Promise.all([laadFiscaleContext(), laadWagens(), laadCatalogus()])
      .then(([c, w, k]) => {
        setCtx(c);
        setWagens(w);
        setCatalogus(k);
      })
      .catch((e) => setFout(e instanceof Error ? e.message : String(e)));
  }, []);

  const zet = <K extends keyof Formulier>(veld: K, waarde: Formulier[K]) =>
    setFormulier((f) => (f ? { ...f, [veld]: waarde } : f));

  function kiesUitCatalogus(id: string) {
    const car = catalogus.find((c) => c.id === Number(id));
    if (!car || !formulier) return;
    setFormulier({ ...catalogNaarWagen(car, EVALUATIEJAAR), categorie: formulier.categorie });
  }

  async function bewaar() {
    if (!formulier) return;
    setBezig(true);
    setFout(null);
    try {
      await bewaarWagen({
        ...formulier,
        werknemer: formulier.werknemer || null,
        kenteken: formulier.kenteken || null,
        merk: formulier.merk || null,
        model: formulier.model || null,
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
      <SectionTitle
        sub="Identificatie, technische gegevens, financieel en beleid per wagen, cf. Bijlage 4 van het rapport. Berekende cijfers gelden voor gebruiksjaar 2026."
        action={
          <button
            onClick={() => setFormulier({ ...leegFormulier })}
            className="rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-ink-700"
          >
            + Nieuwe wagen
          </button>
        }
      >
        Mijn wagens
      </SectionTitle>

      {fout && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{fout}</p>}

      {formulier && (
        <Card className="border-gold/40 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-ink">
              {formulier.id ? "Wagen bewerken" : "Nieuwe wagen toevoegen"}
            </h2>
          </div>

          {!formulier.id && (
            <div className="mt-4 rounded-xl bg-paper p-4">
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-medium text-slate-500">
                  Snel starten: kies een model uit de catalogus (vult de technische velden voor)
                </span>
                <select
                  className={invoer}
                  defaultValue=""
                  onChange={(e) => kiesUitCatalogus(e.target.value)}
                >
                  <option value="" disabled>
                    Selecteer een model…
                  </option>
                  {catalogus.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.merk} {c.model} · {c.voertuigtype} · {euro(c.cataloguswaarde)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Veld label="Omschrijving">
              <input className={invoer} value={formulier.omschrijving} onChange={(e) => zet("omschrijving", e.target.value)} placeholder="bv. Offerte BMW iX1 – juni" />
            </Veld>
            <Veld label="Categorie">
              <select className={invoer} value={formulier.categorie} onChange={(e) => zet("categorie", e.target.value as Categorie)}>
                <option value="kandidaat">Kandidaat (offerte)</option>
                <option value="vloot">Huidige vloot</option>
              </select>
            </Veld>
            <Veld label="Werknemer">
              <input className={invoer} value={formulier.werknemer ?? ""} onChange={(e) => zet("werknemer", e.target.value)} />
            </Veld>
            <Veld label="Merk">
              <input className={invoer} value={formulier.merk ?? ""} onChange={(e) => zet("merk", e.target.value)} />
            </Veld>
            <Veld label="Model">
              <input className={invoer} value={formulier.model ?? ""} onChange={(e) => zet("model", e.target.value)} />
            </Veld>
            <Veld label="Kenteken">
              <input className={invoer} value={formulier.kenteken ?? ""} onChange={(e) => zet("kenteken", e.target.value)} />
            </Veld>
            <Veld label="Type aandrijving">
              <select className={invoer} value={formulier.voertuigtype} onChange={(e) => zet("voertuigtype", e.target.value as Voertuigtype)}>
                <option value="BEV">BEV (volledig elektrisch)</option>
                <option value="PHEV">PHEV (plug-in hybride)</option>
                <option value="HEV">HEV (hybride)</option>
                <option value="fossiel">Fossiel (diesel/benzine)</option>
              </select>
            </Veld>
            <Veld label="Brandstof">
              <select className={invoer} value={formulier.brandstof} onChange={(e) => zet("brandstof", e.target.value as Brandstof)}>
                <option value="elektrisch">Elektrisch</option>
                <option value="diesel">Diesel</option>
                <option value="benzine">Benzine</option>
                <option value="lpg">LPG</option>
                <option value="cng">CNG</option>
              </select>
            </Veld>
            <Veld label="CO₂-uitstoot (g/km)">
              <input type="number" className={invoer} value={formulier.co2} onChange={(e) => zet("co2", Number(e.target.value))} />
            </Veld>
            <Veld label="Besteldatum (bepalend voor het regime)">
              <input type="date" className={invoer} value={formulier.besteldatum} onChange={(e) => zet("besteldatum", e.target.value)} />
            </Veld>
            <Veld label="Eerste ingebruikname">
              <input type="date" className={invoer} value={formulier.eerste_ingebruikname} onChange={(e) => zet("eerste_ingebruikname", e.target.value)} />
            </Veld>
            <Veld label="Cataloguswaarde (€)">
              <input type="number" className={invoer} value={formulier.cataloguswaarde} onChange={(e) => zet("cataloguswaarde", Number(e.target.value))} />
            </Veld>
            <Veld label="Jaarlijkse autokosten (€)">
              <input type="number" className={invoer} value={formulier.jaarlijkse_autokosten} onChange={(e) => zet("jaarlijkse_autokosten", Number(e.target.value))} />
            </Veld>
            <Veld label="Aankoop-/leasingprijs (€)">
              <input type="number" className={invoer} value={formulier.aankoopprijs ?? ""} onChange={(e) => zet("aankoopprijs", e.target.value === "" ? null : Number(e.target.value))} />
            </Veld>
            <Veld label="Verwacht jaarlijks kilometeraantal">
              <input type="number" className={invoer} value={formulier.km_per_jaar ?? ""} onChange={(e) => zet("km_per_jaar", e.target.value === "" ? null : Number(e.target.value))} />
            </Veld>
            <Veld label="Beroepsgebruik (%)">
              <input type="number" min={0} max={100} className={invoer} value={formulier.beroepsgebruik_pct} onChange={(e) => zet("beroepsgebruik_pct", Number(e.target.value))} />
            </Veld>
            <Veld label="Score operationele flexibiliteit (1-10)">
              <input type="number" min={1} max={10} className={invoer} value={formulier.flex_score} onChange={(e) => zet("flex_score", Number(e.target.value))} />
            </Veld>
            <Veld label="Score restwaarde na 4 jaar (1-10)">
              <input type="number" min={1} max={10} className={invoer} value={formulier.restwaarde_score} onChange={(e) => zet("restwaarde_score", Number(e.target.value))} />
            </Veld>
            <div className="flex items-end gap-6 pb-1">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={formulier.tankkaart} onChange={(e) => zet("tankkaart", e.target.checked)} />
                Tank-/laadkaart (40% VAA → VU)
              </label>
            </div>
            <div className="flex items-end gap-6 pb-1">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={formulier.thuislaadpunt} onChange={(e) => zet("thuislaadpunt", e.target.checked)} />
                Thuislaadinfrastructuur
              </label>
            </div>
          </div>

          <div className="mt-5 flex gap-3">
            <button onClick={bewaar} disabled={bezig || !formulier.omschrijving} className="rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-ink-700 disabled:opacity-50">
              {bezig ? "Bezig…" : "Bewaren"}
            </button>
            <button onClick={() => setFormulier(null)} className="rounded-xl border border-line px-4 py-2 text-sm font-medium hover:bg-slate-50">
              Annuleren
            </button>
          </div>
        </Card>
      )}

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-paper text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5">Wagen</th>
              <th className="px-4 py-2.5">Categorie</th>
              <th className="px-4 py-2.5">Besteld</th>
              <th className="px-4 py-2.5 text-right">CO₂</th>
              <th className="px-4 py-2.5 text-right">Catalogus</th>
              <th className="px-4 py-2.5 text-right">Aftrek 2026</th>
              <th className="px-4 py-2.5 text-right">VAA</th>
              <th className="px-4 py-2.5 text-right">VU</th>
              <th className="px-4 py-2.5 text-right">RSZ/jaar</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {wagens.map((w) => {
              const r = ctx ? berekenJaar(ctx, w, EVALUATIEJAAR) : null;
              return (
                <tr key={w.id}>
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-2 font-medium text-ink">
                      <TypeDot type={w.voertuigtype} />
                      {w.omschrijving}
                    </span>
                    {w.werknemer && <span className="block pl-4 text-xs text-slate-400">{w.werknemer}</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge tint={w.categorie === "vloot" ? "ink" : "gold"}>{w.categorie}</Badge>
                  </td>
                  <td className="px-4 py-2.5">{w.besteldatum}</td>
                  <td className="px-4 py-2.5 text-right">{w.co2} g</td>
                  <td className="px-4 py-2.5 text-right">{euro(w.cataloguswaarde)}</td>
                  <td className="px-4 py-2.5 text-right">{r ? pct(r.aftrekPct) : "…"}</td>
                  <td className="px-4 py-2.5 text-right">{r ? euro(r.vaa) : "…"}</td>
                  <td className="px-4 py-2.5 text-right font-medium">{r ? euro(r.verworpenUitgaven) : "…"}</td>
                  <td className="px-4 py-2.5 text-right">{r ? euro(r.rszJaar) : "…"}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-right">
                    <button onClick={() => setFormulier({ ...w })} className="mr-3 text-sm font-medium text-ink hover:text-gold">
                      Bewerk
                    </button>
                    <button onClick={() => verwijder(w.id)} className="text-sm font-medium text-rose-600 hover:underline">
                      Verwijder
                    </button>
                  </td>
                </tr>
              );
            })}
            {wagens.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                  Nog geen wagens. Voeg er toe vanuit de catalogus of via “Nieuwe wagen”.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

const invoer =
  "w-full rounded-lg border border-line px-3 py-1.5 text-sm focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold";

function Veld({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      {children}
    </label>
  );
}
