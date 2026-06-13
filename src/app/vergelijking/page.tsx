"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import CarImage from "@/components/CarImage";
import Icon from "@/components/Icon";
import { Container, Eyebrow } from "@/components/ui";
import {
  bewaarEvaluatie,
  laadCatalogus,
  laadEvaluaties,
  laadFiscaleContext,
  laadWagens,
  type Evaluatie,
} from "@/lib/data";
import { berekenProjectie } from "@/lib/fiscaal/engine";
import { CRITERIA, scoreVergelijking } from "@/lib/fiscaal/scoring";
import type { CatalogCar, FiscaleContext, Vehicle } from "@/lib/fiscaal/types";
import { euro, getal, pct } from "@/lib/format";

const MAX_KANDIDATEN = 3;
const JAREN = [2025, 2026, 2027, 2028, 2029, 2030];

type Metric = "tco" | "vaa" | "aftrek";

export default function VergelijkingPagina() {
  const [ctx, setCtx] = useState<FiscaleContext | null>(null);
  const [wagens, setWagens] = useState<Vehicle[]>([]);
  const [catalogus, setCatalogus] = useState<CatalogCar[]>([]);
  const [geselecteerd, setGeselecteerd] = useState<string[]>([]);
  const [startjaar, setStartjaar] = useState(2026);
  const [kmoTarief, setKmoTarief] = useState(false);
  const [metric, setMetric] = useState<Metric>("tco");
  const [evaluaties, setEvaluaties] = useState<Evaluatie[]>([]);
  const [titel, setTitel] = useState("");
  const [notitie, setNotitie] = useState("");
  const [bezig, setBezig] = useState(false);
  const [bewaard, setBewaard] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

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

  // Bouw per kandidaat een rijke weergave op basis van de echte rekenkern.
  const cmp = projecties.map((p) => {
    const j0 = p.jaren[0];
    const score = scores.find((s) => s.vehicleId === p.vehicle.id);
    const cat = catalogus.find((c) => c.id === p.vehicle.catalog_id) ?? null;
    return {
      id: p.vehicle.id,
      name: p.vehicle.omschrijving,
      type: p.vehicle.voertuigtype,
      cat,
      cataloguswaarde: p.vehicle.cataloguswaarde,
      aftrekPct: j0.aftrekPct,
      vaa: j0.vaa,
      co2: p.vehicle.co2,
      verworpen: j0.verworpenUitgaven,
      rsz: j0.rszJaar,
      tco4: p.totaleKost,
      tcoM: p.totaleKost / 48,
      eindscore: score?.eindscore ?? 0,
      advies: score?.advies ?? "overwegen",
      scores: score?.scores ?? {},
    };
  });

  const winner = cmp.slice().sort((a, b) => b.eindscore - a.eindscore)[0] ?? null;

  // Vergelijkingstabel-rijen met "beste waarde"-detectie.
  const rowsDef: Array<{ label: string; get: (c: (typeof cmp)[number]) => number; fmt: (c: (typeof cmp)[number]) => string; best: "min" | "max" | "none" }> = [
    { label: "Cataloguswaarde", get: (c) => c.cataloguswaarde, fmt: (c) => euro(c.cataloguswaarde), best: "min" },
    { label: "Fiscale aftrek", get: (c) => c.aftrekPct, fmt: (c) => pct(c.aftrekPct), best: "max" },
    { label: "Voordeel alle aard / jaar", get: (c) => c.vaa, fmt: (c) => euro(c.vaa), best: "min" },
    { label: "CO₂-uitstoot", get: (c) => c.co2, fmt: (c) => `${c.co2} g/km`, best: "min" },
    { label: "Verworpen uitgaven / jaar", get: (c) => c.verworpen, fmt: (c) => euro(c.verworpen), best: "min" },
    { label: "RSZ-bijdrage / jaar", get: (c) => c.rsz, fmt: (c) => euro(c.rsz), best: "min" },
    { label: "Totale kost / maand", get: (c) => c.tcoM, fmt: (c) => euro(c.tcoM), best: "min" },
  ];

  function bestIndex(get: (c: (typeof cmp)[number]) => number, best: "min" | "max" | "none") {
    if (best === "none" || cmp.length === 0) return -1;
    const vals = cmp.map(get);
    const t = best === "min" ? Math.min(...vals) : Math.max(...vals);
    return vals.indexOf(t);
  }

  let winnerBest = 0;
  rowsDef.forEach((r) => {
    const bi = bestIndex(r.get, r.best);
    if (bi >= 0 && winner && cmp[bi].id === winner.id) winnerBest++;
  });

  const typeWoord = winner
    ? winner.type === "BEV"
      ? "volledig elektrische"
      : winner.type === "PHEV"
        ? "plug-in hybride"
        : winner.type === "HEV"
          ? "hybride"
          : "fossiele"
    : "";

  // Grafiekdata.
  const metricDefs: Record<Metric, { label: string; get: (c: (typeof cmp)[number]) => number; best: "min" | "max"; fmt: (v: number) => string }> = {
    tco: { label: "Totale kost per maand", get: (c) => c.tcoM, best: "min", fmt: (v) => euro(v) },
    vaa: { label: "Voordeel alle aard per jaar", get: (c) => c.vaa, best: "min", fmt: (v) => euro(v) },
    aftrek: { label: "Fiscale aftrekbaarheid", get: (c) => c.aftrekPct, best: "max", fmt: (v) => pct(v) },
  };

  async function bewaarBeslissing() {
    if (scores.length === 0 || !winner) return;
    setBezig(true);
    setFout(null);
    try {
      await bewaarEvaluatie({
        titel: titel || `Vergelijking ${new Date().toLocaleDateString("nl-BE")}`,
        vehicle_ids: geselecteerd,
        resultaten: scores,
        aanbeveling: `${winner.name}: ${winner.advies} (${getal(winner.eindscore)}/10)`,
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

  return (
    <Container className="pb-[90px] pt-[52px]">
      {/* Kop */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
        <div>
          <Eyebrow>Vergelijking · {cmp.length} wagens</Eyebrow>
          <h1 className="m-0 mb-2.5 text-[clamp(30px,4vw,46px)] font-bold tracking-[-0.02em]">
            Het scoredashboard
          </h1>
          <p className="m-0 max-w-[42em] text-[16.5px] text-ink-700">
            Een onderbouwde rangschikking op basis van fiscale aftrek, voordeel alle aard, totale
            kost en milieu-impact.
          </p>
        </div>
        <div className="bs-no-print flex gap-3">
          <Link
            href="/catalogus"
            className="inline-flex h-[46px] items-center gap-2 rounded-[11px] border-[1.5px] border-line bg-white px-5 text-[14.5px] font-bold text-ink transition-colors hover:border-ink"
          >
            <Icon name="sliders-horizontal" size={17} />
            Pas selectie aan
          </Link>
          <button
            onClick={() => window.print()}
            className="inline-flex h-[46px] items-center gap-2 rounded-[11px] bg-ink px-5 text-[14.5px] font-bold text-white transition-colors hover:bg-ink-600"
          >
            <Icon name="printer" size={17} />
            Print / PDF
          </button>
        </div>
      </div>

      {fout && <p className="mb-6 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{fout}</p>}

      {/* Bedieningsbalk: kandidaten + jaar + KMO */}
      <div className="bs-no-print mb-10 rounded-[14px] border border-line bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2.5 text-[13px] font-bold text-ink">
              Kandidaten ({kandidaten.length}/{MAX_KANDIDATEN})
            </div>
            <div className="flex flex-wrap gap-2">
              {wagens.map((w) => (
                <button
                  key={w.id}
                  onClick={() => wissel(w.id)}
                  data-active={geselecteerd.includes(w.id)}
                  className="bs-chip cursor-pointer rounded-full px-3.5 py-1.5 text-[13.5px] font-bold transition-all"
                >
                  {w.omschrijving}
                </button>
              ))}
              {wagens.length === 0 && (
                <p className="m-0 text-sm text-ink-500">
                  Voeg eerst wagens toe via de{" "}
                  <Link href="/catalogus" className="font-bold text-ink underline">
                    catalogus
                  </Link>
                  .
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-5 text-[14px]">
            <label className="flex items-center gap-2">
              <span className="text-[12px] font-bold text-ink-500">Eerste gebruiksjaar</span>
              <select
                value={startjaar}
                onChange={(e) => setStartjaar(Number(e.target.value))}
                className="bs-inp h-[40px] rounded-[10px] px-2.5"
              >
                {JAREN.map((j) => (
                  <option key={j} value={j}>
                    {j}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex cursor-pointer items-center gap-2 font-medium text-ink-700">
              <input type="checkbox" checked={kmoTarief} onChange={(e) => setKmoTarief(e.target.checked)} />
              Verlaagd KMO-tarief (20%)
            </label>
          </div>
        </div>
      </div>

      {cmp.length === 0 ? (
        <div className="rounded-[14px] border border-line bg-paper p-12 text-center">
          <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full border border-line bg-white text-ink-500">
            <Icon name="scale" size={26} />
          </span>
          <p className="m-0 text-[16px] text-ink-700">
            Selecteer minstens één kandidaat om de vergelijking te zien.
          </p>
        </div>
      ) : (
        <>
          {/* WINNAAR-BANNER */}
          {winner && (
            <div className="relative mb-10 overflow-hidden rounded-[18px] bg-ink">
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "radial-gradient(120% 140% at 100% 0%, rgba(174,154,100,0.18), transparent 55%)",
                }}
              />
              <div className="relative flex flex-wrap items-center justify-between gap-8 p-9">
                <div className="flex items-center gap-6">
                  <div className="h-[88px] w-[132px] flex-none overflow-hidden rounded-[16px] border border-gold-line bg-white/[0.05]">
                    <CarImage
                      type={winner.type}
                      segment={winner.cat?.segment ?? null}
                      imageUrl={winner.cat?.image_url}
                      alt={winner.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="mb-2 text-[12px] font-bold uppercase tracking-[0.16em] text-gold">
                      Beste keuze · {winner.advies}
                    </div>
                    <div className="text-[30px] font-bold leading-[1.1] tracking-[-0.01em] text-white">
                      {winner.name}
                    </div>
                    <div className="mt-2 max-w-[38em] text-[15px] text-white/70">
                      Beste totaalscore op {winnerBest} van {rowsDef.length} kerncijfers. Een{" "}
                      {typeWoord} keuze met de scherpste fiscale balans.
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-[30px]">
                  <div className="text-center">
                    <div className="text-[56px] font-bold leading-none tracking-[-0.02em] text-gold">
                      {getal(winner.eindscore)}
                    </div>
                    <div className="mt-1.5 text-[11px] uppercase tracking-[0.14em] text-white/55">
                      Score / 10
                    </div>
                  </div>
                  <div className="flex flex-col gap-3.5 border-l border-white/[0.12] pl-[30px]">
                    <div>
                      <div className="text-[12px] text-white/55">Fiscale aftrek</div>
                      <div className="text-[18px] font-bold text-white">{pct(winner.aftrekPct)}</div>
                    </div>
                    <div>
                      <div className="text-[12px] text-white/55">Totale kost / maand</div>
                      <div className="text-[18px] font-bold text-white">{euro(winner.tcoM)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VERGELIJKINGSTABEL */}
          <div className="mb-11">
            <h2 className="m-0 mb-[18px] text-[22px] font-bold">Fiscale kerncijfers naast elkaar</h2>
            <div className="overflow-hidden rounded-[14px] border border-line">
              <div className="bs-cmp-scroll">
                <table className="bs-cmp-table w-full text-[15px]">
                  <thead>
                    <tr>
                      <th className="bs-sticky-col min-w-[200px] border-b border-line px-5 py-[18px] text-left align-bottom text-[12px] font-bold uppercase tracking-[0.1em] text-ink-500">
                        Criterium
                      </th>
                      {cmp.map((c) => (
                        <th
                          key={c.id}
                          data-win={winner?.id === c.id}
                          className="min-w-[150px] border-b border-line px-5 py-4 text-left"
                        >
                          <div className="text-[16px] font-bold text-ink">{c.name}</div>
                          <div className="mt-0.5 text-[12.5px] text-ink-500">{c.type}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rowsDef.map((r) => {
                      const bi = bestIndex(r.get, r.best);
                      return (
                        <tr key={r.label} className="border-b border-line last:border-0">
                          <td className="bs-sticky-col px-5 py-[15px] font-bold text-ink-700">
                            {r.label}
                          </td>
                          {cmp.map((c, i) => (
                            <td key={c.id} data-win={winner?.id === c.id} className="px-5 py-[15px]">
                              <span className="inline-flex items-center gap-2">
                                <span className="font-bold text-ink">{r.fmt(c)}</span>
                                {i === bi && (
                                  <span className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full bg-gold text-white">
                                    <Icon name="check" size={12} />
                                  </span>
                                )}
                              </span>
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-[13px] text-ink-500">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-gold text-white">
                <Icon name="check" size={11} />
              </span>
              Gunstigste waarde per criterium
            </div>
          </div>

          {/* SCORINGSMATRIX */}
          <div className="mb-11">
            <h2 className="m-0 mb-[18px] text-[22px] font-bold">Scoringsmatrix</h2>
            <div className="overflow-hidden rounded-[14px] border border-line">
              <div className="bs-cmp-scroll">
                <table className="bs-cmp-table w-full text-[15px]">
                  <thead>
                    <tr>
                      <th className="bs-sticky-col min-w-[220px] border-b border-line px-5 py-4 text-left text-[12px] font-bold uppercase tracking-[0.1em] text-ink-500">
                        Criterium <span className="font-normal normal-case tracking-normal">· gewicht</span>
                      </th>
                      {cmp.map((c) => (
                        <th
                          key={c.id}
                          data-win={winner?.id === c.id}
                          className="min-w-[160px] border-b border-line px-5 py-4 text-left text-[15px] font-bold text-ink"
                        >
                          {c.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {CRITERIA.map((cr) => {
                      const vals = cmp.map((c) => c.scores[cr.code] ?? 0);
                      const max = Math.max(...vals);
                      return (
                        <tr key={cr.code} className="border-b border-line">
                          <td className="bs-sticky-col px-5 py-4 text-ink-700">
                            <span className="font-bold">{cr.naam}</span>{" "}
                            <span className="text-[13px] text-ink-500">· {Math.round(cr.weging * 100)}%</span>
                          </td>
                          {cmp.map((c) => {
                            const s = c.scores[cr.code] ?? 0;
                            return (
                              <td key={c.id} data-win={winner?.id === c.id} className="px-5 py-4">
                                <div className="flex items-center gap-2.5">
                                  <span className="w-[30px] flex-none font-bold text-ink">
                                    {getal(s)}
                                  </span>
                                  <span className="h-[7px] flex-1 overflow-hidden rounded-full" style={{ background: "var(--grey-200)", minWidth: 50 }}>
                                    <span
                                      className="block h-full rounded-full bg-ink"
                                      style={{ width: `${(s / 10) * 100}%`, opacity: s === max ? 1 : 0.55 }}
                                    />
                                  </span>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                    <tr style={{ background: "var(--paper)" }}>
                      <td className="bs-sticky-col px-5 py-[18px] text-[16px] font-bold text-ink" style={{ background: "var(--paper)" }}>
                        Eindscore
                      </td>
                      {cmp.map((c) => (
                        <td key={c.id} data-win={winner?.id === c.id} className="px-5 py-[18px]">
                          <span className="inline-flex items-center gap-2.5">
                            <span className="text-[24px] font-bold tracking-[-0.01em] text-ink">
                              {getal(c.eindscore)}
                            </span>
                            {winner?.id === c.id && (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-soft px-2.5 py-1 text-[11.5px] font-bold text-ink">
                                <Icon name="award" size={12} />
                                Winnaar
                              </span>
                            )}
                          </span>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* GRAFIEK */}
          <div className="mb-11">
            <div className="mb-[18px] flex flex-wrap items-end justify-between gap-5">
              <div>
                <h2 className="m-0 mb-1 text-[22px] font-bold">{metricDefs[metric].label}</h2>
                <p className="m-0 text-[14px] text-ink-500">De gulden balk markeert de gunstigste waarde.</p>
              </div>
              <div className="bs-no-print inline-flex overflow-hidden rounded-[10px] border border-line">
                {([
                  { id: "tco", label: "TCO / maand" },
                  { id: "vaa", label: "VAA / jaar" },
                  { id: "aftrek", label: "Aftrek %" },
                ] as Array<{ id: Metric; label: string }>).map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setMetric(b.id)}
                    data-active={metric === b.id}
                    className="bs-mswitch cursor-pointer px-4 py-2.5 text-[13.5px] font-bold transition-all"
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-[14px] border border-line px-5 pb-3 pt-6">
              <BarChart
                items={cmp.map((c) => ({
                  short: c.cat?.model ?? c.name,
                  type: c.type,
                  value: metricDefs[metric].get(c),
                }))}
                fmt={metricDefs[metric].fmt}
                best={metricDefs[metric].best}
                isPct={metric === "aftrek"}
              />
            </div>
          </div>

          {/* BEWAREN */}
          <div className="bs-no-print rounded-[14px] border border-line bg-white p-6">
            <h2 className="m-0 mb-1 text-[18px] font-bold">Beslissing bewaren</h2>
            <p className="m-0 mb-4 text-[14px] text-ink-500">
              Leg deze vergelijking vast voor de directievergadering.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={titel}
                onChange={(e) => setTitel(e.target.value)}
                placeholder="Titel (bv. Vervanging vloot 2026)"
                className="bs-inp h-[44px] rounded-[10px] px-3.5 text-[15px]"
              />
              <input
                value={notitie}
                onChange={(e) => setNotitie(e.target.value)}
                placeholder="Korte motivering (optioneel)"
                className="bs-inp h-[44px] rounded-[10px] px-3.5 text-[15px]"
              />
            </div>
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={bewaarBeslissing}
                disabled={bezig}
                className="inline-flex h-[46px] items-center gap-2 rounded-[11px] bg-gold px-6 text-[15px] font-bold text-ink transition-colors hover:bg-gold-hover disabled:opacity-50"
              >
                <Icon name="check" size={17} />
                {bezig ? "Bezig…" : "Bewaar beslissing"}
              </button>
              {bewaard && <span className="text-sm font-medium text-emerald-700">Bewaard ✓</span>}
            </div>
          </div>

          {/* HISTORIEK */}
          {evaluaties.length > 0 && (
            <div className="mt-8">
              <h2 className="m-0 mb-[18px] text-[22px] font-bold">Beslissingshistoriek</h2>
              <div className="flex flex-col gap-3">
                {evaluaties.map((e) => (
                  <div key={e.id} className="rounded-[12px] border border-line bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-ink">{e.titel}</span>
                      <span className="text-[13px] text-ink-500">
                        {new Date(e.created_at).toLocaleDateString("nl-BE")}
                      </span>
                    </div>
                    <p className="m-0 mt-1 text-[14px] text-ink-700">{e.aanbeveling}</p>
                    {e.notitie && <p className="m-0 mt-1 text-[13px] text-ink-500">{e.notitie}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </Container>
  );
}

/** Eenvoudige, huisstijl-conforme staafgrafiek (eigen SVG). */
function BarChart({
  items,
  fmt,
  best,
  isPct,
}: {
  items: Array<{ short: string; type: string; value: number }>;
  fmt: (v: number) => string;
  best: "min" | "max";
  isPct: boolean;
}) {
  const W = 760,
    H = 340,
    padL = 78,
    padR = 24,
    padT = 22,
    padB = 50;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const baseY = padT + plotH;
  const vals = items.map((i) => i.value);
  const rawMax = vals.length ? Math.max(...vals) : 0;
  const maxV = isPct ? 100 : Math.max(200, Math.ceil(rawMax / 200) * 200);
  const target = vals.length ? (best === "min" ? Math.min(...vals) : Math.max(...vals)) : 0;
  const n = items.length || 1;
  const slot = plotW / n;
  const barW = Math.min(96, slot * 0.46);
  const grid = [0, 1, 2, 3, 4].map((i) => ({
    y: baseY - (i / 4) * plotH,
    label: isPct ? `${Math.round((maxV * i) / 4)}%` : euroAxis((maxV * i) / 4),
  }));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="grafiek" style={{ display: "block", height: "auto" }}>
      {grid.map((g, i) => (
        <g key={i}>
          <line x1={padL} x2={W - padR} y1={g.y} y2={g.y} stroke="#e9ecef" strokeWidth={1} />
          <text x={padL - 14} y={g.y + 4} textAnchor="end" fontSize={12.5} fill="#5c6b7a">
            {g.label}
          </text>
        </g>
      ))}
      <line x1={padL} x2={W - padR} y1={baseY} y2={baseY} stroke="#c9ced4" strokeWidth={1.5} />
      {items.map((it, i) => {
        const h = maxV ? (it.value / maxV) * plotH : 0;
        const x = padL + slot * i + (slot - barW) / 2;
        const y = baseY - h;
        const cx = x + barW / 2;
        const isBest = it.value === target;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={Math.max(h, 2)} rx={8} fill={isBest ? "#AE9A64" : "#0B1F33"} className="bs-cmp-bar" />
            <text x={cx} y={y - 12} textAnchor="middle" fontSize={15} fontWeight={700} fill="#0B1F33">
              {fmt(it.value)}
            </text>
            <text x={cx} y={baseY + 26} textAnchor="middle" fontSize={13.5} fontWeight={700} fill="#2b3f52">
              {it.short}
            </text>
            <text x={cx} y={baseY + 43} textAnchor="middle" fontSize={11.5} fill="#8a94a0">
              {it.type}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function euroAxis(v: number) {
  return "€ " + Math.round(v).toLocaleString("nl-BE");
}
