import { EURONORMEN } from "./types";
import type { Brandstof, Euronorm, Voertuigtype } from "./types";
import type { Bron } from "./bronnen";

/**
 * Lage-emissiezones.
 *
 * Geen belasting, maar wel de reden waarom een oude diesel sneller in waarde
 * daalt dan zijn fiscale behandeling doet vermoeden: wie er niet meer in mag,
 * verkoopt hem niet meer aan wie er wel moet zijn. Voor een vlootbeslissing is
 * dat even zwaar als het aftrekpercentage.
 *
 * De regels verschillen per stad en werden in 2025 twee keer bijgesteld: de
 * Vlaamse verstrenging werd in september 2025 geschrapt, terwijl Brussel na een
 * arrest van het Grondwettelijk Hof net verstrengde.
 */

export type LezStad = "antwerpen" | "gent" | "brussel";

export interface LezRegel {
  stad: LezStad;
  /** Strengste toegelaten euronorm per brandstof. */
  minimum: Partial<Record<Brandstof, Euronorm>>;
  dagpas: { prijs: number; maxPerJaar: number | null } | null;
  boete: number | null;
  /** Loopt er nog een waarschuwingsperiode, en tot wanneer? */
  waarschuwingTot: string | null;
  bron: Bron;
}

export const LEZ_REGELS: LezRegel[] = [
  {
    stad: "antwerpen",
    minimum: { diesel: "euro5", benzine: "euro2", lpg: "euro2", cng: "euro2" },
    dagpas: { prijs: 35, maxPerJaar: null },
    boete: 150,
    waarschuwingTot: null,
    bron: {
      wet: "Vlaams LEZ-kader, versoepeling september 2025",
      zekerheid: "bevestigd",
    },
  },
  {
    stad: "gent",
    minimum: { diesel: "euro5", benzine: "euro2", lpg: "euro2", cng: "euro2" },
    dagpas: { prijs: 35, maxPerJaar: null },
    boete: 150,
    waarschuwingTot: null,
    bron: {
      wet: "Vlaams LEZ-kader, versoepeling september 2025",
      zekerheid: "bevestigd",
    },
  },
  {
    stad: "brussel",
    // Sinds 11 september 2025, na het arrest van het Grondwettelijk Hof.
    minimum: { diesel: "euro6", benzine: "euro3", lpg: "euro3", cng: "euro3" },
    dagpas: { prijs: 35, maxPerJaar: 24 },
    boete: 350,
    waarschuwingTot: "2026-03-31",
    bron: {
      wet: "Brussels LEZ-besluit, van kracht sinds 11/9/2025",
      zekerheid: "bevestigd",
    },
  },
];

export interface LezToegang {
  stad: LezStad;
  toegelaten: boolean;
  /** Vrijgesteld ongeacht de euronorm, bijvoorbeeld een elektrische wagen. */
  vrijgesteld: boolean;
  reden: string;
  /** Wat een dag rijden kost wanneer de wagen niet toegelaten is. */
  dagpasPrijs: number | null;
  /** Boete bij een overtreding, of null tijdens de waarschuwingsperiode. */
  boete: number | null;
  bron: Bron;
}

export interface LezVoertuig {
  voertuigtype: Voertuigtype;
  brandstof: Brandstof;
  euronorm?: Euronorm | null;
  co2?: number;
}

function haalt(norm: Euronorm, minimum: Euronorm): boolean {
  return EURONORMEN.indexOf(norm) >= EURONORMEN.indexOf(minimum);
}

/**
 * Mag deze wagen de zone in?
 *
 * Elektrische wagens en waterstofwagens zijn overal vrijgesteld, plug-inhybrides
 * onder de 50 g eveneens. Voor de rest beslist de euronorm. Zonder euronorm is
 * er geen uitspraak te doen: dat wordt gezegd, niet geraden.
 */
export function lezToegang(voertuig: LezVoertuig, stad: LezStad): LezToegang {
  const regel = LEZ_REGELS.find((r) => r.stad === stad);
  if (!regel) throw new Error(`Geen LEZ-regels gekend voor ${stad}`);

  const basis = {
    stad,
    dagpasPrijs: regel.dagpas?.prijs ?? null,
    boete: regel.waarschuwingTot ? null : regel.boete,
    bron: regel.bron,
  };

  if (voertuig.voertuigtype === "BEV") {
    return { ...basis, toegelaten: true, vrijgesteld: true, reden: "Emissievrij: overal vrijgesteld.", dagpasPrijs: null };
  }

  if (voertuig.voertuigtype === "PHEV" && (voertuig.co2 ?? 999) < 50) {
    return {
      ...basis,
      toegelaten: true,
      vrijgesteld: true,
      reden: "Plug-inhybride onder 50 g/km: vrijgesteld.",
      dagpasPrijs: null,
    };
  }

  const minimum = regel.minimum[voertuig.brandstof];
  if (!minimum) {
    return { ...basis, toegelaten: true, vrijgesteld: false, reden: "Voor deze brandstof geldt geen beperking." };
  }

  if (!voertuig.euronorm) {
    return {
      ...basis,
      toegelaten: false,
      vrijgesteld: false,
      reden: `Zonder euronorm valt niet te bepalen of de wagen binnen mag. ${stad} vraagt minstens ${minimum} voor ${voertuig.brandstof}.`,
    };
  }

  const toegelaten = haalt(voertuig.euronorm, minimum);
  return {
    ...basis,
    toegelaten,
    vrijgesteld: false,
    reden: toegelaten
      ? `${voertuig.euronorm} haalt de vereiste ${minimum}.`
      : `${voertuig.euronorm} haalt de vereiste ${minimum} niet.`,
  };
}

/** De toegang tot alle zones tegelijk, voor de restwaardebeoordeling. */
export function lezOverzicht(voertuig: LezVoertuig): LezToegang[] {
  return LEZ_REGELS.map((r) => lezToegang(voertuig, r.stad));
}
