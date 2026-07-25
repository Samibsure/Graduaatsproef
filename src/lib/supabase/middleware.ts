import { createServerClient } from "@supabase/ssr";
import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { supabaseConfig } from "./env";

/**
 * Routes die aanmelden vereisen, zonder taalvoorvoegsel. Alles wat hier niet in
 * staat, is publiek.
 */
const AFGESCHERMD = ["/wagens", "/vergelijking", "/instellingen", "/beheer", "/welkom"];

/** De onboarding zelf mag uiteraard niet naar de onboarding omleiden. */
const ONBOARDING_PAD = "/welkom";

const intlMiddleware = createIntlMiddleware(routing);

/** Haalt het taalvoorvoegsel weg zodat de padcontrole taalonafhankelijk is. */
function padZonderTaal(pad: string): string {
  for (const locale of routing.locales) {
    if (pad === `/${locale}`) return "/";
    if (pad.startsWith(`/${locale}/`)) return pad.slice(locale.length + 1);
  }
  return pad;
}

/**
 * Ververst de sessie-cookies, bepaalt de taal en stuurt niet-aangemelde
 * bezoekers naar de aanmeldpagina.
 *
 * Let op: de omleiding is een gemaksvoorziening voor de gebruikerservaring,
 * niet de beveiligingsgrens. De echte afscherming zit in de RLS-policies in de
 * database (zie supabase/migrations/0003_tenantdata_en_rls.sql). Zonder die
 * policies is een omweg rond deze middleware voldoende om alles te zien.
 */
export async function updateSession(request: NextRequest) {
  // De taalmiddleware bepaalt de locale en levert de basisrespons; daarop
  // schrijven we vervolgens de verse sessie-cookies.
  const response = intlMiddleware(request);
  const { url, key } = supabaseConfig();

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          request.cookies.set(name, value);
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

  const pad = padZonderTaal(request.nextUrl.pathname);
  const moetAangemeld = AFGESCHERMD.some((p) => pad === p || pad.startsWith(`${p}/`));
  const taal = request.nextUrl.pathname.split("/")[1];
  const voorvoegsel = (routing.locales as readonly string[]).includes(taal) ? `/${taal}` : "";

  if (!user && moetAangemeld) {
    const aanmelden = request.nextUrl.clone();
    aanmelden.pathname = `${voorvoegsel}/aanmelden`;
    aanmelden.search = "";
    aanmelden.searchParams.set("verder", pad);
    return NextResponse.redirect(aanmelden);
  }

  // Wie zich net registreerde heeft een bedrijf zonder gegevens en zonder
  // wagens. Die sturen we eerst door de wizard, anders is de eerste indruk een
  // lege tabel. Eén extra opzoeking, en alleen op de afgeschermde routes.
  if (user && moetAangemeld && pad !== ONBOARDING_PAD) {
    const { data: profiel } = await supabase
      .from("profiles")
      .select("companies (onboarding_voltooid)")
      .eq("id", user.id)
      .maybeSingle();

    const bedrijf = profiel?.companies as unknown as { onboarding_voltooid: boolean } | null;
    if (bedrijf && !bedrijf.onboarding_voltooid) {
      const welkom = request.nextUrl.clone();
      welkom.pathname = `${voorvoegsel}${ONBOARDING_PAD}`;
      welkom.search = "";
      return NextResponse.redirect(welkom);
    }
  }

  return response;
}
