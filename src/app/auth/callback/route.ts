import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase/server";
import { metTaal } from "@/lib/taalpad";

/**
 * Landingspunt voor alle links uit auth-mails: bevestiging van een registratie,
 * een inloglink en een wachtwoordherstel.
 *
 * Er zijn twee vormen. Nieuwere Supabase-projecten sturen een `code` (PKCE);
 * oudere mailsjablonen sturen `token_hash` + `type`. Beide worden hier
 * afgehandeld, zodat een aangepast mailsjabloon de aanmelding niet breekt.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  // metTaal() weert een open redirect (alleen relatieve paden) en zet meteen het
  // taalvoorvoegsel terug. Zonder dat laatste belandde wie zijn e-mailadres
  // bevestigde of zijn wachtwoord herstelde altijd in het Nederlands.
  const taal = searchParams.get("taal");
  const verder = metTaal(searchParams.get("verder"), taal);

  const supabase = await createServerSupabase();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${verder}`);
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) return NextResponse.redirect(`${origin}${verder}`);
  }

  const mislukt = new URL(metTaal("/aanmelden", taal), origin);
  mislukt.searchParams.set("fout", "link-verlopen");
  return NextResponse.redirect(mislukt);
}
