import type { Vehicle } from "./fiscaal/types";

/**
 * Import en export van de vloot.
 *
 * Wagens moesten tot nu toe één voor één ingegeven worden, en er was geen enkele
 * manier om ze er weer uit te krijgen. Voor een bedrijf met vijftien wagens is
 * dat het verschil tussen de tool proberen en de tool gebruiken.
 *
 * Bewust een eigen parser en geen bibliotheek: het formaat is beperkt en
 * volledig in ons beheer, en dit scheelt een afhankelijkheid in de browser.
 * De parser kent wel de twee dingen die er echt toe doen: velden tussen
 * aanhalingstekens, en dubbele aanhalingstekens als ontsnapping daarbinnen.
 */

/** De kolommen van het sjabloon, in vaste volgorde. */
export const CSV_KOLOMMEN = [
  "omschrijving",
  "categorie",
  "merk",
  "model",
  "voertuigtype",
  "brandstof",
  "besteldatum",
  "eerste_ingebruikname",
  "co2",
  "cataloguswaarde",
  "jaarlijkse_autokosten",
  "aankoopprijs",
  "tankkaart",
  "beroepsgebruik_pct",
  "thuislaadpunt",
  "km_per_jaar",
  "flex_score",
  "restwaarde_score",
  "btw_methode",
  "kosten_financiering",
  "eigen_bijdrage_maand",
  "laadpaal_jaarkost",
  "laadstroom_jaar",
  "einde_contract",
] as const;

export type CsvKolom = (typeof CSV_KOLOMMEN)[number];

function ontsnap(waarde: unknown): string {
  if (waarde === null || waarde === undefined) return "";
  const tekst = String(waarde);
  // Alleen aanhalingstekens zetten wanneer het moet: dat houdt het bestand
  // leesbaar wanneer iemand het in een editor opent.
  return /[",;\n\r]/.test(tekst) ? `"${tekst.replace(/"/g, '""')}"` : tekst;
}

/**
 * Zet wagens om naar CSV. Het scheidingsteken is een puntkomma: Excel in een
 * Belgische landinstelling opent een komma-CSV als één kolom.
 */
export function wagensNaarCsv(wagens: Vehicle[]): string {
  const regels = [CSV_KOLOMMEN.join(";")];
  for (const w of wagens) {
    regels.push(
      CSV_KOLOMMEN.map((kolom) => ontsnap((w as unknown as Record<string, unknown>)[kolom])).join(";"),
    );
  }
  return regels.join("\r\n");
}

/** Een leeg sjabloon met alleen de kopregel en één voorbeeldrij. */
export function csvSjabloon(): string {
  const voorbeeld: Record<string, string> = {
    omschrijving: "Voorbeeld BEV",
    categorie: "kandidaat",
    merk: "Tesla",
    model: "Model Y",
    voertuigtype: "BEV",
    brandstof: "elektrisch",
    besteldatum: "2026-01-15",
    eerste_ingebruikname: "2026-03-01",
    co2: "0",
    cataloguswaarde: "39990",
    jaarlijkse_autokosten: "6800",
    aankoopprijs: "39990",
    tankkaart: "ja",
    beroepsgebruik_pct: "100",
    thuislaadpunt: "ja",
    km_per_jaar: "25000",
    flex_score: "7",
    restwaarde_score: "6",
    btw_methode: "geen",
    kosten_financiering: "",
    eigen_bijdrage_maand: "0",
    laadpaal_jaarkost: "0",
    laadstroom_jaar: "0",
    einde_contract: "",
  };
  return [
    CSV_KOLOMMEN.join(";"),
    CSV_KOLOMMEN.map((k) => ontsnap(voorbeeld[k])).join(";"),
  ].join("\r\n");
}

/** Splitst één CSV-regel, met respect voor velden tussen aanhalingstekens. */
export function splitsRegel(regel: string, scheider: string): string[] {
  const velden: string[] = [];
  let huidig = "";
  let inAanhaling = false;

  for (let i = 0; i < regel.length; i++) {
    const teken = regel[i];
    if (inAanhaling) {
      if (teken === '"') {
        // Twee aanhalingstekens na elkaar zijn één letterlijk aanhalingsteken.
        if (regel[i + 1] === '"') {
          huidig += '"';
          i++;
        } else {
          inAanhaling = false;
        }
      } else {
        huidig += teken;
      }
    } else if (teken === '"') {
      inAanhaling = true;
    } else if (teken === scheider) {
      velden.push(huidig);
      huidig = "";
    } else {
      huidig += teken;
    }
  }
  velden.push(huidig);
  return velden;
}

export interface ImportRegel {
  /** Regelnummer in het bestand, kopregel meegeteld. Voor de foutmelding. */
  regelnummer: number;
  waarden: Partial<Record<CsvKolom, string>>;
}

export interface ImportResultaat {
  regels: ImportRegel[];
  /** Kolommen in het bestand die wij niet kennen. */
  onbekendeKolommen: string[];
  /** Kolommen die wij verwachten maar die ontbreken. */
  ontbrekendeKolommen: string[];
}

/**
 * Leest een CSV in. Detecteert zelf of er puntkomma's of komma's gebruikt zijn,
 * want beide komen in de praktijk uit Excel.
 */
export function leesCsv(inhoud: string): ImportResultaat {
  const regels = inhoud
    .replace(/^﻿/, "") // Byte order mark die Excel er graag voor zet.
    .split(/\r\n|\n|\r/)
    .filter((r) => r.trim() !== "");

  if (regels.length === 0) {
    return { regels: [], onbekendeKolommen: [], ontbrekendeKolommen: [...CSV_KOLOMMEN] };
  }

  const scheider = (regels[0].match(/;/g)?.length ?? 0) >= (regels[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const kop = splitsRegel(regels[0], scheider).map((k) => k.trim().toLowerCase());

  const bekend = new Set<string>(CSV_KOLOMMEN);
  const onbekendeKolommen = kop.filter((k) => k !== "" && !bekend.has(k));
  const ontbrekendeKolommen = CSV_KOLOMMEN.filter((k) => !kop.includes(k));

  const uitgelezen: ImportRegel[] = regels.slice(1).map((regel, i) => {
    const velden = splitsRegel(regel, scheider);
    const waarden: Partial<Record<CsvKolom, string>> = {};
    kop.forEach((kolom, index) => {
      if (bekend.has(kolom)) waarden[kolom as CsvKolom] = (velden[index] ?? "").trim();
    });
    return { regelnummer: i + 2, waarden };
  });

  return { regels: uitgelezen, onbekendeKolommen, ontbrekendeKolommen };
}

/** Leest "ja", "waar", "true" en "1" als true; al de rest als false. */
export function leesBoolean(waarde: string | undefined): boolean {
  return ["ja", "j", "waar", "true", "1", "oui", "yes"].includes((waarde ?? "").trim().toLowerCase());
}

/** Leest een getal, met zowel de komma als de punt als decimaalteken. */
export function leesGetal(waarde: string | undefined): number | null {
  const schoon = (waarde ?? "").trim().replace(/\s/g, "").replace(",", ".");
  if (schoon === "") return null;
  const n = Number(schoon);
  return Number.isFinite(n) ? n : null;
}
