/**
 * Onder welke namen de Supabase-configuratie kan binnenkomen.
 *
 * De applicatie leest zelf alleen NEXT_PUBLIC_SUPABASE_URL en
 * NEXT_PUBLIC_SUPABASE_ANON_KEY. Maar wie zijn Supabase-project via de
 * Vercel-marketplace aanmaakt, krijgt de waarden onder de namen van díe
 * integratie geïnjecteerd — meestal zonder NEXT_PUBLIC_-voorvoegsel. Zonder
 * vertaalslag faalt de build dan met "variabele ontbreekt", terwijl ze er wel
 * degelijk staat.
 *
 * next.config.ts zoekt daarom de eerste naam die gevuld is en zet de waarde
 * door naar de canonieke naam, ook richting de browser.
 */
export const URL_NAMEN = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PROJECT_URL",
  "SUPABASE_PROJECT_URL",
] as const;

export const SLEUTEL_NAMEN = [
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_ANON_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
] as const;

/** De eerste naam uit de lijst die een niet-lege waarde heeft. */
export function eersteWaarde(
  namen: readonly string[],
  omgeving: Record<string, string | undefined>,
): string | undefined {
  for (const naam of namen) {
    const waarde = omgeving[naam]?.trim();
    if (waarde) return waarde;
  }
  return undefined;
}

/**
 * Een geheime sleutel hoort nooit in de browserbundel. De publishable key mag
 * publiek zijn; een secret key of een service-role token omzeilt alle
 * RLS-policies. Liever een gefaalde build dan een sleutel die alles opent in
 * de JavaScript van elke bezoeker.
 */
export function isGeheimeSleutel(sleutel: string): boolean {
  if (sleutel.startsWith("sb_secret_")) return true;
  try {
    const payload = JSON.parse(
      Buffer.from(sleutel.split(".")[1] ?? "", "base64").toString("utf8"),
    );
    return payload?.role === "service_role";
  } catch {
    return false;
  }
}
