import { createClient } from "./supabase/client";

/**
 * Gedeelde browser-client voor de client-side datalaag (src/lib/data.ts).
 *
 * Server components gebruiken createServerSupabase() uit ./supabase/server.
 */
export const supabase = createClient();
