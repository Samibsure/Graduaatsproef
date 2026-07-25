import { createBrowserClient } from "@supabase/ssr";
import { supabaseConfig } from "./env";

/**
 * Supabase-client voor de browser.
 *
 * createBrowserClient bewaart de sessie in cookies in plaats van localStorage.
 * Daardoor kan de middleware de sessie verversen en kunnen server components de
 * aangemelde gebruiker lezen, zonder dat de bestaande client-side datalaag
 * hoeft te veranderen.
 */
export function createClient() {
  const { url, key } = supabaseConfig();
  return createBrowserClient(url, key);
}
