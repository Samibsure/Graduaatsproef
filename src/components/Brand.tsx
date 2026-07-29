import { useTranslations } from "next-intl";

/**
 * Eigen wordmark van Autofiscaliteit. Volledig inline SVG, dus geen externe
 * lettertypes of afbeeldingen nodig.
 *
 * `compact` laat de ondertitel weg. In de header telde die tweede regel mee voor
 * de hoogte van de hele balk, terwijl niemand hem daar leest: wie op de site is,
 * weet waar hij is. In de voettekst, waar het merk zich wél moet voorstellen,
 * staat de ondertitel er nog.
 */
export function Wordmerk({
  variant = "light",
  compact = false,
}: {
  variant?: "light" | "dark";
  compact?: boolean;
}) {
  const t = useTranslations("merk");
  const ink = variant === "dark" ? "#ffffff" : "var(--ink)";
  const sub = variant === "dark" ? "rgba(255,255,255,.72)" : "var(--ink-500)";

  return (
    <span className="inline-flex items-center gap-2.5 leading-none">
      <Logomerk size={compact ? 30 : 36} />
      <span className="flex flex-col gap-0.5">
        <span
          className={`font-bold tracking-[-0.01em] ${compact ? "text-[16.5px]" : "text-[17px]"}`}
          style={{ color: ink }}
        >
          {t("naam")}
        </span>
        {!compact && (
          <span
            className="text-[9.5px] font-bold uppercase tracking-[0.15em]"
            style={{ color: sub }}
          >
            {t("ondertitel")}
          </span>
        )}
      </span>
    </span>
  );
}

/** Compact merkteken: een procentteken in de accentkleur op een donker vlak. */
export function Logomerk({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <rect width="36" height="36" rx="9" fill="var(--ink)" />
      <circle cx="13.6" cy="13.6" r="3.1" fill="none" stroke="var(--gold)" strokeWidth="2.2" />
      <circle cx="22.4" cy="22.4" r="3.1" fill="none" stroke="var(--gold)" strokeWidth="2.2" />
      <path
        d="M24.6 11.4 11.4 24.6"
        stroke="#ffffff"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
