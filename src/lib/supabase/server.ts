import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseConfig } from "./env";

/** Supabase-client voor server components en route handlers. */
export async function createServerSupabase() {
  const { url, key } = supabaseConfig();
  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server components mogen geen cookies schrijven. Dat is geen
          // probleem: de middleware ververst de sessie bij elke request.
        }
      },
    },
  });
}
