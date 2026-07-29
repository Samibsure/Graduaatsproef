"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import Dialoog from "@/components/Dialoog";
import Icon from "@/components/Icon";
import { useSessie } from "@/components/SessieProvider";
import {
  Button,
  Card,
  Container,
  Laadskelet,
  LegeStaat,
  Melding,
  PageHead,
  Tabel,
  Veld,
  invoerKlassen,
} from "@/components/ui";
import {
  MODEL_KOLOMMEN,
  leesCsv,
  leesGetal,
  leesUitrusting,
  modelSjabloon,
  modellenNaarCsv,
  type ModelKolom,
} from "@/lib/csv";
import {
  bewaarEigenModel,
  importeerEigenModellen,
  laadEigenModellen,
  verwijderEigenModel,
  type EigenModel,
  type EigenModelInvoer,
} from "@/lib/eigenModellen";
import { berekenKosten } from "@/lib/fiscaal/kosten";
import type { CatalogCar } from "@/lib/fiscaal/types";
import { formatters } from "@/lib/format";
import { magSchrijven } from "@/lib/rollen";

type Formulier = Partial<EigenModelInvoer> & { eigen_id?: string };

const LEEG: Formulier = {
  merk: "",
  model: "",
  uitvoering: null,
  voertuigtype: "BEV",
  brandstof: "elektrisch",
  carrosserie: "suv",
  segment: null,
  modeljaar: new Date().getFullYear(),
  co2: 0,
  cataloguswaarde: 40000,
  vermogen_kw: 150,
  aandrijving: "voor",
  verbruik: 16,
  batterij_kwh: 60,
  actieradius_km: 400,
  laadvermogen_dc_kw: 100,
  zitplaatsen: 5,
  koffer_liter: 450,
  trekgewicht_kg: 0,
  restwaarde_pct_4j: 45,
  onderhoudsklasse: "laag",
  uitrusting: [],
  bron: null,
  opmerking: null,
};

/** Zet één CSV-regel om naar de invoer van een model. */
function regelNaarModel(waarden: Partial<Record<ModelKolom, string>>): Partial<EigenModelInvoer> {
  const tekst = (k: ModelKolom) => (waarden[k]?.trim() ? waarden[k]!.trim() : null);
  return {
    merk: waarden.merk?.trim() ?? "",
    model: waarden.model?.trim() ?? "",
    uitvoering: tekst("uitvoering"),
    // De enums worden hier niet gecast maar doorgegeven zoals ze staan; Zod
    // weigert een onbekende waarde met de naam van het veld erbij. De import van
    // de vloot deed dit met een blinde cast, waarna pas de databank protesteerde.
    voertuigtype: waarden.voertuigtype?.trim() as EigenModelInvoer["voertuigtype"],
    brandstof: waarden.brandstof?.trim() as EigenModelInvoer["brandstof"],
    carrosserie: tekst("carrosserie") as EigenModelInvoer["carrosserie"],
    segment: tekst("segment"),
    modeljaar: leesGetal(waarden.modeljaar),
    co2: leesGetal(waarden.co2) ?? 0,
    cataloguswaarde: leesGetal(waarden.cataloguswaarde) ?? 0,
    vermogen_kw: leesGetal(waarden.vermogen_kw),
    aandrijving: tekst("aandrijving") as EigenModelInvoer["aandrijving"],
    verbruik: leesGetal(waarden.verbruik),
    batterij_kwh: leesGetal(waarden.batterij_kwh),
    actieradius_km: leesGetal(waarden.actieradius_km),
    laadvermogen_dc_kw: leesGetal(waarden.laadvermogen_dc_kw),
    zitplaatsen: leesGetal(waarden.zitplaatsen),
    koffer_liter: leesGetal(waarden.koffer_liter),
    trekgewicht_kg: leesGetal(waarden.trekgewicht_kg),
    restwaarde_pct_4j: leesGetal(waarden.restwaarde_pct_4j),
    onderhoudsklasse: tekst("onderhoudsklasse") as EigenModelInvoer["onderhoudsklasse"],
    uitrusting: leesUitrusting(waarden.uitrusting),
    bron: tekst("bron"),
    opmerking: tekst("opmerking"),
  };
}

