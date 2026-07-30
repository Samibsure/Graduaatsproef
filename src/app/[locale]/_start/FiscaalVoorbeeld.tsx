"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import CarImage from "@/components/CarImage";
import Icon from "@/components/Icon";
import { StatCard } from "@/components/ui";
import { laadCatalogus, laadFiscaleContext } from "@/lib/data";
import { catalogPreview, perZekerheid } from "@/lib/fiscaal/catalog";
import { berekenJaar } from "@/lib/fiscaal/engine";
import type { CatalogCar, FiscaleContext } from "@/lib/fiscaal/types";
import { formatters } from "@/lib/format";

const EVALUATIEJAAR = 2026;

/**
 * De rekenkaart naast de hero, met echte cijfers uit de rekenkern.
 *
 * Dit blok is het enige in de hero dat gegevens nodig heeft, en staat daarom
 * apart: de rest van de startpagina rendert op de server en is dus meteen
 * zichtbaar en indexeerbaar. Voordien was de hele pagina een clientcomponent die
 * eerst puntjes toonde.
 */
export default function FiscaalVoorbeeld() {
  const t = useTranslations("dashboard");
  const { euro, pct } = formatters(useLocale());
  const [ctx, setCtx] = useState<FiscaleContext | null>(null);
  const [wagen, setWagen] = useState<CatalogCar | null>(null);

  useEffect(() => {
    let levend = true;
    Promise.all([laadFiscaleContext(), laadCatalogus()])
      .then(([c, k]) => {
        if (!levend) return;
        setCtx(c);
        // De meest aftrekbare wagen uit de catalogus: dat is het punt dat de
        // kaart wil maken, niet "de eerste rij van de tabel".
        // Bij voorkeur een nagekeken wagen: het voorbeeld op de startpagina
        // hoort te rusten op cijfers met een bron.
        const bev = (car: CatalogCar) => car.voertuigtype === "BEV";
        const { nagekeken, ramingen } = perZekerheid(k);
        setWagen(nagekeken.find(bev) ?? ramingen.find(bev) ?? k[0] ?? null);
      })
      .catch(() => {
        /* De hero blijft zonder cijfers gewoon staan; dit is geen kernfunctie. */
      });
    return () => {
      levend = false;
    };
  }, []);

  const jaar = ctx && wagen ? berekenJaar(ctx, catalogPreview(wagen, EVALUATIEJAAR), EVALUATIEJAAR) : null;

  return (
    <div className="overflow-hidden rounded-[16px] border border-line bg-white shadow-zwevend">
      <div className="flex items-center justify-between bg-ink px-[22px] py-[18px]">
        <span className="text-[13.5px] font-bold text-white/[0.78]">{t("voorbeeld")}</span>
        <span className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-white">
          <Icon name="award" size={15} /> {t("meestAftrekbaar")}
        </span>
      </div>

      <div className="p-[22px]" data-cijfers>
        <div className="mb-[18px] flex items-center gap-4">
          <div className="h-[56px] w-[86px] flex-none overflow-hidden rounded-[9px] border border-line bg-paper">
            {wagen && (
              <CarImage
                type={wagen.voertuigtype}
                segment={wagen.segment}
                        carrosserie={wagen.carrosserie}
                imageUrl={wagen.image_url}
                alt={`${wagen.merk} ${wagen.model}`}
                className="h-full w-full object-cover"
              />
            )}
          </div>
          <div className="min-w-0">
            <div className="truncate text-[18px] font-bold text-ink">
              {wagen ? `${wagen.merk} ${wagen.model}` : t("ladenKort")}
            </div>
            <div className="text-[13.5px] text-ink-500">
              {wagen ? `${wagen.voertuigtype} · ${wagen.co2} g CO₂/km` : ""}
            </div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-[30px] font-bold leading-none text-ink">
              {jaar ? pct(jaar.aftrekPct) : "—"}
            </div>
            <div className="text-[11px] tracking-[0.04em] text-ink-500">{t("aftrekJaar")}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-line bg-line">
          {[
            [t("cataloguswaarde"), wagen ? euro(wagen.cataloguswaarde) : "—"],
            [t("vaaPerJaar"), jaar ? euro(jaar.vaa) : "—"],
            [t("vuPerJaar"), jaar ? euro(jaar.verworpenUitgaven) : "—"],
            [t("rszPerJaar"), jaar ? euro(jaar.rszJaar) : "—"],
          ].map(([label, waarde]) => (
            <div key={label} className="bg-white px-[15px] py-[13px]">
              <div className="text-[12px] text-ink-500">{label}</div>
              <div className="text-[19px] font-bold text-ink">{waarde}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** De vier kerncijfers onder de hero. Aparte export omdat ze dezelfde data delen. */
export function Kerncijfers() {
  const t = useTranslations("dashboard");
  const { pct } = formatters(useLocale());
  const [catalogus, setCatalogus] = useState<CatalogCar[] | null>(null);

  useEffect(() => {
    laadCatalogus()
      .then(setCatalogus)
      .catch(() => setCatalogus([]));
  }, []);

  const aantal = catalogus?.length ?? 0;
  const bevAandeel = aantal
    ? Math.round((catalogus!.filter((c) => c.voertuigtype === "BEV").length / aantal) * 100)
    : 0;

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4" data-cijfers>
      <StatCard
        icon="layout-grid"
        label={t("kpiCatalogus")}
        value={aantal || "—"}
        detail={t("kpiCatalogusDetail")}
      />
      <StatCard
        icon="percent"
        label={t("kpiAftrek")}
        value={pct(100)}
        detail={t("kpiAftrekDetail")}
      />
      <StatCard
        icon="calendar"
        label={t("kpiVenster")}
        value={t("kpiVensterWaarde")}
        detail={t("kpiVensterDetail")}
      />
      <StatCard
        icon="leaf"
        label={t("kpiAandeel")}
        value={aantal ? pct(bevAandeel) : "—"}
        detail={t("kpiAandeelDetail")}
      />
    </div>
  );
}
