"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Icon from "@/components/Icon";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/catalogus", label: "Catalogus" },
  { href: "/vergelijking", label: "Vergelijking" },
  { href: "/wagens", label: "Wagens" },
  { href: "/fiscaal-kader", label: "Fiscaal kader" },
  { href: "/handleiding", label: "Handleiding" },
];

export default function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActief = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header
      className="bs-no-print sticky top-0 z-50 border-b border-line"
      style={{
        background: "rgba(255,255,255,0.82)",
        backdropFilter: "saturate(180%) blur(14px)",
        WebkitBackdropFilter: "saturate(180%) blur(14px)",
      }}
    >
      <div className="mx-auto flex h-[68px] max-w-[1200px] items-center justify-between gap-6 px-6">
        <Link href="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-[9px] bg-ink text-white">
            <Icon name="gauge" size={21} />
          </span>
          <span className="flex flex-col items-start gap-0.5 whitespace-nowrap leading-none">
            <span className="text-[17px] font-bold tracking-[-0.01em] text-ink">
              B-sure <span className="font-normal text-ink-500">×</span>{" "}
              <span className="text-gold">PXL</span>
            </span>
            <span className="text-[10px] font-bold uppercase leading-none tracking-[0.15em] text-ink-500">
              Autofiscaliteit
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-[30px] lg:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              data-active={isActief(l.href)}
              className="bs-nav-link cursor-pointer py-2 text-[15px] font-bold transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Link
            href="/vergelijking"
            className="inline-flex h-[42px] items-center gap-2 rounded-[10px] bg-gold px-5 text-[14.5px] font-bold text-ink transition-colors hover:bg-gold-hover"
          >
            <Icon name="bar-chart-3" size={17} />
            Vergelijk nu
          </Link>
        </div>

        <button
          onClick={() => setOpen((o) => !o)}
          aria-label="Menu"
          className="inline-flex h-[42px] w-[42px] items-center justify-center rounded-[9px] border border-line text-ink lg:hidden"
        >
          <Icon name="menu" size={21} />
        </button>
      </div>

      {open && (
        <div className="border-t border-line bg-white px-6 pb-4 pt-2 lg:hidden">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              data-active={isActief(l.href)}
              onClick={() => setOpen(false)}
              className="bs-mob-link block rounded-lg px-3 py-3 text-base font-bold"
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
