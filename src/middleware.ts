import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Alles behalve statische bestanden, afbeeldingen en de routes die buiten
     * `src/app/[locale]/` leven.
     *
     * Die laatste uitzondering is geen verfijning maar een reparatie.
     * `updateSession()` roept de taalmiddleware onvoorwaardelijk aan, en die
     * herschrijft bij `localePrefix: "as-needed"` elk pad zonder
     * taalvoorvoegsel naar `/nl/<pad>`. Voor `/auth/callback`, `/afmelden`,
     * `/robots.txt` en `/sitemap.xml` bestaat dat doel niet: die zitten niet
     * onder `[locale]`. Het gevolg was een 404 op de bevestigingsmail, op de
     * herstellink, op de inloglink, op het afmelden — de sessiecookie bleef
     * daar gewoon geldig — en op alles wat een zoekmachine van de site wil
     * weten. Aanmelden met een wachtwoord bleef wél werken, want dat loopt
     * volledig client-side; daardoor was er met de hand vrijwel niets van te
     * merken.
     *
     * De routehandlers maken hun eigen Supabase-client (zie
     * src/lib/supabase/server.ts) en hebben de sessieverversing hier dus niet
     * nodig.
     *
     * De og-afbeelding staat er om een andere reden bij. Die route zit wél onder
     * [locale], maar Next zet in de metadata de URL met voorvoegsel
     * (/nl/opengraph-image), en next-intl stuurt dat bij "as-needed" met een 307
     * door naar /opengraph-image. Niet elke scraper volgt zo'n omleiding voor een
     * og:image, en dan blijft de kaart alsnog leeg. Zonder middleware serveert
     * Next de route rechtstreeks.
     *
     * `src/middleware.test.ts` bewaakt deze lijst.
     */
    "/((?!auth/|afmelden|robots.txt|sitemap.xml|.*opengraph-image|_next/static|_next/image|favicon.ico|cars/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
