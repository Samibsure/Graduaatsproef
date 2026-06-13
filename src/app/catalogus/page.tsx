"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import CarImage from "@/components/CarImage";
import { Badge, Card, SectionTitle, TypeDot } from "@/components/ui";
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
  { code: "fossiel", label: "Diesel/benzine" },
];

export default function CatalogusPagina() {
  const [ctx, setCtx] = useState<FiscaleContext | null>(null);
  const [catalogus, setCatalogus] = useState<CatalogCar[]>([]);
  const [filter, setFilter] = useState<Voertuigtype | "alle">("alle");
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

  const gefilterd = useMemo(
    () => (filter === "alle" ? catalogus : catalogus.filter((c) => c.voertuigtype === filter)),
    [catalogus, filter],
  );

  async function voegToe(car: CatalogCar) {
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

  return (
    <div className="space-y-6">
      <SectionTitle
        sub="De 25 bekendste bedrijfswagens in België met indicatieve cataloguswaarde en WLTP-uitstoot. Elk model toont meteen de fiscale impact voor 2026. Voeg een model toe als kandidaat om het in een vergelijking mee te nemen."
        action={
          <Link href="/vergelijking" className="text-sm font-medium text-ink hover:text-gold">
            Naar vergelijking →
          </Link>
        }
      >
        Wagencatalogus
      </SectionTitle>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.code}
            onClick={() => setFilter(f.code)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              filter === f.code ? "bg-ink text-white" : "border border-line bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {fout && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{fout}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {gefilterd.map((car) => {
          const j = ctx ? berekenJaar(ctx, catalogPreview(car, EVALUATIEJAAR), EVALUATIEJAAR) : null;
          const isToegevoegd = toegevoegd.includes(car.id);
          return (
            <Card key={car.id} className="flex flex-col overflow-hidden">
              <div className="relative">
                <CarImage
                  type={car.voertuigtype}
                  segment={car.segment}
                  imageUrl={car.image_url}
                  alt={`${car.merk} ${car.model}`}
                  className="aspect-[260/150] w-full"
                />
                <span className="absolute right-3 top-3">
                  <Badge tint="gold">#{car.populariteit_rang}</Badge>
                </span>
              </div>

              <div className="flex flex-1 flex-col p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-ink">
                    {car.merk} {car.model}
                  </p>
                  <p className="text-xs text-slate-500">{car.segment}</p>
                </div>
              </div>

              <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <TypeDot type={car.voertuigtype} />
                {car.voertuigtype} · {car.brandstof}
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
                <Rij label="Cataloguswaarde" waarde={euro(car.cataloguswaarde)} />
                <Rij label="CO₂" waarde={`${car.co2} g/km`} />
                <Rij label="Aftrek 2026" waarde={j ? pct(j.aftrekPct) : "…"} accent={j?.aftrekPct === 100} />
                <Rij label="VAA / jaar" waarde={j ? euro(j.vaa) : "…"} />
                <Rij label="Verworpen uitg." waarde={j ? euro(j.verworpenUitgaven) : "…"} />
                <Rij label="RSZ / jaar" waarde={j ? euro(j.rszJaar) : "…"} />
              </dl>

              {car.opmerking && (
                <p className="mt-3 text-xs leading-relaxed text-slate-400">{car.opmerking}</p>
              )}

              <div className="mt-auto pt-4">
                <button
                  onClick={() => voegToe(car)}
                  disabled={bezigId === car.id || isToegevoegd}
                  className={`w-full rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                    isToegevoegd
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-ink text-white hover:bg-ink-700 disabled:opacity-50"
                  }`}
                >
                  {isToegevoegd ? "Toegevoegd ✓" : bezigId === car.id ? "Bezig…" : "Voeg toe als kandidaat"}
                </button>
              </div>
              </div>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-slate-400">
        Cataloguswaarden en CO₂ zijn indicatieve richtwaarden (juni 2026) die per uitvoering en optie
        variëren. Pas ze per concrete offerte aan bij “Mijn wagens”. De jaarlijkse autokosten worden
        hier geraamd op basis van de cataloguswaarde.
      </p>
    </div>
  );
}

function Rij({ label, waarde, accent }: { label: string; waarde: string; accent?: boolean }) {
  return (
    <>
      <dt className="text-slate-500">{label}</dt>
      <dd className={`text-right font-medium ${accent ? "text-emerald-600" : "text-ink"}`}>{waarde}</dd>
    </>
  );
}
