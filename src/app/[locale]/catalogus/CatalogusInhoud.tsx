"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import Besteljaartabel from "@/components/Besteljaartabel";
import CarImage from "@/components/CarImage";
import Icon from "@/components/Icon";
import Zekerheidsregel from "@/components/Zekerheidsregel";
import { useSessie } from "@/components/SessieProvider";
import { magSchrijven } from "@/lib/rollen";
import {
  Button,
  Container,
  Laadskelet,
  LegeStaat,
  Melding,
  knopKlassen,
} from "@/components/ui";
import { Link, useRouter } from "@/i18n/navigation";
import { bewaarWagen, laadCatalogus, laadFiscaleContext } from "@/lib/data";
import { laadEigenModellen } from "@/lib/eigenModellen";
import { standaardBesteljaren, vergelijkBesteljaren } from "@/lib/fiscaal/besteljaar";
import { catalogNaarWagen, catalogPreview } from "@/lib/fiscaal/catalog";
import { berekenJaar } from "@/lib/fiscaal/engine";
import { STANDAARD_GEBRUIK, verkeersbelastingVoorbehoud } from "@/lib/fiscaal/kosten";
import type { CatalogCar, FiscaleContext, Voertuigtype } from "@/lib/fiscaal/types";
import { formatters } from "@/lib/format";

/** Bij 163 modellen is alles tegelijk tonen traag en onleesbaar. */
const PER_PAGINA = 24;

const BESTELJAREN = [2024, 2025, 2026, 2027, 2028];

const TYPEFILTERS: Array<{ code: Voertuigtype | "alle"; sleutel: string }> = [
  { code: "alle", sleutel: "filterAlle" },
  { code: "BEV", sleutel: "filterBev" },
  { code: "PHEV", sleutel: "filterPhev" },
  { code: "HEV", sleutel: "filterHev" },
  { code: "fossiel", sleutel: "filterFossiel" },
];

type Sortering = "prijsOp" | "prijsAf" | "co2Op" | "aftrekAf" | "radiusAf" | "merk";