function downloadTekst(naam: string, inhoud: string) {
  const blob = new Blob(["﻿" + inhoud], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = naam;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Pas opruimen nadat de browser de download echt heeft opgepakt; meteen
  // intrekken laat het bestand in Safari en Firefox soms leeg.
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * De eigen modellenbibliotheek.
 *
 * De ingebouwde catalogus dekt de courante Belgische bedrijfswagens, maar niet
 * elk bedrijf rijdt courant. Hier maak je een model met je eigen cijfers, uit een
 * offerte of uit een bestaand contract, en gebruik je het daarna net als een
 * catalogusmodel.
 */
export default function ModellenPagina() {
  const t = useTranslations("modellen");
  const { euro } = formatters(useLocale());
  const magBewerken = magSchrijven(useSessie());
  const bestandKiezer = useRef<HTMLInputElement>(null);

  const [modellen, setModellen] = useState<EigenModel[] | null>(null);
  const [nogNietBeschikbaar, setNogNietBeschikbaar] = useState(false);
  const [formulier, setFormulier] = useState<Formulier | null>(null);
  const [teVerwijderen, setTeVerwijderen] = useState<EigenModel | null>(null);
  const [bezig, setBezig] = useState(false);
  const [melding, setMelding] = useState<string | null>(null);
  const [fout, setFout] = useState<string | null>(null);

  const herlaad = async () => {
    const r = await laadEigenModellen();
    setModellen(r.modellen);
    setNogNietBeschikbaar(r.nogNietBeschikbaar);
  };

  useEffect(() => {
    herlaad().catch((e) => {
      setModellen([]);
      setFout(e instanceof Error ? e.message : String(e));
    });
  }, []);

  const zet = <K extends keyof Formulier>(veld: K, waarde: Formulier[K]) =>
    setFormulier((f) => (f ? { ...f, [veld]: waarde } : f));

  async function bewaar() {
    if (!formulier) return;
    setBezig(true);
    setFout(null);
    setMelding(null);
    try {
      await bewaarEigenModel(formulier);
      await herlaad();
      setFormulier(null);
      setMelding(t("bewaard"));
    } catch (e) {
      setFout(e instanceof Error ? e.message : String(e));
    } finally {
      setBezig(false);
    }
  }

  async function verwijder(model: EigenModel) {
    setTeVerwijderen(null);
    setFout(null);
    try {
      await verwijderEigenModel(model.eigen_id);
      await herlaad();
    } catch (e) {
      setFout(e instanceof Error ? e.message : String(e));
    }
  }

  async function importeer(bestand: File) {
    setBezig(true);
    setFout(null);
    setMelding(null);
    try {
      const gelezen = leesCsv(await bestand.text(), MODEL_KOLOMMEN);
      if (gelezen.regels.length === 0) throw new Error(t("importLeeg"));

      const uitkomst = await importeerEigenModellen(
        gelezen.regels.map((r) => regelNaarModel(r.waarden)),
      );
      await herlaad();
      setMelding(t("importKlaar", { gelukt: uitkomst.gelukt, mislukt: uitkomst.fouten.length }));
      if (uitkomst.fouten.length) {
        // Per regel zeggen wat er mis is, niet alleen hoeveel er misgingen:
        // anders weet niemand welke rij aangepast moet worden.
        setFout(
          uitkomst.fouten
            .slice(0, 5)
            .map((f) => `${t("regel")} ${f.regel}: ${f.bericht}`)
            .join(" · "),
        );
      }
    } catch (e) {
      setFout(e instanceof Error ? e.message : String(e));
    } finally {
      setBezig(false);
      if (bestandKiezer.current) bestandKiezer.current.value = "";
    }
  }

  /** De berekende jaarkost, zodat meteen zichtbaar is wat het model oplevert. */
  const jaarkost = (m: CatalogCar) => berekenKosten(m).totaal;

  return (
    <Container className="py-12">
      <PageHead
        eyebrow={t("eyebrow")}
        title={t("titel")}
        sub={t("intro")}
        action={
          magBewerken && !nogNietBeschikbaar ? (
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => setFormulier({ ...LEEG })}>
                <Icon name="plus" size={16} /> {t("nieuw")}
              </Button>
              <Button variant="stil" onClick={() => bestandKiezer.current?.click()} disabled={bezig}>
                <Icon name="upload" size={16} /> {t("importeer")}
              </Button>
              <input
                ref={bestandKiezer}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const bestand = e.target.files?.[0];
                  if (bestand) importeer(bestand);
                }}
              />
            </div>
          ) : undefined
        }
      />

      {melding && <Melding soort="ok" className="mb-6">{melding}</Melding>}
      {fout && <Melding soort="fout" className="mb-6">{fout}</Melding>}

      {nogNietBeschikbaar ? (
        <Melding soort="let-op">{t("nogNietBeschikbaar")}</Melding>
      ) : modellen === null ? (
        <Laadskelet aantal={3} hoogte={120} className="grid gap-4" />
      ) : (
        <>
          {formulier && (
            <Card className="mb-8 p-6 sm:p-7">
              <h2 className="m-0 mb-5 text-[19px] font-bold text-ink">
                {formulier.eigen_id ? t("bewerken") : t("nieuw")}
              </h2>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Veld label={t("merk")}>
                  <input
                    className={invoerKlassen}
                    value={formulier.merk ?? ""}
                    onChange={(e) => zet("merk", e.target.value)}
                  />
                </Veld>
                <Veld label={t("model")}>
                  <input
                    className={invoerKlassen}
                    value={formulier.model ?? ""}
                    onChange={(e) => zet("model", e.target.value)}
                  />
                </Veld>
                <Veld label={t("uitvoering")} hint={t("optioneel")}>
                  <input
                    className={invoerKlassen}
                    value={formulier.uitvoering ?? ""}
                    onChange={(e) => zet("uitvoering", e.target.value || null)}
                  />
                </Veld>

                <Veld label={t("voertuigtype")}>
                  <select
                    className={invoerKlassen}
                    value={formulier.voertuigtype}
                    onChange={(e) => {
                      const type = e.target.value as EigenModelInvoer["voertuigtype"];
                      zet("voertuigtype", type);
                      // Een elektrische wagen stoot per definitie niets uit en
                      // rijdt op stroom; die twee velden hoeven dan niet apart
                      // gezet te worden, en fout zetten kan zo ook niet.
                      if (type === "BEV") {
                        zet("co2", 0);
                        zet("brandstof", "elektrisch");
                      } else if (formulier.brandstof === "elektrisch") {
                        zet("brandstof", "benzine");
                      }
                    }}
                  >
                    {(["BEV", "PHEV", "HEV", "fossiel"] as const).map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </Veld>
                <Veld label={t("brandstof")}>
                  <select
                    className={invoerKlassen}
                    value={formulier.brandstof}
                    disabled={formulier.voertuigtype === "BEV"}
                    onChange={(e) =>
                      zet("brandstof", e.target.value as EigenModelInvoer["brandstof"])
                    }
                  >
                    {(["elektrisch", "diesel", "benzine", "lpg", "cng"] as const).map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </Veld>
                <Veld label={t("carrosserie")}>
                  <select
                    className={invoerKlassen}
                    value={formulier.carrosserie ?? "suv"}
                    onChange={(e) =>
                      zet("carrosserie", e.target.value as EigenModelInvoer["carrosserie"])
                    }
                  >
                    {(["hatchback", "berline", "break", "suv", "mpv", "coupe", "bestelwagen"] as const).map(
                      (c) => (
                        <option key={c} value={c}>{t(`carrosserie_${c}` as "carrosserie_suv")}</option>
                      ),
                    )}
                  </select>
                </Veld>

                <Getalveld label={t("modeljaar")} hint={t("modeljaarHint")} waarde={formulier.modeljaar} zet={(v) => zet("modeljaar", v)} />
                <Getalveld label={t("co2")} waarde={formulier.co2} zet={(v) => zet("co2", v ?? 0)} uitgeschakeld={formulier.voertuigtype === "BEV"} />
                <Getalveld label={t("cataloguswaarde")} waarde={formulier.cataloguswaarde} zet={(v) => zet("cataloguswaarde", v ?? 0)} />

                <Getalveld label={t("vermogen")} waarde={formulier.vermogen_kw} zet={(v) => zet("vermogen_kw", v)} />
                <Getalveld label={t("verbruik")} hint={t("verbruikHint")} waarde={formulier.verbruik} zet={(v) => zet("verbruik", v)} />
                <Getalveld label={t("batterij")} waarde={formulier.batterij_kwh} zet={(v) => zet("batterij_kwh", v)} />

                <Getalveld label={t("actieradius")} waarde={formulier.actieradius_km} zet={(v) => zet("actieradius_km", v)} />
                <Getalveld label={t("laadvermogen")} waarde={formulier.laadvermogen_dc_kw} zet={(v) => zet("laadvermogen_dc_kw", v)} />
                <Getalveld label={t("restwaarde")} hint={t("restwaardeHint")} waarde={formulier.restwaarde_pct_4j} zet={(v) => zet("restwaarde_pct_4j", v)} />

                <Getalveld label={t("zitplaatsen")} waarde={formulier.zitplaatsen} zet={(v) => zet("zitplaatsen", v)} />
                <Getalveld label={t("koffer")} waarde={formulier.koffer_liter} zet={(v) => zet("koffer_liter", v)} />
                <Getalveld label={t("trekgewicht")} waarde={formulier.trekgewicht_kg} zet={(v) => zet("trekgewicht_kg", v)} />

                <Veld label={t("uitrusting")} hint={t("uitrustingHint")}>
                  <input
                    className={invoerKlassen}
                    value={(formulier.uitrusting ?? []).join(", ")}
                    onChange={(e) =>
                      zet(
                        "uitrusting",
                        e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                      )
                    }
                  />
                </Veld>
                <Veld label={t("bron")} hint={t("bronHint")}>
                  <input
                    className={invoerKlassen}
                    value={formulier.bron ?? ""}
                    onChange={(e) => zet("bron", e.target.value || null)}
                  />
                </Veld>
                <Veld label={t("segment")} hint={t("optioneel")}>
                  <input
                    className={invoerKlassen}
                    value={formulier.segment ?? ""}
                    onChange={(e) => zet("segment", e.target.value || null)}
                  />
                </Veld>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-5">
                <Button onClick={bewaar} disabled={bezig || !formulier.merk || !formulier.model}>
                  {bezig ? t("bezig") : t("bewaar")}
                </Button>
                <Button variant="stil" onClick={() => setFormulier(null)} disabled={bezig}>
                  {t("annuleer")}
                </Button>
              </div>
            </Card>
          )}

          {modellen.length === 0 ? (
            <LegeStaat
              icoon="car"
              titel={t("leegTitel")}
              tekst={t("leegTekst")}
              actie={
                magBewerken ? (
                  <>
                    <Button onClick={() => setFormulier({ ...LEEG })}>
                      <Icon name="plus" size={16} /> {t("nieuw")}
                    </Button>
                    <Button
                      variant="stil"
                      onClick={() => downloadTekst("sjabloon-modellen.csv", modelSjabloon())}
                    >
                      <Icon name="download" size={16} /> {t("sjabloon")}
                    </Button>
                  </>
                ) : undefined
              }
            />
          ) : (
            <Card>
              <Tabel minBreedte={760} bijschrift={t("titel")}>
                <thead className="border-b border-line bg-paper text-left text-xs uppercase tracking-wide text-ink-500">
                  <tr>
                    <th scope="col" className="px-4 py-3">{t("kolomModel")}</th>
                    <th scope="col" className="px-4 py-3">{t("kolomType")}</th>
                    <th scope="col" className="px-4 py-3 text-right">{t("modeljaar")}</th>
                    <th scope="col" className="px-4 py-3 text-right">CO₂</th>
                    <th scope="col" className="px-4 py-3 text-right">{t("cataloguswaarde")}</th>
                    <th scope="col" className="px-4 py-3 text-right">{t("kolomJaarkost")}</th>
                    <th scope="col" className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line" data-cijfers>
                  {modellen.map((m) => (
                    <tr key={m.eigen_id}>
                      <th scope="row" className="px-4 py-3 text-left">
                        <span className="font-bold text-ink">
                          {m.merk} {m.model}
                        </span>
                        {m.uitvoering && (
                          <span className="block text-[13px] font-normal text-ink-500">
                            {m.uitvoering}
                          </span>
                        )}
                      </th>
                      <td className="px-4 py-3 text-ink-700">{m.voertuigtype}</td>
                      <td className="px-4 py-3 text-right text-ink-700">{m.modeljaar ?? "–"}</td>
                      <td className="px-4 py-3 text-right text-ink-700">{m.co2} g/km</td>
                      <td className="px-4 py-3 text-right text-ink-700">
                        {euro(m.cataloguswaarde)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-ink">
                        {euro(jaarkost(m))}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {magBewerken ? (
                          <>
                            <button
                              onClick={() => setFormulier({ ...m })}
                              className="text-sm font-bold text-ink hover:underline"
                            >
                              {t("bewerk")}
                            </button>
                            <button
                              onClick={() => setTeVerwijderen(m)}
                              className="ml-4 text-sm font-bold text-danger hover:underline"
                            >
                              {t("verwijder")}
                            </button>
                          </>
                        ) : (
                          <span className="text-sm text-ink-500">{t("alleenLezen")}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Tabel>
            </Card>
          )}

          {modellen.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                variant="stil"
                onClick={() => downloadTekst("eigen-modellen.csv", modellenNaarCsv(modellen))}
              >
                <Icon name="download" size={16} /> {t("exporteer")}
              </Button>
              <Button
                variant="stil"
                onClick={() => downloadTekst("sjabloon-modellen.csv", modelSjabloon())}
              >
                <Icon name="file-text" size={16} /> {t("sjabloon")}
              </Button>
            </div>
          )}
        </>
      )}

      <Dialoog
        open={teVerwijderen !== null}
        titel={t("verwijderTitel")}
        tekst={t("verwijderTekst")}
        bevestigLabel={t("verwijder")}
        annuleerLabel={t("annuleer")}
        gevaarlijk
        onBevestig={() => teVerwijderen && verwijder(teVerwijderen)}
        onAnnuleer={() => setTeVerwijderen(null)}
      />
    </Container>
  );
}

/** Numeriek veld dat een leeg vak als null doorgeeft in plaats van als nul. */
function Getalveld({
  label,
  hint,
  waarde,
  zet,
  uitgeschakeld = false,
}: {
  label: string;
  hint?: string;
  waarde: number | null | undefined;
  zet: (waarde: number | null) => void;
  uitgeschakeld?: boolean;
}) {
  return (
    <Veld label={label} hint={hint}>
      <input
        type="number"
        step="any"
        disabled={uitgeschakeld}
        className={invoerKlassen}
        value={waarde ?? ""}
        onChange={(e) => zet(e.target.value === "" ? null : Number(e.target.value))}
      />
    </Veld>
  );
}
