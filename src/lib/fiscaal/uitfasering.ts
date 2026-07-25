import { aftrekPct, berekenJaar } from "./engine";
import type { FiscaleContext, Vehicle } from "./types";

/**
 * De uitdoofkalender zichtbaar maken.
 *
 * De rekenkern past het dalende aftrekpercentage al toe, maar de interface
 * toonde tot nu toe alleen het eerste jaar. Net dat verbergt de kern van de
 * zaak: een verbrandingswagen die vandaag nog 50% aftrekbaar is, is dat over
 * twee jaar niet meer, en dat verschil loopt in de duizenden euro's.
 */

export interface Uitfaseringsjaar {
  jaar: number;
  aftrekPct: number;
  verworpenUitgaven: number;
  fiscaleMeerkost: number;
  /** True wanneer de aftrek in dit jaar lager ligt dan het jaar ervoor. */
  daaltHier: boolean;
}

export interface Uitfasering {
  jaren: Uitfaseringsjaar[];
  /** Het eerste jaar waarin de aftrek daalt, of null als ze stabiel blijft. */
  eersteDaling: number | null;
  /** Het eerste jaar waarin de aftrek nul wordt, of null. */
  eersteNulJaar: number | null;
  /** Aftrek in het eerste jaar van het bereik. */
  aftrekStart: number;
  /** Aftrek in het laatste jaar van het bereik. */
  aftrekEinde: number;
  /**
   * Hoeveel de fiscale meerkost in het laatste jaar hoger ligt dan in het
   * eerste. Dit is het bedrag waar de waarschuwing over gaat.
   */
  meerkostToename: number;
}

/**
 * Rekent de aftrekbaarheid en de fiscale meerkost per kalenderjaar uit over een
 * bereik, standaard van het startjaar tot en met 2031. Dat eindjaar is niet
 * willekeurig: de aftrekkalender in de database loopt tot die grens.
 */
export function berekenUitfasering(
  ctx: FiscaleContext,
  vehicle: Vehicle,
  startjaar: number,
  eindjaar = 2031,
  opties?: { kmoTarief?: boolean },
): Uitfasering {
  const jaren: Uitfaseringsjaar[] = [];
  let vorigePct: number | null = null;

  for (let jaar = startjaar; jaar <= Math.max(startjaar, eindjaar); jaar++) {
    const pct = aftrekPct(ctx, vehicle, jaar);
    const r = berekenJaar(ctx, vehicle, jaar, opties);
    jaren.push({
      jaar,
      aftrekPct: pct,
      verworpenUitgaven: r.verworpenUitgaven,
      fiscaleMeerkost: r.fiscaleMeerkost,
      daaltHier: vorigePct !== null && pct < vorigePct,
    });
    vorigePct = pct;
  }

  const eersteDaling = jaren.find((j) => j.daaltHier)?.jaar ?? null;
  const eersteNulJaar = jaren.find((j) => j.aftrekPct === 0)?.jaar ?? null;
  const eerste = jaren[0];
  const laatste = jaren[jaren.length - 1];

  return {
    jaren,
    eersteDaling,
    eersteNulJaar,
    aftrekStart: eerste.aftrekPct,
    aftrekEinde: laatste.aftrekPct,
    meerkostToename: laatste.fiscaleMeerkost - eerste.fiscaleMeerkost,
  };
}
