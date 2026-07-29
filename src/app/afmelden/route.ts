import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { voorvoegsel } from "@/lib/taalpad";

/**
 * Afmelden gebeurt via POST, niet via een gewone link: anders meldt een
 * link-prefetcher of een mailscanner de gebruiker ongevraagd af.
 *
 * De taal komt als queryparameter mee vanuit het formulier in de header. Deze
 * route zit niet onder [locale] en kent de taal dus niet uit het pad; zonder die
 * parameter kwam een Franstalige gebruiker na het afmelden op de Nederlandstalige
 * startpagina terecht.
 */
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();

  const taal = new URL(request.url).searchParams.get("taal");
  const doel = `${voorvoegsel(taal)}/`;
  return NextResponse.redirect(new URL(doel, request.url), { status: 303 });
}
