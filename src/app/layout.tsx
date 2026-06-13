import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import Icon from "@/components/Icon";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "B-sure × PXL · Autofiscaliteit-tool",
  description:
    "Beslissingstool voor de voertuigkeuze bij B-sure NV: aftrekbaarheid, VAA, verworpen uitgaven en scoringsmatrix. Graduaatsproef van Sami Elhamdaoui, Hogeschool PXL 2025-2026.",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <body className="antialiased flex min-h-screen flex-col">
        <Nav />
        <main className="flex-1">{children}</main>

        <footer className="bs-no-print mt-auto bg-ink text-white/[0.78]">
          <div className="mx-auto flex max-w-[1200px] flex-wrap items-start justify-between gap-10 px-6 py-12">
            <div className="max-w-[30em]">
              <div className="mb-3.5 flex items-center gap-3">
                <span className="inline-flex h-[34px] w-[34px] items-center justify-center rounded-lg bg-white/[0.08] text-gold">
                  <Icon name="gauge" size={18} />
                </span>
                <span className="text-base font-bold text-white">
                  B-sure <span className="font-normal opacity-50">×</span>{" "}
                  <span className="text-gold">PXL</span>
                </span>
              </div>
              <p className="mb-1.5 text-sm leading-relaxed text-white/[0.62]">
                Een beslissingstool voor autofiscaliteit, ontwikkeld als graduaatsproef in
                samenwerking met B-sure NV en Hogeschool PXL.
              </p>
              <p className="m-0 text-xs italic tracking-[0.04em] text-gold">Your financial butler</p>
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
            </div>
          </div>
          <div className="border-t border-white/[0.08]">
            <div className="mx-auto max-w-[1200px] px-6 py-[18px] text-[12.5px] text-white/[0.42]">
              © 2026 · Graduaatsproef autofiscaliteit van Sami Elhamdaoui · Huisstijl B-sure ×
              Hogeschool PXL
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
