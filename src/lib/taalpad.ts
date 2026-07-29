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

/**
 * Een pad met het juiste taalvoorvoegsel, met een controle op open redirects.
 *
 * Alleen relatieve paden komen erdoor: `//kwaadaardig.be` ziet er relatief uit
 * maar is dat niet, en zou de gebruiker na het aanmelden naar een andere site
 * sturen.
 */
export function metTaal(pad: string | null | undefined, taal: string | null | undefined): string {
  const veilig = pad && pad.startsWith("/") && !pad.startsWith("//") ? pad : "/wagens";
  const vv = voorvoegsel(taal);
  // Niet dubbel voorvoegen wanneer het pad de taal al draagt.
  if (vv && (veilig === vv || veilig.startsWith(`${vv}/`))) return veilig;
  return `${vv}${veilig}`;
}
