import { createServerSupabase } from "./supabase/server";
import { BEDRIJF_VELDEN, type Bedrijf, type Bedrijfsrol, type Sessie } from "./rollen";

/**
 * Het ophalen van de sessie, server-side. De rollen, het bedrijfstype en de
 * rechtenhulpjes staan in ./rollen omdat client components die nodig hebben en
 * dit bestand next/headers meebrengt.
 */
export type { Bedrijf, Bedrijfsrol, Sessie };
export { BEDRIJF_VELDEN, ROLLEN, magBeheren, magSchrijven, minstensRol } from "./rollen";

/**
 * Haalt de aangemelde gebruiker met zijn bedrijf op, server-side.
 * Geeft null terug wanneer niemand is aangemeld.
 */
export async function laadSessie(): Promise<Sessie | null> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profiel } = await supabase
    .from("profiles")
    .select(`volledige_naam, rol, is_platform_admin, companies (${BEDRIJF_VELDEN})`)
    .eq("id", user.id)
    .maybeSingle();

  // Een gebruiker zonder profiel hoort niet te bestaan: de trigger
  // handle_new_user maakt er altijd één aan. Gebeurt het toch, dan behandelen
  // we hem als niet-aangemeld in plaats van een halve sessie te tonen.
  const bedrijf = profiel?.companies as unknown as Bedrijf | null | undefined;
  if (!profiel || !bedrijf) return null;

  return {
    gebruikerId: user.id,
    email: user.email ?? "",
    volledigeNaam: profiel.volledige_naam,
    rol: profiel.rol as Bedrijfsrol,
    isPlatformAdmin: profiel.is_platform_admin,
    bedrijf,
  };
}
