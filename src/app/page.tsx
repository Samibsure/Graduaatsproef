"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import CarImage from "@/components/CarImage";
import Icon from "@/components/Icon";
import { Container, Eyebrow, StatCard } from "@/components/ui";
import { laadCatalogus, laadFiscaleContext } from "@/lib/data";
import { catalogPreview } from "@/lib/fiscaal/catalog";
import { berekenJaar } from "@/lib/fiscaal/engine";
import type { CatalogCar, FiscaleContext } from "@/lib/fiscaal/types";
import { euro, pct } from "@/lib/format";

const EVALUATIEJAAR = 2026;
const BEV_DEADLINE = new Date("2026-12-31T23:59:59");

const steps = [
  {
    num: "01",
    icon: "car",
    title: "Voeg uw wagens toe",
    text: "U registreert de wagens die u overweegt, of kiest ze rechtstreeks uit onze catalogus van 25 modellen.",
  },
  {
    num: "02",
    icon: "calculator",
    title: "Wij berekenen de impact",
    text: "De fiscale aftrek, het voordeel alle aard, de verworpen uitgaven en de RSZ-bijdrage worden nauwkeurig doorgerekend.",
  },
  {
    num: "03",
    icon: "scale",
    title: "Vergelijk en kies",
    text: "U ziet de winnaar in één oogopslag, met een heldere onderbouwing per gewogen criterium.",
  },
];

