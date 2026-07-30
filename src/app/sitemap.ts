import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { voorvoegsel } from "@/lib/taalpad";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://autofiscaliteit.com";

/** Alleen de publieke pagina's; alles achter de aanmelding hoort hier niet. */
const PUBLIEK = [
  { pad: "", prioriteit: 1 },
  // De simulator ontbrak hier, terwijl ze publiek is en sinds "Start hier" de
  // eerste bestemming van elke bezoeker.
  { pad: "/simulator", prioriteit: 0.95 },
  { pad: "/catalogus", prioriteit: 0.9 },
  { pad: "/fiscaal-kader", prioriteit: 0.8 },
  { pad: "/parameters", prioriteit: 0.7 },
  { pad: "/handleiding", prioriteit: 0.6 },
  { pad: "/over", prioriteit: 0.5 },
  { pad: "/steunen", prioriteit: 0.4 },
  { pad: "/privacy", prioriteit: 0.3 },
  { pad: "/voorwaarden", prioriteit: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIEK.flatMap(({ pad, prioriteit }) =>
    routing.locales.map((locale) => ({
      url: `${SITE_URL}${voorvoegsel(locale)}${pad}`,
      changeFrequency: "monthly" as const,
      priority: prioriteit,
      // Elke taalversie verwijst naar de andere, zodat een zoekmachine ze als
      // vertalingen behandelt en niet als duplicaten.
      alternates: {
        languages: Object.fromEntries(
          routing.locales.map((l) => [l, `${SITE_URL}${voorvoegsel(l)}${pad}`]),
        ),
      },
    })),
  );
}
