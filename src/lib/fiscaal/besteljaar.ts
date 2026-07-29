import { aftrekPct, berekenProjectie } from "./engine";
import type { FiscaleContext, Vehicle } from "./types";

/**
 * Wat het besteljaar met een wagen doet.
 *
 * Dit is het zwaarste gegeven in de hele applicatie, en het stond nergens op het
 * scherm. De catalogus vulde stil `besteldatum = 15 januari van het gekozen jaar`
 * in en toonde het resultaat alsof dat een eigenschap van de wagen was. Het is
 * een eigenschap van het *moment*: dezelfde verbrandingswagen die besteld in 2025
 * nog 75% aftrekbaar is in zijn eerste gebruiksjaar, is besteld in 2026 meteen
 * 0% aftrekbaar. Dat verschil loopt over vier jaar in de duizenden euro's, en de
 * gebruiker zag alleen het eindcijfer.
 *
 * Deze module varieert het besteljaar bij een vaste wagen. Dat is het spiegelbeeld
 * van uitfasering.ts, dat het besteljaar vasthoudt en het gebruiksjaar laat lopen.
 * Beide vragen zijn nodig: "wanneer valt mijn aftrek weg?" en "maakt het uit of ik
 * nu of volgend jaar teken?".
 */

export interface Besteljaarrij {
  jaar: number;
  /** Aftrekpercentage in het eerste gebruiksjaar na die bestelling. */
  aftrekEerste: number;
  /** Gemiddelde aftrek over de looptijd. */
  aftrekGemiddeld: number;
  verworpenUitgaven: number;
  fiscaleMeerkost: number;
  /** Totale kost over de looptijd. */
  totaleKost: number;
  /** Verschil in totale kost tegenover het goedkoopste besteljaar in het bereik. */
  meerkostTegenoverBeste: number;
}

export interface Besteljaarvergelijking {
  rijen: Besteljaarrij[];
  /** Het besteljaar met de laagste totale kost. */
  besteJaar: number;
  /** Het laatste jaar waarin bestellen nog aftrek oplevert, of null. */
  laatsteJaarMetAftrek: number | null;
  /** Verschil tussen het duurste en het goedkoopste besteljaar. */
  spreiding: number;
}

/**
 * Zet dezelfde wagen naast elkaar voor verschillende besteljaren.
 *
 * De besteldatum wordt op 15 januari gezet, net zoals de catalogus dat doet, en
 * de eerste ingebruikname twee maanden later. Die twee maanden zijn geen detail:
 * de leeftijdscorrectie op het voordeel van alle aard vertrekt vanaf de
 * inschrijving, niet vanaf de bestelling.
 */
export function vergelijkBesteljaren(
  ctx: FiscaleContext,
  wagen: Vehicle,
  jaren: number[],
  looptijd = 4,
  opties?: { kmoTarief?: boolean },
): Besteljaarvergelijking {
  const rijen: Besteljaarrij[] = jaren
    .slice()
    .sort((a, b) => a - b)
    .map((jaar) => {
      const kandidaat: Vehicle = {
        ...wagen,
        besteldatum: `${jaar}-01-15`,
        eerste_ingebruikname: `${jaar}-03-01`,
      };
      const projectie = berekenProjectie(ctx, kandidaat, jaar, looptijd, opties);
      const eerste = projectie.jaren[0];

      return {
        jaar,
        aftrekEerste: aftrekPct(ctx, kandidaat, jaar),
        aftrekGemiddeld: projectie.gemiddeldeAftrekPct,
        verworpenUitgaven: eerste.verworpenUitgaven,
        fiscaleMeerkost: eerste.fiscaleMeerkost,
        totaleKost: projectie.totaleKost,
        meerkostTegenoverBeste: 0,
      };
    });

  if (rijen.length === 0) {
    return { rijen, besteJaar: 0, laatsteJaarMetAftrek: null, spreiding: 0 };
  }

  const kosten = rijen.map((r) => r.totaleKost);
  const laagste = Math.min(...kosten);
  const hoogste = Math.max(...kosten);
  for (const r of rijen) r.meerkostTegenoverBeste = r.totaleKost - laagste;

  const metAftrek = rijen.filter((r) => r.aftrekEerste > 0);

  return {
    rijen,
    besteJaar: rijen[kosten.indexOf(laagste)].jaar,
    laatsteJaarMetAftrek: metAftrek.length ? metAftrek[metAftrek.length - 1].jaar : null,
    spreiding: hoogste - laagste,
  };
}

/**
 * Het bereik dat standaard getoond wordt: twee jaar terug en drie vooruit.
 *
 * Terugkijken is geen curiositeit. Wie in 2024 of 2025 besteld heeft, zit onder
 * een regime dat vandaag niet meer te krijgen is, en die vergelijking maakt
 * zichtbaar wat een bestaand contract waard is.
 */
export function standaardBesteljaren(rond = 2026): number[] {
  return [rond - 2, rond - 1, rond, rond + 1, rond + 2];
}
