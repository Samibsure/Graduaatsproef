import { useTranslations } from "next-intl";
import Icon from "@/components/Icon";
import { Badge } from "@/components/ui";
import type { Regimeband, VerbrandingRegime } from "@/lib/fiscaal/regimes";
import type { Formatters } from "@/lib/format";

/**
 * De aftrekbaarheid per bestelperiode, voor elektrisch en voor verbranding.
 *
 * Dit vervangt vier kaarten die naast elkaar stonden met de waarden "50 tot 100%",
 * "Daalt naar 0%", "0% of 100%" en "95% tot 67,5%". Die rij leek één tijdlijn maar
 * was het niet: de eerste drie kaarten gingen over verbrandingswagens per
 * bestelperiode, de vierde uitsluitend over het elektrische afbouwpad. "0% of 100%"
 * las als een muntworp terwijl het gewoon het verschil tussen de twee aandrijvingen
 * is, en "95% tot 67,5%" leek een daling over de looptijd van één wagen terwijl het
 * een reeks besteljaren is.
 *
 * Vandaar twee kolommen in plaats van één getal per periode. Elke cel antwoordt op
 * precies één vraag: deze bestelperiode, deze aandrijving. En de cijfers komen uit
 * `regimebanden`, dus uit de aftrekkalender zelf; ze staan niet meer als tekst in
 * het taalbestand waar ze stil konden verouderen.
 *
 * De kolom voor verbranding dekt PHEV, HEV en fossiel samen: die drie hebben in de
 * kalender identieke rijen. Waar een plug-inhybride wél afwijkt, in zijn
 * brandstofdeel en zijn laadstroom, staat op /fiscaal-kader.
 */

/** De periodekop uit de grensdatums, niet uit het Nederlandse label in de databank. */
function periodeKop(
  band: Pick<Regimeband, "van" | "tot">,
  t: (sleutel: string, waarden?: Record<string, string>) => string,
  datum: (iso: string) => string,
): string {
  if (band.van === null && band.tot !== null) return t("periodeTot", { tot: datum(band.tot) });
  if (band.tot === null && band.van !== null) return t("periodeVanaf", { van: datum(band.van) });
  if (band.van !== null && band.tot !== null) {
    return t("periodeTussen", { van: datum(band.van), tot: datum(band.tot) });
  }
  return t("periodeAltijd");
}

/**
 * Wat er in de verbrandingscel staat. De drie soorten zijn geen opmaakkeuze: ze
 * zeggen of dit een vast percentage is, een band die de gramformule bepaalt, of
 * een plafond waar de formule nog onder kan zitten. Precies dat onderscheid
 * verzwegen de oude kaarten.
 */
function Verbrandingscel({
  regime,
  t,
  pct,
}: {
  regime: VerbrandingRegime;
  t: (sleutel: string, waarden?: Record<string, string | number>) => string;
  pct: (n: number) => string;
}) {
  if (regime.soort === "vast") {
    return <span className="font-bold text-ink">{pct(regime.pct)}</span>;
  }

  if (regime.soort === "formule") {
    return (
      <div>
        <span className="font-bold text-ink">
          {t("bandVan", { van: pct(regime.ondergrens), tot: pct(regime.bovengrens) })}
        </span>
        <div className="mt-1 text-[13px] leading-snug text-ink-500">
          {t("viaFormule")}
          <br />
          {t("forfaitHoog", { pct: pct(regime.forfait) })}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="text-[13px] font-bold uppercase tracking-wide text-ink-500">
        {t("hoogstens")}
      </div>
      <ul className="m-0 mt-1 flex list-none flex-wrap gap-x-3 gap-y-0.5 p-0">
        {regime.stappen.map((s) => (
          <li key={s.gebruiksjaar} className="text-[14px] text-ink-700">
            <span className="text-ink-500">{s.gebruiksjaar}</span>{" "}
            <span className="font-bold text-ink">{pct(s.plafond)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-1 text-[13px] leading-snug text-ink-500">{t("plafondNietWaarde")}</div>
    </div>
  );
}

/** Eén periode als blok. Op brede schermen een tabelrij, op een telefoon een kaart. */
function Bandinhoud({
  band,
  t,
  formatters,
}: {
  band: Regimeband;
  t: (sleutel: string, waarden?: Record<string, string | number>) => string;
  formatters: Pick<Formatters, "pct" | "datum">;
}) {
  return (
    <>
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="font-bold text-ink">{periodeKop(band, t, formatters.datum)}</span>
        {band.isVandaag && <Badge tint="green">{t("vandaag")}</Badge>}
      </div>
      <dl className="m-0 mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-[13px] font-bold uppercase tracking-wide text-ink-500">
            {t("kolomElektrisch")}
          </dt>
          <dd className="m-0 mt-0.5 font-bold text-ink">{formatters.pct(band.bev)}</dd>
        </div>
        <div>
          <dt className="text-[13px] font-bold uppercase tracking-wide text-ink-500">
            {t("kolomVerbranding")}
          </dt>
          <dd className="m-0 mt-0.5">
            <Verbrandingscel regime={band.verbranding} t={t} pct={formatters.pct} />
          </dd>
        </div>
      </dl>
    </>
  );
}

export default function Regimematrix({
  banden,
  formatters,
  /**
   * Vanaf deze bestelperiode worden de banden ingeklapt. Zonder dit staan er acht
   * rijen onder elkaar waarvan zes hetzelfde verhaal vertellen, en dat is op een
   * telefoon precies het soort muur waar een bezoeker afhaakt.
   */
  vouwVanaf,
}: {
  banden: Regimeband[];
  formatters: Pick<Formatters, "pct" | "datum">;
  vouwVanaf?: string;
}) {
  const t = useTranslations("regimes");

  const splitsing = vouwVanaf ? banden.findIndex((b) => b.periodeCode === vouwVanaf) : -1;
  // Een band die vandaag geldt, blijft altijd open staan: dat is de rij waarvoor
  // een bezoeker de tabel opent.
  const grens =
    splitsing >= 0 && !banden.slice(splitsing).some((b) => b.isVandaag) ? splitsing : banden.length;
  const open = banden.slice(0, grens);
  const gevouwen = banden.slice(grens);

  return (
    <div>
      <ul className="m-0 grid list-none gap-3 p-0">
        {open.map((band) => (
          <li
            key={band.periodeCode}
            className={`rounded-[12px] border bg-white p-5 ${
              band.isVandaag ? "border-accent-line ring-1 ring-accent-line" : "border-line"
            }`}
          >
            <Bandinhoud band={band} t={t} formatters={formatters} />
          </li>
        ))}
      </ul>

      {gevouwen.length > 0 && (
        // Native details: dit hoort te werken zonder JavaScript, en een zoekmachine
        // leest de ingeklapte jaren dan gewoon mee.
        <details className="group mt-3 rounded-[12px] border border-line bg-white">
          <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 text-[15px] font-bold text-ink marker:content-none">
            {t("meerJaren", {
              van: formatters.pct(gevouwen[0].bev),
              tot: formatters.pct(gevouwen[gevouwen.length - 1].bev),
            })}
            <span className="flex-none text-ink-500 transition-transform group-open:rotate-180">
              <Icon name="chevron-down" size={19} />
            </span>
          </summary>
          <ul className="m-0 grid list-none gap-3 border-t border-line p-5 pt-4">
            {gevouwen.map((band) => (
              <li key={band.periodeCode}>
                <Bandinhoud band={band} t={t} formatters={formatters} />
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
