"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import { Melding, Veld, invoerKlasse, knopKlasse } from "@/components/AuthKaart";
import Icon from "@/components/Icon";
import { useSessie } from "@/components/SessieProvider";
import { Card, Container, Eyebrow } from "@/components/ui";
import { voltooiOnboarding, type BedrijfsInvoer } from "@/lib/bedrijf";
import { maakVoorbeeldvloot } from "@/lib/voorbeeldvloot";

const STAPPEN = 3;

/**
 * Onboarding voor een nieuw bedrijf.
 *
 * Zonder deze pagina landt wie zich net registreerde op een dashboard met nul
 * wagens en geen enkele aanwijzing wat te doen. Drie stappen: wie ben je,
 * hoe word je belast, en waarmee wil je beginnen.
 */
export default function WelkomPagina() {
  const t = useTranslations("welkom");
  const router = useRouter();
  const sessie = useSessie();

  const [stap, setStap] = useState(1);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  const [profiel, setProfiel] = useState<BedrijfsInvoer>({
    naam: "",
    ondernemingsnummer: null,
    btw_nummer: null,
    adres: null,
    postcode: null,
    gemeente: null,
    is_kmo: true,
    boekjaar_start_maand: 1,
  });

  useEffect(() => {
    if (!sessie) return;
    setProfiel((p) => ({
      ...p,
      naam: sessie.bedrijf.naam,
      ondernemingsnummer: sessie.bedrijf.ondernemingsnummer,
      btw_nummer: sessie.bedrijf.btw_nummer,
      adres: sessie.bedrijf.adres,
      postcode: sessie.bedrijf.postcode,
      gemeente: sessie.bedrijf.gemeente,
      is_kmo: sessie.bedrijf.is_kmo,
      boekjaar_start_maand: sessie.bedrijf.boekjaar_start_maand,
    }));
  }, [sessie]);

  function zet<K extends keyof BedrijfsInvoer>(veld: K, waarde: BedrijfsInvoer[K]) {
    setProfiel((p) => ({ ...p, [veld]: waarde }));
  }

  async function afronden(metVoorbeeldvloot: boolean) {
    setFout(null);
    setBezig(true);
    try {
      await voltooiOnboarding(profiel);
      if (metVoorbeeldvloot) await maakVoorbeeldvloot();
      // refresh() zodat de layout de sessie opnieuw ophaalt: anders blijft
      // onboarding_voltooid op false staan en stuurt de middleware terug.
      router.refresh();
      router.push(metVoorbeeldvloot ? "/vergelijking" : "/wagens");
    } catch (e) {
      setFout(e instanceof Error ? e.message : String(e));
      setBezig(false);
    }
  }

  if (!sessie) return null;

  return (
    <Container className="max-w-[720px] py-14">
      <Eyebrow dash>{t("eyebrow")}</Eyebrow>
      <h1 className="m-0 text-[clamp(26px,4vw,38px)] font-bold tracking-[-0.02em] text-ink">
        {t("titel")}
      </h1>
      <p className="mt-2.5 text-[16.5px] text-ink-700">{t("intro")}</p>

      <ol className="m-0 mt-7 flex list-none gap-2 p-0" aria-label={t("voortgang")}>
        {Array.from({ length: STAPPEN }, (_, i) => i + 1).map((n) => (
          <li key={n} className="flex-1">
            <span
              aria-current={n === stap ? "step" : undefined}
              className={`block h-[5px] rounded-full ${n <= stap ? "bg-gold" : "bg-line"}`}
            />
            <span className="mt-2 block text-[12.5px] font-bold text-ink-500">
              {t(`stap${n}Label`)}
            </span>
          </li>
        ))}
      </ol>

      {fout && (
        <div className="mt-6">
          <Melding soort="fout">{fout}</Melding>
        </div>
      )}

      <Card className="mt-6 p-6 sm:p-8">
        {stap === 1 && (
          <div className="space-y-4">
            <h2 className="m-0 text-[20px] font-bold text-ink">{t("stap1Titel")}</h2>
            <p className="text-[14.5px] text-ink-700">{t("stap1Sub")}</p>

            <Veld label={t("bedrijfsnaam")}>
              <input
                className={invoerKlasse}
                value={profiel.naam}
                onChange={(e) => zet("naam", e.target.value)}
              />
            </Veld>
            <div className="grid gap-4 sm:grid-cols-2">
              <Veld label={t("ondernemingsnummer")} hint={t("optioneel")}>
                <input
                  className={invoerKlasse}
                  value={profiel.ondernemingsnummer ?? ""}
                  placeholder="0123.456.789"
                  onChange={(e) => zet("ondernemingsnummer", e.target.value)}
                />
              </Veld>
              <Veld label={t("btwNummer")} hint={t("optioneel")}>
                <input
                  className={invoerKlasse}
                  value={profiel.btw_nummer ?? ""}
                  placeholder="BE0123456789"
                  onChange={(e) => zet("btw_nummer", e.target.value)}
                />
              </Veld>
            </div>
          </div>
        )}

        {stap === 2 && (
          <div className="space-y-5">
            <h2 className="m-0 text-[20px] font-bold text-ink">{t("stap2Titel")}</h2>
            <p className="text-[14.5px] text-ink-700">{t("stap2Sub")}</p>

            <fieldset className="m-0 border-0 p-0">
              <legend className="mb-2 text-[13.5px] font-bold text-ink">{t("kmoVraag")}</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {[true, false].map((waarde) => (
                  <button
                    key={String(waarde)}
                    type="button"
                    aria-pressed={profiel.is_kmo === waarde}
                    onClick={() => zet("is_kmo", waarde)}
                    className={`rounded-[11px] border p-4 text-left transition-colors ${
                      profiel.is_kmo === waarde
                        ? "border-gold bg-gold-soft"
                        : "border-line hover:border-ink-500"
                    }`}
                  >
                    <span className="block text-[15px] font-bold text-ink">
                      {waarde ? t("kmoJa") : t("kmoNee")}
                    </span>
                    <span className="mt-1 block text-[13px] text-ink-700">
                      {waarde ? t("kmoJaUitleg") : t("kmoNeeUitleg")}
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>

            <Veld label={t("boekjaar")} hint={t("boekjaarHint")}>
              <select
                className={invoerKlasse}
                value={profiel.boekjaar_start_maand}
                onChange={(e) => zet("boekjaar_start_maand", Number(e.target.value))}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {t(`maand${m}`)}
                  </option>
                ))}
              </select>
            </Veld>
          </div>
        )}

        {stap === 3 && (
          <div className="space-y-5">
            <h2 className="m-0 text-[20px] font-bold text-ink">{t("stap3Titel")}</h2>
            <p className="text-[14.5px] text-ink-700">{t("stap3Sub")}</p>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                disabled={bezig}
                onClick={() => afronden(true)}
                className="rounded-[11px] border border-gold bg-gold-soft p-5 text-left transition-opacity disabled:opacity-60"
              >
                <Icon name="bar-chart-3" size={20} />
                <span className="mt-2.5 block text-[15.5px] font-bold text-ink">
                  {t("startVoorbeeld")}
                </span>
                <span className="mt-1 block text-[13px] text-ink-700">
                  {t("startVoorbeeldUitleg")}
                </span>
              </button>
              <button
                type="button"
                disabled={bezig}
                onClick={() => afronden(false)}
                className="rounded-[11px] border border-line p-5 text-left transition-colors hover:border-ink-500 disabled:opacity-60"
              >
                <Icon name="plus" size={20} />
                <span className="mt-2.5 block text-[15.5px] font-bold text-ink">
                  {t("startLeeg")}
                </span>
                <span className="mt-1 block text-[13px] text-ink-700">{t("startLeegUitleg")}</span>
              </button>
            </div>
          </div>
        )}

        <div className="mt-7 flex items-center justify-between gap-3 border-t border-line pt-5">
          <button
            type="button"
            disabled={stap === 1 || bezig}
            onClick={() => setStap((s) => s - 1)}
            className="text-[14px] font-bold text-ink-500 hover:text-ink disabled:invisible"
          >
            {t("vorige")}
          </button>
          {stap < STAPPEN && (
            <button
              type="button"
              disabled={bezig || (stap === 1 && profiel.naam.trim().length < 2)}
              onClick={() => setStap((s) => s + 1)}
              className={`${knopKlasse} w-auto`}
            >
              {t("volgende")}
            </button>
          )}
        </div>
      </Card>
    </Container>
  );
}
