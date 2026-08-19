"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import Dialoog from "@/components/Dialoog";
import { useSessie } from "@/components/SessieProvider";
import { Button, Card, Container, Melding, PageHead } from "@/components/ui";
import {
  bewaarAftrekRegel,
  bewaarMultiplicator,
  bewaarParameters,
  herstelStandaardwaarden,
} from "@/lib/beheer";
import { laadFiscaleContext } from "@/lib/data";
import type {
  DeductionRule,
  FiscaleContext,
  TaxParameters,
  Voertuigtype,
} from "@/lib/fiscaal/types";
import { PARAM_VELDEN } from "@/lib/parameterVelden";

const TYPES: Voertuigtype[] = ["BEV", "PHEV", "HEV", "fossiel"];

export default function BeheerParametersPagina() {
  const t = useTranslations("parameters");
  const sessie = useSessie();
  const [ctx, setCtx] = useState<FiscaleContext | null>(null);
  const [geladen, setGeladen] = useState(false);
  const [jaar, setJaar] = useState(2026);
  const [melding, setMelding] = useState<string | null>(null);
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);
  const [vraagHerstel, setVraagHerstel] = useState(false);

  // Strikt: deze pagina schrijft terug wat ze inleest. Zou ze de terugval op de
  // standaardwaarden krijgen zonder het te merken, dan bewaart ze die over de
  // echte parameters heen. Zie de toelichting bij laadFiscaleContext.
  const herlaad = () => laadFiscaleContext({ strikt: true }).then(setCtx);

  useEffect(() => {
    herlaad()
      .catch((e) => {
        setCtx(null);
        setFout(e instanceof Error ? e.message : String(e));
      })
      .finally(() => setGeladen(true));
  }, []);

  const params = ctx?.parameters.find((p) => p.year === jaar) ?? null;

  function zetParam(veld: keyof TaxParameters, waarde: number) {
    if (!ctx) return;
    setCtx({
      ...ctx,
      parameters: ctx.parameters.map((p) => (p.year === jaar ? { ...p, [veld]: waarde } : p)),
    });
  }

  function zetRegel(regel: DeductionRule, waarde: number) {
    if (!ctx) return;
    setCtx({
      ...ctx,
      regels: ctx.regels.map((r) =>
        r.voertuigtype === regel.voertuigtype &&
        r.bestelperiode === regel.bestelperiode &&
        r.gebruiksjaar === regel.gebruiksjaar
          ? { ...r, aftrek_pct: waarde }
          : r,
      ),
    });
  }

  function zetMultiplicator(code: string, waarde: number) {
    if (!ctx) return;
    setCtx({
      ...ctx,
      periodes: ctx.periodes.map((p) =>
        p.code === code ? { ...p, rsz_multiplicator: waarde } : p,
      ),
    });
  }

  async function doe(actie: () => Promise<void>, succes: string) {
    setBezig(true);
    setFout(null);
    setMelding(null);
    try {
      await actie();
      setMelding(succes);
    } catch (e) {
      setFout(e instanceof Error ? e.message : String(e));
    } finally {
      setBezig(false);
    }
  }

  async function bewaarAlles() {
    if (!ctx || !params) return;
    await doe(async () => {
      /*
       * Alle jaren, niet alleen het jaar dat toevallig in de keuzelijst staat.
       * `zetParam` schrijft in ctx.parameters, dus wie 2026 corrigeert, naar
       * 2027 schakelt en dan bewaart, had zijn correctie van 2026 zien
       * verdwijnen -- met "Bewaard" in het groen erboven en de aangepaste waarde
       * nog op het scherm. De twee lussen hieronder deden het al goed.
       */
      for (const p of ctx.parameters) {
        await bewaarParameters(p);
      }
      for (const p of ctx.periodes) {
        await bewaarMultiplicator(p.code, p.rsz_multiplicator);
      }
      for (const r of ctx.regels) {
        await bewaarAftrekRegel(r);
      }
    }, t("beheerBewaard"));
  }

  async function herstel() {
    setVraagHerstel(false);
    await doe(async () => {
      await herstelStandaardwaarden();
      await herlaad();
    }, t("beheerHersteld"));
  }

  // De database weigert schrijfacties van niet-beheerders hoe dan ook; dit
  // voorkomt alleen dat iemand een formulier invult dat toch niet bewaart.
  // Let op de afwezige sessie: die betekent "niet aangemeld", niet "beheerder".
  if (!sessie?.isPlatformAdmin) {
    return (
      <Container className="py-16">
        <PageHead
          title={t("geenToegangTitel")}
          sub={t("geenToegangTekst")}
        />
      </Container>
    );
  }

  // Zonder ingelezen context is er niets om te bewerken, en vooral: niets om te
  // bewaren. Een formulier tonen dat op standaardwaarden staat, nodigt uit om
  // die over de echte cijfers te schrijven.
  if (!ctx) {
    return (
      <Container className="py-16">
        <PageHead title={t("beheerTitel")} />
        {geladen ? (
          <p role="alert" className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {fout ?? t("beheerNietGeladen")}
          </p>
        ) : (
          <div className="h-32 animate-pulse rounded-[13px] bg-line" />
        )}
      </Container>
    );
  }

  return (
    <Container className="space-y-6 py-[52px]">
      <PageHead
        title={t("beheerTitel")}
        sub={t("beheerIntro")}
        action={
          <div className="flex gap-3">
            <Button onClick={bewaarAlles} disabled={bezig}>
              {bezig ? t("beheerBezig") : t("beheerBewaar")}
            </Button>
            <Button variant="stil" onClick={() => setVraagHerstel(true)} disabled={bezig}>
              {t("beheerHerstel")}
            </Button>
          </div>
        }
      />

      {melding && <Melding soort="ok">{melding}</Melding>}
      {fout && <Melding soort="fout">{fout}</Melding>}

      <Dialoog
        open={vraagHerstel}
        titel={t("beheerHerstel")}
        tekst={t("beheerBevestig")}
        bevestigLabel={t("beheerHerstel")}
        annuleerLabel={t("beheerAnnuleer")}
        gevaarlijk
        onBevestig={herstel}
        onAnnuleer={() => setVraagHerstel(false)}
      />

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{t("perJaar")}</h2>
          <select
            className="rounded-lg border border-line px-2 py-1.5 text-sm"
            value={jaar}
            onChange={(e) => setJaar(Number(e.target.value))}
          >
            {ctx?.parameters.map((p) => (
              <option key={p.year} value={p.year}>
                {p.year}
              </option>
            ))}
          </select>
        </div>
        {params && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PARAM_VELDEN.map(({ veld, sleutel }) => (
              <label key={veld} className="block text-sm">
                <span className="mb-1 block text-xs font-medium text-slate-500">{t(sleutel)}</span>
                <input
                  type="number"
                  step="any"
                  className="w-full rounded-lg border border-line px-3 py-1.5 text-sm focus:border-gold focus:outline-none"
                  value={params[veld] as number}
                  onChange={(e) => zetParam(veld, Number(e.target.value))}
                />
              </label>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold">{t("beheerMultiplicatorTitel")}</h2>
        {/* Deze kolom staat in de databank en is hier aanpasbaar, maar
            rszBijdrageMaand leest ze niet: die neemt de multiplicator van het
            bijdragejaar uit tax_parameters. Zonder deze waarschuwing denkt een
            beheerder dat hij hier iets wijzigt wat doorwerkt in de berekening. */}
        <Melding soort="let-op" className="mt-3">
          {t("beheerMultiplicatorNoot")}
        </Melding>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ctx?.periodes.map((p) => (
            <label key={p.code} className="block text-sm">
              <span className="mb-1 block text-xs font-medium text-slate-500">{p.label}</span>
              <input
                type="number"
                step="any"
                className="w-full rounded-lg border border-line px-3 py-1.5 text-sm focus:border-gold focus:outline-none"
                value={p.rsz_multiplicator}
                onChange={(e) => zetMultiplicator(p.code, Number(e.target.value))}
              />
            </label>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold">{t("kalenderTitel")}</h2>
        <p className="mt-1 text-sm text-slate-500">{t("kalenderIntro")}</p>
        {TYPES.map((type) => {
          const regels = ctx?.regels.filter((r) => r.voertuigtype === type) ?? [];
          if (regels.length === 0) return null;
          return (
            <div key={type} className="mt-4">
              <h3 className="text-sm font-semibold text-ink">{type}</h3>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-y border-line bg-paper text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th scope="col" className="px-3 py-2">{t("kolomBestelperiode")}</th>
                      <th scope="col" className="px-3 py-2">{t("kolomGebruiksjaar")}</th>
                      <th scope="col" className="px-3 py-2 text-right">{t("kolomAftrek")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {regels.map((r) => (
                      <tr key={`${r.bestelperiode}-${r.gebruiksjaar ?? "alle"}`}>
                        <td className="px-3 py-1.5">
                          {ctx?.periodes.find((p) => p.code === r.bestelperiode)?.label ??
                            r.bestelperiode}
                        </td>
                        <td className="px-3 py-1.5">{r.gebruiksjaar ?? t("heleGebruiksduur")}</td>
                        <td className="px-3 py-1.5 text-right">
                          <input
                            type="number"
                            step="any"
                            min={0}
                            max={120}
                            className="w-24 rounded-lg border border-line px-2 py-1 text-right text-sm focus:border-gold focus:outline-none"
                            value={r.aftrek_pct}
                            onChange={(e) => zetRegel(r, Number(e.target.value))}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </Card>
    </Container>
  );
}
