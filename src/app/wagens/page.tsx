"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { Badge, Card, Container, PageHead, TypeDot } from "@/components/ui";
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
import { euro, pct } from "@/lib/format";

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
    if (!confirm("Deze wagen verwijderen?")) return;
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
        eyebrow="Wagens"
        title="Mijn wagenpark"
        sub="Identificatie, technische gegevens, financieel en beleid per wagen. Berekende cijfers gelden voor gebruiksjaar 2026."
        action={
          <button
            onClick={() => setFormulier({ ...leegFormulier })}
            className="inline-flex h-[46px] items-center gap-2 rounded-[11px] bg-gold px-5 text-[14.5px] font-bold text-ink transition-colors hover:bg-gold-hover"
          >
            <Icon name="plus" size={17} /> Nieuwe wagen
          </button>
        }
      />

      {fout && <p className="mb-6 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{fout}</p>}

      {formulier && (
        <div className="mb-6 grid items-start gap-7 lg:grid-cols-[1.6fr_1fr]">
          <Card className="border-gold-line p-7">
            <h2 className="m-0 mb-5 text-[19px] font-bold text-ink">
              {formulier.id ? "Wagen bewerken" : "Nieuwe wagen toevoegen"}
            </h2>

            {!formulier.id && (
              <div className="mb-5 rounded-[12px] bg-paper p-4">
                <Veld label="Snel starten: kies een model uit de catalogus (vult de velden voor)">
                  <select className={invoer} defaultValue="" onChange={(e) => kiesUitCatalogus(e.target.value)}>
                    <option value="" disabled>
                      Selecteer een model…
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
              <Veld label="Omschrijving">
                <input className={invoer} value={formulier.omschrijving} onChange={(e) => zet("omschrijving", e.target.value)} placeholder="bv. Offerte BMW iX1" />
              </Veld>
              <Veld label="Categorie">
                <select className={invoer} value={formulier.categorie} onChange={(e) => zet("categorie", e.target.value as Categorie)}>
                  <option value="kandidaat">Kandidaat (offerte)</option>
                  <option value="vloot">Huidige vloot</option>
                </select>
              </Veld>
              <Veld label="Werknemer">
                <input className={invoer} value={formulier.werknemer ?? ""} onChange={(e) => zet("werknemer", e.target.value)} />
              </Veld>
              <Veld label="Kenteken">
                <input className={invoer} value={formulier.kenteken ?? ""} onChange={(e) => zet("kenteken", e.target.value)} />
              </Veld>
              <Veld label="Merk">
                <input className={invoer} value={formulier.merk ?? ""} onChange={(e) => zet("merk", e.target.value)} />
              </Veld>
              <Veld label="Model">
                <input className={invoer} value={formulier.model ?? ""} onChange={(e) => zet("model", e.target.value)} />
              </Veld>
              <Veld label="Type aandrijving">
                <select className={invoer} value={formulier.voertuigtype} onChange={(e) => zet("voertuigtype", e.target.value as Voertuigtype)}>
                  <option value="BEV">BEV (volledig elektrisch)</option>
                  <option value="PHEV">PHEV (plug-in hybride)</option>
                  <option value="HEV">HEV (hybride)</option>
                  <option value="fossiel">Fossiel (diesel/benzine)</option>
                </select>
              </Veld>
              <Veld label="Brandstof">
                <select className={invoer} value={formulier.brandstof} onChange={(e) => zet("brandstof", e.target.value as Brandstof)}>
                  <option value="elektrisch">Elektrisch</option>
                  <option value="diesel">Diesel</option>
                  <option value="benzine">Benzine</option>
                  <option value="lpg">LPG</option>
                  <option value="cng">CNG</option>
                </select>
              </Veld>
              <Veld label="CO₂-uitstoot (g/km)">
                <input type="number" className={invoer} value={formulier.co2} onChange={(e) => zet("co2", Number(e.target.value))} />
              </Veld>
              <Veld label="Besteldatum (bepaalt het regime)">
                <input type="date" className={invoer} value={formulier.besteldatum} onChange={(e) => zet("besteldatum", e.target.value)} />
              </Veld>
              <Veld label="Eerste ingebruikname">
                <input type="date" className={invoer} value={formulier.eerste_ingebruikname} onChange={(e) => zet("eerste_ingebruikname", e.target.value)} />
              </Veld>
              <Veld label="Cataloguswaarde (€)">
                <input type="number" className={invoer} value={formulier.cataloguswaarde} onChange={(e) => zet("cataloguswaarde", Number(e.target.value))} />
              </Veld>
              <Veld label="Jaarlijkse autokosten (€)">
                <input type="number" className={invoer} value={formulier.jaarlijkse_autokosten} onChange={(e) => zet("jaarlijkse_autokosten", Number(e.target.value))} />
              </Veld>
              <Veld label="Aankoop-/leasingprijs (€)">
                <input type="number" className={invoer} value={formulier.aankoopprijs ?? ""} onChange={(e) => zet("aankoopprijs", e.target.value === "" ? null : Number(e.target.value))} />
              </Veld>
              <Veld label="Verwacht jaarlijks kilometeraantal">
                <input type="number" className={invoer} value={formulier.km_per_jaar ?? ""} onChange={(e) => zet("km_per_jaar", e.target.value === "" ? null : Number(e.target.value))} />
              </Veld>
              <Veld label="Beroepsgebruik (%)">
                <input type="number" min={0} max={100} className={invoer} value={formulier.beroepsgebruik_pct} onChange={(e) => zet("beroepsgebruik_pct", Number(e.target.value))} />
              </Veld>
              <Veld label="Score operationele flexibiliteit (1-10)">
                <input type="number" min={1} max={10} className={invoer} value={formulier.flex_score} onChange={(e) => zet("flex_score", Number(e.target.value))} />
              </Veld>
              <Veld label="Score restwaarde na 4 jaar (1-10)">
                <input type="number" min={1} max={10} className={invoer} value={formulier.restwaarde_score} onChange={(e) => zet("restwaarde_score", Number(e.target.value))} />
              </Veld>
              <label className="flex items-center gap-2 pt-2 text-sm text-ink-700">
                <input type="checkbox" checked={formulier.tankkaart} onChange={(e) => zet("tankkaart", e.target.checked)} />
                Tank-/laadkaart (40% VAA → VU)
              </label>
              <label className="flex items-center gap-2 pt-2 text-sm text-ink-700">
                <input type="checkbox" checked={formulier.thuislaadpunt} onChange={(e) => zet("thuislaadpunt", e.target.checked)} />
                Thuislaadinfrastructuur
              </label>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={bewaar}
                disabled={bezig || !formulier.omschrijving}
                className="inline-flex h-[46px] items-center gap-2 rounded-[11px] bg-gold px-6 text-[15px] font-bold text-ink transition-colors hover:bg-gold-hover disabled:opacity-50"
              >
                <Icon name="check" size={17} /> {bezig ? "Bezig…" : "Wagen bewaren"}
              </button>
              <button
                onClick={() => setFormulier(null)}
                className="h-[46px] px-3 text-[15px] font-bold text-ink-500 hover:text-ink"
              >
                Annuleren
              </button>
            </div>
          </Card>

          <aside className="lg:sticky lg:top-[92px]">
            <Card className="bg-paper p-6">
              <div className="mb-4 text-[12px] font-bold uppercase tracking-[0.14em] text-ink-500">
                Fiscale inschatting · 2026
              </div>
              {formPreview ? (
                <div className="space-y-3">
                  <div className="flex items-baseline justify-between border-b border-line pb-4">
                    <span className="text-[14.5px] text-ink-700">Fiscale aftrek</span>
                    <span className="text-[30px] font-bold leading-none text-ink">{pct(formPreview.aftrekPct)}</span>
                  </div>
                  <Rij label="VAA / jaar" value={euro(formPreview.vaa)} />
                  <Rij label="Verworpen uitgaven / jaar" value={euro(formPreview.verworpenUitgaven)} />
                  <Rij label="RSZ-bijdrage / jaar" value={euro(formPreview.rszJaar)} />
                  <Rij label="Fiscale meerkost / jaar" value={euro(formPreview.fiscaleMeerkost)} />
                </div>
              ) : (
                <p className="m-0 text-[14px] text-ink-500">Vul de velden in om de inschatting te zien.</p>
              )}
            </Card>
          </aside>
        </div>
      )}

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-paper text-left text-xs uppercase tracking-wide text-ink-500">
            <tr>
              <th className="px-4 py-3">Wagen</th>
              <th className="px-4 py-3">Categorie</th>
              <th className="px-4 py-3">Besteld</th>
              <th className="px-4 py-3 text-right">CO₂</th>
              <th className="px-4 py-3 text-right">Catalogus</th>
              <th className="px-4 py-3 text-right">Aftrek 2026</th>
              <th className="px-4 py-3 text-right">VAA</th>
              <th className="px-4 py-3 text-right">Verw. uitg.</th>
              <th className="px-4 py-3 text-right">RSZ/jaar</th>
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
                    <Badge tint={w.categorie === "vloot" ? "ink" : "gold"}>{w.categorie}</Badge>
                  </td>
                  <td className="px-4 py-3">{w.besteldatum}</td>
                  <td className="px-4 py-3 text-right">{w.co2} g</td>
                  <td className="px-4 py-3 text-right">{euro(w.cataloguswaarde)}</td>
                  <td className="px-4 py-3 text-right">{r ? pct(r.aftrekPct) : "…"}</td>
                  <td className="px-4 py-3 text-right">{r ? euro(r.vaa) : "…"}</td>
                  <td className="px-4 py-3 text-right font-bold">{r ? euro(r.verworpenUitgaven) : "…"}</td>
                  <td className="px-4 py-3 text-right">{r ? euro(r.rszJaar) : "…"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <button onClick={() => setFormulier({ ...w })} className="mr-3 text-sm font-bold text-ink hover:text-gold">
                      Bewerk
                    </button>
                    <button onClick={() => verwijder(w.id)} className="text-sm font-bold text-rose-600 hover:underline">
                      Verwijder
                    </button>
                  </td>
                </tr>
              );
            })}
            {wagens.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-ink-500">
                  Nog geen wagens. Voeg er toe vanuit de catalogus of via “Nieuwe wagen”.
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

function Veld({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[13.5px] font-bold text-ink">{label}</span>
      {children}
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
