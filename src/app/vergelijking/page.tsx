"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import AdviesBadge from "@/components/AdviesBadge";
import CarImage from "@/components/CarImage";
import { Badge, Card, SectionTitle } from "@/components/ui";
import { bewaarEvaluatie, laadCatalogus, laadEvaluaties, laadFiscaleContext, laadWagens, type Evaluatie } from "@/lib/data";
import { berekenProjectie } from "@/lib/fiscaal/engine";
import { CRITERIA, scoreVergelijking } from "@/lib/fiscaal/scoring";
import type { CatalogCar, FiscaleContext, Projectie, Vehicle } from "@/lib/fiscaal/types";
import { euro, getal, pct } from "@/lib/format";

const MAX_KANDIDATEN = 3;
const JAREN = [2025, 2026, 2027, 2028, 2029, 2030];

const adviesKleur: Record<string, string> = {
  aanvaarden: "#059669",
  overwegen: "#d97706",
  afwijzen: "#e11d48",
};

export default function VergelijkingPagina() {
  const [ctx, setCtx] = useState<FiscaleContext | null>(null);
  const [wagens, setWagens] = useState<Vehicle[]>([]);
  const [catalogus, setCatalogus] = useState<CatalogCar[]>([]);
  const [geselecteerd, setGeselecteerd] = useState<string[]>([]);
  const [startjaar, setStartjaar] = useState(2026);
  const [kmoTarief, setKmoTarief] = useState(false);
  const [evaluaties, setEvaluaties] = useState<Evaluatie[]>([]);
  const [titel, setTitel] = useState("");
  const [notitie, setNotitie] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [bewaard, setBewaard] = useState(false);

  useEffect(() => {
    Promise.all([laadFiscaleContext(), laadWagens(), laadEvaluaties(), laadCatalogus()])
      .then(([c, w, e, k]) => {
        setCtx(c);
        setWagens(w);
        setEvaluaties(e);
        setCatalogus(k);
        setGeselecteerd(w.slice(0, MAX_KANDIDATEN).map((v) => v.id));
      })
      .catch((e) => setFout(e instanceof Error ? e.message : String(e)));
  }, []);

  const kandidaten = wagens.filter((w) => geselecteerd.includes(w.id));

  const { projecties, scores } = useMemo(() => {
    if (!ctx || kandidaten.length === 0) return { projecties: [], scores: [] };
    const projecties = kandidaten.map((w) => berekenProjectie(ctx, w, startjaar, 4, { kmoTarief }));
    return { projecties, scores: scoreVergelijking(projecties) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx, wagens, geselecteerd, startjaar, kmoTarief]);

  function wissel(id: string) {
    setBewaard(false);
    setGeselecteerd((sel) =>
      sel.includes(id)
        ? sel.filter((s) => s !== id)
        : sel.length >= MAX_KANDIDATEN
          ? sel
          : [...sel, id],
    );
  }

  async function bewaarBeslissing() {
    if (scores.length === 0) return;
    setBezig(true);
    setFout(null);
    try {
      const winnaar = [...scores].sort((a, b) => b.eindscore - a.eindscore)[0];
      await bewaarEvaluatie({
        titel: titel || `Vergelijking ${new Date().toLocaleDateString("nl-BE")}`,
        vehicle_ids: geselecteerd,
        resultaten: scores,
        aanbeveling: `${winnaar.omschrijving}: ${winnaar.advies} (${getal(winnaar.eindscore)}/10)`,
        notitie: notitie || null,
      });
      setTitel("");
      setNotitie("");
      setBewaard(true);
      setEvaluaties(await laadEvaluaties());
    } catch (e) {
      setFout(e instanceof Error ? e.message : String(e));
    } finally {
      setBezig(false);
    }
  }

  const winnaar =
    scores.length > 0 ? [...scores].sort((a, b) => b.eindscore - a.eindscore)[0] : null;
  const winnaarWagen = winnaar ? kandidaten.find((w) => w.id === winnaar.vehicleId) ?? null : null;
  const winnaarCatalog = winnaarWagen
    ? catalogus.find((c) => c.id === winnaarWagen.catalog_id) ?? null
    : null;

  return (
    <div className="space-y-6">
      <SectionTitle
        sub="Selecteer maximaal drie kandidaten. De tool berekent het volledige fiscale plaatje over vier gebruiksjaren en past de scoringsmatrix uit het rapport toe."
        action={
          scores.length > 0 ? (
            <button
              onClick={() => window.print()}
              className="rounded-xl border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-paper"
            >
              Print / export PDF
            </button>
          ) : null
        }
      >
        Scoredashboard
      </SectionTitle>

      {fout && <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{fout}</p>}

      {winnaar && winnaarWagen && (
        <Card className="flex flex-col items-center gap-5 overflow-hidden border-gold/40 sm:flex-row">
          <CarImage
            type={winnaarWagen.voertuigtype}
            segment={winnaarCatalog?.segment ?? null}
            imageUrl={winnaarCatalog?.image_url}
            alt={winnaar.omschrijving}
            className="h-32 w-full shrink-0 object-cover sm:w-56"
          />
          <div className="flex-1 px-5 pb-5 pt-0 sm:py-5 sm:pl-0">
            <Badge tint="gold">Aanbevolen keuze</Badge>
            <h2 className="mt-2 text-xl font-bold text-ink">{winnaar.omschrijving}</h2>
            <p className="mt-1 text-sm text-slate-600">
              Hoogste eindscore met advies <span className="font-semibold">{winnaar.advies}</span>.
            </p>
          </div>
          <div className="px-5 pb-5 text-center sm:py-5 sm:pr-8">
            <p className="text-4xl font-bold text-ink">{getal(winnaar.eindscore)}</p>
            <p className="text-xs uppercase tracking-wide text-slate-500">eindscore / 10</p>
          </div>
        </Card>
      )}

      <section className="rounded-xl border border-line bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold">Kandidaten ({kandidaten.length}/{MAX_KANDIDATEN})</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {wagens.map((w) => {
                const actief = geselecteerd.includes(w.id);
                return (
                  <button
                    key={w.id}
                    onClick={() => wissel(w.id)}
                    className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                      actief
                        ? "border-ink bg-ink text-white"
                        : "border-line text-slate-600 hover:bg-paper"
                    }`}
                  >
                    {w.omschrijving}
                  </button>
                );
              })}
              {wagens.length === 0 && (
                <p className="text-sm text-slate-400">Voeg eerst wagens toe via “Wagens”.</p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <label className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">Eerste gebruiksjaar</span>
              <select
                className="rounded-lg border border-line px-2 py-1.5"
                value={startjaar}
                onChange={(e) => setStartjaar(Number(e.target.value))}
              >
                {JAREN.map((j) => (
                  <option key={j} value={j}>
                    {j}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={kmoTarief}
                onChange={(e) => setKmoTarief(e.target.checked)}
              />
              Verlaagd KMO-tarief (20%)
            </label>
          </div>
        </div>
      </section>

      {projecties.length > 0 && (
        <>
          <section className="overflow-x-auto rounded-xl border border-line bg-white">
            <h2 className="px-5 pt-4 font-semibold">
              Fiscale vergelijking · gebruiksjaar {startjaar} (cf. Tabel 4 van het rapport)
            </h2>
            <table className="mt-3 w-full text-sm">
              <thead className="border-y border-line bg-paper text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-2.5">Parameter</th>
                  {projecties.map((p) => (
                    <th key={p.vehicle.id} className="px-5 py-2.5 text-right">
                      {p.vehicle.omschrijving}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(
                  [
                    ["Cataloguswaarde", (p) => euro(p.vehicle.cataloguswaarde)],
                    ["CO₂-uitstoot", (p) => `${p.vehicle.co2} g/km`],
                    ["Aftrekbaarheid VenB", (p) => pct(p.jaren[0].aftrekPct)],
                    ["Jaarlijkse autokosten", (p) => euro(p.vehicle.jaarlijkse_autokosten)],
                    ["Niet-aftrekbaar deel", (p) => euro(p.jaren[0].nietAftrekbaar)],
                    ["VAA per jaar", (p) => euro(p.jaren[0].vaa)],
                    ["Verworpen uitgaven", (p) => euro(p.jaren[0].verworpenUitgaven)],
                    [`Extra VenB (${kmoTarief ? "20" : "25"}%)`, (p) => euro(p.jaren[0].extraVenB)],
                    ["CO₂-bijdrage RSZ / jaar", (p) => euro(p.jaren[0].rszJaar)],
                    ["Fiscale meerkost / jaar", (p) => euro(p.jaren[0].fiscaleMeerkost)],
                    ["Totale kost over 4 jaar", (p) => euro(p.totaleKost)],
                    ["Verworpen uitgaven over 4 jaar", (p) => euro(p.totaleVU)],
                  ] as Array<[string, (p: Projectie) => string]>
                ).map(([label, fn]) => (
                  <tr key={label}>
                    <td className="px-5 py-2.5 font-medium">{label}</td>
                    {projecties.map((p) => (
                      <td key={p.vehicle.id} className="px-5 py-2.5 text-right">
                        {fn(p)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="px-5 py-3 text-xs text-slate-400">
              Verworpen uitgaven = (1 − aftrek%) × autokosten + (17% zonder / 40% met tank- of
              laadkaart) × VAA. De meerjarencijfers passen de uitdoofkalender per gebruiksjaar toe.
            </p>
          </section>

          <section className="overflow-x-auto rounded-xl border border-line bg-white">
            <h2 className="px-5 pt-4 font-semibold">
              Detail per gebruiksjaar ({startjaar}–{startjaar + 3})
            </h2>
            <table className="mt-3 w-full text-sm">
              <thead className="border-y border-line bg-paper text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-2.5">Wagen</th>
                  {projecties[0].jaren.map((j) => (
                    <th key={j.gebruiksjaar} className="px-5 py-2.5 text-right">
                      {j.gebruiksjaar}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {projecties.map((p) => (
                  <tr key={p.vehicle.id}>
                    <td className="px-5 py-2.5 font-medium">{p.vehicle.omschrijving}</td>
                    {p.jaren.map((j) => (
                      <td key={j.gebruiksjaar} className="px-5 py-2.5 text-right">
                        <span className="block">{euro(j.verworpenUitgaven)}</span>
                        <span className="block text-xs text-slate-400">
                          aftrek {pct(j.aftrekPct)}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="px-5 py-3 text-xs text-slate-400">
              Verworpen uitgaven per gebruiksjaar, met telkens de geldende aftrekbaarheid.
            </p>
          </section>

          <section className="rounded-xl border border-line bg-white">
            <h2 className="px-5 pt-4 font-semibold">
              Scoringsmatrix (cf. Tabel 5 van het rapport)
            </h2>
            <div className="overflow-x-auto">
              <table className="mt-3 w-full text-sm">
                <thead className="border-y border-line bg-paper text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-2.5">Criterium</th>
                    <th className="px-5 py-2.5 text-right">Weging</th>
                    {scores.map((s) => (
                      <th key={s.vehicleId} className="px-5 py-2.5 text-right">
                        {s.omschrijving}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {CRITERIA.map((c) => (
                    <tr key={c.code} title={c.toelichting}>
                      <td className="px-5 py-2.5 font-medium">{c.naam}</td>
                      <td className="px-5 py-2.5 text-right">{pct(c.weging * 100)}</td>
                      {scores.map((s) => (
                        <td key={s.vehicleId} className="px-5 py-2.5 text-right">
                          {getal(s.scores[c.code])}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr className="bg-gold/10 font-semibold">
                    <td className="px-5 py-2.5">Gewogen eindscore (op 10)</td>
                    <td className="px-5 py-2.5 text-right">100%</td>
                    {scores.map((s) => (
                      <td key={s.vehicleId} className="px-5 py-2.5 text-right text-base">
                        {getal(s.eindscore)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-5 py-2.5 font-medium">Aanbeveling</td>
                    <td />
                    {scores.map((s) => (
                      <td key={s.vehicleId} className="px-5 py-2.5 text-right">
                        <AdviesBadge advies={s.advies} />
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="h-64 px-5 pb-5 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scores.map((s) => ({ naam: s.omschrijving, score: s.eindscore, advies: s.advies }))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="naam" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => [`${getal(Number(v))}/10`, "Eindscore"]} />
                  <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                    {scores.map((s) => (
                      <Cell key={s.vehicleId} fill={adviesKleur[s.advies]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-xl border border-line bg-white p-5">
            <h2 className="font-semibold">Beslissing bewaren</h2>
            <p className="mt-1 text-sm text-slate-500">
              Bewaar deze vergelijking als onderbouwing voor de directievergadering.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <input
                className="rounded-lg border border-line px-3 py-1.5 text-sm"
                placeholder="Titel (bv. Vervanging wagen X – juni 2026)"
                value={titel}
                onChange={(e) => setTitel(e.target.value)}
              />
              <input
                className="rounded-lg border border-line px-3 py-1.5 text-sm"
                placeholder="Notitie / motivering (optioneel)"
                value={notitie}
                onChange={(e) => setNotitie(e.target.value)}
              />
            </div>
            <button
              onClick={bewaarBeslissing}
              disabled={bezig}
              className="mt-3 rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-ink-700 disabled:opacity-50"
            >
              {bezig ? "Bezig…" : "Bewaar beslissing"}
            </button>
            {bewaard && (
              <span className="ml-3 text-sm font-medium text-emerald-700">Bewaard ✓</span>
            )}
          </section>
        </>
      )}

      {evaluaties.length > 0 && (
        <section className="rounded-xl border border-line bg-white">
          <h2 className="px-5 pt-4 font-semibold">Beslissingshistoriek</h2>
          <ul className="mt-2 divide-y divide-slate-100">
            {evaluaties.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
                <div>
                  <p className="font-medium">{e.titel}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(e.created_at).toLocaleString("nl-BE")}
                    {e.notitie ? ` · ${e.notitie}` : ""}
                  </p>
                </div>
                <span className="text-sm text-slate-600">{e.aanbeveling}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
