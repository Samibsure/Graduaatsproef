/**
 * Eigen wordmark van Autofiscaliteit. Volledig inline SVG, dus geen externe
 * lettertypes of afbeeldingen nodig.
 */
export function Wordmerk({ variant = "light" }: { variant?: "light" | "dark" }) {
  const ink = variant === "dark" ? "#ffffff" : "var(--ink)";
  const sub = variant === "dark" ? "rgba(255,255,255,.62)" : "var(--ink-500)";
  return (
    <span className="inline-flex items-center gap-3 leading-none">
      <Logomerk />
      <span className="flex flex-col gap-0.5">
        <span className="text-[17px] font-bold tracking-[-0.01em]" style={{ color: ink }}>
          Autofiscaliteit
        </span>
        <span
          className="text-[9.5px] font-bold uppercase tracking-[0.15em]"
          style={{ color: sub }}
        >
          Bedrijfswagens in België
        </span>
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
