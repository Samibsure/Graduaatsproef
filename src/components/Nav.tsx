"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { Wordmerk } from "@/components/Brand";
import Icon from "@/components/Icon";
import { useSessie } from "@/components/SessieProvider";
import Taalkiezer from "@/components/Taalkiezer";
import { knopKlassen } from "@/components/ui";
import { Link, usePathname } from "@/i18n/navigation";
import {
  START_HIER_HREF,
  hoofdGroep,
  hoofdLinks,
  type NavGroep,
  type NavLink,
} from "@/lib/navigatie";

/**
 * Afmelden gebeurt via POST, zodat een prefetch niemand ongewenst uitlogt.
 *
 * De taal gaat als parameter mee: /afmelden zit niet onder [locale] en kan ze
 * dus niet uit het pad afleiden. Zonder deze parameter kwam een Franstalige
 * gebruiker na het afmelden op de Nederlandstalige startpagina terecht.
 */
function AfmeldKnop({ className, label }: { className: string; label: string }) {
  const taal = useLocale();
  return (
    <form action={`/afmelden?taal=${taal}`} method="post">
      <button type="submit" className={className}>
        {label}
      </button>
    </form>
  );
}

/**
 * Sluit bij een klik buiten het element en bij Escape.
 *
 * Escape ontbrak in de vorige versie: een geopend menu bleef openstaan en was
 * met het toetsenbord alleen weg te krijgen door ergens anders te klikken.
 */
function useSluitBuiten(open: boolean, sluit: () => void) {
  const doel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function bijKlik(e: MouseEvent) {
      if (doel.current && !doel.current.contains(e.target as Node)) sluit();
    }
    function bijToets(e: KeyboardEvent) {
      if (e.key === "Escape") sluit();
    }
    document.addEventListener("mousedown", bijKlik);
    document.addEventListener("keydown", bijToets);
    return () => {
      document.removeEventListener("mousedown", bijKlik);
      document.removeEventListener("keydown", bijToets);
    };
  }, [open, sluit]);

  return doel;
}