export default function CatalogusInhoud() {
  const t = useTranslations("catalogus");
  const tJaar = useTranslations("besteljaar");
  const tKosten = useTranslations("kosten");
  const tFoto = useTranslations("fotobronnen");
  const { euro, pct, getal } = formatters(useLocale());
  const sessie = useSessie();
  const router = useRouter();

  const [ctx, setCtx] = useState<FiscaleContext | null>(null);
  const [catalogus, setCatalogus] = useState<CatalogCar[] | null>(null);
  const [eigen, setEigen] = useState<CatalogCar[]>([]);
  const [bron, setBron] = useState<"alle" | "eigen">("alle");
  /**
   * Standaard alleen wat nagekeken is.
   *
   * Van de honderdzestig modellen zijn er negen tegen een genoemde bron gelegd.
   * De rest is een raming, en een raming hoort niet als vaststaand op het scherm
   * te komen wanneer er een fiscale berekening op gebouwd wordt. Ze zijn niet
   * weggegooid: één klik zet ze erbij, met hun label.
   */
  const [ookRamingen, setOokRamingen] = useState(false);
  const [besteljaar, setBesteljaar] = useState(2026);
  const [filter, setFilter] = useState<Voertuigtype | "alle">("alle");
  const [merkFilter, setMerkFilter] = useState("alle");
  const [carrosserieFilter, setCarrosserieFilter] = useState("alle");
  const [sortering, setSortering] = useState<Sortering>("prijsOp");
  const [query, setQuery] = useState("");
  const [zichtbaar, setZichtbaar] = useState(PER_PAGINA);
  const [bezigId, setBezigId] = useState<number | null>(null);
  /*
   * Een bezoeker zonder account mag de knop wél gebruiken: die stuurt hem naar
   * de aanmeldpagina. Alleen de rol `lezer` mag hem niet gebruiken, want de
   * policy weigert die schrijfactie toch.
   */
  const magToevoegen = !sessie || magSchrijven(sessie);
  const [toegevoegd, setToegevoegd] = useState<number[]>([]);
  const [detail, setDetail] = useState<CatalogCar | null>(null);
  const [fout, setFout] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([laadFiscaleContext(), laadCatalogus()])
      .then(([c, k]) => {
        setCtx(c);
        setCatalogus(k);
      })
      .catch((e) => {
        setCatalogus([]);
        setFout(e instanceof Error ? e.message : String(e));
      });

    // De eigen modellen apart en zonder de pagina op te houden: wie niet
    // aangemeld is of migratie 0010 nog niet uitvoerde, hoort daar niets van te
    // merken. De catalogus werkt gewoon.
    laadEigenModellen()
      .then((r) => setEigen(r.modellen))
      .catch(() => setEigen([]));
  }, []);

  /**
   * Alles wat er is, vóór de zekerheidsschakelaar: die telt eigen modellen niet
   * mee. Een model dat het bedrijf zelf invoerde, is zijn eigen bron; de app
   * heeft niets nagekeken en hoort het ook niet weg te filteren.
   */
  const beschikbaar = useMemo(
    () => (bron === "eigen" ? eigen : [...eigen, ...(catalogus ?? [])]),
    [bron, eigen, catalogus],
  );

  const ramingen = useMemo(
    () => (catalogus ?? []).filter((c) => c.zekerheid !== "geverifieerd"),
    [catalogus],
  );
  const nagekeken = useMemo(
    () => (catalogus ?? []).filter((c) => c.zekerheid === "geverifieerd"),
    [catalogus],
  );

  const alles = useMemo(
    () =>
      ookRamingen || bron === "eigen"
        ? beschikbaar
        : beschikbaar.filter((c) => c.zekerheid === "geverifieerd" || eigen.includes(c)),
    [beschikbaar, ookRamingen, bron, eigen],
  );

  const merken = useMemo(
    () => [...new Set(alles.map((c) => c.merk))].sort((a, b) => a.localeCompare(b)),
    [alles],
  );
  const carrosserieen = useMemo(
    () => [...new Set(alles.map((c) => c.carrosserie).filter(Boolean))].sort() as string[],
    [alles],
  );

  /**
   * Eén berekening per model per besteljaar, gememoïseerd.
   *
   * Zonder dit draaide berekenJaar() voor elke kaart bij elke render opnieuw.
   * Bij vijfentwintig modellen viel dat niet op; bij honderdzestig wel.
   */
  const preview = useMemo(() => {
    const kaart = new Map<number, ReturnType<typeof berekenJaar>>();
    if (!ctx) return kaart;
    for (const car of alles) {
      kaart.set(car.id, berekenJaar(ctx, catalogPreview(car, besteljaar), besteljaar));
    }
    return kaart;
  }, [ctx, alles, besteljaar]);

  const gefilterd = useMemo(() => {
    const q = query.trim().toLowerCase();
    const lijst = alles.filter((c) => {
      if (filter !== "alle" && c.voertuigtype !== filter) return false;
      if (merkFilter !== "alle" && c.merk !== merkFilter) return false;
      if (carrosserieFilter !== "alle" && c.carrosserie !== carrosserieFilter) return false;
      if (!q) return true;
      // Ook op uitvoering en segment zoeken: bij honderdzestig modellen is
      // "break" of "long range" een even zinnige zoekterm als een merknaam.
      const tekst = `${c.merk} ${c.model} ${c.uitvoering ?? ""} ${c.segment ?? ""}`.toLowerCase();
      return tekst.includes(q);
    });

    const aftrek = (c: CatalogCar) => preview.get(c.id)?.aftrekPct ?? 0;
    return lijst.sort((a, b) => {
      switch (sortering) {
        case "prijsAf":
          return b.cataloguswaarde - a.cataloguswaarde;
        case "co2Op":
          return a.co2 - b.co2 || a.cataloguswaarde - b.cataloguswaarde;
        case "aftrekAf":
          return aftrek(b) - aftrek(a) || a.cataloguswaarde - b.cataloguswaarde;
        case "radiusAf":
          return (b.actieradius_km ?? 0) - (a.actieradius_km ?? 0);
        case "merk":
          return `${a.merk} ${a.model}`.localeCompare(`${b.merk} ${b.model}`);
        default:
          return a.cataloguswaarde - b.cataloguswaarde;
      }
    });
  }, [alles, filter, merkFilter, carrosserieFilter, query, sortering, preview]);

  // Bij elke wijziging opnieuw vanaf het begin tonen.
  useEffect(
    () => setZichtbaar(PER_PAGINA),
    [filter, merkFilter, carrosserieFilter, query, sortering, bron, ookRamingen],
  );

  async function voegToe(car: CatalogCar) {
    // De catalogus is bewust publiek: pas bij het toevoegen is een account
    // nodig, want dan schrijven we in de vloot van een bedrijf.
    //
    // `?verder=` erbij, want zonder dat belandde de bezoeker na het aanmelden op
    // een lege wagentabel en moest hij zijn model opnieuw zoeken tussen 163.
    if (!sessie) {
      router.push("/aanmelden?verder=/catalogus");
      return;
    }
    // De policy `vehicles_insert` weigert een lezer hoe dan ook. Zonder deze
    // controle kreeg die de rauwe Engelse PostgREST-tekst te zien in plaats van
    // te horen dat hij simpelweg geen schrijfrechten heeft; /wagens, /vloot en
    // /modellen verbergen hun schrijfacties wel.
    if (!magToevoegen) return;
    if (toegevoegd.includes(car.id)) return;
    setBezigId(car.id);
    setFout(null);
    try {
      await bewaarWagen(catalogNaarWagen(car, besteljaar));
      setToegevoegd((lijst) => [...lijst, car.id]);
    } catch (e) {
      setFout(e instanceof Error ? e.message : String(e));
    } finally {
      setBezigId(null);
    }
  }

  const toegevoegdeNamen = alles
    .filter((c) => toegevoegd.includes(c.id))
    .map((c) => `${c.merk} ${c.model}`);

  /*
   * Alleen waarschuwen wanneer het ook ergens over gaat: staat er geen enkele
   * elektrische wagen in het resultaat, dan raakt de betwiste verkeersbelasting
   * geen enkel cijfer op het scherm.
   */
  const toonBelastingvoorbehoud = gefilterd.some(
    (c) => verkeersbelastingVoorbehoud(STANDAARD_GEBRUIK.gewest, c.voertuigtype) !== null,
  );

  const detailVergelijking =
    ctx && detail
      ? vergelijkBesteljaren(ctx, catalogPreview(detail, besteljaar), standaardBesteljaren(besteljaar))
      : null;

  const selectKlassen = "bs-inp h-11 rounded-[10px] px-3 text-[14px]";

  return (
    <Container className="pb-[140px] pt-[52px]">
      <div className="mb-[30px] flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="m-0 mb-2.5 text-[clamp(30px,4vw,46px)] font-bold tracking-[-0.02em] text-ink">
            {t("kop")}
          </h1>
          <p className="m-0 max-w-[40em] text-[16.5px] text-ink-700">{t("intro")}</p>
        </div>
        <div className="relative min-w-[260px]">
          <span className="absolute left-3.5 top-1/2 inline-flex -translate-y-1/2 text-ink-500">
            <Icon name="search" size={18} />
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("zoekPlaceholder")}
            aria-label={t("zoekLabel")}
            className="bs-inp h-[46px] w-full rounded-[11px] pl-[42px] pr-4 text-[15px]"
          />
        </div>
      </div>

      {/*
        Het besteljaar bovenaan, niet verstopt. Het bepaalt elk fiscaal cijfer op
        deze pagina, en tot nu toe stond het nergens: de catalogus rekende stil
        met een bestelling op 15 januari 2026.
      */}
      <div className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-3 rounded-[12px] border border-accent-line bg-accent-soft px-5 py-4">
        <label className="flex items-center gap-2.5">
          <span className="text-[13.5px] font-bold text-ink">{tJaar("kiesBesteljaar")}</span>
          <select
            className={selectKlassen}
            value={besteljaar}
            onChange={(e) => setBesteljaar(Number(e.target.value))}
          >
            {BESTELJAREN.map((j) => (
              <option key={j} value={j}>
                {j}
              </option>
            ))}
          </select>
        </label>
        <p className="m-0 max-w-[46em] text-[13.5px] leading-relaxed text-ink-700">
          {tJaar("kiesBesteljaarHint")}
        </p>
      </div>

      {/*
        Welke cijfers nagekeken zijn, en welke niet. Dit staat boven de filters en
        niet in een voetnoot: het onderscheid bepaalt hoeveel je op een getal op
        deze pagina mag bouwen, en dat is belangrijker dan elke filter eronder.
      */}
      {catalogus !== null && ramingen.length > 0 && (
        <div className="mb-6 rounded-[12px] border border-line bg-paper px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
            <div className="max-w-[52em]">
              <div className="flex items-center gap-2 text-[14px] font-bold text-ink">
                <Icon name="check" size={16} />
                {t("zekerheidTitel")}
              </div>
              <p className="m-0 mt-1.5 text-[13.5px] leading-relaxed text-ink-700">
                {t("zekerheidUitleg", {
                  geverifieerd: nagekeken.length,
                  totaal: nagekeken.length + ramingen.length,
                })}
              </p>
              <p className="m-0 mt-1.5 text-[13px] leading-relaxed text-ink-500">
                {t("restwaardeSchatting")}
              </p>
            </div>
            <Button
              variant={ookRamingen ? "secundair" : "stil"}
              maat="sm"
              aria-pressed={ookRamingen}
              onClick={() => setOokRamingen((aan) => !aan)}
            >
              {ookRamingen
                ? t("zekerheidVerbergRamingen", { aantal: nagekeken.length })
                : t("zekerheidToonRamingen", { aantal: ramingen.length })}
            </Button>
          </div>
        </div>
      )}

      {/*
        De verkeersbelasting zit in de jaarkost van elke wagen hierboven, en voor
        een elektrische wagen is dat bedrag in 2026 betwist. Een getal in een som
        kan dat zelf niet zeggen.
      */}
      {toonBelastingvoorbehoud && (
        <Melding soort="let-op" className="mb-6">
          <span className="font-bold">{tKosten("voorbehoudTitel")}</span>{" "}
          {tKosten("voorbehoud_bevVlaanderen")} {tKosten("voorbehoud_bevWallonieBrussel")}
        </Melding>
      )}

      {eigen.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-2.5">
          {(["alle", "eigen"] as const).map((keuze) => (
            <button
              key={keuze}
              onClick={() => setBron(keuze)}
              data-active={bron === keuze}
              aria-pressed={bron === keuze}
              className="bs-chip inline-flex cursor-pointer items-center gap-[7px] rounded-full px-4 py-[9px] text-[14px] font-bold transition-all"
            >
              {keuze === "alle" ? t("bronAlle") : t("bronEigen")}
              <span className="font-bold opacity-55">
                {keuze === "alle" ? eigen.length + (catalogus?.length ?? 0) : eigen.length}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="mb-[26px] flex flex-wrap items-center justify-between gap-[18px] border-b border-line pb-[22px]">
        <div className="flex flex-wrap gap-2.5">
          {TYPEFILTERS.map((f) => {
            const aantal =
              f.code === "alle" ? alles.length : alles.filter((c) => c.voertuigtype === f.code).length;
            return (
              <button
                key={f.code}
                onClick={() => setFilter(f.code)}
                data-active={filter === f.code}
                aria-pressed={filter === f.code}
                className="bs-chip inline-flex cursor-pointer items-center gap-[7px] rounded-full px-4 py-[9px] text-[14px] font-bold transition-all"
              >
                {t(f.sleutel)} <span className="font-bold opacity-55">{aantal}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            className={selectKlassen}
            value={merkFilter}
            onChange={(e) => setMerkFilter(e.target.value)}
            aria-label={t("filterMerk")}
          >
            <option value="alle">{t("filterMerk")}</option>
            {merken.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <select
            className={selectKlassen}
            value={carrosserieFilter}
            onChange={(e) => setCarrosserieFilter(e.target.value)}
            aria-label={t("filterCarrosserie")}
          >
            <option value="alle">{t("filterCarrosserie")}</option>
            {carrosserieen.map((c) => (
              <option key={c} value={c}>
                {t(`carrosserie_${c}` as "carrosserie_suv")}
              </option>
            ))}
          </select>
          <select
            className={selectKlassen}
            value={sortering}
            onChange={(e) => setSortering(e.target.value as Sortering)}
            aria-label={t("sorteerLabel")}
          >
            <option value="prijsOp">{t("sorteerPrijsOp")}</option>
            <option value="prijsAf">{t("sorteerPrijsAf")}</option>
            <option value="aftrekAf">{t("sorteerAftrek")}</option>
            <option value="co2Op">{t("sorteerCo2")}</option>
            <option value="radiusAf">{t("sorteerRadius")}</option>
            <option value="merk">{t("sorteerMerk")}</option>
          </select>
        </div>
      </div>

      {fout && <Melding soort="fout" className="mb-6">{fout}</Melding>}

      {catalogus === null ? (
        <Laadskelet aantal={6} hoogte={330} className="grid gap-[22px] sm:grid-cols-2 lg:grid-cols-3" />
      ) : gefilterd.length === 0 ? (
        <LegeStaat
          titel={t("geenResultatenTitel")}
          tekst={t("geenResultatenTekst")}
          actie={
            <Button
              variant="stil"
              onClick={() => {
                setQuery("");
                setFilter("alle");
                setMerkFilter("alle");
                setCarrosserieFilter("alle");
              }}
            >
              {t("wisFilters")}
            </Button>
          }
        />
      ) : (
        <>
          <p className="mb-5 text-[14px] text-ink-500">
            {t("aantalGevonden", { aantal: gefilterd.length, totaal: alles.length })}
          </p>

          <div className="grid gap-[22px] sm:grid-cols-2 lg:grid-cols-3">
            {gefilterd.slice(0, zichtbaar).map((car) => {
              const j = preview.get(car.id) ?? null;
              const isToegevoegd = toegevoegd.includes(car.id);
              return (
                <div
                  key={car.id}
                  data-selected={isToegevoegd}
                  className="bs-cat-card flex flex-col overflow-hidden rounded-[14px] bg-white transition-all"
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
                    <span className="absolute left-3 top-3 rounded-full bg-white/[0.94] px-[11px] py-[5px] text-[11px] font-bold text-ink">
                      {car.voertuigtype}
                    </span>
                    {/*
                      In plaats van "#137 POPULAIR", wat bij honderdzestig
                      modellen niets meer zegt: het cijfer dat de beslissing
                      stuurt.
                    */}
                    {j && j.aftrekPct > 0 && (
                      <span className="absolute right-3 top-3 rounded-full bg-ink px-2.5 py-[5px] text-[12px] font-bold text-white">
                        {t("badgeAftrek", { pct: pct(j.aftrekPct) })}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col p-5" data-cijfers>
                    <div className="text-[18px] font-bold text-ink">
                      {car.merk} {car.model}
                    </div>
                    <div className="text-[13.5px] text-ink-500">
                      {car.uitvoering ? `${car.uitvoering} · ` : ""}
                      {t("catalogusprijs", {
                        segment: car.segment ?? "",
                        prijs: euro(car.cataloguswaarde),
                      })}
                    </div>
                    {car.modeljaar && (
                      <div className="mt-1.5 text-[12.5px] text-ink-500">
                        {tJaar("specificaties", { modeljaar: car.modeljaar })}
                      </div>
                    )}

                    <Zekerheidsregel car={car} />

                    <div className="mb-4 mt-[16px] grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-line bg-line">
                      <Cel label={t("cellAftrek")} waarde={j ? pct(j.aftrekPct) : "—"} />
                      <Cel label="CO₂" waarde={`${car.co2} g/km`} />
                      <Cel label={t("cellVaa")} waarde={j ? euro(j.vaa) : "—"} />
                      <Cel label={t("cellVu")} waarde={j ? euro(j.verworpenUitgaven) : "—"} />
                    </div>

                    <Specificaties car={car} labels={t} />

                    <div className="mt-4 flex flex-col gap-2">
                      <button
                        onClick={() => voegToe(car)}
                        data-selected={isToegevoegd}
                        disabled={bezigId === car.id || isToegevoegd || !magToevoegen}
                        className="bs-cat-add inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] text-[14.5px] font-bold transition-all"
                      >
                        <Icon name={isToegevoegd ? "check" : "plus"} size={17} />
                        {!magToevoegen
                          ? t("geenRechten")
                          : isToegevoegd
                          ? t("toegevoegd")
                          : bezigId === car.id
                            ? t("bezig")
                            : sessie
                              ? t("voegToe")
                              : t("meldAan")}
                      </button>
                      <button
                        onClick={() => setDetail(detail?.id === car.id ? null : car)}
                        aria-expanded={detail?.id === car.id}
                        className="text-[13.5px] font-bold text-ink-500 underline-offset-4 hover:text-ink hover:underline"
                      >
                        {detail?.id === car.id ? t("verbergBesteljaren") : t("toonBesteljaren")}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {zichtbaar < gefilterd.length && (
            <div className="mt-10 text-center">
              <Button variant="stil" maat="lg" onClick={() => setZichtbaar((n) => n + PER_PAGINA)}>
                {t("toonMeer", { aantal: Math.min(PER_PAGINA, gefilterd.length - zichtbaar) })}
              </Button>
            </div>
          )}

          {/*
            CC BY en CC BY-SA vragen de naamsvermelding dáár waar het werk
            gebruikt wordt. Deze regel staat onder het raster; de volledige lijst
            met auteur, licentie en bronlink staat op /fotobronnen.
          */}
          <p className="mt-10 text-center text-[13px] text-ink-500">
            {tFoto("voetnoot")}{" "}
            <Link href="/fotobronnen" className="underline underline-offset-2">
              {tFoto("titel")}
            </Link>
          </p>
        </>
      )}

      {detail && detailVergelijking && (
        <div className="mt-10 rounded-[14px] border border-line bg-white p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="m-0 text-[19px] font-bold text-ink">
              {detail.merk} {detail.model} · {tJaar("titel")}
            </h2>
            <Button variant="stil" maat="sm" onClick={() => setDetail(null)}>
              {t("sluit")}
            </Button>
          </div>
          <Besteljaartabel vergelijking={detailVergelijking} formatters={{ euro, pct, getal }} />
        </div>
      )}

      {toegevoegd.length > 0 && (
        <div
          className="bs-no-print fixed inset-x-0 bottom-0 z-40 border-t border-line"
          style={{
            background: "rgba(255,255,255,0.9)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            boxShadow: "0 -8px 28px rgba(11,31,51,0.07)",
          }}
        >
          <Container className="flex flex-wrap items-center justify-between gap-[18px] py-4">
            <div className="flex items-center gap-3.5">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] bg-accent-soft text-[17px] font-bold text-ink">
                {toegevoegd.length}
              </span>
              <div className="min-w-0">
                <div className="text-[15px] font-bold text-ink">
                  {t("aantalToegevoegd", { aantal: toegevoegd.length })}
                </div>
                <div className="truncate text-[13px] text-ink-500">
                  {toegevoegdeNamen.join(" · ")}
                </div>
              </div>
            </div>
            <Link href="/vergelijking" className={knopKlassen("primair", "lg")}>
              {t("naarVergelijking")} <Icon name="arrow-right" size={18} />
            </Link>
          </Container>
        </div>
      )}
    </Container>
  );
}

function Cel({ label, waarde }: { label: string; waarde: string }) {
  return (
    <div className="bg-white px-[13px] py-[11px]">
      <div className="text-[11.5px] text-ink-500">{label}</div>
      <div className="text-[16px] font-bold text-ink">{waarde}</div>
    </div>
  );
}


/**
 * De praktische kant van de wagen, naast de fiscale.
 *
 * Actieradius, koffervolume en trekgewicht bepalen of een wagen de job aankan.
 * Ze wegen sinds de uitbreiding van de scoringsmatrix ook echt mee, dus horen ze
 * ook zichtbaar te zijn in plaats van alleen in de eindscore door te sijpelen.
 */
function Specificaties({
  car,
  labels,
}: {
  car: CatalogCar;
  labels: (sleutel: "specRadius" | "specKoffer" | "specTrek" | "specVermogen") => string;
}) {
  const items: Array<[string, string]> = [];
  if (car.actieradius_km) items.push([labels("specRadius"), `${car.actieradius_km} km`]);
  if (car.koffer_liter) items.push([labels("specKoffer"), `${car.koffer_liter} l`]);
  if (car.trekgewicht_kg) items.push([labels("specTrek"), `${car.trekgewicht_kg} kg`]);
  if (car.vermogen_kw) items.push([labels("specVermogen"), `${car.vermogen_kw} kW`]);
  if (items.length === 0) return null;

  return (
    <dl className="m-0 flex flex-wrap gap-x-4 gap-y-1.5 text-[12.5px] text-ink-500">
      {items.map(([label, waarde]) => (
        <div key={label} className="flex gap-1.5">
          <dt className="m-0">{label}</dt>
          <dd className="m-0 font-bold text-ink-700">{waarde}</dd>
        </div>
      ))}
    </dl>
  );
}
