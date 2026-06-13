import { createClient } from "@supabase/supabase-js";

// Publishable key: veilig om client-side te gebruiken; toegang wordt door RLS geregeld.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://fkmulfdpuphedfakmmsd.supabase.co";
const key =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "sb_publishable_0dhAntmc3Y9Eo9NJkno-Nw_PDT1zaM0";

export const supabase = createClient(url, key);
