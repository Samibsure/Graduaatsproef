import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const ontwikkeling = process.env.NODE_ENV === "development";

/**
 * De enige externe bestemming die de applicatie nodig heeft, is het eigen
 * Supabase-project. Door die expliciet te benoemen kan een ingespoten script
 * nergens anders gegevens naartoe sturen.
 */
const supabaseOrigin = (() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return "";
  try {
    const { origin, host } = new URL(url);
    return `${origin} wss://${host}`;
  } catch {
    return "";
  }
})();

/**
 * De applicatie laadt geen enkele externe bron: geen lettertypes, geen CDN,
 * geen afbeeldingen van buiten. Alles mag dus dicht, op twee punten na.
 *
 * 'unsafe-inline' blijft nodig voor scripts en stijlen: Next.js zet de
 * hydratiegegevens in een inline script en Tailwind injecteert stijlen. Dat
 * strakker maken vraagt een nonce per verzoek vanuit de middleware; dat is een
 * aparte ingreep. De winst hier zit vooral in connect-src, frame-ancestors en
 * form-action: waar gegevens naartoe mogen, en wie de site mag inkaderen.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${ontwikkeling ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self' ${supabaseOrigin}`.trim(),
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/:pad*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
