"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "@/components/Icon";
import { useSessie } from "@/components/SessieProvider";
import { Badge, Card, Container, PageHead, SectionTitle, StatCard, TypeDot } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { bewaarWagen, laadFiscaleContext, laadWagens } from "@/lib/data";
import { CSV_KOLOMMEN, csvSjabloon, leesBoolean, leesCsv, leesGetal, wagensNaarCsv } from "@/lib/csv";
import { berekenVlootPrognose, vervangkalender } from "@/lib/fiscaal/vloot";
import type { FiscaleContext, Vehicle } from "@/lib/fiscaal/types";
import { formatters } from "@/lib/format";
import { magSchrijven } from "@/lib/rollen";

const EINDJAAR = 2031;

/** Zet een ingelezen CSV-regel om naar de velden van een wagen. */
function regelNaarWagen(waarden: Partial<Record<string, string>>): Omit<Vehicle, "id"> {
  return {
    omschrijving: waarden.omschrijving ?? "",
    werknemer: null,
    kenteken: null,
    categorie: waarden.categorie === "vloot" ? "vloot" : "kandidaat",
    merk: waarden.merk || null,
    model: waarden.model || null,
    catalog_id: null,
    voertuigtype: (waarden.voertuigtype ?? "BEV") as Vehicle["voertuigtype"],
    brandstof: (waarden.brandstof ?? "elektrisch") as Vehicle["brandstof"],
    besteldatum: waarden.besteldatum ?? "",
    eerste_ingebruikname: waarden.eerste_ingebruikname ?? "",
    co2: leesGetal(waarden.co2) ?? 0,
    cataloguswaarde: leesGetal(waarden.cataloguswaarde) ?? 0,
    jaarlijkse_autokosten: leesGetal(waarden.jaarlijkse_autokosten) ?? 0,
    aankoopprijs: leesGetal(waarden.aankoopprijs),
    tankkaart: leesBoolean(waarden.tankkaart),
    beroepsgebruik_pct: leesGetal(waarden.beroepsgebruik_pct) ?? 100,
    thuislaadpunt: leesBoolean(waarden.thuislaadpunt),
    km_per_jaar: leesGetal(waarden.km_per_jaar),
    flex_score: leesGetal(waarden.flex_score) ?? 5,
    restwaarde_score: leesGetal(waarden.restwaarde_score) ?? 5,
    btw_methode: (waarden.btw_methode ?? "geen") as Vehicle["btw_methode"],
    kosten_financiering: leesGetal(waarden.kosten_financiering),
    eigen_bijdrage_maand: leesGetal(waarden.eigen_bijdrage_maand) ?? 0,
    laadpaal_jaarkost: leesGetal(waarden.laadpaal_jaarkost) ?? 0,
    laadstroom_jaar: leesGetal(waarden.laadstroom_jaar) ?? 0,
    einde_contract: waarden.einde_contract || null,
  };
}

