import type { Metadata } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import "../globals.css";
import { Wordmerk } from "@/components/Brand";
import Nav from "@/components/Nav";
import { SessieProvider } from "@/components/SessieProvider";
import { SteunKnop } from "@/components/Steun";
import { Link } from "@/i18n/navigation";
import { INTL_LOCALE, routing } from "@/i18n/routing";
import { laadSessie } from "@/lib/sessie";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://autofiscaliteit.com";

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

  const kolommen = [
    {
      titel: t("navigatie"),
      links: [
        { href: "/catalogus", label: t("catalogus") },
        { href: "/simulator", label: t("simulator") },
        { href: "/vergelijking", label: t("vergelijking") },
        { href: "/vloot", label: t("vloot") },
        { href: "/wagens", label: t("wagensBeheren") },
      ],
    },
    {
      titel: t("kennis"),
      links: [
        { href: "/fiscaal-kader", label: t("fiscaalKader") },
        { href: "/parameters", label: t("parameters") },
        { href: "/handleiding", label: t("handleiding") },
        { href: "/over", label: t("over") },
        { href: "/steunen", label: t("steunen") },
      ],
    },
    {
      titel: t("juridisch"),
      links: [
        { href: "/privacy", label: t("privacy") },
        { href: "/voorwaarden", label: t("voorwaarden") },
      ],
    },
  ];

  return (
    <html lang={INTL_LOCALE[locale]}>
      <body className="antialiased flex min-h-screen flex-col">
        <NextIntlClientProvider>
          <SessieProvider sessie={sessie}>
            <Nav />
            <main className="flex-1">{children}</main>
          </SessieProvider>

          <footer className="bs-no-print mt-auto bg-ink text-white/[0.78]">
            <div className="mx-auto flex max-w-[1200px] flex-wrap items-start justify-between gap-10 px-6 py-12">
              <div className="max-w-[30em]">
                <div className="mb-4">
                  <Wordmerk variant="dark" />
                </div>
                <p className="mb-3 text-sm leading-relaxed text-white/[0.62]">{t("intro")}</p>
                <p className="mb-4 text-xs leading-relaxed text-white/[0.45]">{t("disclaimer")}</p>
                <SteunKnop variant="donker" />
                <p className="mt-2.5 text-xs leading-relaxed text-white/[0.45]">
                  {t("steunSub")}
                </p>
              </div>

              <div className="flex flex-wrap gap-14">
                {kolommen.map((kolom) => (
                  <div key={kolom.titel}>
                    <div className="mb-3.5 text-[11.5px] font-bold uppercase tracking-[0.14em] text-white/[0.45]">
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
              <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-6 py-[18px] text-[12.5px] text-white/[0.42]">
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
