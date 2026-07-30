"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Besteljaartabel from "@/components/Besteljaartabel";
import CarImage from "@/components/CarImage";
import Fiscaleopbouw from "@/components/Fiscaleopbouw";
import Icon from "@/components/Icon";
import Inlogwaarde from "@/components/Inlogwaarde";
import Kostenopbouwtabel from "@/components/Kostenopbouwtabel";
import Stappenbalk from "@/components/Stappenbalk";
import { SteunKaart } from "@/components/Steun";
import Uitfaseringstijdlijn from "@/components/Uitfaseringstijdlijn";
import Wagenkiezer from "@/components/Wagenkiezer";
import {
  Card,
  Container,
  Laadskelet,
  Melding,
  PageHead,
  StatCard,
  invoerKlassen,
  knopKlassen,
} from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { laadCatalogus, laadFiscaleContext } from "@/lib/data";
import { laadEigenModellen } from "@/lib/eigenModellen";
import { standaardBesteljaren, vergelijkBesteljaren } from "@/lib/fiscaal/besteljaar";
import { autokostenVoorModel } from "@/lib/fiscaal/catalog";
import {
  aftrekOpbouw,
  berekenProjectie,
  parametersVoorJaar,
} from "@/lib/fiscaal/engine";
import { berekenKosten, verkeersbelastingVoorbehoud } from "@/lib/fiscaal/kosten";
import { berekenUitfasering } from "@/lib/fiscaal/uitfasering";
import type { CatalogCar, FiscaleContext } from "@/lib/fiscaal/types";
import { formatters } from "@/lib/format";
import {
  BESTELJAREN,
  BTW_METHODES,
  FINANCIERINGSVORMEN,
  GEWESTEN,
  KM_SNELKEUZES,
  LOOPTIJDEN,
  STAPPEN,
  btwKeuzeMogelijk,
  gebruiksprofielUit,
  keuzesNaarWagen,
  leesKeuzes,
  naarQuery,
  zoekModel,
  type Keuzes,
} from "@/lib/simulatorflow";

/**
 * De simulator als flow.
 *
 * Wat hier voordien stond, was een rapport met een formulier ernaast: bij het
 * openen van de pagina was het eerste catalogusmodel al gekozen en stonden alle
 * uitkomsten er meteen. Er viel dus niets te beslissen, en dan voelt niets als
 * simuleren, hoe correct de cijfers ook zijn.
 *
 * Nu is het een reeks keuzes waarvan er telkens één iets zichtbaar verandert:
 * welke wagen, wanneer besteld, hoe gereden, hoe belast. Pas op het einde staat het
 * volledige resultaat, en dan pas de vraag om een account of een bijdrage.
 *
 * ## Waarom de keuzes in de URL staan
 *
 * Componentstate alleen had twee gevolgen: verversen gooide alles weg, en een
 * resultaat was niet te delen. Voor een gratis tool die van doorvertellen leeft, is
 * dat tweede het duurst. De React-state blijft hier de waarheid voor het renderen
 * (anders knippert de pagina bij elke toetsaanslag), en de URL is er de spiegel van
 * via de History API. De terug- en vooruitknop lopen daardoor door de stappen in
 * plaats van de hele pagina te verlaten.
 */
