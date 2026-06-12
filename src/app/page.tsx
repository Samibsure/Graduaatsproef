"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { laadFiscaleContext, laadWagens } from "@/lib/data";
import { berekenJaar } from "@/lib/fiscaal/engine";
import type { FiscaleContext, Vehicle } from "@/lib/fiscaal/types";
import { euro, pct } from "@/lib/format";

const EVALUATIEJAAR = 2026;
const BEV_DEADLINE = new Date("2026-12-31T23:59:59");

export default function Dashboard() {
  const [ctx, setCtx] = useState<FiscaleContext | null>(null);
  const [wagens, setWagens] = useState<Vehicle[]>([]);
  const [fout, setFout] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([laadFiscaleContext(), laadWagens()])
      .then(([c, w]) => {
        setCtx(c);
        setWagens(w);
      })
      .catch((e) => setFout(e instanceof Error ? e.message : String(e)));
  }, []);

  const dagenTotDeadline = Math.max(
    0,
    Math.ceil((BEV_DEADLINE.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
  );

  const resultaten =
    ctx === null
      ? []
      : wagens.map((w) => ({ wagen: w, jaar: berekenJaar(ctx, w, EVALUATIEJAAR) }));
  const totaalVU = resultaten.reduce((s, r) => s + r.jaar.verworpenUitgaven, 0);
  const totaalMeerkost = resultaten.reduce((s, r) => s + r.jaar.fiscaleMeerkost, 0);

  return (
    <div className="space-y-8">
      <section className="rounded-xl bg-blue-900 px-6 py-8 text-white">
        <h1 className="text-2xl font-bold">
          Autofiscaliteit: impact van autokosten op verworpen uitgaven
        </h1>
        <p className="mt-3 max-w-3xl text-blue-100">
          Hoe kan B-sure NV een fiscaal én financieel optimale voertuigkeuze maken op basis van de
          impact van autokosten op verworpen uitgaven? Deze tool vertaalt het fiscale kader
          (aftrekkalender, VAA, RSZ-bijdrage en verworpen uitgaven) naar een herhaalbare
          scoringsmatrix per offerte.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/vergelijking"
            className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-blue-900 hover:bg-blue-50"
          >
            Start een vergelijking
          </Link>
          <Link
            href="/wagens"
            className="rounded-md border border-blue-300 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
          >
            Beheer wagens
          </Link>
        </div>
      </section>

      {fout && <p className="rounded-md bg-rose-50 px-4 py-3 text-sm text-rose-700">{fout}</p>}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatKaart
          label="Wagens in de tool"
          waarde={ctx ? String(wagens.length) : "…"}
          detail="kandidaten en vlootwagens"
        />
        <StatKaart
          label="BEV-venster (100% aftrek)"
          waarde={dagenTotDeadline > 0 ? `${dagenTotDeadline} dagen` : "verstreken"}
          detail="bestellen vóór 1 januari 2027"
          accent
        />
        <StatKaart
          label={`Verworpen uitgaven ${EVALUATIEJAAR}`}
          waarde={ctx ? euro(totaalVU) : "…"}
          detail="som over alle ingevoerde wagens"
        />
        <StatKaart
          label={`Fiscale meerkost ${EVALUATIEJAAR}`}
          waarde={ctx ? euro(totaalMeerkost) : "…"}
          detail="extra VenB + RSZ-bijdrage"
        />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="font-semibold">Vloot in {EVALUATIEJAAR}</h2>
          <Link href="/wagens" className="text-sm font-medium text-blue-700 hover:underline">
            Alle details →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-y border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-2.5">Wagen</th>
                <th className="px-5 py-2.5">Type</th>
                <th className="px-5 py-2.5 text-right">Aftrek VenB</th>
                <th className="px-5 py-2.5 text-right">VAA</th>
                <th className="px-5 py-2.5 text-right">Verworpen uitgaven</th>
                <th className="px-5 py-2.5 text-right">Fiscale meerkost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {resultaten.map(({ wagen, jaar }) => (
                <tr key={wagen.id}>
                  <td className="px-5 py-2.5 font-medium">{wagen.omschrijving}</td>
                  <td className="px-5 py-2.5">{wagen.voertuigtype}</td>
                  <td className="px-5 py-2.5 text-right">{pct(jaar.aftrekPct)}</td>
                  <td className="px-5 py-2.5 text-right">{euro(jaar.vaa)}</td>
                  <td className="px-5 py-2.5 text-right">{euro(jaar.verworpenUitgaven)}</td>
                  <td className="px-5 py-2.5 text-right">{euro(jaar.fiscaleMeerkost)}</td>
                </tr>
              ))}
              {ctx && wagens.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-6 text-center text-slate-400">
                    Nog geen wagens ingevoerd.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <InfoKaart
          titel="1 · Parameters"
          tekst="Aftrekkalenders, VAA-parameters, RSZ-bijdragen en VenB-tarieven. Jaarlijks bij te werken na het begrotingsakkoord."
          href="/parameters"
        />
        <InfoKaart
          titel="2 · Invoer per wagen"
          tekst="Identificatie, technische gegevens, kosten en beleid per kandidaat-wagen, zoals beschreven in Bijlage 4 van het rapport."
          href="/wagens"
        />
        <InfoKaart
          titel="3 · Scoredashboard"
          tekst="Vergelijk maximaal drie kandidaten, bekijk de scoringsmatrix en bewaar de beslissing met motivering."
          href="/vergelijking"
        />
      </section>
    </div>
  );
}

function StatKaart({
  label,
  waarde,
  detail,
  accent,
}: {
  label: string;
  waarde: string;
  detail: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-5 py-4 ${
        accent ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{waarde}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

function InfoKaart({ titel, tekst, href }: { titel: string; tekst: string; href: string }) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-slate-200 bg-white px-5 py-4 transition-shadow hover:shadow-md"
    >
      <h3 className="font-semibold text-blue-900">{titel}</h3>
      <p className="mt-2 text-sm text-slate-600">{tekst}</p>
    </Link>
  );
}
