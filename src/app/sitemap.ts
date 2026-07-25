import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://autofiscaliteit.com";

/** Alleen de publieke pagina's; alles achter de aanmelding hoort hier niet. */
const PUBLIEK = [
  { pad: "", prioriteit: 1 },
  { pad: "/catalogus", prioriteit: 0.9 },
  { pad: "/fiscaal-kader", prioriteit: 0.8 },
  { pad: "/parameters", prioriteit: 0.7 },
  { pad: "/handleiding", prioriteit: 0.6 },
  { pad: "/over", prioriteit: 0.5 },
  { pad: "/privacy", prioriteit: 0.3 },
  { pad: "/voorwaarden", prioriteit: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIEK.map(({ pad, prioriteit }) => ({
    url: `${SITE_URL}${pad}`,
    changeFrequency: "monthly" as const,
    priority: prioriteit,
  }));
}
