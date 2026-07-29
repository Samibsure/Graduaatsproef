import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import "../globals.css";
import { Wordmerk } from "@/components/Brand";
import Feedbackknop from "@/components/Feedbackknop";
import Nav from "@/components/Nav";
import { SessieProvider } from "@/components/SessieProvider";
import { Link } from "@/i18n/navigation";
import { INTL_LOCALE, routing } from "@/i18n/routing";
import { VOETTEKST_KOLOMMEN } from "@/lib/navigatie";
import { laadSessie } from "@/lib/sessie";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://autofiscaliteit.com";

/**
 * Het lettertype wordt tijdens de build opgehaald en mee uitgeleverd vanaf het
 * eigen domein. Dat is geen detail: de CSP staat `font-src 'self'` toe en zou een
 * verwijzing naar Google Fonts blokkeren.
 *
 * Deze applicatie is één lange kolom cijfers. `tabular-nums` zorgt dat elk cijfer
 * even breed is, zodat bedragen onder elkaar uitlijnen in plaats van te dansen
 * bij elke herberekening.
 */
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

/**
 * Vrijwillige donatie: één link naar een externe pagina, bewust geen
 * betaalintegratie in de applicatie zelf. Blijft de variabele leeg, dan
 * verdwijnt de knop gewoon.
 */
const DONATIE_URL = process.env.NEXT_PUBLIC_DONATIE_URL ?? "";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t("titel"), template: t("sjabloon", { pagina: "%s" }) },
    description: t("beschrijving"),
    alternates: {
      // hreflang, zodat Google de Franstalige versie aan Waalse bezoekers toont
      // in plaats van drie versies als duplicaten te behandelen.
      languages: Object.fromEntries(
        routing.locales.map((l) => [
          INTL_LOCALE[l],
          l === routing.defaultLocale ? "/" : `/${l}`,
        ]),
      ),
    },
    openGraph: {
      type: "website",
      locale: INTL_LOCALE[locale as keyof typeof INTL_LOCALE]?.replace("-", "_"),
      siteName: "Autofiscaliteit",
      title: t("titel"),
      description: t("ogBeschrijving"),
    },
  };
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);

  const [sessie, t] = await Promise.all([
    laadSessie(),
    getTranslations({ locale, namespace: "footer" }),
  ]);

  // Uit src/lib/navigatie.ts, dezelfde bron als de header. Voordien stond hier
  // een eigen lijst die stilaan van de header was afgeweken.
  const kolommen = VOETTEKST_KOLOMMEN.map((kolom) => ({
    titel: t(kolom.sleutel),
    links: kolom.links.map((l) => ({ href: l.href, label: t(l.sleutel) })),
  }));

  return (
    <html lang={INTL_LOCALE[locale]} className={inter.variable}>
      <body className="antialiased flex min-h-screen flex-col">
        <NextIntlClientProvider>
          <SessieProvider sessie={sessie}>
            <Nav />
            <main className="flex-1">{children}</main>
            {/* Op elke pagina bereikbaar. Voor een rekentool is "dit cijfer
                klopt niet" het waardevolste signaal dat er bestaat, en dat mag
                niet afhangen van een e-mailadres in een alinea op /over. */}
            <Feedbackknop />
          </SessieProvider>

          <footer className="bs-no-print mt-auto bg-ink text-white/[0.78]">
            <div className="mx-auto flex max-w-[1200px] flex-wrap items-start justify-between gap-10 px-6 py-12">
              <div className="max-w-[30em]">
                <div className="mb-4">
                  <Wordmerk variant="dark" />
                </div>
                <p className="mb-3 text-sm leading-relaxed text-white/[0.72]">{t("intro")}</p>
                <p className="mb-4 text-xs leading-relaxed text-white/[0.62]">{t("disclaimer")}</p>
                {DONATIE_URL && (
                  <a
                    href={DONATIE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-[9px] border border-white/[0.16] px-3.5 py-2 text-xs font-bold text-white/[0.78] transition-colors hover:border-white/[0.32] hover:text-white"
                  >
                    {t("steun")}
                  </a>
                )}
              </div>

              <div className="flex flex-wrap gap-14">
                {kolommen.map((kolom) => (
                  <div key={kolom.titel}>
                    <div className="mb-3.5 text-[11.5px] font-bold uppercase tracking-[0.14em] text-white/[0.62]">
                      {kolom.titel}
                    </div>
                    <div className="flex flex-col gap-2.5">
                      {kolom.links.map((l) => (
                        <Link
                          key={l.href}
                          href={l.href}
                          className="text-sm text-white/[0.78] hover:text-white"
                        >
                          {l.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-white/[0.08]">
              <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-6 py-[18px] text-[12.5px] text-white/[0.58]">
                <span>{t("copyright")}</span>
                <span>{t("gratis")}</span>
              </div>
            </div>
          </footer>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
