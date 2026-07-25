"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { useSessie } from "@/components/SessieProvider";
import { Badge, Card, Container, PageHead, TypeDot } from "@/components/ui";
import { magSchrijven } from "@/lib/rollen";
import {
  bewaarWagen,
  laadCatalogus,
  laadFiscaleContext,
  laadWagens,
  verwijderWagen,
} from "@/lib/data";
import { catalogNaarWagen } from "@/lib/fiscaal/catalog";
import { berekenJaar } from "@/lib/fiscaal/engine";
import type {
  Brandstof,
  CatalogCar,
  Categorie,
  FiscaleContext,
  Vehicle,
  Voertuigtype,
} from "@/lib/fiscaal/types";
import { formatters } from "@/lib/format";

const EVALUATIEJAAR = 2026;

type Formulier = Omit<Vehicle, "id"> & { id?: string };

const leegFormulier: Formulier = {
  omschrijving: "",
  werknemer: "",
  kenteken: "",
  categorie: "kandidaat",
  merk: "",
  model: "",
  catalog_id: null,
  voertuigtype: "BEV",
  brandstof: "elektrisch",
  besteldatum: "2026-01-01",
  eerste_ingebruikname: "2026-03-01",
  co2: 0,
  cataloguswaarde: 45000,
  jaarlijkse_autokosten: 8500,
  aankoopprijs: null,
  tankkaart: true,
  beroepsgebruik_pct: 100,
  thuislaadpunt: false,
  km_per_jaar: 25000,
  flex_score: 7,
  restwaarde_score: 5,
};

