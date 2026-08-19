import { routing } from "@/i18n/routing";

/**
 * Het taalvoorvoegsel van een pad, voor de routes buiten next-intl om.
 *
 * `/afmelden` en `/auth/callback` zijn gewone routehandlers: die zitten niet
 * onder `[locale]` en kennen de taal dus niet. Ze stuurden allebei door naar een
 * pad zonder voorvoegsel, waardoor een Franstalige gebruiker in het Nederlands
 * belandde na afmelden, na het bevestigen van zijn e-mailadres en na een
 * wachtwoordherstel: precies op de momenten waarop hij het minst verwacht dat de
 * taal verspringt.
 */

/** Nederlands staat zonder voorvoegsel in de URL; de rest krijgt er een. */
export function voorvoegsel(taal: string | null | undefined): string {
  if (!taal) return "";
  if (!(routing.locales as readonly string[]).includes(taal)) return "";
  return taal === routing.defaultLocale ? "" : `/${taal}`;
}

/** Waar iemand belandt wanneer het gevraagde pad niet door de controle komt. */
export const STANDAARD_BESTEMMING = "/wagens";

/**
 * Een pad uit een queryparameter, teruggebracht tot iets wat gegarandeerd op
 * deze site blijft.
 *
 * Hier stond `pad.startsWith("/") && !pad.startsWith("//")`. Die controle weert
 * `//kwaadaardig.be`, maar niet `/\kwaadaardig.be`: de URL-parser behandelt een
 * backslash in een http(s)-adres als een schuine streep, dus
 * `new URL("/\evil.com", "https://autofiscaliteit.com/")` levert
 * `https://evil.com/` op. Een phishinglink naar het échte domein stuurde de
 * gebruiker zo meteen na een geslaagde aanmelding door naar de aanvaller, met
 * autofiscaliteit.com in de adresbalk op het moment dat hij zijn wachtwoord
 * intikte.
 *
 * Vandaar geen tekencontrole meer maar een echte parse tegen een basis die
 * nergens bestaat: blijft de oorsprong die basis, dan was het pad relatief. Het
 * resultaat is altijd pad + queryreeks, nooit een oorsprong.
 */
export function veiligPad(pad: string | null | undefined): string {
  if (!pad || !pad.startsWith("/")) return STANDAARD_BESTEMMING;
  try {
    const basis = "https://intern.invalid";
    const url = new URL(pad, basis);
    if (url.origin !== basis) return STANDAARD_BESTEMMING;
    return `${url.pathname}${url.search}`;
  } catch {
    return STANDAARD_BESTEMMING;
  }
}

/**
 * Een pad met het juiste taalvoorvoegsel, met een controle op open redirects.
 *
 * Alleen relatieve paden komen erdoor; zie `veiligPad`.
 */
export function metTaal(pad: string | null | undefined, taal: string | null | undefined): string {
  const veilig = veiligPad(pad);
  const vv = voorvoegsel(taal);
  // Niet dubbel voorvoegen wanneer het pad de taal al draagt.
  if (vv && (veilig === vv || veilig.startsWith(`${vv}/`))) return veilig;
  return `${vv}${veilig}`;
}
