import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfig } from "./env";

/** Routes die aanmelden vereisen. Alles wat hier niet in staat, is publiek. */
const AFGESCHERMD = ["/wagens", "/vergelijking", "/instellingen", "/beheer"];

/**
 * Ververst de sessie-cookies en stuurt niet-aangemelde bezoekers naar de
 * aanmeldpagina.
 *
 * Let op: dit is een gemaksvoorziening voor de gebruikerservaring, niet de
 * beveiligingsgrens. De echte afscherming zit in de RLS-policies in de
 * database (zie supabase/migrations/0003_tenantdata_en_rls.sql). Zonder die
 * policies is een omweg rond deze middleware voldoende om alles te zien.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, key } = supabaseConfig();

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // getUser() en niet getSession(): alleen getUser valideert het token bij
  // Supabase. Deze aanroep ververst meteen ook de cookies.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pad = request.nextUrl.pathname;
  const moetAangemeld = AFGESCHERMD.some((p) => pad === p || pad.startsWith(`${p}/`));

  if (!user && moetAangemeld) {
    const aanmelden = request.nextUrl.clone();
    aanmelden.pathname = "/aanmelden";
    aanmelden.search = "";
    aanmelden.searchParams.set("verder", pad);
    return NextResponse.redirect(aanmelden);
  }

  return response;
}
