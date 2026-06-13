/**
 * Eigen wordmark-lockup in de gecombineerde B-sure × PXL huisstijl.
 * Bewust een eigen tekstlockup (geen kopie van de officiële, handelsmerk-
 * beschermde logo's) — ink + PXL-goud. Werkt volledig offline (inline SVG).
 */
export function BrandLockup({ variant = "light" }: { variant?: "light" | "dark" }) {
  const ink = variant === "dark" ? "#ffffff" : "var(--ink)";
  const sub = variant === "dark" ? "rgba(255,255,255,.65)" : "rgba(11,31,51,.55)";
  return (
    <span className="inline-flex items-center gap-2.5 leading-none">
      <BSureMark />
      <span className="flex flex-col">
        <span className="flex items-baseline gap-1.5">
          <span className="text-[15px] font-semibold tracking-tight" style={{ color: ink }}>
            B&#8209;sure
          </span>
          <span className="text-[11px] font-medium" style={{ color: "var(--gold)" }}>
            ×
          </span>
          <span className="text-[15px] font-bold tracking-[0.18em]" style={{ color: ink }}>
            PXL
          </span>
        </span>
        <span className="text-[9.5px] font-medium uppercase tracking-[0.14em]" style={{ color: sub }}>
          Autofiscaliteit
        </span>
      </span>
    </span>
  );
}

/** Compacte "b" met goud-cirkel, als herkenbaar merkpunt. */
export function BSureMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <rect width="36" height="36" rx="9" fill="var(--ink)" />
      <circle cx="18" cy="14" r="6.4" fill="none" stroke="var(--gold)" strokeWidth="2.4" />
      <path d="M18 21.5v6.2" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="18" cy="14" r="1.9" fill="var(--gold)" />
    </svg>
  );
}