export default function WagensPagina() {
  const t = useTranslations("wagens");
  const { euro, pct } = formatters(useLocale());
  // Een lezer mag de vloot bekijken maar niets wijzigen. De policies in de
  // database weigeren zijn schrijfacties sowieso; dit voorkomt dat hij knoppen
  // ziet die toch op een foutmelding uitlopen.
  const magBewerken = magSchrijven(useSessie());
  const [ctx, setCtx] = useState<FiscaleContext | null>(null);
  const [wagens, setWagens] = useState<Vehicle[]>([]);
  const [catalogus, setCatalogus] = useState<CatalogCar[]>([]);
  const [formulier, setFormulier] = useState<Formulier | null>(null);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  const herlaad = () => laadWagens().then(setWagens);

  useEffect(() => {
    Promise.all([laadFiscaleContext(), laadWagens(), laadCatalogus()])
      .then(([c, w, k]) => {
        setCtx(c);
        setWagens(w);
        setCatalogus(k);
      })
      .catch((e) => setFout(e instanceof Error ? e.message : String(e)));
  }, []);

  const zet = <K extends keyof Formulier>(veld: K, waarde: Formulier[K]) =>
    setFormulier((f) => (f ? { ...f, [veld]: waarde } : f));

  function kiesUitCatalogus(id: string) {
    const car = catalogus.find((c) => c.id === Number(id));
    if (!car || !formulier) return;
    setFormulier({ ...catalogNaarWagen(car, EVALUATIEJAAR), categorie: formulier.categorie });
  }

  async function bewaar() {
    if (!formulier) return;
    setBezig(true);
    setFout(null);
    try {
      await bewaarWagen({
        ...formulier,
        werknemer: formulier.werknemer || null,
        kenteken: formulier.kenteken || null,
        merk: formulier.merk || null,
        model: formulier.model || null,
      });
      setFormulier(null);
      await herlaad();
    } catch (e) {
      setFout(e instanceof Error ? e.message : String(e));
    } finally {
      setBezig(false);
    }
  }

  async function verwijder(id: string) {
    if (!confirm(t("verwijderBevestig"))) return;
    setFout(null);
    try {
      await verwijderWagen(id);
      await herlaad();
    } catch (e) {
      setFout(e instanceof Error ? e.message : String(e));
    }
  }

  // Live fiscale inschatting voor het huidige formulier.
  const formPreview =
    ctx && formulier
      ? berekenJaar(ctx, { ...(formulier as Vehicle), id: formulier.id ?? "preview" }, EVALUATIEJAAR)
      : null;

  return (
    <Container className="py-[52px]">
      <PageHead
        eyebrow={t("eyebrow")}
        title={t("titel")}
        sub={t("intro")}
        action={
          magBewerken ? (
            <button
              onClick={() => setFormulier({ ...leegFormulier })}
              className="inline-flex h-[46px] items-center gap-2 rounded-[11px] bg-gold px-5 text-[14.5px] font-bold text-white transition-colors hover:bg-gold-hover"
            >
              <Icon name="plus" size={17} /> {t("nieuweWagen")}
            </button>
          ) : (
            <Badge tint="slate">{t("alleenLezen")}</Badge>
          )
        }
      />

      {fout && <p className="mb-6 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{fout}</p>}

      {formulier && (
        <div className="mb-6 grid items-start gap-7 lg:grid-cols-[1.6fr_1fr]">
          <Card className="border-gold-line p-7">
            <h2 className="m-0 mb-5 text-[19px] font-bold text-ink">
              {formulier.id ? t("bewerkenTitel") : t("nieuwTitel")}
            </h2>

            {!formulier.id && (
              <div className="mb-5 rounded-[12px] bg-paper p-4">
                <Veld label={t("snelStarten")}>
                  <select className={invoer} defaultValue="" onChange={(e) => kiesUitCatalogus(e.target.value)}>
                    <option value="" disabled>
                      {t("selecteerModel")}
                    </option>
                    {catalogus.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.merk} {c.model} · {c.voertuigtype} · {euro(c.cataloguswaarde)}
                      </option>
                    ))}
                  </select>
                </Veld>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Veld label={t("omschrijving")}>
                <input className={invoer} value={formulier.omschrijving} onChange={(e) => zet("omschrijving", e.target.value)} placeholder={t("omschrijvingPlaceholder")} />
              </Veld>
              <Veld label={t("categorie")}>
                <select className={invoer} value={formulier.categorie} onChange={(e) => zet("categorie", e.target.value as Categorie)}>
                  <option value="kandidaat">{t("categorieKandidaat")}</option>
                  <option value="vloot">{t("categorieVloot")}</option>
                </select>
              </Veld>
              <Veld
                label={t("interneReferentie")}
                hint={t("interneReferentieHint")}
              >
                <input className={invoer} value={formulier.werknemer ?? ""} onChange={(e) => zet("werknemer", e.target.value)} placeholder={t("interneReferentiePlaceholder")} />
              </Veld>
              <Veld label={t("kenteken")} hint={t("kentekenHint")}>
                <input className={invoer} value={formulier.kenteken ?? ""} onChange={(e) => zet("kenteken", e.target.value)} />
              </Veld>
              <Veld label={t("merk")}>
                <input className={invoer} value={formulier.merk ?? ""} onChange={(e) => zet("merk", e.target.value)} />
              </Veld>
              <Veld label={t("model")}>
                <input className={invoer} value={formulier.model ?? ""} onChange={(e) => zet("model", e.target.value)} />
              </Veld>
              <Veld label={t("aandrijving")}>
                <select className={invoer} value={formulier.voertuigtype} onChange={(e) => zet("voertuigtype", e.target.value as Voertuigtype)}>
                  <option value="BEV">{t("aandrijvingBev")}</option>
                  <option value="PHEV">{t("aandrijvingPhev")}</option>
                  <option value="HEV">{t("aandrijvingHev")}</option>
                  <option value="fossiel">{t("aandrijvingFossiel")}</option>
                </select>
              </Veld>
              <Veld label={t("brandstof")}>
                <select className={invoer} value={formulier.brandstof} onChange={(e) => zet("brandstof", e.target.value as Brandstof)}>
                  <option value="elektrisch">{t("brandstofElektrisch")}</option>
                  <option value="diesel">{t("brandstofDiesel")}</option>
                  <option value="benzine">{t("brandstofBenzine")}</option>
                  <option value="lpg">LPG</option>
                  <option value="cng">CNG</option>
                </select>
              </Veld>
              <Veld label={t("co2")}>
                <input type="number" className={invoer} value={formulier.co2} onChange={(e) => zet("co2", Number(e.target.value))} />
              </Veld>
              <Veld label={t("besteldatum")}>
                <input type="date" className={invoer} value={formulier.besteldatum} onChange={(e) => zet("besteldatum", e.target.value)} />
              </Veld>
              <Veld label={t("eersteIngebruikname")}>
                <input type="date" className={invoer} value={formulier.eerste_ingebruikname} onChange={(e) => zet("eerste_ingebruikname", e.target.value)} />
              </Veld>
              <Veld label={t("cataloguswaarde")}>
                <input type="number" className={invoer} value={formulier.cataloguswaarde} onChange={(e) => zet("cataloguswaarde", Number(e.target.value))} />
              </Veld>
              <Veld label={t("autokosten")}>
                <input type="number" className={invoer} value={formulier.jaarlijkse_autokosten} onChange={(e) => zet("jaarlijkse_autokosten", Number(e.target.value))} />
              </Veld>
              <Veld label={t("aankoopprijs")}>
                <input type="number" className={invoer} value={formulier.aankoopprijs ?? ""} onChange={(e) => zet("aankoopprijs", e.target.value === "" ? null : Number(e.target.value))} />
              </Veld>
              <Veld label={t("kmPerJaar")}>
                <input type="number" className={invoer} value={formulier.km_per_jaar ?? ""} onChange={(e) => zet("km_per_jaar", e.target.value === "" ? null : Number(e.target.value))} />
              </Veld>
              <Veld label={t("beroepsgebruik")}>
                <input type="number" min={0} max={100} className={invoer} value={formulier.beroepsgebruik_pct} onChange={(e) => zet("beroepsgebruik_pct", Number(e.target.value))} />
              </Veld>
              <Veld label={t("flexScore")}>
                <input type="number" min={1} max={10} className={invoer} value={formulier.flex_score} onChange={(e) => zet("flex_score", Number(e.target.value))} />
              </Veld>
              <Veld label={t("restwaardeScore")}>
                <input type="number" min={1} max={10} className={invoer} value={formulier.restwaarde_score} onChange={(e) => zet("restwaarde_score", Number(e.target.value))} />
              </Veld>
              <label className="flex items-center gap-2 pt-2 text-sm text-ink-700">
                <input type="checkbox" checked={formulier.tankkaart} onChange={(e) => zet("tankkaart", e.target.checked)} />
                {t("tankkaart")}
              </label>
              <label className="flex items-center gap-2 pt-2 text-sm text-ink-700">
                <input type="checkbox" checked={formulier.thuislaadpunt} onChange={(e) => zet("thuislaadpunt", e.target.checked)} />
                {t("thuislaadpunt")}
              </label>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={bewaar}
                disabled={bezig || !formulier.omschrijving}
                className="inline-flex h-[46px] items-center gap-2 rounded-[11px] bg-gold px-6 text-[15px] font-bold text-white transition-colors hover:bg-gold-hover disabled:opacity-50"
              >
                <Icon name="check" size={17} /> {bezig ? t("bezig") : t("bewaren")}
              </button>
              <button
                onClick={() => setFormulier(null)}
                className="h-[46px] px-3 text-[15px] font-bold text-ink-500 hover:text-ink"
              >
                {t("annuleren")}
              </button>
            </div>
          </Card>

          <aside className="lg:sticky lg:top-[92px]">
            <Card className="bg-paper p-6">
              <div className="mb-4 text-[12px] font-bold uppercase tracking-[0.14em] text-ink-500">
                {t("inschatting")}
              </div>
              {formPreview ? (
                <div className="space-y-3">
                  <div className="flex items-baseline justify-between border-b border-line pb-4">
                    <span className="text-[14.5px] text-ink-700">{t("fiscaleAftrek")}</span>
                    <span className="text-[30px] font-bold leading-none text-ink">{pct(formPreview.aftrekPct)}</span>
                  </div>
                  <Rij label={t("vaaPerJaar")} value={euro(formPreview.vaa)} />
                  <Rij label={t("vuPerJaar")} value={euro(formPreview.verworpenUitgaven)} />
                  <Rij label={t("rszPerJaar")} value={euro(formPreview.rszJaar)} />
                  <Rij label={t("meerkostPerJaar")} value={euro(formPreview.fiscaleMeerkost)} />
                </div>
              ) : (
                <p className="m-0 text-[14px] text-ink-500">{t("vulVeldenIn")}</p>
              )}
            </Card>
          </aside>
        </div>
      )}

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-paper text-left text-xs uppercase tracking-wide text-ink-500">
            <tr>
              <th className="px-4 py-3">{t("kolomWagen")}</th>
              <th className="px-4 py-3">{t("kolomCategorie")}</th>
              <th className="px-4 py-3">{t("kolomBesteld")}</th>
              <th className="px-4 py-3 text-right">CO₂</th>
              <th className="px-4 py-3 text-right">{t("kolomCatalogus")}</th>
              <th className="px-4 py-3 text-right">{t("kolomAftrek")}</th>
              <th className="px-4 py-3 text-right">{t("kolomVaa")}</th>
              <th className="px-4 py-3 text-right">{t("kolomVu")}</th>
              <th className="px-4 py-3 text-right">{t("kolomRsz")}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {wagens.map((w) => {
              const r = ctx ? berekenJaar(ctx, w, EVALUATIEJAAR) : null;
              return (
                <tr key={w.id}>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2 font-bold text-ink">
                      <TypeDot type={w.voertuigtype} />
                      {w.omschrijving}
                    </span>
                    {w.werknemer && <span className="block pl-4 text-xs text-ink-500">{w.werknemer}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tint={w.categorie === "vloot" ? "ink" : "gold"}>
                      {w.categorie === "vloot" ? t("badgeVloot") : t("badgeKandidaat")}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">{w.besteldatum}</td>
                  <td className="px-4 py-3 text-right">{w.co2} g</td>
                  <td className="px-4 py-3 text-right">{euro(w.cataloguswaarde)}</td>
                  <td className="px-4 py-3 text-right">{r ? pct(r.aftrekPct) : "…"}</td>
                  <td className="px-4 py-3 text-right">{r ? euro(r.vaa) : "…"}</td>
                  <td className="px-4 py-3 text-right font-bold">{r ? euro(r.verworpenUitgaven) : "…"}</td>
                  <td className="px-4 py-3 text-right">{r ? euro(r.rszJaar) : "…"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    {magBewerken ? (
                      <>
                        <button onClick={() => setFormulier({ ...w })} className="mr-3 text-sm font-bold text-ink hover:text-gold">
                          {t("bewerk")}
                        </button>
                        <button onClick={() => verwijder(w.id)} className="text-sm font-bold text-rose-600 hover:underline">
                          {t("verwijder")}
                        </button>
                      </>
                    ) : (
                      <span className="text-sm text-ink-500">{t("geenRechten")}</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {wagens.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-ink-500">
                  {t("leeg")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </Container>
  );
}

const invoer = "bs-inp h-[44px] w-full rounded-[10px] px-3.5 text-[15px]";

function Veld({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[13.5px] font-bold text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[12.5px] text-ink-500">{hint}</span>}
    </label>
  );
}

function Rij({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[14px] text-ink-700">{label}</span>
      <span className="text-[15px] font-bold text-ink">{value}</span>
    </div>
  );
}