/** Uitklapmenu met de achtergrondpagina's, zodat ze niet los in de balk staan. */
function Groepsmenu({ groep, actief }: { groep: NavGroep; actief: (href: string) => boolean }) {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const doel = useSluitBuiten(open, () => setOpen(false));
  const heeftActieve = groep.links.some((l) => actief(l.href));

  return (
    <div className="relative" ref={doel}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        data-active={heeftActieve}
        className="bs-nav-link inline-flex cursor-pointer items-center gap-1.5 py-2 text-[14.5px] font-semibold transition-colors"
      >
        {t(groep.sleutel)}
        <Icon name="chevron-down" size={15} />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute left-0 top-[42px] z-50 w-[220px] overflow-hidden rounded-[12px] border border-line bg-white py-1.5 shadow-diep"
        >
          {groep.links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              role="menuitem"
              aria-current={actief(l.href) ? "page" : undefined}
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-[14px] text-ink hover:bg-paper aria-[current=page]:font-bold"
            >
              {t(l.sleutel)}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Accountmenu() {
  const t = useTranslations("nav");
  const sessie = useSessie();
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const doel = useSluitBuiten(open, () => setOpen(false));

  if (!sessie) {
    return (
      <>
        <Taalkiezer variant="minimaal" />
        <Link href="/aanmelden" className="text-[14.5px] font-semibold text-ink-500 hover:text-ink">
          {t("aanmelden")}
        </Link>
        <Link href={START_HIER_HREF} className={knopKlassen("primair", "md")}>
          {t("startHier")}
          <Icon name="arrow-right" size={16} />
        </Link>
      </>
    );
  }

  return (
    <div className="relative" ref={doel}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        className="inline-flex h-11 max-w-[220px] items-center gap-2 rounded-[10px] border border-line px-4 text-[14.5px] font-semibold text-ink hover:bg-paper"
      >
        <span className="truncate">{sessie.bedrijf.naam}</span>
        <Icon name="chevron-down" size={16} />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 top-[50px] z-50 w-[250px] overflow-hidden rounded-[12px] border border-line bg-white py-1.5 shadow-diep"
        >
          <div className="border-b border-line px-4 pb-2.5 pt-1.5">
            <p className="m-0 truncate text-[13.5px] font-bold text-ink">
              {sessie.volledigeNaam ?? sessie.email}
            </p>
            <p className="m-0 truncate text-[12.5px] text-ink-500">{sessie.email}</p>
          </div>
          <Link
            href="/instellingen"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-[14px] text-ink hover:bg-paper"
          >
            {t("instellingen")}
          </Link>
          {sessie.isPlatformAdmin && (
            <Link
              href="/beheer/parameters"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-[14px] text-ink hover:bg-paper"
            >
              {t("parametersBeheren")}
            </Link>
          )}

          {/* De taalkeuze staat hier en niet in de balk: wie aangemeld is,
              wisselt zelden van taal, en de balk was er te vol van. */}
          <div className="flex items-center justify-between gap-2 border-t border-line px-4 py-2.5">
            <span className="text-[13px] text-ink-500">{t("taal")}</span>
            <Taalkiezer variant="compact" />
          </div>

          <div className="border-t border-line pt-1">
            <AfmeldKnop
              label={t("afmelden")}
              className="block w-full px-4 py-2.5 text-left text-[14px] text-ink hover:bg-paper"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function Nav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const sessie = useSessie();
  const [open, setOpen] = useState(false);
  const menuId = useId();

  const links: readonly NavLink[] = hoofdLinks(sessie !== null);
  const groep = hoofdGroep(sessie !== null);

  const isActief = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  // Het mobiele menu bedekt het scherm; laat de pagina eronder dan niet
  // meescrollen, anders verliest de bezoeker bij het sluiten zijn plaats.
  useEffect(() => {
    if (!open) return;
    const vorige = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function bijToets(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", bijToets);
    return () => {
      document.body.style.overflow = vorige;
      document.removeEventListener("keydown", bijToets);
    };
  }, [open]);

  // Bij een paginawissel hoort het menu dicht te gaan.
  useEffect(() => setOpen(false), [pathname]);

  const alleLinks = [...links, ...groep.links];

  return (
    <header
      className="bs-no-print sticky top-0 z-50 border-b border-line"
      style={{
        background: "rgba(255,255,255,0.86)",
        backdropFilter: "saturate(180%) blur(14px)",
        WebkitBackdropFilter: "saturate(180%) blur(14px)",
      }}
    >
      <div className="mx-auto flex h-[60px] max-w-[1200px] items-center justify-between gap-6 px-6">
        <Link href="/" className="flex items-center" aria-label={t("naarStart")}>
          <Wordmerk compact />
        </Link>

        <nav className="hidden items-center gap-7 md:flex" aria-label={t("hoofdmenu")}>
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              data-active={isActief(l.href)}
              aria-current={isActief(l.href) ? "page" : undefined}
              className="bs-nav-link cursor-pointer py-2 text-[14.5px] font-semibold transition-colors"
            >
              {t(l.sleutel)}
            </Link>
          ))}
          <Groepsmenu groep={groep} actief={isActief} />
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Accountmenu />
        </div>

        <button
          onClick={() => setOpen((o) => !o)}
          aria-label={t("menu")}
          aria-expanded={open}
          aria-controls={menuId}
          className="inline-flex h-11 w-11 items-center justify-center rounded-[10px] border border-line text-ink md:hidden"
        >
          <Icon name={open ? "x" : "menu"} size={21} />
        </button>
      </div>

      {open && (
        <div
          id={menuId}
          className="fixed inset-x-0 bottom-0 top-[60px] z-40 overflow-y-auto border-t border-line bg-white px-6 pb-10 pt-4 md:hidden"
        >
          <nav aria-label={t("hoofdmenu")}>
            {alleLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                data-active={isActief(l.href)}
                aria-current={isActief(l.href) ? "page" : undefined}
                className="bs-mob-link block rounded-lg px-3 py-3 text-base font-semibold"
              >
                {t(l.sleutel)}
              </Link>
            ))}
          </nav>

          <div className="mt-4 border-t border-line pt-4">
            {sessie ? (
              <>
                <p className="px-3 pb-2 text-[13px] text-ink-500">
                  {t("aangemeldAls", { bedrijf: sessie.bedrijf.naam })}
                </p>
                <Link
                  href="/instellingen"
                  className="bs-mob-link block rounded-lg px-3 py-3 text-base font-semibold"
                >
                  {t("instellingen")}
                </Link>
                {sessie.isPlatformAdmin && (
                  <Link
                    href="/beheer/parameters"
                    className="bs-mob-link block rounded-lg px-3 py-3 text-base font-semibold"
                  >
                    {t("parametersBeheren")}
                  </Link>
                )}
                <AfmeldKnop
                  label={t("afmelden")}
                  className="block w-full rounded-lg px-3 py-3 text-left text-base font-semibold text-ink-500"
                />
              </>
            ) : (
              <div className="space-y-2.5">
                <Link
                  href={START_HIER_HREF}
                  className={knopKlassen("primair", "lg", "w-full")}
                >
                  {t("startHier")}
                  <Icon name="arrow-right" size={17} />
                </Link>
                <Link href="/aanmelden" className={knopKlassen("stil", "lg", "w-full")}>
                  {t("aanmelden")}
                </Link>
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-line px-3 pt-4">
            <span className="text-[13px] text-ink-500">{t("taal")}</span>
            <Taalkiezer variant="compact" />
          </div>
        </div>
      )}
    </header>
  );
}
