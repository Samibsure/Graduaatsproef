import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import {
  SLEUTEL_NAMEN,
  STANDAARD_SLEUTEL,
  STANDAARD_URL,
  URL_NAMEN,
  eersteWaarde,
  isGeheimeSleutel,
} from "./src/lib/supabase/envnamen";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const ontwikkeling = process.env.NODE_ENV === "development";

/**
 * De Supabase-configuratie kan onder verschillende namen binnenkomen; zie
 * src/lib/supabase/envnamen.ts. Hier wordt de gevonden waarde doorgezet naar
 * de canonieke naam, zodat de rest van de applicatie maar één naam hoeft te
 * kennen en de browserbundel ze ook krijgt.
 */
const supabaseUrl = eersteWaarde(URL_NAMEN, process.env) ?? STANDAARD_URL;
const supabaseSleutel = eersteWaarde(SLEUTEL_NAMEN, process.env) ?? STANDAARD_SLEUTEL;

if (isGeheimeSleutel(supabaseSleutel)) {
  throw new Error(
    "De gevonden Supabase-sleutel is een geheime sleutel (secret of service_role). " +
      "Die hoort niet in de browserbundel: ze omzeilt alle RLS-policies. " +
      "Gebruik de publishable key (anon).",
  );
}

/*
 * De terugval bestaat zodat een build nooit struikelt over een ontbrekende
 * variabele, en dat blijft zo: de site plat leggen weegt zwaarder dan een
 * publieke sleutel in de broncode. Maar ze wijst naar het productieproject.
 * Draait een preview-deployment of een lokale build erop, dan schrijft die
 * rechtstreeks in de échte databank, tussen de gegevens van echte bedrijven,
 * zonder dat iets dat verraadt.
 *
 * Vandaar deze regel in het buildlogboek. Weigeren zou betekenen dat een
 * vergeten variabele op Vercel de site plat legt, en dat is precies waar de
 * terugval voor bedoeld is.
 */
if (!eersteWaarde(URL_NAMEN, process.env) || !eersteWaarde(SLEUTEL_NAMEN, process.env)) {
  console.warn(
    "\n  Let op: geen Supabase-configuratie in de omgeving gevonden.\n" +
      `  Deze build praat met het standaardproject (${supabaseUrl}).\n` +
      "  Zet NEXT_PUBLIC_SUPABASE_URL en NEXT_PUBLIC_SUPABASE_ANON_KEY om een\n" +
      "  eigen project te gebruiken; zie .env.example.\n",
  );
}

/**
 * De enige externe bestemming die de applicatie nodig heeft, is het eigen
 * Supabase-project. Door die expliciet te benoemen kan een ingespoten script
 * nergens anders gegevens naartoe sturen.
 */
const supabaseOrigin = (() => {
  const url = supabaseUrl;
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

  // De gevonden waarde onder de canonieke naam zetten, ook richting de
  // browserbundel. Zo heeft de applicatie altijd een geldige configuratie,
  // ongeacht onder welke naam de hosting ze aanlevert.
  env: {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseSleutel,
  },

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
            /*
             * Eén jaar, en zonder `preload`.
             *
             * Het sleutelwoord `preload` zet op zichzelf niets in gang -- daarvoor
             * moet het domein op hstspreload.org ingediend worden -- maar het is
             * wel de verklaring dat je dat wil, en die stap is in de praktijk niet
             * terug te draaien: eruit geraken duurt maanden en tot dan weigert
             * elke browser elk subdomein over HTTP. Voor een domein dat vandaag
             * voor het eerst live gaat, is dat een belofte die je pas hoort te
             * doen als alles staat. Zet het er gerust bij zodra het draait.
             *
             * Twee jaar naar één jaar om dezelfde reden: even effectief tegen een
             * downgrade-aanval, en een fout in de HTTPS-configuratie is de helft
             * van de tijd bindend in plaats van het dubbele.
             */
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
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
