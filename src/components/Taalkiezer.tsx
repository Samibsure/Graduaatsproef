"use client";

import { useLocale } from "next-intl";
import { useParams } from "next/navigation";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { TAALNAAM, routing, type Locale } from "@/i18n/routing";

/**
 * Taalkeuze NL / FR / EN. Houdt de huidige pagina vast: wie op /fr/catalogus
 * naar Engels overschakelt, komt op /en/catalogus terecht en niet op de
 * startpagina.
 */
export default function Taalkiezer({
  variant = "licht",
}: {
  variant?: "licht" | "compact" | "minimaal";
}) {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const [bezig, startOvergang] = useTransition();

  function kies(nieuw: Locale) {
    if (nieuw === locale) return;
    startOvergang(() => {
      router.replace(
        // @ts-expect-error: pathname en params horen bij dezelfde route, maar
        // dat verband kan TypeScript hier niet zelf leggen.
        { pathname, params },
        { locale: nieuw },
      );
    });
  }

  if (variant === "compact" || variant === "minimaal") {
    return (
      <div className={variant === "minimaal" ? "flex gap-0.5" : "flex gap-1.5"}>
        {routing.locales.map((l) => (
          <button
            key={l}
            onClick={() => kies(l)}
            disabled={bezig}
            aria-current={l === locale ? "true" : undefined}
            // lang op de knop zelf: anders spreekt een schermlezer "FR" uit
            // volgens de uitspraakregels van de pagina eromheen.
            lang={l}
            title={TAALNAAM[l]}
            className={
              variant === "minimaal"
                ? "rounded-md px-1.5 py-1 text-[12.5px] font-bold uppercase text-ink-500 hover:text-ink aria-[current=true]:text-ink aria-[current=true]:underline aria-[current=true]:underline-offset-4"
                : "rounded-md px-2.5 py-1.5 text-[13px] font-bold uppercase text-ink-500 aria-[current=true]:bg-accent-soft aria-[current=true]:text-ink"
            }
          >
            {l}
          </button>
        ))}
      </div>
    );
  }

  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{TAALNAAM[locale]}</span>
      <select
        value={locale}
        disabled={bezig}
        onChange={(e) => kies(e.target.value as Locale)}
        className="h-11 cursor-pointer appearance-none rounded-[10px] border border-line bg-white pl-3.5 pr-8 text-[14px] font-bold uppercase text-ink hover:bg-paper"
      >
        {routing.locales.map((l) => (
          <option key={l} value={l} lang={l}>
            {l.toUpperCase()}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3 text-ink-500">▾</span>
    </label>
  );
}
