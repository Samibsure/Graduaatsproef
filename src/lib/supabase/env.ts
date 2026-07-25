/**
 * De Supabase-configuratie komt uitsluitend uit de omgeving. Er zijn bewust
 * geen fallbacks: een verkeerd geconfigureerde omgeving (denk aan een
 * Vercel-preview) mag nooit stilzwijgend naar de productiedatabase schrijven.
 *
 * De publishable key is niet geheim — die wordt naar elke browser gestuurd. De
 * eigenlijke afscherming gebeurt door de RLS-policies in de database.
 */
export function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL en NEXT_PUBLIC_SUPABASE_ANON_KEY zijn verplicht. " +
        "Kopieer .env.example naar .env.local en vul de waarden van je Supabase-project in.",
    );
  }

  return { url, key };
}
