"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import CarImage from "@/components/CarImage";
import Icon from "@/components/Icon";
import { useSessie } from "@/components/SessieProvider";
import Besteljaartabel from "@/components/Besteljaartabel";
import Uitfaseringstijdlijn from "@/components/Uitfaseringstijdlijn";
import { Card, Container, PageHead, StatCard, knopKlassen } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { laadCatalogus, laadFiscaleContext } from "@/lib/data";
import { catalogPreview, geschatteAutokosten, perZekerheid } from "@/lib/fiscaal/catalog";
import { berekenProjectie } from "@/lib/fiscaal/engine";
import { berekenUitfasering } from "@/lib/fiscaal/uitfasering";
import { standaardBesteljaren, vergelijkBesteljaren } from "@/lib/fiscaal/besteljaar";
import type { CatalogCar, FiscaleContext, Vehicle } from "@/lib/fiscaal/types";
import { formatters } from "@/lib/format";

const JAREN = 4;

/**
 * De simulator zonder account.
 *
 * De publieke pagina's waren tot nu toe uitsluitend informatief: je kon lezen
 * hoe de regels werken, maar niets uitrekenen zonder je eerst te registreren.
 * Voor een gratis product is dat de verkeerde volgorde. Hier reken je één wagen
 * volledig door, en pas wanneer je het resultaat wil bewaren of naast een
 * andere wagen leggen, is een account nodig.
 *
 * Alles draait client-side op de publiek leesbare referentiedata; er wordt niets
 * bewaard en er is dus ook niets af te schermen.
 */