export default function Dashboard() {
  const [ctx, setCtx] = useState<FiscaleContext | null>(null);
  const [catalogus, setCatalogus] = useState<CatalogCar[]>([]);
  const [fout, setFout] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([laadFiscaleContext(), laadCatalogus()])
      .then(([c, k]) => {
        setCtx(c);
        setCatalogus(k);
      })
      .catch((e) => setFout(e instanceof Error ? e.message : String(e)));
  }, []);

  const dagen = Math.max(0, Math.ceil((BEV_DEADLINE.getTime() - Date.now()) / 86400000));
  const bevAandeel = catalogus.length
    ? Math.round((catalogus.filter((c) => c.voertuigtype === "BEV").length / catalogus.length) * 100)
    : 0;

  const preview = (car: CatalogCar) =>
    ctx ? berekenJaar(ctx, catalogPreview(car, EVALUATIEJAAR), EVALUATIEJAAR) : null;

  const topCar = catalogus[0] ?? null;
  const topJ = topCar ? preview(topCar) : null;
  const featured = catalogus.slice(0, 3);

  return (
    <div>
      {fout && (
        <Container className="pt-6">
          <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{fout}</p>
        </Container>
      )}

      {/* HERO */}
      <section className="overflow-hidden border-b border-line bg-paper">
        <Container className="grid items-center gap-14 py-[72px] lg:grid-cols-[1.15fr_0.85fr]">
          <div className="bs-rise">
            <Eyebrow dash>Autofiscaliteit, helder gemaakt</Eyebrow>
            <h1 className="m-0 mb-5 text-[clamp(38px,5.2vw,62px)] font-bold leading-[1.04] tracking-[-0.022em] text-ink">
              De juiste bedrijfswagen,
              <br />
              <span className="text-gold">fiscaal onderbouwd</span>
            </h1>
            <p className="m-0 mb-8 max-w-[30em] text-[19px] leading-relaxed text-ink-700">
              Wij brengen de fiscale impact van uw bedrijfswagens helder in kaart. U vergelijkt
              rustig, op basis van cijfers, en kiest met vertrouwen. De complexiteit handelen wij
              voor u af.
            </p>
            <div className="flex flex-wrap gap-3.5">
              <Link
                href="/vergelijking"
                className="inline-flex h-[52px] items-center gap-2.5 rounded-[11px] bg-gold px-7 text-[16px] font-bold text-ink transition-colors hover:bg-gold-hover"
              >
                Start een vergelijking <Icon name="arrow-right" size={18} />
              </Link>
              <Link
                href="/catalogus"
                className="inline-flex h-[52px] items-center rounded-[11px] border-[1.5px] border-ink bg-transparent px-6 text-[16px] font-bold text-ink transition-colors hover:bg-ink hover:text-white"
              >
                Verken de catalogus
              </Link>
            </div>
          </div>

          <div className="bs-rise" style={{ animationDelay: ".08s" }}>
            <div className="overflow-hidden rounded-[16px] border border-line bg-white shadow-[0_18px_48px_rgba(11,31,51,0.10)]">
              <div className="flex items-center justify-between bg-ink px-[22px] py-[18px]">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/[0.62]">
                  Fiscaal voorbeeld
                </span>
                <span className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-gold">
                  <Icon name="award" size={15} /> Meest aftrekbaar
                </span>
              </div>
              <div className="p-[22px]">
                <div className="mb-[18px] flex items-center gap-4">
                  <div className="h-[56px] w-[86px] flex-none overflow-hidden rounded-[9px] border border-line">
                    {topCar && (
                      <CarImage
                        type={topCar.voertuigtype}
                        segment={topCar.segment}
                        imageUrl={topCar.image_url}
                        alt={`${topCar.merk} ${topCar.model}`}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div>
                    <div className="text-[18px] font-bold text-ink">
                      {topCar ? `${topCar.merk} ${topCar.model}` : "…"}
                    </div>
                    <div className="text-[13.5px] text-ink-500">
                      {topCar ? `${topCar.voertuigtype} · ${topCar.co2} g CO₂/km` : ""}
                    </div>
                  </div>
                  <div className="ml-auto text-right">
                    <div className="text-[30px] font-bold leading-none text-ink">
                      {topJ ? pct(topJ.aftrekPct) : "…"}
                    </div>
                    <div className="text-[11px] tracking-[0.04em] text-ink-500">AFTREK 2026</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-line bg-line">
                  {[
                    ["Cataloguswaarde", topCar ? euro(topCar.cataloguswaarde) : "…"],
                    ["VAA / jaar", topJ ? euro(topJ.vaa) : "…"],
                    ["Verworpen uitg. / jr", topJ ? euro(topJ.verworpenUitgaven) : "…"],
                    ["RSZ / jaar", topJ ? euro(topJ.rszJaar) : "…"],
                  ].map(([l, v]) => (
                    <div key={l} className="bg-white px-[15px] py-[13px]">
                      <div className="text-[12px] text-ink-500">{l}</div>
                      <div className="text-[19px] font-bold text-ink">{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* KPI'S */}
      <section>
        <Container className="py-14">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon="layout-grid" label="Wagens in catalogus" value={catalogus.length || "…"} detail="Elektrisch, hybride en fossiel" />
            <StatCard icon="percent" label="Aftrek elektrisch 2026" value="100%" detail="Volledig aftrekbaar in 2026" />
            <StatCard icon="calendar" label="BEV-venster 100% aftrek" value={dagen > 0 ? `${dagen} d` : "verstreken"} detail="bestellen vóór 1 januari 2027" />
            <StatCard icon="leaf" label="Aandeel elektrisch" value={`${bevAandeel}%`} detail="van de catalogus" />
          </div>
        </Container>
      </section>

      {/* ZO WERKT HET */}
      <section className="border-y border-line bg-paper">
        <Container className="py-[68px]">
          <div className="mx-auto mb-12 max-w-[640px] text-center">
            <div className="mb-3.5 text-[12px] font-bold uppercase tracking-[0.16em] text-gold">
              Zo werkt het
            </div>
            <h2 className="m-0 mb-4 text-[clamp(28px,3.4vw,40px)] font-bold tracking-[-0.02em]">
              In drie rustige stappen naar een onderbouwde keuze
            </h2>
            <p className="m-0 text-[17px] text-ink-700">
              U levert de wagens aan. Wij rekenen de fiscale gevolgen door. Samen kiest u met
              vertrouwen.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.num} className="relative rounded-[14px] border border-line bg-white p-[30px]">
                <div className="mb-5 flex items-center justify-between">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-[12px] bg-gold-soft text-ink">
                    <Icon name={s.icon} size={23} />
                  </span>
                  <span className="text-[40px] font-bold leading-none text-line">{s.num}</span>
                </div>
                <h3 className="m-0 mb-2.5 text-[20px] font-bold">{s.title}</h3>
                <p className="m-0 text-[15px] leading-relaxed text-ink-700">{s.text}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* UITGELICHT */}
      <section>
        <Container className="py-[68px]">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
            <div>
              <Eyebrow>Uit de catalogus</Eyebrow>
              <h2 className="m-0 text-[clamp(28px,3.4vw,40px)] font-bold tracking-[-0.02em]">
                Fiscaal voordelige wagens, uitgelicht
              </h2>
            </div>
            <Link
              href="/catalogus"
              className="inline-flex h-[46px] items-center gap-2 whitespace-nowrap rounded-[11px] border-[1.5px] border-line bg-transparent px-[22px] text-[15px] font-bold text-ink transition-colors hover:border-ink hover:bg-paper"
            >
              Bekijk de volledige catalogus <Icon name="arrow-right" size={17} />
            </Link>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {featured.map((car) => {
              const j = preview(car);
              return (
                <Link
                  key={car.id}
                  href="/catalogus"
                  className="group overflow-hidden rounded-[14px] border border-line bg-white transition-shadow hover:shadow-[0_14px_36px_rgba(11,31,51,0.09)]"
                >
                  <div className="relative aspect-[16/10]">
                    <CarImage
                      type={car.voertuigtype}
                      segment={car.segment}
                      imageUrl={car.image_url}
                      alt={`${car.merk} ${car.model}`}
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute left-3.5 top-3.5 rounded-full bg-white/[0.92] px-[11px] py-[5px] text-[11.5px] font-bold text-ink">
                      {car.voertuigtype}
                    </span>
                  </div>
                  <div className="p-5">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[17px] font-bold text-ink">
                          {car.merk} {car.model}
                        </div>
                        <div className="text-[13px] text-ink-500">{car.segment}</div>
                      </div>
                      <div className="flex-none text-right">
                        <div className="text-[22px] font-bold leading-none text-ink">
                          #{car.populariteit_rang}
                        </div>
                        <div className="text-[10px] tracking-[0.06em] text-ink-500">POPULAIR</div>
                      </div>
                    </div>
                    <div className="flex gap-[18px] border-t border-line pt-3.5">
                      <Metric label="Aftrek" value={j ? pct(j.aftrekPct) : "…"} />
                      <Metric label="VAA/jr" value={j ? euro(j.vaa) : "…"} />
                      <Metric label="Verw. uitg." value={j ? euro(j.verworpenUitgaven) : "…"} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </Container>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11.5px] text-ink-500">{label}</div>
      <div className="text-[15px] font-bold text-ink">{value}</div>
    </div>
  );
}
