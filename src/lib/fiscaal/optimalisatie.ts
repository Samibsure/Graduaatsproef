import { berekenProjectie, voordeelAlleAard } from "./engine";
import { catalogNaarWagen } from "./catalog";
import type { CatalogCar, FiscaleContext, Vehicle } from "./types";

/**
 * De omgekeerde vraag.
 *
 * De rest van de rekenkern beantwoordt "wat kost deze wagen?". Hier draaien we
 * dat om: "welke wagen past binnen dit budget?" en "welke eigen bijdrage brengt
 * het voordeel van alle aard op dit bedrag?". Beide bouwen op dezelfde pure
 * functies, zodat er geen tweede waarheid ontstaat.
 */

export interface OptimalisatieOpties {
  startjaar: number;
  jaren?: number;
  kmoTarief?: boolean;
}

/**
 * De eigen bijdrage per maand die het VAA op `doelVaa` brengt.
 *
 * Geeft 0 terug wanneer het VAA al lager ligt: een bijdrage kan het voordeel
 * niet negatief maken, dus meer betalen dan het VAA heeft fiscaal geen zin.
 */
export function eigenBijdrageVoorVaa(
  ctx: FiscaleContext,
  vehicle: Vehicle,
  gebruiksjaar: number,
  doelVaa = 0,
): number {
  const bruto = voordeelAlleAard(ctx, vehicle, gebruiksjaar);
  return Math.max(0, (bruto - Math.max(0, doelVaa)) / 12);
}

export interface Kandidaat {
  car: CatalogCar;
  wagen: Vehicle;
  tcoJaar: number;
  tcoMaand: number;
  verworpenUitgavenJaar: number;
  gemiddeldeAftrekPct: number;
  vaaJaar: number;
}

/**
 * Rekent elk catalogusmodel door en sorteert op maandelijkse totale kost.
 *
 * De ramingen voor de autokosten komen uit geschatteAutokosten(); ze zijn een
 * vertrekpunt, geen offerte. Dat staat ook zo in de interface.
 */
export function rangschikCatalogus(
  ctx: FiscaleContext,
  catalogus: CatalogCar[],
  opties: OptimalisatieOpties,
): Kandidaat[] {
  const jaren = opties.jaren ?? 4;

  return catalogus
    .map((car) => {
      const basis = catalogNaarWagen(car, opties.startjaar);
      const wagen: Vehicle = { id: `catalog-${car.id}`, ...basis };
      const projectie = berekenProjectie(ctx, wagen, opties.startjaar, jaren, {
        kmoTarief: opties.kmoTarief,
      });
      return {
        car,
        wagen,
        tcoJaar: projectie.totaleKost / jaren,
        tcoMaand: projectie.totaleKost / (jaren * 12),
        verworpenUitgavenJaar: projectie.totaleVU / jaren,
        gemiddeldeAftrekPct: projectie.gemiddeldeAftrekPct,
        vaaJaar: projectie.jaren[0].vaa,
      };
    })
    .sort((a, b) => a.tcoMaand - b.tcoMaand);
}

export interface BudgetFilter {
  maxTcoMaand?: number | null;
  maxCataloguswaarde?: number | null;
  maxCo2?: number | null;
  voertuigtypes?: string[] | null;
}

/** Houdt uit een rangschikking over wat binnen het opgegeven budget past. */
export function pasBinnenBudget(kandidaten: Kandidaat[], filter: BudgetFilter): Kandidaat[] {
  return kandidaten.filter((k) => {
    if (filter.maxTcoMaand != null && k.tcoMaand > filter.maxTcoMaand) return false;
    if (filter.maxCataloguswaarde != null && k.car.cataloguswaarde > filter.maxCataloguswaarde) {
      return false;
    }
    if (filter.maxCo2 != null && k.car.co2 > filter.maxCo2) return false;
    if (filter.voertuigtypes?.length && !filter.voertuigtypes.includes(k.car.voertuigtype)) {
      return false;
    }
    return true;
  });
}
