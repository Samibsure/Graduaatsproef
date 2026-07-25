import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Alles behalve statische bestanden en afbeeldingen. De sessie moet bij
     * elke paginaverzoek ververst worden, anders verloopt ze tijdens gebruik.
     */
    "/((?!_next/static|_next/image|favicon.ico|cars/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
