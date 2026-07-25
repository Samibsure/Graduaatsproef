import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase/server";

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

  // Alleen relatieve paden, anders is dit een open redirect.
  const gevraagd = searchParams.get("verder") ?? "/wagens";
  const verder = gevraagd.startsWith("/") && !gevraagd.startsWith("//") ? gevraagd : "/wagens";

  const supabase = await createServerSupabase();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${verder}`);
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) return NextResponse.redirect(`${origin}${verder}`);
  }

  const mislukt = new URL("/aanmelden", origin);
  mislukt.searchParams.set("fout", "link-verlopen");
  return NextResponse.redirect(mislukt);
}
