import { berekenJaar } from "./engine";
import type { FiscaleContext, Vehicle } from "./types";

/**
 * De vloot als geheel.
 *
 * De vergelijkingspagina zet maximaal drie kandidaten naast elkaar. Dat
 * beantwoordt "welke wagen kies ik", maar niet "wat kost mijn wagenpark de
 * komende jaren". Voor een bedrijf met tien wagens is die tweede vraag de
 * duurdere.
 */

export interface VlootJaar {
  jaar: number;
  verworpenUitgaven: number;
  extraVenB: number;
  rsz: number;
  autokosten: number;
  totaleKost: number;
  /** Gewogen gemiddelde aftrek, naar kostenaandeel. */
  gemiddeldeAftrekPct: number;
}

export interface VlootWagen {
  vehicle: Vehicle;
  verworpenUitgavenJaar1: number;
  fiscaleMeerkostJaar1: number;
  totaleKostJaar1: number;
  aftrekPctJaar1: number;
  /** Jaar waarin deze wagen zijn aftrek volledig verliest, of null. */
  nulJaar: number | null;
}

export interface VlootPrognose {
  jaren: VlootJaar[];
  wagens: VlootWagen[];
  /** Totale verworpen uitgaven over de hele periode. */
  totaleVU: number;
  /** Totale fiscale meerkost over de hele periode. */
  totaleFiscaleMeerkost: number;
}

/**
 * Rekent de volledige vloot door per kalenderjaar.
 *
 * `wagens` bevat zowel vloot als kandidaten; de aanroeper filtert zelf op
 * categorie. Zo kan dezelfde functie een "wat als we deze kandidaat opnemen"
 * doorrekenen zonder tweede implementatie.
 */
export function berekenVlootPrognose(
  ctx: FiscaleContext,
  wagens: Vehicle[],
  startjaar: number,
  eindjaar = 2031,
  opties?: { kmoTarief?: boolean },
): VlootPrognose {
  const jaren: VlootJaar[] = [];

  for (let jaar = startjaar; jaar <= Math.max(startjaar, eindjaar); jaar++) {
    let verworpenUitgaven = 0;
    let extraVenB = 0;
    let rsz = 0;
    let autokosten = 0;
    let totaleKost = 0;
    let gewogenAftrek = 0;
    let kostenBasisSom = 0;

    for (const w of wagens) {
      const r = berekenJaar(ctx, w, jaar, opties);
      verworpenUitgaven += r.verworpenUitgaven;
      extraVenB += r.extraVenB;
      rsz += r.rszJaar;
      autokosten += r.kostenOnderworpen + r.kostenVolledigAftrekbaar;
      totaleKost += r.totaleKost;
      gewogenAftrek += r.aftrekPct * r.kostenOnderworpen;
      kostenBasisSom += r.kostenOnderworpen;
    }

    jaren.push({
      jaar,
      verworpenUitgaven,
      extraVenB,
      rsz,
      autokosten,
      totaleKost,
      gemiddeldeAftrekPct: kostenBasisSom > 0 ? gewogenAftrek / kostenBasisSom : 0,
    });
  }

  const wagenRegels: VlootWagen[] = wagens
    .map((vehicle) => {
      const eerste = berekenJaar(ctx, vehicle, startjaar, opties);

      // Het eerste jaar waarin deze wagen op 0% aftrek valt, binnen het bereik.
      let nulJaar: number | null = null;
      for (let jaar = startjaar; jaar <= eindjaar; jaar++) {
        if (berekenJaar(ctx, vehicle, jaar, opties).aftrekPct === 0) {
          nulJaar = jaar;
          break;
        }
      }

      return {
        vehicle,
        verworpenUitgavenJaar1: eerste.verworpenUitgaven,
        fiscaleMeerkostJaar1: eerste.fiscaleMeerkost,
        totaleKostJaar1: eerste.totaleKost,
        aftrekPctJaar1: eerste.aftrekPct,
        nulJaar,
      };
    })
    // Duurste eerst: dat is de lijst waar een zaakvoerder naar wil kijken.
    .sort((a, b) => b.fiscaleMeerkostJaar1 - a.fiscaleMeerkostJaar1);

  return {
    jaren,
    wagens: wagenRegels,
    totaleVU: jaren.reduce((s, j) => s + j.verworpenUitgaven, 0),
    totaleFiscaleMeerkost: jaren.reduce((s, j) => s + j.extraVenB + j.rsz, 0),
  };
}

/**
 * Wagens waarvan het contract binnen `maanden` afloopt, met het aantal maanden
 * dat er nog rest. Gesorteerd op wat het eerst vervalt.
 */
export function vervangkalender(
  wagens: Vehicle[],
  vandaag: Date,
  maanden = 12,
): Array<{ vehicle: Vehicle; eindigt: string; maandenTeGaan: number }> {
  const grens = new Date(vandaag);
  grens.setMonth(grens.getMonth() + maanden);

  return wagens
    .filter((w) => w.einde_contract)
    .map((w) => {
      const eind = new Date(w.einde_contract as string);
      const maandenTeGaan =
        (eind.getFullYear() - vandaag.getFullYear()) * 12 + (eind.getMonth() - vandaag.getMonth());
      return { vehicle: w, eindigt: w.einde_contract as string, maandenTeGaan };
    })
    .filter((r) => new Date(r.eindigt) <= grens)
    .sort((a, b) => a.eindigt.localeCompare(b.eindigt));
}
