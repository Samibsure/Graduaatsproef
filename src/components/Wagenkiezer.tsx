"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import CarImage from "@/components/CarImage";
import { Badge, LegeStaat, invoerKlassen } from "@/components/ui";
import type { CatalogCar, Voertuigtype } from "@/lib/fiscaal/types";
import { modelSleutel } from "@/lib/simulatorflow";

/** Bij honderdzestig modellen is alles tegelijk tonen traag en onleesbaar. */
const PER_PAGINA = 12;

const TYPEFILTERS: Array<{ code: Voertuigtype | "alle"; sleutel: string }> = [
  { code: "alle", sleutel: "filterAlle" },
  { code: "BEV", sleutel: "filterBev" },
  { code: "PHEV", sleutel: "filterPhev" },
  { code: "HEV", sleutel: "filterHev" },
  { code: "fossiel", sleutel: "filterFossiel" },
];

/**
 * De eerste stap van de simulator: kies een wagen.
 *
 * Tot nu toe was dit één keuzelijst met honderdzestig regels, en het eerste model
 * stond bij het openen van de pagina al ingevuld. Er viel dus niets te kiezen; het
 * resultaat stond er gewoon. Dat is precies wat de simulator geen simulatie deed
 * voelen.
 *
 * Bewust smaller dan de catalogus: geen sorteren, geen merk- of carrosseriefilter,
 * geen vlootbalk. Wie hier komt, kiest één wagen om door te rekenen en gaat niet
 * honderdzestig modellen doorbladeren. Wat wél op elke kaart staat, is het
 * aftrekpercentage voor het gekozen besteljaar: dat verschilt sterker tussen
 * aandrijvingen dan tussen prijsklassen, en het is de reden dat deze applicatie
 * bestaat.
 */
