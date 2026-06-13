import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "B-sure × PXL · Autofiscaliteit-tool",
  description:
    "Beslissingstool voor de voertuigkeuze bij B-sure NV: aftrekbaarheid, VAA, verworpen uitgaven en scoringsmatrix. Graduaatsproef van Sami Elhamdaoui, Hogeschool PXL 2025-2026.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <body className="antialiased">
        <Nav />
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <footer className="border-t border-line bg-white">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>
              Een graduaatsproef van{" "}
              <span className="font-semibold text-ink">Sami Elhamdaoui</span> · Hogeschool PXL ×
              B-sure NV · 2025-2026
            </p>
            <Link href="/over" className="font-medium text-ink hover:text-gold">
              Over deze tool →
            </Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