export default function SimulatorFlow() {
  const t = useTranslations("simulator");
  const tJaar = useTranslations("besteljaar");
  const tRegimes = useTranslations("regimes");
  const tCat = useTranslations("catalogus");
  const locale = useLocale();
  const fmt = formatters(locale);
  const { euro, pct, getal } = fmt;
  const zoekparameters = useSearchParams();

  const [keuzes, setKeuzes] = useState<Keuzes>(() =>
    leesKeuzes(new URLSearchParams(zoekparameters.toString())),
  );
  const [ctx, setCtx] = useState<FiscaleContext | null>(null);
  const [catalogus, setCatalogus] = useState<CatalogCar[]>([]);
  const [eigen, setEigen] = useState<CatalogCar[]>([]);
  const [fout, setFout] = useState<string | null>(null);
  // Zonder deze vlag blijft het skelet draaien wanneer het laden faalt: het
  // resultaat komt er dan nooit, en het skelet wacht op een resultaat.
  const [geladen, setGeladen] = useState(false);
  const [gekopieerd, setGekopieerd] = useState(false);

  useEffect(() => {
    Promise.all([laadFiscaleContext(), laadCatalogus()])
      .then(([c, k]) => {
        setCtx(c);
        setCatalogus(k);
      })
      .catch((e) => setFout(e instanceof Error ? e.message : String(e)))
      .finally(() => setGeladen(true));

    // De eigen modellen apart en zonder de pagina op te houden: wie niet
    // aangemeld is of migratie 0010 nog niet uitvoerde, hoort daar niets van te
    // merken. De flow werkt gewoon.
    laadEigenModellen()
      .then((r) => setEigen(r.modellen))
      .catch(() => setEigen([]));
  }, []);

  // De terug- en vooruitknop van de browser: dan is de URL de waarheid.
  useEffect(() => {
    const bij = () => setKeuzes(leesKeuzes(new URLSearchParams(window.location.search)));
    window.addEventListener("popstate", bij);
    return () => window.removeEventListener("popstate", bij);
  }, []);

  const zet = useCallback((patch: Partial<Keuzes>) => {
    setKeuzes((huidig) => ({ ...huidig, ...patch }));
    setGekopieerd(false);
  }, []);

  const gaNaar = useCallback(
    (stap: number) => {
      zet({ stap });
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [zet],
  );

  /**
   * De URL bijwerken ná het renderen, niet tijdens.
   *
   * Dit stond eerst in de updater van setKeuzes, en dat is precies één regel te
   * vroeg: Next.js onderschept history.replaceState om zijn router te verwittigen,
   * dus riep die updater een setState op in een ander component terwijl dit
   * component aan het renderen was. React waarschuwt daar terecht voor. In een
   * effect gebeurt hetzelfde na de commit, en dan klaagt niemand.
   */
  const vorigeStap = useRef(keuzes.stap);
  useEffect(() => {
    const query = naarQuery(keuzes);
    const url = query ? `${window.location.pathname}?${query}` : window.location.pathname;
    if (url !== `${window.location.pathname}${window.location.search}`) {
      // Een stapwissel hoort in de geschiedenis, zodat de terugknop door de stappen
      // loopt. Een wijziging binnen een stap niet: anders wordt elke sleepbeweging
      // op een schuifregelaar een item en raakt de terugknop onbruikbaar.
      if (keuzes.stap !== vorigeStap.current) window.history.pushState(null, "", url);
      else window.history.replaceState(null, "", url);
    }
    vorigeStap.current = keuzes.stap;
  }, [keuzes]);

  const alles = useMemo(() => [...eigen, ...catalogus], [eigen, catalogus]);
  const gekozen = zoekModel(alles, keuzes.sleutel);

  const gebruik = useMemo(() => gebruiksprofielUit(keuzes), [keuzes]);

  const wagen = useMemo(
    () => (gekozen ? keuzesNaarWagen(gekozen, keuzes) : null),
    [gekozen, keuzes],
  );

  const kostenopbouw = useMemo(
    () => (gekozen ? berekenKosten(gekozen, gebruik) : null),
    [gekozen, gebruik],
  );

  const resultaat = useMemo(() => {
    if (!ctx || !wagen) return null;
    const opties = { kmoTarief: keuzes.kmoTarief };
    const projectie = berekenProjectie(
      ctx,
      wagen,
      keuzes.besteljaar,
      keuzes.looptijd,
      opties,
    );
    const params = parametersVoorJaar(ctx, keuzes.besteljaar);
    return {
      projectie,
      eerste: projectie.jaren[0],
      tariefPct: keuzes.kmoTarief ? params.kmo_tarief : params.venb_tarief,
      vuPct: keuzes.tankkaart ? params.vu_pct_met_kaart : params.vu_pct_zonder_kaart,
      uitfasering: berekenUitfasering(ctx, wagen, keuzes.besteljaar, 2031, opties),
      besteljaren: vergelijkBesteljaren(
        ctx,
        wagen,
        standaardBesteljaren(keuzes.besteljaar),
        keuzes.looptijd,
        opties,
      ),
    };
  }, [ctx, wagen, keuzes.besteljaar, keuzes.looptijd, keuzes.kmoTarief, keuzes.tankkaart]);

  /** Het aftrekpercentage van een model in het gekozen besteljaar, voor de kaartjes. */
  const aftrekVoor = useCallback(
    (car: CatalogCar) => {
      if (!ctx) return 0;
      return aftrekOpbouw(ctx, keuzesNaarWagen(car, keuzes), keuzes.besteljaar).pct;
    },
    [ctx, keuzes],
  );

  const maandkostVoor = useCallback(
    (car: CatalogCar) => {
      if (!ctx) return 0;
      const p = berekenProjectie(
        ctx,
        keuzesNaarWagen(car, keuzes),
        keuzes.besteljaar,
        keuzes.looptijd,
        { kmoTarief: keuzes.kmoTarief },
      );
      return p.totaleKost / (keuzes.looptijd * 12);
    },
    [ctx, keuzes],
  );

  const maandkost = resultaat
    ? resultaat.projectie.totaleKost / (keuzes.looptijd * 12)
    : 0;

  const stapnamen = STAPPEN.map((s) => t(`stap_${s}`));
  const stap = keuzes.stap;
  const stapnaam = STAPPEN[stap - 1];
  const laatste = STAPPEN.length;

  /** De berekende jaarkost, dus zonder wat de bezoeker eventueel zelf invulde. */
  const berekendeKosten = gekozen ? autokostenVoorModel(gekozen, gebruik) : 0;

  async function kopieerLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setGekopieerd(true);
    } catch {
      // Zonder klembordrechten valt er niets te melden: de link staat in de
      // adresbalk en is daar te selecteren.
      setGekopieerd(false);
    }
  }

  const rijVoorBesteljaar = resultaat?.besteljaren.rijen.find((r) => r.jaar === keuzes.besteljaar);

  return (
    <Container className="py-12">
      <PageHead title={t("titel")} sub={t("intro")} />

      {fout && (
        <Melding soort="fout" className="mb-6">
          {fout}
        </Melding>
      )}

      <div className="mb-8">
        <Stappenbalk
          stappen={stapnamen}
          huidige={stap}
          label={t("voortgang")}
          onGa={gaNaar}
        />
      </div>

      <div className="mb-6">
        <h2 className="m-0 text-[clamp(20px,2.6vw,26px)] font-bold tracking-[-0.01em] text-ink">
          {t(`stap_${stapnaam}Titel`)}
        </h2>
        <p className="m-0 mt-1.5 max-w-[46em] text-[15px] leading-relaxed text-ink-700">
          {stapnaam === "resultaat"
            ? t("stap_resultaatSub", { jaren: keuzes.looptijd })
            : t(`stap_${stapnaam}Sub`)}
        </p>
      </div>

      {!geladen ? (
        <Laadskelet aantal={6} hoogte={140} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" />
      ) : alles.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="m-0 text-[15px] text-ink-700">{t("geenModel")}</p>
        </Card>
      ) : (
        <>
          {/* ---------------------------------------------------- stap 1: wagen */}
          {stapnaam === "wagen" && (
            <Wagenkiezer
              catalogus={alles}
              gekozenSleutel={keuzes.sleutel}
              onKies={(sleutel) => zet({ sleutel })}
              aftrekVoor={aftrekVoor}
              maandkostVoor={maandkostVoor}
              besteljaar={keuzes.besteljaar}
              euro={euro}
              pct={pct}
            />
          )}

          {/* --------------------------------------- stappen 2 tot 4 met paneel */}
          {stap > 1 && stap < laatste && (
            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
              <div>
                {stapnaam === "besteljaar" && gekozen && ctx && (
                  <Card className="p-6">
                    <fieldset className="m-0 border-0 p-0">
                      <legend className="sr-only">{tJaar("kiesBesteljaar")}</legend>
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {BESTELJAREN.map((jaar) => {
                          const opbouw = aftrekOpbouw(
                            ctx,
                            keuzesNaarWagen(gekozen, { ...keuzes, besteljaar: jaar }),
                            jaar,
                          );
                          const actief = keuzes.besteljaar === jaar;
                          return (
                            <button
                              key={jaar}
                              type="button"
                              aria-pressed={actief}
                              onClick={() => zet({ besteljaar: jaar })}
                              className={`rounded-[11px] border p-4 text-left transition-colors ${
                                actief
                                  ? "border-accent bg-accent-soft"
                                  : "border-line hover:border-ink-500"
                              }`}
                            >
                              <span className="flex items-baseline justify-between gap-2">
                                <span className="text-[17px] font-bold text-ink">{jaar}</span>
                                <span
                                  className={`text-[15px] font-bold ${
                                    opbouw.pct === 0 ? "text-danger" : "text-ink"
                                  }`}
                                >
                                  {pct(opbouw.pct)}
                                </span>
                              </span>
                              <span className="mt-1.5 block text-[12px] leading-snug text-ink-500">
                                {tRegimes(opbouw.periode.code)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </fieldset>
                    <p className="m-0 mt-4 text-[13px] text-ink-500">
                      {tJaar("kiesBesteljaarHint")}
                    </p>
                  </Card>
                )}

                {stapnaam === "gebruik" && gekozen && (
                  <Card className="space-y-6 p-6">
                    <div>
                      <label className="block">
                        <span className="mb-1.5 block text-[13.5px] font-bold text-ink">
                          {t("km")}
                        </span>
                        <input
                          type="number"
                          min={0}
                          step={1000}
                          className={invoerKlassen}
                          value={keuzes.km}
                          onChange={(e) => zet({ km: Math.max(0, Number(e.target.value) || 0) })}
                        />
                        <span className="mt-1 block text-[12.5px] text-ink-500">{t("kmHint")}</span>
                      </label>
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        {KM_SNELKEUZES.map((n) => (
                          <button
                            key={n}
                            type="button"
                            data-active={keuzes.km === n}
                            onClick={() => zet({ km: n })}
                            className="bs-chip h-8 rounded-full px-3 text-[13px] font-bold transition-colors"
                          >
                            {getal(n)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <fieldset className="m-0 border-0 p-0">
                      <legend className="mb-2 text-[13.5px] font-bold text-ink">
                        {t("gewest")}
                      </legend>
                      <div className="grid gap-3 sm:grid-cols-3">
                        {GEWESTEN.map((g) => (
                          <button
                            key={g}
                            type="button"
                            aria-pressed={keuzes.gewest === g}
                            onClick={() => zet({ gewest: g })}
                            className={`rounded-[11px] border p-3 text-left text-[14px] font-bold transition-colors ${
                              keuzes.gewest === g
                                ? "border-accent bg-accent-soft text-ink"
                                : "border-line text-ink-700 hover:border-ink-500"
                            }`}
                          >
                            {t(`gewest_${g}`)}
                          </button>
                        ))}
                      </div>
                      <p className="m-0 mt-2 text-[12.5px] text-ink-500">{t("gewestHint")}</p>
                    </fieldset>

                    {/*
                      Alleen wanneer er iets te laden is. Bij een verbrandingswagen
                      verandert deze schuif niets aan de energiekost, en een
                      regelaar die niets doet leest als een fout.
                    */}
                    {(gekozen.voertuigtype === "BEV" || gekozen.voertuigtype === "PHEV") && (
                      <label className="block">
                        <span className="mb-1.5 flex items-baseline justify-between gap-3">
                          <span className="text-[13.5px] font-bold text-ink">{t("thuis")}</span>
                          <span className="text-[13.5px] font-bold text-ink" data-cijfers>
                            {pct(keuzes.thuisPct)}
                          </span>
                        </span>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          value={keuzes.thuisPct}
                          onChange={(e) => zet({ thuisPct: Number(e.target.value) })}
                          className="w-full"
                          style={{ accentColor: "var(--gold)" }}
                        />
                        <span className="mt-1 block text-[12.5px] text-ink-500">
                          {t("thuisHint")}
                        </span>
                      </label>
                    )}

                    <fieldset className="m-0 border-0 p-0">
                      <legend className="mb-2 text-[13.5px] font-bold text-ink">
                        {t("looptijd")}
                      </legend>
                      <div className="flex flex-wrap gap-2">
                        {LOOPTIJDEN.map((n) => (
                          <button
                            key={n}
                            type="button"
                            aria-pressed={keuzes.looptijd === n}
                            onClick={() => zet({ looptijd: n })}
                            className={`rounded-[11px] border px-4 py-2.5 text-[14px] font-bold transition-colors ${
                              keuzes.looptijd === n
                                ? "border-accent bg-accent-soft text-ink"
                                : "border-line text-ink-700 hover:border-ink-500"
                            }`}
                          >
                            {t("aantalJaar", { aantal: n })}
                          </button>
                        ))}
                      </div>
                      <p className="m-0 mt-2 text-[12.5px] text-ink-500">{t("looptijdHint")}</p>
                    </fieldset>

                    {kostenopbouw && (
                      <div className="border-t border-line pt-5">
                        <h3 className="m-0 mb-3 text-[15px] font-bold text-ink">
                          {t("kostenTitel")}
                        </h3>
                        <Kostenopbouwtabel
                          opbouw={kostenopbouw}
                          voorbehoud={verkeersbelastingVoorbehoud(
                            keuzes.gewest,
                            gekozen.voertuigtype,
                          )}
                          euro={euro}
                        />
                      </div>
                    )}
                  </Card>
                )}

                {stapnaam === "onderneming" && (
                  <Card className="space-y-6 p-6">
                    <fieldset className="m-0 border-0 p-0">
                      <legend className="mb-2 text-[13.5px] font-bold text-ink">
                        {t("kmoVraag")}
                      </legend>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {[true, false].map((waarde) => (
                          <button
                            key={String(waarde)}
                            type="button"
                            aria-pressed={keuzes.kmoTarief === waarde}
                            onClick={() => zet({ kmoTarief: waarde })}
                            className={`rounded-[11px] border p-4 text-left transition-colors ${
                              keuzes.kmoTarief === waarde
                                ? "border-accent bg-accent-soft"
                                : "border-line hover:border-ink-500"
                            }`}
                          >
                            <span className="block text-[15px] font-bold text-ink">
                              {waarde ? t("kmoJa") : t("kmoNee")}
                            </span>
                            <span className="mt-1 block text-[13px] leading-snug text-ink-700">
                              {waarde ? t("kmoJaUitleg") : t("kmoNeeUitleg")}
                            </span>
                          </button>
                        ))}
                      </div>
                    </fieldset>

                    <fieldset className="m-0 border-0 p-0">
                      <legend className="mb-2 text-[13.5px] font-bold text-ink">
                        {t("kaartVraag")}
                      </legend>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {[true, false].map((waarde) => (
                          <button
                            key={String(waarde)}
                            type="button"
                            aria-pressed={keuzes.tankkaart === waarde}
                            onClick={() => zet({ tankkaart: waarde })}
                            className={`rounded-[11px] border p-4 text-left transition-colors ${
                              keuzes.tankkaart === waarde
                                ? "border-accent bg-accent-soft"
                                : "border-line hover:border-ink-500"
                            }`}
                          >
                            <span className="block text-[15px] font-bold text-ink">
                              {waarde ? t("kaartJa") : t("kaartNee")}
                            </span>
                            <span className="mt-1 block text-[13px] leading-snug text-ink-700">
                              {waarde ? t("kaartJaUitleg") : t("kaartNeeUitleg")}
                            </span>
                          </button>
                        ))}
                      </div>
                    </fieldset>

                    <label className="block">
                      <span className="mb-1.5 block text-[13.5px] font-bold text-ink">
                        {t("eigenBijdrage")}
                      </span>
                      <input
                        type="number"
                        min={0}
                        className={invoerKlassen}
                        value={keuzes.eigenBijdrage}
                        onChange={(e) =>
                          zet({ eigenBijdrage: Math.max(0, Number(e.target.value) || 0) })
                        }
                      />
                      <span className="mt-1 block text-[12.5px] text-ink-500">
                        {t("bijdrageHint")}
                      </span>
                    </label>

                    <fieldset className="m-0 border-0 p-0">
                      <legend className="mb-2 text-[13.5px] font-bold text-ink">
                        {t("financiering")}
                      </legend>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {FINANCIERINGSVORMEN.map((v) => (
                          <button
                            key={v}
                            type="button"
                            aria-pressed={keuzes.financiering === v}
                            onClick={() => zet({ financiering: v })}
                            className={`rounded-[11px] border px-3.5 py-2.5 text-left text-[14px] font-bold transition-colors ${
                              keuzes.financiering === v
                                ? "border-accent bg-accent-soft text-ink"
                                : "border-line text-ink-700 hover:border-ink-500"
                            }`}
                          >
                            {t(`financiering_${v}`)}
                          </button>
                        ))}
                      </div>
                    </fieldset>

                    {btwKeuzeMogelijk(keuzes.financiering) ? (
                      <fieldset className="m-0 border-0 p-0">
                        <legend className="mb-2 text-[13.5px] font-bold text-ink">{t("btw")}</legend>
                        <div className="grid gap-2 sm:grid-cols-3">
                          {BTW_METHODES.map((m) => (
                            <button
                              key={m}
                              type="button"
                              aria-pressed={keuzes.btwMethode === m}
                              onClick={() => zet({ btwMethode: m })}
                              className={`rounded-[11px] border px-3.5 py-2.5 text-left text-[14px] font-bold transition-colors ${
                                keuzes.btwMethode === m
                                  ? "border-accent bg-accent-soft text-ink"
                                  : "border-line text-ink-700 hover:border-ink-500"
                              }`}
                            >
                              {t(`btw_${m}`)}
                            </button>
                          ))}
                        </div>
                        <p className="m-0 mt-2 text-[12.5px] text-ink-500">{t("btwHint")}</p>

                        {keuzes.btwMethode === "werkelijk" && (
                          <label className="mt-4 block">
                            <span className="mb-1.5 flex items-baseline justify-between gap-3">
                              <span className="text-[13.5px] font-bold text-ink">
                                {t("beroepsgebruik")}
                              </span>
                              <span className="text-[13.5px] font-bold text-ink" data-cijfers>
                                {pct(keuzes.beroepsgebruik)}
                              </span>
                            </span>
                            <input
                              type="range"
                              min={0}
                              max={100}
                              step={5}
                              value={keuzes.beroepsgebruik}
                              onChange={(e) => zet({ beroepsgebruik: Number(e.target.value) })}
                              className="w-full"
                              style={{ accentColor: "var(--gold)" }}
                            />
                            <span className="mt-1 block text-[12.5px] text-ink-500">
                              {t("beroepsgebruikHint")}
                            </span>
                          </label>
                        )}
                      </fieldset>
                    ) : (
                      <Melding soort="let-op">{t("btwNietBijAankoop")}</Melding>
                    )}
                  </Card>
                )}
              </div>

              {/*
                Het paneel dat meebeweegt. Dit is wat de pagina van een formulier
                een simulatie maakt: je ziet het bedrag verschuiven op het moment
                dat je kiest, in plaats van drie stappen later.
              */}
              <aside className="lg:sticky lg:top-6 lg:self-start">
                <Card className="p-5">
                  {gekozen && (
                    <div className="mb-4 flex items-center gap-3">
                      <span className="h-[46px] w-[72px] shrink-0 overflow-hidden rounded-[8px] bg-paper">
                        <CarImage
                          type={gekozen.voertuigtype}
                          segment={gekozen.segment}
                          carrosserie={gekozen.carrosserie}
                          imageUrl={gekozen.image_url}
                          alt={`${gekozen.merk} ${gekozen.model}`}
                          className="h-full w-full object-cover"
                        />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[14.5px] font-bold text-ink">
                          {gekozen.merk} {gekozen.model}
                        </span>
                        <span className="block truncate text-[12.5px] text-ink-500">
                          {tRegimes(
                            resultaat?.besteljaren.rijen.find((r) => r.jaar === keuzes.besteljaar)
                              ?.opbouw.periode.code ?? "2026",
                          )}
                        </span>
                      </span>
                    </div>
                  )}

                  {resultaat ? (
                    <dl className="m-0 space-y-3">
                      <div className="flex items-baseline justify-between gap-3">
                        <dt className="text-[13px] text-ink-500">{t("kpiTco")}</dt>
                        <dd className="m-0 text-[22px] font-bold leading-none text-ink" data-cijfers>
                          {euro(maandkost)}
                        </dd>
                      </div>
                      <div className="flex items-baseline justify-between gap-3">
                        <dt className="text-[13px] text-ink-500">{t("kpiAftrek")}</dt>
                        <dd
                          className={`m-0 text-[15px] font-bold ${
                            resultaat.eerste.aftrekPct === 0 ? "text-danger" : "text-ink"
                          }`}
                          data-cijfers
                        >
                          {pct(resultaat.eerste.aftrekPct)}
                        </dd>
                      </div>
                      <div className="flex items-baseline justify-between gap-3">
                        <dt className="text-[13px] text-ink-500">{t("kpiVu")}</dt>
                        <dd className="m-0 text-[15px] font-bold text-ink" data-cijfers>
                          {euro(resultaat.eerste.verworpenUitgaven)}
                        </dd>
                      </div>
                      <div className="flex items-baseline justify-between gap-3">
                        <dt className="text-[13px] text-ink-500">{t("kpiVaa")}</dt>
                        <dd className="m-0 text-[15px] font-bold text-ink" data-cijfers>
                          {euro(resultaat.eerste.vaa)}
                        </dd>
                      </div>

                      {/*
                        Alleen op de besteljaarstap, want alleen daar is dit het
                        gevolg van de keuze die je net maakte. Het cijfer komt uit
                        de vergelijking die verderop toch al gemaakt wordt.
                      */}
                      {stapnaam === "besteljaar" && rijVoorBesteljaar && (
                        <div className="flex items-baseline justify-between gap-3 border-t border-line pt-3">
                          <dt className="text-[13px] text-ink-500">{tJaar("kolomMeerkost")}</dt>
                          <dd
                            className={`m-0 text-[15px] font-bold ${
                              rijVoorBesteljaar.meerkostTegenoverBeste > 0
                                ? "text-danger"
                                : "text-success"
                            }`}
                            data-cijfers
                          >
                            {rijVoorBesteljaar.meerkostTegenoverBeste > 0 ? "+ " : ""}
                            {euro(rijVoorBesteljaar.meerkostTegenoverBeste)}
                          </dd>
                        </div>
                      )}
                    </dl>
                  ) : (
                    <p className="m-0 text-[14px] text-ink-700">{t("kiesEerst")}</p>
                  )}
                </Card>
              </aside>
            </div>
          )}

          {/* ------------------------------------------------ stap 5: resultaat */}
          {stapnaam === "resultaat" && gekozen && resultaat && kostenopbouw && (
            <div className="space-y-6">
              <Card className="overflow-hidden">
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
                      {gekozen.voertuigtype} · {gekozen.co2} g/km ·{" "}
                      {euro(gekozen.cataloguswaarde)}
                    </div>
                    {/* De twee jaartallen die door elkaar liepen, uit elkaar
                        gehaald: waar de cijfers vandaan komen, en waarop gerekend
                        wordt. */}
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-500">
                      {gekozen.modeljaar && (
                        <span className="rounded-full bg-paper px-2.5 py-1 font-bold text-ink-700">
                          {tJaar("specificaties", { modeljaar: gekozen.modeljaar })}
                        </span>
                      )}
                      <span>{tJaar("gerekendOp", { jaar: keuzes.besteljaar })}</span>
                      {gekozen.zekerheid !== "geverifieerd" && (
                        <span className="rounded-full bg-paper px-2.5 py-1 text-ink-700">
                          {tCat("badgeRaming")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  label={t("kpiAftrek")}
                  value={pct(resultaat.eerste.aftrekPct)}
                  detail={t("kpiAftrekDetail", { jaar: keuzes.besteljaar })}
                  icon="percent"
                />
                <StatCard
                  label={t("kpiVaa")}
                  value={euro(resultaat.eerste.vaa)}
                  detail={t("kpiVaaDetail")}
                  icon="piggy-bank"
                />
                <StatCard
                  label={t("kpiVu")}
                  value={euro(resultaat.eerste.verworpenUitgaven)}
                  detail={t("kpiVuDetail")}
                  icon="calculator"
                />
                <StatCard
                  label={t("kpiTco")}
                  value={euro(maandkost)}
                  detail={t("kpiTcoDetail", { jaren: keuzes.looptijd })}
                  icon="car"
                />
              </div>

              <Card className="p-6">
                <h2 className="m-0 mb-1.5 text-[18px] font-bold text-ink">{t("kostenTitel")}</h2>
                <p className="mb-4 max-w-[46em] text-[14px] leading-relaxed text-ink-700">
                  {t("kostenIntro")}
                </p>
                {keuzes.autokosten !== null && (
                  <div className="mb-4 flex flex-wrap items-center gap-3">
                    <Melding soort="info" className="flex-1">
                      {t("kostenEigen")}
                    </Melding>
                    <button
                      type="button"
                      onClick={() => zet({ autokosten: null })}
                      className={knopKlassen("stil", "sm")}
                    >
                      {t("kostenHerstel")}
                    </button>
                  </div>
                )}
                <Kostenopbouwtabel
                  opbouw={kostenopbouw}
                  voorbehoud={verkeersbelastingVoorbehoud(keuzes.gewest, gekozen.voertuigtype)}
                  euro={euro}
                />
                <label className="mt-5 block max-w-[22em]">
                  <span className="mb-1.5 block text-[13.5px] font-bold text-ink">
                    {t("autokosten")}
                  </span>
                  <input
                    type="number"
                    min={0}
                    className={invoerKlassen}
                    value={keuzes.autokosten ?? berekendeKosten}
                    onChange={(e) =>
                      zet({ autokosten: Math.max(0, Number(e.target.value) || 0) })
                    }
                  />
                  <span className="mt-1 block text-[12.5px] text-ink-500">
                    {t("autokostenHint")}
                  </span>
                </label>
              </Card>

              <Card className="p-6">
                <h2 className="m-0 mb-1.5 text-[18px] font-bold text-ink">{t("opbouwTitel")}</h2>
                <p className="mb-4 max-w-[46em] text-[14px] leading-relaxed text-ink-700">
                  {t("opbouwIntro", { jaar: resultaat.eerste.gebruiksjaar })}
                </p>
                <Fiscaleopbouw
                  jaar={resultaat.eerste.gebruiksjaar}
                  autokosten={wagen?.jaarlijkse_autokosten ?? 0}
                  resultaat={resultaat.eerste}
                  tariefPct={resultaat.tariefPct}
                  vuPct={resultaat.vuPct}
                  euro={euro}
                  pct={pct}
                />
              </Card>

              <Card className="p-6">
                <h2 className="m-0 mb-1.5 text-[18px] font-bold text-ink">{t("tijdlijnTitel")}</h2>
                <p className="mb-4 text-[14px] text-ink-700">{t("tijdlijnIntro")}</p>
                <Uitfaseringstijdlijn
                  uitfasering={resultaat.uitfasering}
                  euro={euro}
                  pct={pct}
                />
              </Card>

              <Card className="p-6">
                <h2 className="m-0 mb-2 text-[18px] font-bold text-ink">{tJaar("titel")}</h2>
                <Besteljaartabel
                  vergelijking={resultaat.besteljaren}
                  formatters={{ euro, pct, getal }}
                  metUitleg
                />
              </Card>

              <Card className="p-6">
                <h2 className="m-0 mb-1.5 flex items-center gap-2 text-[18px] font-bold text-ink">
                  <Icon name="share-2" size={18} />
                  {t("deelTitel")}
                </h2>
                <p className="mb-4 max-w-[46em] text-[14px] leading-relaxed text-ink-700">
                  {t("deelTekst")}
                </p>
                <button
                  type="button"
                  onClick={kopieerLink}
                  aria-label={t("deelLabel")}
                  className={knopKlassen("stil", "md")}
                >
                  <Icon name={gekopieerd ? "check" : "copy"} size={16} />
                  {gekopieerd ? t("deelGekopieerd") : t("deelKopieer")}
                </button>
              </Card>

              {/* Eerst leveren, dan vragen: de accountsectie en daarna de
                  vrijwillige bijdrage, allebei ná het volledige resultaat. */}
              <Inlogwaarde />

              <SteunKaart />

              <p className="mt-1 text-[13px] leading-relaxed text-ink-500">{t("disclaimer")}</p>
            </div>
          )}

          {stapnaam === "resultaat" && !gekozen && (
            <Card className="p-10 text-center">
              <p className="m-0 mb-4 text-[15px] text-ink-700">{t("kiesEerst")}</p>
              <button
                type="button"
                onClick={() => gaNaar(1)}
                className={knopKlassen("primair", "md")}
              >
                {t(`stap_wagen`)}
              </button>
            </Card>
          )}

          {/* ------------------------------------------------------- navigatie */}
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
            <button
              type="button"
              disabled={stap === 1}
              onClick={() => gaNaar(stap - 1)}
              className="text-[14px] font-bold text-ink-500 hover:text-ink disabled:invisible"
            >
              {t("vorige")}
            </button>

            <div className="flex flex-wrap items-center gap-4">
              {/* Overslaan bestaat omdat stap 3 en 4 bruikbare standaardwaarden
                  hebben. Zonder die uitweg wordt een flow een muur. */}
              {(stapnaam === "gebruik" || stapnaam === "onderneming") && (
                <button
                  type="button"
                  onClick={() => gaNaar(stap + 1)}
                  className="text-[13.5px] font-bold text-ink-500 underline underline-offset-2 hover:text-ink"
                >
                  {t("overslaan")}
                </button>
              )}

              {stap < laatste ? (
                <button
                  type="button"
                  disabled={!keuzes.sleutel}
                  onClick={() => gaNaar(stap + 1)}
                  className={knopKlassen("primair", "md")}
                >
                  {t("volgende")}
                  <Icon name="arrow-right" size={16} />
                </button>
              ) : (
                <Link href="/fiscaal-kader" className={knopKlassen("stil", "md")}>
                  {t("naarKader")}
                </Link>
              )}
            </div>
          </div>

          {stap === 1 && !keuzes.sleutel && (
            <p className="mt-3 text-right text-[13px] text-ink-500">{t("kiesEerst")}</p>
          )}
        </>
      )}
    </Container>
  );
}
