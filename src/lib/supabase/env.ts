import { SLEUTEL_NAMEN, URL_NAMEN } from "./envnamen";

/**
 * De Supabase-configuratie komt uitsluitend uit de omgeving. Er zijn bewust
 * geen fallbacks: een verkeerd geconfigureerde omgeving (denk aan een
 * Vercel-preview) mag nooit stilzwijgend naar de productiedatabase schrijven.
 *
 * De publishable key is niet geheim, die wordt naar elke browser gestuurd. De
 * eigenlijke afscherming gebeurt door de RLS-policies in de database.
 *
 * next.config.ts vult deze twee namen aan de hand van de alternatieven die
 * hostingintegraties gebruiken; zie ./envnamen.ts.
 */
export function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "De Supabase-configuratie ontbreekt.\n" +
        `Voor de URL wordt gezocht naar: ${URL_NAMEN.join(", ")}.\n` +
        `Voor de sleutel naar: ${SLEUTEL_NAMEN.join(", ")}.\n` +
        "Lokaal: kopieer .env.example naar .env.local en vul de waarden in.\n" +
        "Op Vercel: Project Settings → Environment Variables, voor Production, " +
        "Preview én Development. Deze waarden worden tijdens de build ingebakken, " +
        "dus zonder hen faalt al de build.",
    );
  }

  return { url, key };
}