/** Start een download vanuit de browser, zonder server. */
function downloadTekst(naam: string, inhoud: string) {
  const blob = new Blob(["﻿", inhoud], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = naam;
  a.click();
  URL.revokeObjectURL(url);
}

export default function VlootPagina() {
  const t = useTranslations("vloot");
  const locale = useLocale();
  const { euro, pct } = formatters(locale);
  const sessie = useSessie();
  const magBewerken = magSchrijven(sessie);
  const bestandKiezer = useRef<HTMLInputElement>(null);

  const [ctx, setCtx] = useState<FiscaleContext | null>(null);
  const [wagens, setWagens] = useState<Vehicle[] | null>(null);
  // Los van `wagens`, want die blijft null bij een laadfout. Zonder deze vlag
  // draait het skelet eeuwig door naast de foutmelding.
  const [geladen, setGeladen] = useState(false);
  const [startjaar, setStartjaar] = useState(new Date().getFullYear());
  const [melding, setMelding] = useState<string | null>(null);
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);

  const kmoTarief = sessie?.bedrijf.is_kmo ?? false;

  const herlaad = () => laadWagens().then(setWagens);

  useEffect(() => {
    Promise.all([laadFiscaleContext(), laadWagens()])
      .then(([c, w]) => {
        setCtx(c);
        setWagens(w);
      })
      .catch((e) => setFout(e instanceof Error ? e.message : String(e)))
      .finally(() => setGeladen(true));
  }, []);

  const prognose = useMemo(() => {
    if (!ctx || !wagens?.length) return null;
    return berekenVlootPrognose(ctx, wagens, startjaar, EINDJAAR, { kmoTarief });
  }, [ctx, wagens, startjaar, kmoTarief]);

  const kalender = useMemo(
    () => (wagens ? vervangkalender(wagens, new Date(), 18) : []),
    [wagens],
  );

  async function importeer(bestand: File) {
    setFout(null);
    setMelding(null);
    setBezig(true);
    try {
      const resultaat = leesCsv(await bestand.text());
      if (resultaat.regels.length === 0) throw new Error(t("importLeeg"));

      const mislukt: string[] = [];
      let gelukt = 0;
      for (const regel of resultaat.regels) {
        try {
          await bewaarWagen(regelNaarWagen(regel.waarden));
          gelukt++;
        } catch (e) {
          mislukt.push(`${t("regel")} ${regel.regelnummer}: ${e instanceof Error ? e.message : e}`);
        }
      }

      await herlaad();
      setMelding(t("importKlaar", { gelukt, mislukt: mislukt.length }));
      // De fouten per regel tonen, niet enkel een aantal: anders weet niemand
      // welke rij aangepast moet worden.
      if (mislukt.length) setFout(mislukt.slice(0, 5).join(" · "));
    } catch (e) {
      setFout(e instanceof Error ? e.message : String(e));
    } finally {
      setBezig(false);
      if (bestandKiezer.current) bestandKiezer.current.value = "";
    }
  }

  const jaren = prognose?.jaren ?? [];
  const maxKost = Math.max(1, ...jaren.map((j) => j.totaleKost));
  const ditJaar = jaren[0];

  return (
    <Container className="py-12">
      <PageHead
        title={t("titel")}
        sub={t("intro")}
        action={
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => downloadTekst("vloot.csv", wagensNaarCsv(wagens ?? []))}
              disabled={!wagens?.length}
              className="inline-flex h-[42px] items-center gap-2 rounded-[10px] border border-line px-4 text-[14px] font-bold text-ink hover:border-ink-500 disabled:opacity-50"
            >
              <Icon name="download" size={16} /> {t("exporteren")}
            </button>
            {magBewerken && (
              <>
                <button
                  onClick={() => bestandKiezer.current?.click()}
                  disabled={bezig}
                  className="inline-flex h-[42px] items-center gap-2 rounded-[10px] border border-line px-4 text-[14px] font-bold text-ink hover:border-ink-500 disabled:opacity-50"
                >
                  <Icon name="upload" size={16} /> {t("importeren")}
                </button>
                <input
                  ref={bestandKiezer}
                  type="file"
                  accept=".csv,text/csv"
                  className="sr-only"
                  aria-label={t("importeren")}
                  onChange={(e) => {
                    const bestand = e.target.files?.[0];
                    if (bestand) importeer(bestand);
                  }}
                />
              </>
            )}
          </div>
        }
      />

      {melding && (
        <p role="status" className="mb-6 rounded-[10px] border border-emerald-600/30 bg-emerald-50 px-4 py-3 text-[14px] text-emerald-900">
          {melding}
        </p>
      )}
      {fout && (
        <p role="alert" className="mb-6 rounded-[10px] border border-danger/30 bg-danger/[0.06] px-4 py-3 text-[14px] text-danger">
          {fout}
        </p>
      )}

      {!geladen ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[132px] animate-pulse rounded-[13px] bg-line" />
          ))}
        </div>
      ) : wagens === null ? null : wagens.length === 0 ? (
        <Card className="p-12 text-center">
          <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full border border-line bg-paper text-ink-500">
            <Icon name="car" size={26} />
          </span>
          <h2 className="m-0 mb-2 text-[19px] font-bold text-ink">{t("leegTitel")}</h2>
          <p className="mx-auto mb-6 max-w-[34em] text-[15px] text-ink-700">{t("leegIntro")}</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/wagens"
              className="inline-flex h-[44px] items-center gap-2 rounded-[10px] bg-gold px-5 text-[14.5px] font-bold text-white hover:bg-gold-hover"
            >
              <Icon name="plus" size={16} /> {t("leegActie")}
            </Link>
            <button
              onClick={() => downloadTekst("sjabloon-vloot.csv", csvSjabloon())}
              className="inline-flex h-[44px] items-center gap-2 rounded-[10px] border border-line px-5 text-[14.5px] font-bold text-ink hover:border-ink-500"
            >
              <Icon name="download" size={16} /> {t("sjabloon")}
            </button>
          </div>
        </Card>
      ) : (
        <>
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label={t("kpiWagens")}
              value={wagens.length}
              detail={t("kpiWagensDetail", { jaar: startjaar })}
              icon="car"
            />
            <StatCard
              label={t("kpiVu")}
              value={euro(ditJaar?.verworpenUitgaven ?? 0)}
              detail={t("kpiVuDetail")}
              icon="percent"
            />
            <StatCard
              label={t("kpiMeerkost")}
              value={euro((ditJaar?.extraVenB ?? 0) + (ditJaar?.rsz ?? 0))}
              detail={t("kpiMeerkostDetail")}
              icon="calculator"
            />
            <StatCard
              label={t("kpiAftrek")}
              value={pct(ditJaar?.gemiddeldeAftrekPct ?? 0)}
              detail={t("kpiAftrekDetail")}
              icon="trending-down"
            />
          </div>

          <Card className="mb-8 p-6 sm:p-7">
            <SectionTitle sub={t("prognoseSub", { eindjaar: EINDJAAR })}>
              {t("prognose")}
            </SectionTitle>

            <div className="bs-cmp-scroll">
              <table className="w-full min-w-[560px] text-[14.5px]">
                <caption className="sr-only">{t("prognoseSub", { eindjaar: EINDJAAR })}</caption>
                <thead>
                  <tr className="border-b border-line text-left text-[13px] text-ink-500">
                    <th scope="col" className="py-2 pr-4 font-bold">{t("kolomJaar")}</th>
                    <th scope="col" className="py-2 pr-4 text-right font-bold">{t("kolomAftrek")}</th>
                    <th scope="col" className="py-2 pr-4 text-right font-bold">{t("kolomVu")}</th>
                    <th scope="col" className="py-2 pr-4 text-right font-bold">{t("kolomMeerkost")}</th>
                    <th scope="col" className="py-2 text-right font-bold">{t("kolomTotaal")}</th>
                  </tr>
                </thead>
                <tbody>
                  {jaren.map((j) => (
                    <tr key={j.jaar} className="border-b border-line/60">
                      <th scope="row" className="py-2.5 pr-4 text-left font-bold text-ink">{j.jaar}</th>
                      <td className="py-2.5 pr-4 text-right">{pct(j.gemiddeldeAftrekPct)}</td>
                      <td className="py-2.5 pr-4 text-right">{euro(j.verworpenUitgaven)}</td>
                      <td className="py-2.5 pr-4 text-right">{euro(j.extraVenB + j.rsz)}</td>
                      <td className="py-2.5 text-right font-bold text-ink">
                        <span className="flex items-center justify-end gap-2">
                          <span
                            aria-hidden="true"
                            className="hidden h-[7px] rounded-full bg-gold sm:block"
                            style={{ width: `${Math.round((j.totaleKost / maxKost) * 90)}px` }}
                          />
                          {euro(j.totaleKost)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <label className="mt-5 flex flex-wrap items-center gap-2 text-[14px] text-ink-700">
              {t("vanafJaar")}
              <select
                className="bs-inp h-[38px] rounded-[9px] px-2.5 text-[14px]"
                value={startjaar}
                onChange={(e) => setStartjaar(Number(e.target.value))}
              >
                {[2025, 2026, 2027, 2028, 2029, 2030].map((j) => (
                  <option key={j} value={j}>{j}</option>
                ))}
              </select>
            </label>
          </Card>

          <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <Card className="p-6 sm:p-7">
              <SectionTitle sub={t("perWagenSub")}>{t("perWagen")}</SectionTitle>
              <ul className="m-0 list-none space-y-2 p-0">
                {prognose?.wagens.map((w) => (
                  <li
                    key={w.vehicle.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-line px-4 py-3"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <TypeDot type={w.vehicle.voertuigtype} />
                      <span className="truncate text-[14.5px] font-bold text-ink">
                        {w.vehicle.omschrijving}
                      </span>
                      {w.nulJaar !== null && (
                        <Badge tint="rose">{t("nulVanaf", { jaar: w.nulJaar })}</Badge>
                      )}
                    </span>
                    <span className="flex shrink-0 items-center gap-4 text-[13.5px]">
                      <span className="text-ink-500">{pct(w.aftrekPctJaar1)}</span>
                      <span className="font-bold text-ink">{euro(w.fiscaleMeerkostJaar1)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="p-6 sm:p-7">
              <SectionTitle sub={t("kalenderSub")}>{t("kalender")}</SectionTitle>
              {kalender.length === 0 ? (
                <p className="text-[14px] text-ink-700">{t("kalenderLeeg")}</p>
              ) : (
                <ul className="m-0 list-none space-y-2 p-0">
                  {kalender.map((k) => (
                    <li
                      key={k.vehicle.id}
                      className="flex items-center justify-between gap-3 rounded-[10px] bg-paper px-4 py-2.5"
                    >
                      <span className="min-w-0 truncate text-[14px] text-ink-700">
                        {k.vehicle.omschrijving}
                      </span>
                      <Badge tint={k.maandenTeGaan <= 0 ? "rose" : k.maandenTeGaan <= 6 ? "amber" : "slate"}>
                        {k.maandenTeGaan <= 0
                          ? t("verlopen")
                          : t("maandenTeGaan", { maanden: k.maandenTeGaan })}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <p className="mt-6 text-[13px] text-ink-500">
            {t("csvUitleg", { kolommen: CSV_KOLOMMEN.length })}{" "}
            <button
              onClick={() => downloadTekst("sjabloon-vloot.csv", csvSjabloon())}
              className="font-bold text-ink underline hover:text-gold"
            >
              {t("sjabloon")}
            </button>
          </p>
        </>
      )}
    </Container>
  );
}
