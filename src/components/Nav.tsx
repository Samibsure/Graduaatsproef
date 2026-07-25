"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Wordmerk } from "@/components/Brand";
import Icon from "@/components/Icon";
import { useSessie } from "@/components/SessieProvider";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/catalogus", label: "Catalogus" },
  { href: "/vergelijking", label: "Vergelijking" },
  { href: "/wagens", label: "Wagens" },
  { href: "/fiscaal-kader", label: "Fiscaal kader" },
  { href: "/handleiding", label: "Handleiding" },
];

/** Afmelden gebeurt via POST, zodat een prefetch niemand ongewenst uitlogt. */
function AfmeldKnop({ className }: { className: string }) {
  return (
    <form action="/afmelden" method="post">
      <button type="submit" className={className}>
        Afmelden
      </button>
    </form>
  );
}

function Accountmenu() {
  const sessie = useSessie();
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function bijKlik(e: MouseEvent) {
      if (menu.current && !menu.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", bijKlik);
    return () => document.removeEventListener("mousedown", bijKlik);
  }, [open]);

  if (!sessie) {
    return (
      <>
        <Link href="/aanmelden" className="text-[14.5px] font-bold text-ink-500 hover:text-ink">
          Aanmelden
        </Link>
        <Link
          href="/registreren"
          className="inline-flex h-[42px] items-center gap-2 rounded-[10px] bg-gold px-5 text-[14.5px] font-bold text-white transition-colors hover:bg-gold-hover"
        >
          Gratis starten
        </Link>
      </>
    );
  }

  return (
    <div className="relative" ref={menu}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex h-[42px] max-w-[220px] items-center gap-2 rounded-[10px] border border-line px-4 text-[14.5px] font-bold text-ink hover:bg-paper"
      >
        <span className="truncate">{sessie.bedrijf.naam}</span>
        <Icon name="chevron-down" size={16} />
      </button>

      {open && (
        <div className="absolute right-0 top-[50px] w-[240px] overflow-hidden rounded-[12px] border border-line bg-white py-1.5 shadow-lg">
          <div className="border-b border-line px-4 pb-2.5 pt-1.5">
            <p className="m-0 truncate text-[13.5px] font-bold text-ink">
              {sessie.volledigeNaam ?? sessie.email}
            </p>
            <p className="m-0 truncate text-[12.5px] text-ink-500">{sessie.email}</p>
          </div>
          <Link
            href="/wagens"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-[14px] text-ink hover:bg-paper"
          >
            Mijn wagens
          </Link>
          <Link
            href="/instellingen"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-[14px] text-ink hover:bg-paper"
          >
            Instellingen
          </Link>
          {sessie.isPlatformAdmin && (
            <Link
              href="/beheer/parameters"
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-[14px] text-ink hover:bg-paper"
            >
              Parameters beheren
            </Link>
          )}
          <div className="border-t border-line pt-1">
            <AfmeldKnop className="block w-full px-4 py-2.5 text-left text-[14px] text-ink hover:bg-paper" />
          </div>
        </div>
      )}
    </div>
  );
}

export default function Nav() {
  const pathname = usePathname();
  const sessie = useSessie();
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
        <Link href="/" className="flex items-center" onClick={() => setOpen(false)}>
          <Wordmerk />
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
          <Accountmenu />
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

          <div className="mt-3 border-t border-line pt-3">
            {sessie ? (
              <>
                <p className="px-3 pb-2 text-[13px] text-ink-500">
                  Aangemeld als {sessie.bedrijf.naam}
                </p>
                <Link
                  href="/instellingen"
                  onClick={() => setOpen(false)}
                  className="bs-mob-link block rounded-lg px-3 py-3 text-base font-bold"
                >
                  Instellingen
                </Link>
                <AfmeldKnop className="block w-full rounded-lg px-3 py-3 text-left text-base font-bold text-ink-500" />
              </>
            ) : (
              <>
                <Link
                  href="/aanmelden"
                  onClick={() => setOpen(false)}
                  className="bs-mob-link block rounded-lg px-3 py-3 text-base font-bold"
                >
                  Aanmelden
                </Link>
                <Link
                  href="/registreren"
                  onClick={() => setOpen(false)}
                  className="mt-1 block rounded-lg bg-gold px-3 py-3 text-base font-bold text-white"
                >
                  Gratis starten
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
