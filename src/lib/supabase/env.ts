import { STANDAARD_SLEUTEL, STANDAARD_URL } from "./envnamen";

/**
 * De Supabase-configuratie voor zowel de browser- als de serverclient.
 *
 * De volgorde is: wat de omgeving aanlevert wint, anders het publieke project
 * van Autofiscaliteit (zie ./envnamen.ts). next.config.ts vult deze twee namen
 * al aan de hand van de alternatieven die hostingintegraties gebruiken, dus in
 * de praktijk staat hier altijd een waarde.
 *
 * De publishable key is niet geheim; die wordt naar elke browser gestuurd. De
 * eigenlijke afscherming gebeurt door de RLS-policies in de database.
 */
export function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || STANDAARD_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || STANDAARD_SLEUTEL;

  return { url, key };
}
