"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BSureMark } from "@/components/Brand";
import { Badge, Card, SectionTitle, StatCard, TypeDot } from "@/components/ui";
import { laadCatalogus, laadFiscaleContext, laadWagens } from "@/lib/data";
import { berekenJaar } from "@/lib/fiscaal/engine";
import type { CatalogCar, FiscaleContext, Vehicle } from "@/lib/fiscaal/types";
import { euro, pct } from "@/lib/format";

const EVALUATIEJAAR = 2026;
const BEV_DEADLINE = new Date("2026-12-31T23:59:59");

export default function Dashboard() {
  const [ctx, setCtx] = useState<FiscaleContext | null>(null);
  const [wagens, setWagens] = useState<Vehicle[]>([]);
  const [catalogus, setCatalogus] = useState<CatalogCar[]>([]);
  const [fout, setFout] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([laadFiscaleContext(), laadWagens(), laadCatalogus()])
      .then(([c, w, k]) => {
        setCtx(c);
        setWagens(w);
        setCatalogus(k);
      })
      .catch((e) => setFout(e instanceof Error ? e.message : String(e)));
  }, []);

  const dagen = Math.max(0, Math.ceil((BEV_DEADLINE.getTime() - Date.now()) / 86400000));
  const resultaten = ctx ? wagens.map((w) => ({ w, j: berekenJaar(ctx, w, EVALUATIEJAAR) })) : [];
  const vloot = resultaten.filter((r) => r.w.categorie === "vloot");
  const kandidaten = resultaten.filter((r) => r.w.categorie === "kandidaat");
  const totaalVU = resultaten.reduce((s, r) => s + r.j.verworpenUitgaven, 0);
  const aandeelBev = wagens.length
    ? Math.round((wagens.filter((w) => w.voertuigtype === "BEV").length / wagens.length) * 100)
    : 0;

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="bg-ink-gradient relative overflow-hidden rounded-3xl px-6 py-10 text-white sm:px-10 sm:py-12">
        <div className="absolute -right-10 -top-10 opacity-20">
          <BSureMark size={180} />
        </div>
        <div className="relative max-w-3xl">
          <Badge tint="gold">Graduaatsproef · Sami Elhamdaoui</Badge>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            Financieel geluk, fiscaal onderbouwd.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-white/80">
            Hoe maakt B-sure NV een fiscaal én financieel optimale voertuigkeuze, gegeven de impact
            van autokosten op de verworpen uitgaven? Deze tool vertaalt de aftrekkalender, het VAA,
            de RSZ-bijdrage en de verworpen uitgaven naar een herhaalbare scoringsmatrix per offerte.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/catalogus"
              className="rounded-xl bg-gold px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-gold-soft"
            >
              Verken de wagencatalogus
            </Link>
            <Link
              href="/vergelijking"
              className="rounded-xl border border-white/30 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Start een vergelijking
            </Link>
          </div>
        </div>
      </section>

      {fout && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{fout}</p>}

      {/* Kerncijfers */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Wagens in beheer" value={ctx ? wagens.length : "…"} detail={`${vloot.length} vloot · ${kandidaten.length} kandidaat`} />
        <StatCard label="BEV-venster (100% aftrek)" value={dagen > 0 ? `${dagen} dagen` : "verstreken"} detail="bestellen vóór 1 januari 2027" accent />
        <StatCard label={`Verworpen uitgaven ${EVALUATIEJAAR}`} value={ctx ? euro(totaalVU) : "…"} detail="som over alle wagens" />
        <StatCard label="Aandeel elektrisch" value={`${aandeelBev}%`} detail="van de ingevoerde wagens" />
      </section>

      {/* Vloot + kandidaten */}
      <section className="grid gap-6 lg:grid-cols-2">
        <VlootKaart titel="Huidige vloot" leeg="Nog geen vlootwagens." rijen={vloot} />
        <VlootKaart titel="Kandidaten" leeg="Nog geen kandidaten — voeg er toe vanuit de catalogus." rijen={kandidaten} />
      </section>

      {/* Catalogus-teaser */}
      <section>
        <SectionTitle
          sub="De 25 bekendste bedrijfswagens in België, klaar om te vergelijken. Klik door voor de volledige fiscale preview per model."
          action={
            <Link href="/catalogus" className="text-sm font-medium text-ink hover:text-gold">
              Alle 25 modellen →
            </Link>
          }
        >
          Populaire bedrijfswagens
        </SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {catalogus.slice(0, 6).map((c) => (
            <Link key={c.id} href="/catalogus">
              <Card className="p-4 transition-shadow hover:shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">#{c.populariteit_rang}</span>
                  <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                    <TypeDot type={c.voertuigtype} />
                    {c.voertuigtype}
                  </span>
                </div>
                <p className="mt-1 font-semibold text-ink">
                  {c.merk} {c.model}
                </p>
                <p className="mt-0.5 text-sm text-slate-500">
                  {euro(c.cataloguswaarde)} · {c.co2} g/km
                </p>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function VlootKaart({
  titel,
  leeg,
  rijen,
}: {
  titel: string;
  leeg: string;
  rijen: { w: Vehicle; j: ReturnType<typeof berekenJaar> }[];
}) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
        <h2 className="font-semibold text-ink">{titel}</h2>
        <Badge tint="ink">{rijen.length}</Badge>
      </div>
      {rijen.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-slate-400">{leeg}</p>
      ) : (
        <ul className="divide-y divide-line">
          {rijen.map(({ w, j }) => (
            <li key={w.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 truncate font-medium text-ink">
                  <TypeDot type={w.voertuigtype} />
                  {w.omschrijving}
                </p>
                <p className="text-xs text-slate-500">
                  aftrek {pct(j.aftrekPct)} · VAA {euro(j.vaa)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-ink">{euro(j.verworpenUitgaven)}</p>
                <p className="text-xs text-slate-400">verworpen uitgaven</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
