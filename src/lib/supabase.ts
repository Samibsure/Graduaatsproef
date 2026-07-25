import { createClient } from "@supabase/supabase-js";

/**
 * Supabase-client voor de browser. De publishable key is bedoeld om publiek te
 * zijn: de eigenlijke afscherming gebeurt door de RLS-policies in de database.
 *
 * De waarden komen uitsluitend uit de omgeving. Er zijn bewust geen fallbacks:
 * een verkeerd geconfigureerde omgeving moet meteen falen in plaats van
 * stilzwijgend naar een ander project te schrijven.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL en NEXT_PUBLIC_SUPABASE_ANON_KEY ontbreken. " +
      "Kopieer .env.example naar .env.local en vul de waarden van je Supabase-project in.",
  );
}

export const supabase = createClient(url, key);
