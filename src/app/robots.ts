import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://autofiscaliteit.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Achter de aanmelding valt niets te indexeren, en auth-routes zouden
      // alleen maar verlopen links in de zoekresultaten opleveren.
      disallow: ["/wagens", "/vergelijking", "/instellingen", "/beheer", "/auth/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
