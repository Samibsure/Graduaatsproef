"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import CarImage from "@/components/CarImage";
import Icon from "@/components/Icon";
import { Container, Eyebrow } from "@/components/ui";
import { bewaarWagen, laadCatalogus, laadFiscaleContext } from "@/lib/data";
import { catalogNaarWagen, catalogPreview } from "@/lib/fiscaal/catalog";
import { berekenJaar } from "@/lib/fiscaal/engine";
import type { CatalogCar, FiscaleContext, Voertuigtype } from "@/lib/fiscaal/types";
import { euro, pct } from "@/lib/format";

const EVALUATIEJAAR = 2026;
const FILTERS: Array<{ code: Voertuigtype | "alle"; label: string }> = [
  { code: "alle", label: "Alle" },
  { code: "BEV", label: "Elektrisch" },
  { code: "PHEV", label: "Plug-in hybride" },
  { code: "HEV", label: "Hybride" },
  { code: "fossiel", label: "Diesel / benzine" },
];

export default function CatalogusPagina() {
  const [ctx, setCtx] = useState<FiscaleContext | null>(null);
  const [catalogus, setCatalogus] = useState<CatalogCar[]>([]);
  const [filter, setFilter] = useState<Voertuigtype | "alle">("alle");
  const [query, setQuery] = useState("");
  const [bezigId, setBezigId] = useState<number | null>(null);
  const [toegevoegd, setToegevoegd] = useState<number[]>([]);
  const [fout, setFout] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([laadFiscaleContext(), laadCatalogus()])
      .then(([c, k]) => {
        setCtx(c);
        setCatalogus(k);
      })
      .catch((e) => setFout(e instanceof Error ? e.message : String(e)));
  }, []);

  const gefilterd = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalogus.filter((c) => {
      const typeOk = filter === "alle" || c.voertuigtype === filter;
      const qOk = !q || `${c.merk} ${c.model}`.toLowerCase().includes(q);
      return typeOk && qOk;
    });
  }, [catalogus, filter, query]);

  async function voegToe(car: CatalogCar) {
    if (toegevoegd.includes(car.id)) return;
    setBezigId(car.id);
    setFout(null);
    try {
      await bewaarWagen(catalogNaarWagen(car, EVALUATIEJAAR));
      setToegevoegd((t) => [...t, car.id]);
    } catch (e) {
      setFout(e instanceof Error ? e.message : String(e));
    } finally {
      setBezigId(null);
    }
  }

  const toegevoegdeNamen = catalogus
    .filter((c) => toegevoegd.includes(c.id))
    .map((c) => `${c.merk} ${c.model}`);

  return (
    <Container className="pb-[140px] pt-[52px]">
      {/* Kop + zoek */}
      <div className="mb-[30px] flex flex-wrap items-end justify-between gap-6">
        <div>
          <Eyebrow>Catalogus</Eyebrow>
          <h1 className="m-0 mb-2.5 text-[clamp(30px,4vw,46px)] font-bold tracking-[-0.02em]">
            Het wagenpark, fiscaal gewogen
          </h1>
          <p className="m-0 max-w-[40em] text-[16.5px] text-ink-700">
            De 25 bekendste bedrijfswagens in België. Elke wagen toont meteen zijn fiscale
            kerncijfers voor 2026. Voeg modellen toe om ze te vergelijken.
          </p>
        </div>
        <div className="relative min-w-[260px]">
          <span className="absolute left-3.5 top-1/2 inline-flex -translate-y-1/2 text-ink-500">
            <Icon name="search" size={18} />
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Zoek op merk of model"
            aria-label="Zoeken"
            className="bs-inp h-[46px] w-full rounded-[11px] pl-[42px] pr-4 text-[15px]"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="mb-[30px] flex flex-wrap items-center justify-between gap-[18px] border-b border-line pb-[22px]">
        <div className="flex flex-wrap gap-2.5">
          {FILTERS.map((f) => {
            const count =
              f.code === "alle"
                ? catalogus.length
                : catalogus.filter((c) => c.voertuigtype === f.code).length;
            return (
              <button
                key={f.code}
                onClick={() => setFilter(f.code)}
                data-active={filter === f.code}
                className="bs-chip inline-flex cursor-pointer items-center gap-[7px] rounded-full px-4 py-[9px] text-[14px] font-bold transition-all"
              >
                {f.label} <span className="font-bold opacity-55">{count}</span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2.5 text-[14px] text-ink-500">
          <Icon name="arrow-down-up" size={16} />
          <span>Gesorteerd op populariteit</span>
        </div>
      </div>

      {fout && <p className="mb-6 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{fout}</p>}

      {/* Kaarten */}
      <div className="grid gap-[22px] sm:grid-cols-2 lg:grid-cols-3">
        {gefilterd.map((car) => {
          const j = ctx ? berekenJaar(ctx, catalogPreview(car, EVALUATIEJAAR), EVALUATIEJAAR) : null;
          const isAdded = toegevoegd.includes(car.id);
          return (
            <div
              key={car.id}
              data-selected={isAdded}
              className="bs-cat-card overflow-hidden rounded-[14px] bg-white transition-all"
            >
              <div className="relative aspect-[16/10]">
                <CarImage
                  type={car.voertuigtype}
                  segment={car.segment}
                  imageUrl={car.image_url}
                  alt={`${car.merk} ${car.model}`}
                  className="h-full w-full object-cover"
                />
                <span className="absolute left-3 top-3 rounded-full bg-white/[0.94] px-[11px] py-[5px] text-[11px] font-bold text-ink">
                  {car.voertuigtype}
                </span>
                <span className="absolute right-3 top-3 inline-flex items-center gap-[5px] rounded-full bg-ink px-2.5 py-[5px] text-[12px] font-bold text-white">
                  <span className="text-gold">#{car.populariteit_rang}</span>
                  <span className="text-[10px] font-normal opacity-55">POPULAIR</span>
                </span>
              </div>
              <div className="p-5">
                <div className="text-[18px] font-bold text-ink">
                  {car.merk} {car.model}
                </div>
                <div className="mb-[18px] text-[13.5px] text-ink-500">
                  {car.segment} · catalogusprijs {euro(car.cataloguswaarde)}
                </div>

                <div className="mb-[18px] grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-line bg-line">
                  <Cell label="Fiscale aftrek" value={j ? pct(j.aftrekPct) : "…"} />
                  <Cell label="CO₂" value={`${car.co2} g/km`} />
                  <Cell label="VAA / jaar" value={j ? euro(j.vaa) : "…"} />
                  <Cell label="Verworpen uitg." value={j ? euro(j.verworpenUitgaven) : "…"} />
                </div>

                <button
                  onClick={() => voegToe(car)}
                  data-selected={isAdded}
                  disabled={bezigId === car.id || isAdded}
                  className="bs-cat-add inline-flex h-[46px] w-full items-center justify-center gap-2 rounded-[10px] text-[14.5px] font-bold transition-all"
                >
                  <Icon name={isAdded ? "check" : "plus"} size={17} />
                  {isAdded ? "Toegevoegd" : bezigId === car.id ? "Bezig…" : "Voeg toe aan vergelijking"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selectiebalk */}
      {toegevoegd.length > 0 && (
        <div
          className="bs-no-print fixed inset-x-0 bottom-0 z-40 border-t border-line"
          style={{
            background: "rgba(255,255,255,0.9)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            boxShadow: "0 -8px 28px rgba(11,31,51,0.07)",
          }}
        >
          <Container className="flex flex-wrap items-center justify-between gap-[18px] py-4">
            <div className="flex items-center gap-3.5">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] bg-gold-soft text-[17px] font-bold text-ink">
                {toegevoegd.length}
              </span>
              <div>
                <div className="text-[15px] font-bold text-ink">
                  {toegevoegd.length === 1
                    ? "1 wagen toegevoegd"
                    : `${toegevoegd.length} wagens toegevoegd`}
                </div>
                <div className="text-[13px] text-ink-500">{toegevoegdeNamen.join(" · ")}</div>
              </div>
            </div>
            <Link
              href="/vergelijking"
              className="inline-flex h-12 items-center gap-2.5 rounded-[11px] bg-gold px-[26px] text-[15.5px] font-bold text-ink transition-colors hover:bg-gold-hover"
            >
              Naar de vergelijking <Icon name="arrow-right" size={18} />
            </Link>
          </Container>
        </div>
      )}
    </Container>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white px-[13px] py-[11px]">
      <div className="text-[11.5px] text-ink-500">{label}</div>
      <div className="text-[16px] font-bold text-ink">{value}</div>
    </div>
  );
}
