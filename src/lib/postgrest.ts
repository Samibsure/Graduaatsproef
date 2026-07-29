/**
 * Herkennen wanneer een tabel of kolom nog niet bestaat.
 *
 * De applicatie praat rechtstreeks met PostgREST. Migratie 0010 voegt twee
 * tabellen toe (`feedback` en `eigen_modellen`) en moet met de hand uitgevoerd
 * worden op het Supabase-project. Tussen het uitrollen van deze versie en het
 * draaien van die migratie bestaan die tabellen dus niet.
 *
 * Zonder deze controle zou de gebruiker in dat venster een onbegrijpelijke
 * foutmelding krijgen ("relation does not exist"). Mét deze controle valt de
 * functie die erop steunt netjes terug: het feedbackformulier op e-mail, de
 * eigen modellenbibliotheek op een lege lijst met uitleg.
 *
 * De herkenning is bewust nauw. Alleen deze codes en boodschappen tellen als
 * "nog niet gemigreerd"; elke andere fout is een echte fout en hoort de
 * gebruiker te bereiken in plaats van weggemoffeld te worden.
 */
export function isOntbrekendeTabel(
  fout: { code?: string; message?: string } | null | undefined,
): boolean {
  if (!fout) return false;
  // 42P01 = undefined_table, 42703 = undefined_column,
  // PGRST204/PGRST205 = onbekende kolom of tabel in het schemacachegeheugen.
  if (["42P01", "42703", "PGRST204", "PGRST205"].includes(fout.code ?? "")) return true;
  return /schema cache|does not exist|bestaat niet/i.test(fout.message ?? "");
}
