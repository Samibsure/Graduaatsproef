"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BrandLockup } from "./Brand";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/catalogus", label: "Wagencatalogus" },
  { href: "/wagens", label: "Mijn wagens" },
  { href: "/vergelijking", label: "Vergelijking" },
  { href: "/parameters", label: "Parameters" },
  { href: "/fiscaal-kader", label: "Fiscaal kader" },
  { href: "/handleiding", label: "Handleiding" },
  { href: "/over", label: "Over" },
];

export default function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActief = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="shrink-0" onClick={() => setOpen(false)}>
          <BrandLockup />
        </Link>

        <nav className="hidden flex-wrap gap-1 text-sm lg:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
                isActief(l.href)
                  ? "bg-ink text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-ink"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <button
          className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink lg:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label="Menu"
        >
          Menu
        </button>
      </div>

      {open && (
        <nav className="flex flex-col gap-1 border-t border-line bg-white px-4 py-3 text-sm lg:hidden">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={`rounded-lg px-3 py-2 font-medium ${
                isActief(l.href) ? "bg-ink text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
