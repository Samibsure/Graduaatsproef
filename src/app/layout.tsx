import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "B-sure Autofiscaliteit-tool",
  description:
    "Beslissingstool voor de voertuigkeuze bij B-sure NV: aftrekbaarheid, VAA, verworpen uitgaven en scoringsmatrix. Graduaatsproef Sami Elhamdaoui, PXL 2025-2026.",
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
        <footer className="mx-auto max-w-6xl px-4 pb-8 pt-4 text-xs text-slate-400">
          Graduaatsproef Accounting Administration · Sami Elhamdaoui · Hogeschool PXL · B-sure NV ·
          2025-2026
        </footer>
      </body>
    </html>
  );
}
