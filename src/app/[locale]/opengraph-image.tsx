import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { routing, type Locale } from "@/i18n/routing";

/**
 * De kaart die verschijnt wanneer iemand een link naar de site deelt.
 *
 * Er was er geen, en dat is op een lanceerdag het duurste detail: elke link op
 * LinkedIn, in WhatsApp of in Slack toonde een leeg vlak. Voor een gratis
 * product dat van doorvertellen leeft, is dat precies de plek waar het misloopt.
 *
 * Alles wordt hier getekend, niets opgehaald: geen extern lettertype en geen
 * afbeelding van buiten. Dat is geen keuze maar een noodzaak, want de CSP in
 * next.config.ts laat `img-src 'self'` toe en niets anders. Next zet uit dit
 * bestand automatisch zowel og:image als twitter:image.
 *
 * Per taal, want de ondertitel is de belofte van het product en die hoort in de
 * taal van wie de link opent.
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Autofiscaliteit";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

const INK = "#0b1f33";
const GOLD = "#0f766e";
const PAPER = "#f7f8fa";

export default async function OgAfbeelding({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  const merk = await getTranslations({ locale, namespace: "merk" });

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: PAPER,
          padding: 72,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {/* Hetzelfde merkteken als in Brand.tsx, hier als losse vormen omdat
              ImageResponse geen CSS-variabelen kent. */}
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background: INK,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: GOLD,
              fontSize: 40,
              fontWeight: 700,
            }}
          >
            %
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ fontSize: 38, fontWeight: 700, color: INK, letterSpacing: -0.5 }}>
              {merk("naam")}
            </div>
            <div
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: "#5c6b7a",
                letterSpacing: 2.4,
                textTransform: "uppercase",
              }}
            >
              {merk("ondertitel")}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div
            style={{
              fontSize: 62,
              fontWeight: 700,
              color: INK,
              lineHeight: 1.12,
              letterSpacing: -1.6,
              maxWidth: 980,
            }}
          >
            {t("titel")}
          </div>
          <div style={{ fontSize: 27, color: "#2b3f52", lineHeight: 1.35, maxWidth: 940 }}>
            {t("ogBeschrijving")}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 56, height: 5, borderRadius: 3, background: GOLD }} />
          <div style={{ fontSize: 21, fontWeight: 700, color: GOLD }}>autofiscaliteit.com</div>
        </div>
      </div>
    ),
    size,
  );
}
