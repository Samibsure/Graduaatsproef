import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { Wordmerk } from "@/components/Brand";
import Nav from "@/components/Nav";
import { SessieProvider } from "@/components/SessieProvider";
import { laadSessie } from "@/lib/sessie";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://autofiscaliteit.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Autofiscaliteit · gratis fiscale tool voor bedrijfswagens in België",
    template: "%s · Autofiscaliteit",
  },
  description:
    "Bereken gratis de werkelijke kost van een bedrijfswagen: aftrekbaarheid in de vennootschapsbelasting, voordeel van alle aard, verworpen uitgaven en de CO₂-solidariteitsbijdrage. Vergelijk kandidaten en onderbouw je keuze.",
  openGraph: {
    type: "website",
    locale: "nl_BE",
    siteName: "Autofiscaliteit",
    title: "Autofiscaliteit · gratis fiscale tool voor bedrijfswagens in België",
    description:
      "Bereken de werkelijke kost van een bedrijfswagen en vergelijk kandidaten op fiscale impact en TCO. Gratis voor elk Belgisch bedrijf.",
  },
};

const footerNav = [
  { href: "/catalogus", label: "Catalogus" },
  { href: "/vergelijking", label: "Vergelijking" },
  { href: "/wagens", label: "Wagens beheren" },
];
const footerKennis = [
  { href: "/fiscaal-kader", label: "Fiscaal kader" },
  { href: "/parameters", label: "Parameters" },
  { href: "/handleiding", label: "Handleiding" },
  { href: "/over", label: "Over" },
];
const footerJuridisch = [
  { href: "/privacy", label: "Privacybeleid" },
  { href: "/voorwaarden", label: "Gebruiksvoorwaarden" },
];

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const sessie = await laadSessie();

  return (
    <html lang="nl-BE">
      <body className="antialiased flex min-h-screen flex-col">
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
              <p className="mb-3 text-sm leading-relaxed text-white/[0.62]">
                Een gratis rekeninstrument voor de fiscale en financiële impact van bedrijfswagens
                in België. Voor elke onderneming, van eenmanszaak tot vloot.
              </p>
              <p className="m-0 text-xs leading-relaxed text-white/[0.45]">
                Een hulpmiddel, geen fiscaal advies. Bespreek elke beslissing met je boekhouder of
                belastingadviseur.
              </p>
            </div>

            <div className="flex flex-wrap gap-14">
              <div>
                <div className="mb-3.5 text-[11.5px] font-bold uppercase tracking-[0.14em] text-white/[0.45]">
                  Navigatie
                </div>
                <div className="flex flex-col gap-2.5">
                  {footerNav.map((l) => (
                    <Link key={l.href} href={l.href} className="text-sm text-white/[0.78] hover:text-white">
                      {l.label}
                    </Link>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-3.5 text-[11.5px] font-bold uppercase tracking-[0.14em] text-white/[0.45]">
                  Kennis
                </div>
                <div className="flex flex-col gap-2.5">
                  {footerKennis.map((l) => (
                    <Link key={l.href} href={l.href} className="text-sm text-white/[0.78] hover:text-white">
                      {l.label}
                    </Link>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-3.5 text-[11.5px] font-bold uppercase tracking-[0.14em] text-white/[0.45]">
                  Juridisch
                </div>
                <div className="flex flex-col gap-2.5">
                  {footerJuridisch.map((l) => (
                    <Link key={l.href} href={l.href} className="text-sm text-white/[0.78] hover:text-white">
                      {l.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-white/[0.08]">
            <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-6 py-[18px] text-[12.5px] text-white/[0.42]">
              <span>© 2026 Autofiscaliteit · Gemaakt door Sami Elhamdaoui</span>
              <span>Gratis te gebruiken · België</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
