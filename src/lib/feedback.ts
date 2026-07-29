import { CONTACT } from "./contact";
import { isOntbrekendeTabel } from "./postgrest";
import { supabase } from "./supabase";

/**
 * Bugs melden en verbeteringen vragen.
 *
 * Er bestond hiervoor geen enkele weg. Op /over stond een e-mailadres in een
 * alinea, en op de crashpagina stond datzelfde adres als platte tekst, niet eens
 * als link. Voor een gratis fiscale rekentool is "er zit een fout in deze
 * berekening" het waardevolste wat iemand kan zeggen, en dat mag geen
 * overtypwerk vragen.
 *
 * ## Waarom rechtstreeks naar Supabase
 *
 * De CSP (next.config.ts) beperkt connect-src tot 'self' en de eigen
 * Supabase-origin. Een externe formulierdienst wordt dus geblokkeerd, en dat is
 * bewust zo: waar gegevens naartoe mogen, staat vast.
 *
 * ## Waarom er een terugval is
 *
 * De tabel komt uit migratie 0010, en die moet met de hand uitgevoerd worden op
 * het Supabase-project. Tot dat gebeurd is, bestaat de tabel niet en zou het
 * formulier een onbegrijpelijke fout tonen. In dat geval opent de knop de
 * mailclient met alles vooringevuld. De gebruiker merkt het verschil niet: zijn
 * melding komt aan.
 */

/**
 * Hetzelfde adres als op de Over-pagina en in de privacyverklaring: een melding
 * die ergens anders toekomt dan een vraag, splitst de mailbox zonder reden.
 */
export const FEEDBACK_EMAIL = CONTACT;

export type Feedbacksoort = "bug" | "idee" | "vraag";

export interface Feedback {
  soort: Feedbacksoort;
  omschrijving: string;
  email?: string | null;
  /** Waar de melding vandaan komt. Nooit gegevens uit de vloot of het bedrijf. */
  pagina?: string | null;
  taal?: string | null;
  schermbreedte?: number | null;
  user_agent?: string | null;
}

export type Verzendresultaat = "bewaard" | "geen-tabel";

export async function verstuurFeedback(melding: Feedback): Promise<Verzendresultaat> {
  const omschrijving = melding.omschrijving.trim();
  if (omschrijving.length < 5) {
    throw new Error("Schrijf iets meer, zodat de melding te onderzoeken valt.");
  }

  const { error } = await supabase.from("feedback").insert({
    soort: melding.soort,
    omschrijving,
    email: melding.email?.trim() || null,
    pagina: melding.pagina ?? null,
    taal: melding.taal ?? null,
    schermbreedte: melding.schermbreedte ?? null,
    user_agent: melding.user_agent?.slice(0, 500) ?? null,
  });

  if (!error) return "bewaard";
  // Migratie 0010 nog niet uitgevoerd: dan gaat de melding per e-mail.
  if (isOntbrekendeTabel(error)) return "geen-tabel";
  throw new Error(`Melding versturen mislukt: ${error.message}`);
}

/** De mailto-terugval, met alles al ingevuld zodat er niets over te typen valt. */
export function feedbackMailto(melding: Feedback, onderwerpen: Record<Feedbacksoort, string>): string {
  const regels = [
    melding.omschrijving.trim(),
    "",
    "---",
    melding.pagina ? `Pagina: ${melding.pagina}` : null,
    melding.taal ? `Taal: ${melding.taal}` : null,
    melding.schermbreedte ? `Schermbreedte: ${melding.schermbreedte}px` : null,
    melding.user_agent ? `Browser: ${melding.user_agent}` : null,
  ].filter(Boolean);

  const onderwerp = encodeURIComponent(onderwerpen[melding.soort]);
  const inhoud = encodeURIComponent(regels.join("\n"));
  return `mailto:${FEEDBACK_EMAIL}?subject=${onderwerp}&body=${inhoud}`;
}

/** De context die automatisch meegaat. Alleen wat helpt om een fout te vinden. */
export function huidigeContext(pagina: string, taal: string): Pick<
  Feedback,
  "pagina" | "taal" | "schermbreedte" | "user_agent"
> {
  if (typeof window === "undefined") {
    return { pagina, taal, schermbreedte: null, user_agent: null };
  }
  return {
    pagina,
    taal,
    schermbreedte: window.innerWidth,
    user_agent: window.navigator.userAgent,
  };
}
