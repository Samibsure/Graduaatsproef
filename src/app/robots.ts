import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { AFGESCHERMD } from "@/lib/supabase/middleware";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://autofiscaliteit.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Achter de aanmelding valt niets te indexeren, en auth-routes zouden
      // alleen maar verlopen links in de zoekresultaten opleveren. Deze lijst
      // moet gelijk lopen met AFGESCHERMD in src/lib/supabase/middleware.ts;
      // /vloot, /welkom en /modellen ontbraken hier.
      disallow: AFGESCHERMD.flatMap((pad) => [
        pad,
        // Zonder de taalvoorvoegsels blijven /fr/wagens en /en/wagens gewoon
        // indexeerbaar.
        ...routing.locales
          .filter((l) => l !== routing.defaultLocale)
          .map((l) => `/${l}${pad}`),
      ]).concat("/auth/"),
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
