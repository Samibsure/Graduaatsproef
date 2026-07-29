"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import CarImage from "@/components/CarImage";
import { Laadskelet } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { laadCatalogus, laadFiscaleContext } from "@/lib/data";
import { catalogPreview } from "@/lib/fiscaal/catalog";
import { berekenJaar } from "@/lib/fiscaal/engine";
import type { CatalogCar, FiscaleContext } from "@/lib/fiscaal/types";
import { formatters } from "@/lib/format";

const EVALUATIEJAAR = 2026;

/** Drie modellen uit de catalogus, met de echte fiscale kerncijfers eronder. */
export default function UitgelichteWagens() {
  const t = useTranslations("dashboard");
  const { euro, pct } = formatters(useLocale());
  const [ctx, setCtx] = useState<FiscaleContext | null>(null);
  const [catalogus, setCatalogus] = useState<CatalogCar[] | null>(null);

  useEffect(() => {
    Promise.all([laadFiscaleContext(), laadCatalogus()])
      .then(([c, k]) => {
        setCtx(c);
        setCatalogus(k);
      })
      .catch(() => setCatalogus([]));
  }, []);

  const uitgelicht = useMemo(() => (catalogus ?? []).slice(0, 3), [catalogus]);

  if (catalogus === null) return <Laadskelet aantal={3} hoogte={310} className="grid gap-6 md:grid-cols-3" />;
  if (uitgelicht.length === 0) return null;

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {uitgelicht.map((car) => {
        const jaar = ctx ? berekenJaar(ctx, catalogPreview(car, EVALUATIEJAAR), EVALUATIEJAAR) : null;
        return (
          <Link
            key={car.id}
            href="/catalogus"
            className="group overflow-hidden rounded-[14px] border border-line bg-white transition-shadow hover:shadow-diep"
          >
            <div className="relative aspect-[16/10] bg-paper">
              <CarImage
                type={car.voertuigtype}
                segment={car.segment}
                        carrosserie={car.carrosserie}
                imageUrl={car.image_url}
                alt={`${car.merk} ${car.model}`}
                className="h-full w-full object-cover"
              />
              <span className="absolute left-3.5 top-3.5 rounded-full bg-white/[0.94] px-[11px] py-[5px] text-[11.5px] font-bold text-ink">
                {car.voertuigtype}
              </span>
            </div>
            <div className="p-5" data-cijfers>
              <div className="mb-4">
                <div className="text-[17px] font-bold text-ink">
                  {car.merk} {car.model}
                </div>
                <div className="text-[13px] text-ink-500">{car.segment}</div>
              </div>
              <div className="flex gap-[18px] border-t border-line pt-3.5">
                <Kerncijfer label={t("metricAftrek")} waarde={jaar ? pct(jaar.aftrekPct) : "—"} />
                <Kerncijfer label={t("metricVaa")} waarde={jaar ? euro(jaar.vaa) : "—"} />
                <Kerncijfer label={t("metricVu")} waarde={jaar ? euro(jaar.verworpenUitgaven) : "—"} />
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function Kerncijfer({ label, waarde }: { label: string; waarde: string }) {
  return (
    <div>
      <div className="text-[11.5px] text-ink-500">{label}</div>
      <div className="text-[15px] font-bold text-ink">{waarde}</div>
    </div>
  );
}
