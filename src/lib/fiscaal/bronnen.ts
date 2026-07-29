/**
 * Zekerheid en bronvermelding per cijfer.
 *
 * De Belgische autofiscaliteit bestaat uit drie soorten cijfers door elkaar:
 * bedragen die in het Staatsblad staan, bedragen die uit secundaire bronnen
 * komen en nog bij de administratie te toetsen zijn, en bedragen die wel al
 * circuleren maar nog niet beslist zijn. Ze alle drie als hetzelfde tonen is de
 * snelste manier om het vertrouwen van een boekhouder te verliezen.
 *
 * Elke parameter die deze rekenkern buiten de federale kern gebruikt, draagt
 * daarom zijn eigen zekerheid en rechtsbron mee. De interface toont dat als een
 * badge naast het bedrag, de rekenkern gebruikt het om een resultaat als geheel
 * te markeren.
 */

export type Zekerheid =
  /** Gepubliceerd in het Staatsblad of op de site van de bevoegde administratie. */
  | "bevestigd"
  /** Uit een secundaire bron; te toetsen bij VLABEL, SPW, FOD of RSZ. */
  | "teVerifieren"
  /** Aangekondigd of uitgelekt, nog niet definitief beslist. */
  | "voorlopig";

/** Volgorde van zeker naar onzeker. Gebruikt om zekerheden samen te voegen. */
const RANGORDE: Record<Zekerheid, number> = {
  bevestigd: 0,
  teVerifieren: 1,
  voorlopig: 2,
};

/** Het symbool uit het bronrapport, zodat tekst en interface hetzelfde tonen. */
export const ZEKERHEID_SYMBOOL: Record<Zekerheid, string> = {
  bevestigd: "✅",
  teVerifieren: "\u{1F7E1}",
  voorlopig: "\u{1F535}",
};

/** Kleur van de badge in de interface, cf. de tints in components/ui.tsx. */
export const ZEKERHEID_TINT: Record<Zekerheid, string> = {
  bevestigd: "green",
  teVerifieren: "amber",
  voorlopig: "slate",
};

export interface Bron {
  /** Korte verwijzing naar de rechtsbron, bijvoorbeeld "KB 17/12/2025, BS 24/12/2025". */
  wet: string;
  zekerheid: Zekerheid;
}

/** Een waarde met de bron waaruit ze komt. */
export interface MetBron<T> {
  waarde: T;
  bron: Bron;
}

/**
 * De laagste zekerheid uit een reeks. Een berekening is nooit zekerder dan haar
 * zwakste parameter: één voorlopig tarief maakt de hele uitkomst voorlopig.
 */
export function laagsteZekerheid(zekerheden: Zekerheid[]): Zekerheid {
  return zekerheden.reduce<Zekerheid>(
    (laagste, z) => (RANGORDE[z] > RANGORDE[laagste] ? z : laagste),
    "bevestigd",
  );
}

/** Alle bronnen van een berekening, ontdubbeld op wettekst. */
export function bundelBronnen(bronnen: Bron[]): Bron[] {
  const perWet = new Map<string, Bron>();
  for (const bron of bronnen) {
    const bestaand = perWet.get(bron.wet);
    if (!bestaand || RANGORDE[bron.zekerheid] > RANGORDE[bestaand.zekerheid]) {
      perWet.set(bron.wet, bron);
    }
  }
  return [...perWet.values()];
}

/**
 * Standaardvorm van een resultaat dat niet uit de federale kernparameters komt.
 * Het bedrag mag null zijn: bij de gewestelijke barema's is "wij kennen dit
 * tarief niet" een eerlijker antwoord dan een verzonnen getal.
 */
export interface GemarkeerdBedrag {
  bedrag: number | null;
  zekerheid: Zekerheid;
  bronnen: Bron[];
  /** Toelichting per stap, voor de detailweergave en het PDF-dossier. */
  toelichting: string[];
}
