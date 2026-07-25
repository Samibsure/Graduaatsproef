"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import CarImage from "@/components/CarImage";
import Icon from "@/components/Icon";
import { Container, Eyebrow, StatCard } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { laadCatalogus, laadFiscaleContext } from "@/lib/data";
import { catalogPreview } from "@/lib/fiscaal/catalog";
import { berekenJaar } from "@/lib/fiscaal/engine";
import type { CatalogCar, FiscaleContext } from "@/lib/fiscaal/types";
import { formatters } from "@/lib/format";

const EVALUATIEJAAR = 2026;
const BEV_DEADLINE = new Date("2026-12-31T23:59:59");

export default function Dashboard() {
  const t = useTranslations("dashboard");
  const { euro, pct } = formatters(useLocale());
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

  const steps = [
    { num: "01", icon: "car", title: t("stap1Titel"), text: t("stap1Tekst") },
    { num: "02", icon: "calculator", title: t("stap2Titel"), text: t("stap2Tekst") },
    { num: "03", icon: "scale", title: t("stap3Titel"), text: t("stap3Tekst") },
  ];

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
            <Eyebrow dash>{t("eyebrow")}</Eyebrow>
            <h1 className="m-0 mb-5 text-[clamp(38px,5.2vw,62px)] font-bold leading-[1.04] tracking-[-0.022em] text-ink">
              {t("kop1")}
              <br />
              <span className="text-gold">{t("kop2")}</span>
            </h1>
            <p className="m-0 mb-8 max-w-[30em] text-[19px] leading-relaxed text-ink-700">
              {t("intro")}
            </p>
            <div className="flex flex-wrap gap-3.5">
              <Link
                href="/registreren"
                className="inline-flex h-[52px] items-center gap-2.5 rounded-[11px] bg-gold px-7 text-[16px] font-bold text-white transition-colors hover:bg-gold-hover"
              >
                {t("ctaStarten")} <Icon name="arrow-right" size={18} />
              </Link>
              <Link
                href="/catalogus"
                className="inline-flex h-[52px] items-center rounded-[11px] border-[1.5px] border-ink bg-transparent px-6 text-[16px] font-bold text-ink transition-colors hover:bg-ink hover:text-white"
              >
                {t("ctaCatalogus")}
              </Link>
            </div>
          </div>

          <div className="bs-rise" style={{ animationDelay: ".08s" }}>
            <div className="overflow-hidden rounded-[16px] border border-line bg-white shadow-[0_18px_48px_rgba(11,31,51,0.10)]">
              <div className="flex items-center justify-between bg-ink px-[22px] py-[18px]">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/[0.62]">
                  {t("voorbeeld")}
                </span>
                <span className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-gold">
                  <Icon name="award" size={15} /> {t("meestAftrekbaar")}
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
                    <div className="text-[11px] tracking-[0.04em] text-ink-500">{t("aftrekJaar")}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-line bg-line">
                  {[
                    [t("cataloguswaarde"), topCar ? euro(topCar.cataloguswaarde) : "…"],
                    [t("vaaPerJaar"), topJ ? euro(topJ.vaa) : "…"],
                    [t("vuPerJaar"), topJ ? euro(topJ.verworpenUitgaven) : "…"],
                    [t("rszPerJaar"), topJ ? euro(topJ.rszJaar) : "…"],
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
            <StatCard icon="layout-grid" label={t("kpiCatalogus")} value={catalogus.length || "…"} detail={t("kpiCatalogusDetail")} />
            <StatCard icon="percent" label={t("kpiAftrek")} value={pct(100)} detail={t("kpiAftrekDetail")} />
            <StatCard icon="calendar" label={t("kpiVenster")} value={dagen > 0 ? t("kpiDagen", { dagen }) : t("kpiVerstreken")} detail={t("kpiVensterDetail")} />
            <StatCard icon="leaf" label={t("kpiAandeel")} value={pct(bevAandeel)} detail={t("kpiAandeelDetail")} />
          </div>
        </Container>
      </section>

      {/* ZO WERKT HET */}
      <section className="border-y border-line bg-paper">
        <Container className="py-[68px]">
          <div className="mx-auto mb-12 max-w-[640px] text-center">
            <div className="mb-3.5 text-[12px] font-bold uppercase tracking-[0.16em] text-gold">
              {t("zoWerktHet")}
            </div>
            <h2 className="m-0 mb-4 text-[clamp(28px,3.4vw,40px)] font-bold tracking-[-0.02em]">
              {t("zoWerktKop")}
            </h2>
            <p className="m-0 text-[17px] text-ink-700">
              {t("zoWerktIntro")}
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
          <div className="mt-10 text-center">
            <Link
              href="/handleiding"
              className="inline-flex h-[48px] items-center gap-2 rounded-[11px] border-[1.5px] border-ink bg-white px-6 text-[15px] font-bold text-ink transition-colors hover:bg-ink hover:text-white"
            >
              <Icon name="info" size={17} /> {t("leesHandleiding")}
            </Link>
          </div>
        </Container>
      </section>

      {/* UITGELICHT */}
      <section>
        <Container className="py-[68px]">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
            <div>
              <Eyebrow>{t("uitCatalogus")}</Eyebrow>
              <h2 className="m-0 text-[clamp(28px,3.4vw,40px)] font-bold tracking-[-0.02em]">
                {t("uitgelichtKop")}
              </h2>
            </div>
            <Link
              href="/catalogus"
              className="inline-flex h-[46px] items-center gap-2 whitespace-nowrap rounded-[11px] border-[1.5px] border-line bg-transparent px-[22px] text-[15px] font-bold text-ink transition-colors hover:border-ink hover:bg-paper"
            >
              {t("bekijkCatalogus")} <Icon name="arrow-right" size={17} />
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
                        <div className="text-[10px] tracking-[0.06em] text-ink-500">{t("populair")}</div>
                      </div>
                    </div>
                    <div className="flex gap-[18px] border-t border-line pt-3.5">
                      <Metric label={t("metricAftrek")} value={j ? pct(j.aftrekPct) : "…"} />
                      <Metric label={t("metricVaa")} value={j ? euro(j.vaa) : "…"} />
                      <Metric label={t("metricVu")} value={j ? euro(j.verworpenUitgaven) : "…"} />
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