export default function Wagenkiezer({
  catalogus,
  gekozenSleutel,
  onKies,
  aftrekVoor,
  maandkostVoor,
  besteljaar,
  euro,
  pct,
}: {
  catalogus: CatalogCar[];
  gekozenSleutel: string | null;
  onKies: (sleutel: string) => void;
  /** Aftrekpercentage van dit model in het gekozen besteljaar. */
  aftrekVoor: (car: CatalogCar) => number;
  /** Geschatte totale kost per maand, met het huidige gebruiksprofiel. */
  maandkostVoor: (car: CatalogCar) => number;
  besteljaar: number;
  euro: (n: number) => string;
  pct: (n: number) => string;
}) {
  const t = useTranslations("simulator");
  const tCat = useTranslations("catalogus");

  const [query, setQuery] = useState("");
  const [type, setType] = useState<Voertuigtype | "alle">("alle");
  const [ookRamingen, setOokRamingen] = useState(false);
  const [zichtbaar, setZichtbaar] = useState(PER_PAGINA);

  /**
   * Standaard alleen wat nagekeken is, net als in de catalogus. Een raming hoort
   * niet als vaststaand op het scherm te komen wanneer er een fiscale berekening
   * op gebouwd wordt; één klik zet ze erbij, met hun label.
   *
   * Uitzondering: het al gekozen model blijft altijd staan. Anders verdwijnt de
   * wagen waarop de hele flow rekent zodra iemand de schakelaar aanraakt.
   */
  const gefilterd = useMemo(() => {
    const zoek = query.trim().toLowerCase();
    return catalogus.filter((c) => {
      const isGekozen = modelSleutel(c) === gekozenSleutel;
      if (!ookRamingen && c.zekerheid !== "geverifieerd" && !isGekozen) return false;
      if (type !== "alle" && c.voertuigtype !== type) return false;
      if (zoek === "") return true;
      const tekst = `${c.merk} ${c.model} ${c.uitvoering ?? ""} ${c.segment ?? ""}`.toLowerCase();
      return tekst.includes(zoek);
    });
  }, [catalogus, query, type, ookRamingen, gekozenSleutel]);

  const aantalPerType = useMemo(() => {
    const basis = ookRamingen
      ? catalogus
      : catalogus.filter((c) => c.zekerheid === "geverifieerd");
    return Object.fromEntries(
      TYPEFILTERS.map(({ code }) => [
        code,
        code === "alle" ? basis.length : basis.filter((c) => c.voertuigtype === code).length,
      ]),
    ) as Record<Voertuigtype | "alle", number>;
  }, [catalogus, ookRamingen]);

  const lijst = gefilterd.slice(0, zichtbaar);

  return (
    <div>
      <div className="mb-4 space-y-3">
        <label className="block">
          <span className="mb-1.5 block text-[13.5px] font-bold text-ink">{t("zoek")}</span>
          <input
            type="search"
            className={invoerKlassen}
            placeholder={t("zoekPlaceholder")}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setZichtbaar(PER_PAGINA);
            }}
          />
        </label>

        <div className="flex flex-wrap gap-2">
          {TYPEFILTERS.map(({ code, sleutel }) => (
            <button
              key={code}
              type="button"
              data-active={type === code}
              onClick={() => {
                setType(code);
                setZichtbaar(PER_PAGINA);
              }}
              className="bs-chip h-9 rounded-full px-3.5 text-[13.5px] font-bold transition-colors"
            >
              {tCat(sleutel)}{" "}
              <span className="font-normal opacity-70">{aantalPerType[code]}</span>
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-[13.5px] text-ink-700">
          <input
            type="checkbox"
            checked={ookRamingen}
            onChange={(e) => {
              setOokRamingen(e.target.checked);
              setZichtbaar(PER_PAGINA);
            }}
          />
          {t("ookRamingen")}
        </label>
      </div>

      {lijst.length === 0 ? (
        <LegeStaat titel={t("geenTreffers")} tekst={t("geenTreffersTekst")} />
      ) : (
        <>
          <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 xl:grid-cols-3">
            {lijst.map((c) => {
              const sleutel = modelSleutel(c);
              const gekozen = sleutel === gekozenSleutel;
              const aftrek = aftrekVoor(c);
              return (
                <li key={sleutel}>
                  <button
                    type="button"
                    data-selected={gekozen}
                    aria-pressed={gekozen}
                    onClick={() => onKies(sleutel)}
                    className="bs-cat-card block w-full overflow-hidden rounded-[13px] bg-white text-left transition-shadow"
                  >
                    <span className="block h-[104px] w-full overflow-hidden bg-paper">
                      <CarImage
                        type={c.voertuigtype}
                        segment={c.segment}
                        carrosserie={c.carrosserie}
                        imageUrl={c.image_url}
                        alt={`${c.merk} ${c.model}`}
                        className="h-full w-full object-cover"
                      />
                    </span>
                    <span className="block p-3.5">
                      <span className="flex items-start justify-between gap-2">
                        <span className="min-w-0">
                          <span className="block truncate text-[14.5px] font-bold text-ink">
                            {c.merk} {c.model}
                          </span>
                          <span className="block truncate text-[12.5px] text-ink-500">
                            {c.uitvoering ? `${c.uitvoering} · ` : ""}
                            {c.co2} g/km · {euro(c.cataloguswaarde)}
                          </span>
                        </span>
                        {gekozen && (
                          <span className="shrink-0">
                            <Badge tint="gold">{t("gekozen")}</Badge>
                          </span>
                        )}
                      </span>

                      {/*
                        Het cijfer waar het om gaat, al bij het kiezen. Wie hier
                        een verbrandingswagen aanklikt voor besteljaar 2026, hoort
                        die 0% te zien vóór hij drie stappen verder is.
                      */}
                      <span className="mt-3 flex items-end justify-between gap-2 border-t border-line pt-2.5">
                        <span className="block">
                          <span className="block text-[11.5px] text-ink-500">
                            {t("aftrekIn", { jaar: besteljaar })}
                          </span>
                          <span
                            className={`block text-[15px] font-bold ${
                              aftrek === 0 ? "text-danger" : "text-ink"
                            }`}
                          >
                            {pct(aftrek)}
                          </span>
                        </span>
                        <span className="block text-right">
                          <span className="block text-[11.5px] text-ink-500">{t("perMaand")}</span>
                          <span className="block text-[15px] font-bold text-ink">
                            {euro(maandkostVoor(c))}
                          </span>
                        </span>
                      </span>

                      {c.zekerheid !== "geverifieerd" && (
                        <span className="mt-2.5 block text-[11.5px] text-ink-500">
                          {tCat("badgeRaming")}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="m-0 text-[13px] text-ink-500">
              {t("aantalModellen", { aantal: lijst.length, totaal: gefilterd.length })}
            </p>
            {zichtbaar < gefilterd.length && (
              <button
                type="button"
                onClick={() => setZichtbaar((n) => n + PER_PAGINA)}
                className="text-[13.5px] font-bold text-ink underline underline-offset-2 hover:text-accent"
              >
                {t("toonMeer")}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