export default function SimulatorPagina() {
  const t = useTranslations("simulator");
  const tJaar = useTranslations("besteljaar");
  const tCat = useTranslations("catalogus");
  const locale = useLocale();
  const { euro, pct } = formatters(locale);
  const sessie = useSessie();

  const [ctx, setCtx] = useState<FiscaleContext | null>(null);
  const [catalogus, setCatalogus] = useState<CatalogCar[]>([]);
  const [gekozenId, setGekozenId] = useState<number | null>(null);
  const [startjaar, setStartjaar] = useState(2026);
  const [kmoTarief, setKmoTarief] = useState(false);
  const [tankkaart, setTankkaart] = useState(true);
  const [autokosten, setAutokosten] = useState<number | null>(null);
  const [eigenBijdrage, setEigenBijdrage] = useState(0);
  const [fout, setFout] = useState<string | null>(null);
  // Zonder deze vlag blijft het skelet draaien wanneer het laden faalt: het
  // resultaat komt er dan nooit, en het skelet wacht op een resultaat.
  const [geladen, setGeladen] = useState(false);

  useEffect(() => {
    Promise.all([laadFiscaleContext(), laadCatalogus()])
      .then(([c, k]) => {
        setCtx(c);
        setCatalogus(k);
        setGekozenId(k[0]?.id ?? null);
      })
      .catch((e) => setFout(e instanceof Error ? e.message : String(e)))
      .finally(() => setGeladen(true));
  }, []);

  const gekozen = catalogus.find((c) => c.id === gekozenId) ?? null;

  // De autokosten volgen de raming van het gekozen model, tenzij de bezoeker ze
  // zelf heeft aangepast. Daarom null als "nog niet aangeraakt".
  const effectieveKosten =
    autokosten ?? (gekozen ? geschatteAutokosten(gekozen.cataloguswaarde, gekozen.voertuigtype) : 0);

  const wagen: Vehicle | null = useMemo(() => {
    if (!gekozen) return null;
    return {
      ...catalogPreview(gekozen, startjaar),
      jaarlijkse_autokosten: effectieveKosten,
      tankkaart,
      eigen_bijdrage_maand: eigenBijdrage,
    };
  }, [gekozen, startjaar, effectieveKosten, tankkaart, eigenBijdrage]);

  const resultaat = useMemo(() => {
    if (!ctx || !wagen) return null;
    const projectie = berekenProjectie(ctx, wagen, startjaar, JAREN, { kmoTarief });
    return {
      projectie,
      eerste: projectie.jaren[0],
      uitfasering: berekenUitfasering(ctx, wagen, startjaar, 2031, { kmoTarief }),
      besteljaren: vergelijkBesteljaren(
        ctx,
        wagen,
        standaardBesteljaren(startjaar),
        JAREN,
        { kmoTarief },
      ),
    };
  }, [ctx, wagen, startjaar, kmoTarief]);

  const invoer = "bs-inp h-[42px] w-full rounded-[10px] px-3 text-[15px]";

  return (
    <Container className="py-12">
      <PageHead title={t("titel")} sub={t("intro")} />

      {fout && (
        <p role="alert" className="mb-6 rounded-[10px] border border-danger/30 bg-danger/[0.06] px-4 py-3 text-[14px] text-danger">
          {fout}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <Card className="h-fit p-6">
          <h2 className="m-0 mb-4 text-[18px] font-bold text-ink">{t("invoerTitel")}</h2>

          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-[13.5px] font-bold text-ink">{t("model")}</span>
              <select
                className={invoer}
                value={gekozenId ?? ""}
                onChange={(e) => {
                  setGekozenId(Number(e.target.value));
                  setAutokosten(null);
                }}
              >
                {/*
                  Nagekeken modellen en ramingen apart, met een kop erboven. Wie
                  hier kiest, hoort te weten of het cijfer waarop de simulatie
                  straks rekent, tegen een bron gelegd is.
                */}
                {(["nagekeken", "ramingen"] as const).map((groep) => {
                  const lijst = perZekerheid(catalogus)[groep];
                  if (lijst.length === 0) return null;
                  return (
                    <optgroup
                      key={groep}
                      label={tCat(groep === "nagekeken" ? "badgeGeverifieerd" : "badgeRaming")}
                    >
                      {lijst.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.merk} {c.model} · {c.voertuigtype}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[13.5px] font-bold text-ink">
                {tJaar("kiesBesteljaar")}
              </span>
              <select
                className={invoer}
                value={startjaar}
                onChange={(e) => setStartjaar(Number(e.target.value))}
              >
                {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((j) => (
                  <option key={j} value={j}>{j}</option>
                ))}
              </select>
              <span className="mt-1 block text-[12.5px] text-ink-500">
                {tJaar("kiesBesteljaarHint")}
              </span>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[13.5px] font-bold text-ink">{t("autokosten")}</span>
              <input
                type="number" min={0} className={invoer}
                value={effectieveKosten}
                onChange={(e) => setAutokosten(Number(e.target.value))}
              />
              <span className="mt-1 block text-[12.5px] text-ink-500">{t("autokostenHint")}</span>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[13.5px] font-bold text-ink">
                {t("eigenBijdrage")}
              </span>
              <input
                type="number" min={0} className={invoer}
                value={eigenBijdrage}
                onChange={(e) => setEigenBijdrage(Number(e.target.value))}
              />
            </label>

            <label className="flex items-center gap-2 text-[14px] text-ink-700">
              <input type="checkbox" checked={tankkaart} onChange={(e) => setTankkaart(e.target.checked)} />
              {t("tankkaart")}
            </label>
            <label className="flex items-center gap-2 text-[14px] text-ink-700">
              <input type="checkbox" checked={kmoTarief} onChange={(e) => setKmoTarief(e.target.checked)} />
              {t("kmoTarief")}
            </label>
          </div>
        </Card>

        <div>
          {!geladen ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-[132px] animate-pulse rounded-[13px] bg-line" />
              ))}
            </div>
          ) : !resultaat || !gekozen ? (
            <Card className="p-10 text-center">
              <p className="m-0 text-[15px] text-ink-700">{t("geenModel")}</p>
            </Card>
          ) : (
            <>
              <Card className="mb-6 overflow-hidden">
                <div className="flex flex-wrap items-center gap-5 p-6">
                  <div className="h-[84px] w-[132px] shrink-0 overflow-hidden rounded-[10px] bg-paper">
                    <CarImage
                      type={gekozen.voertuigtype}
                      segment={gekozen.segment}
                        carrosserie={gekozen.carrosserie}
                      imageUrl={gekozen.image_url}
                      alt={`${gekozen.merk} ${gekozen.model}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[20px] font-bold text-ink">
                      {gekozen.merk} {gekozen.model}
                    </div>
                    <div className="text-[14px] text-ink-500">
                      {gekozen.uitvoering ? `${gekozen.uitvoering} · ` : ""}
                      {gekozen.voertuigtype} · {gekozen.co2} g/km · {euro(gekozen.cataloguswaarde)}
                    </div>
                    {/* De twee jaartallen die door elkaar liepen, nu uit elkaar
                        gehaald: waar de cijfers vandaan komen, en waarop
                        gerekend wordt. */}
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-500">
                      {gekozen.modeljaar && (
                        <span className="rounded-full bg-paper px-2.5 py-1 font-bold text-ink-700">
                          {tJaar("specificaties", { modeljaar: gekozen.modeljaar })}
                        </span>
                      )}
                      <span>{tJaar("gerekendOp", { jaar: startjaar })}</span>
                    </div>
                  </div>
                </div>
              </Card>

              <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  label={t("kpiAftrek")} value={pct(resultaat.eerste.aftrekPct)}
                  detail={t("kpiAftrekDetail", { jaar: startjaar })} icon="percent"
                />
                <StatCard
                  label={t("kpiVaa")} value={euro(resultaat.eerste.vaa)}
                  detail={t("kpiVaaDetail")} icon="piggy-bank"
                />
                <StatCard
                  label={t("kpiVu")} value={euro(resultaat.eerste.verworpenUitgaven)}
                  detail={t("kpiVuDetail")} icon="calculator"
                />
                <StatCard
                  label={t("kpiTco")} value={euro(resultaat.projectie.totaleKost / (JAREN * 12))}
                  detail={t("kpiTcoDetail")} icon="car"
                />
              </div>

              <Card className="mb-6 p-6">
                <h2 className="m-0 mb-1.5 text-[18px] font-bold text-ink">{t("tijdlijnTitel")}</h2>
                <p className="mb-4 text-[14px] text-ink-700">{t("tijdlijnIntro")}</p>
                <Uitfaseringstijdlijn uitfasering={resultaat.uitfasering} euro={euro} pct={pct} />
              </Card>

              <Card className="mb-6 p-6">
                <h2 className="m-0 mb-2 text-[18px] font-bold text-ink">{tJaar("titel")}</h2>
                <Besteljaartabel
                  vergelijking={resultaat.besteljaren}
                  formatters={{ euro, pct }}
                />
              </Card>

              <Card className="border-accent-line bg-accent-soft p-6">
                <h2 className="m-0 mb-2 text-[18px] font-bold text-ink">
                  {sessie ? t("verderTitelAangemeld") : t("verderTitel")}
                </h2>
                <p className="mb-4 max-w-[42em] text-[14.5px] leading-relaxed text-ink-700">
                  {sessie ? t("verderIntroAangemeld") : t("verderIntro")}
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href={sessie ? "/vergelijking" : "/registreren"}
                    className={knopKlassen("primair", "md")}
                  >
                    {sessie ? t("naarVergelijking") : t("registreren")}
                    <Icon name="arrow-right" size={16} />
                  </Link>
                  <Link href="/fiscaal-kader" className={knopKlassen("stil", "md")}>
                    {t("naarKader")}
                  </Link>
                </div>
              </Card>

              <p className="mt-5 text-[13px] leading-relaxed text-ink-500">{t("disclaimer")}</p>
            </>
          )}
        </div>
      </div>
    </Container>
  );
}
