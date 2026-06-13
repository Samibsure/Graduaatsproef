import type { ReactNode } from "react";

/** Herbruikbare UI-primitieven in de B-sure × PXL huisstijl. */

export function Card({
  children,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section";
}) {
  return (
    <Tag className={`rounded-2xl border border-line bg-white shadow-sm ${className}`}>{children}</Tag>
  );
}

export function SectionTitle({
  children,
  sub,
  action,
}: {
  children: ReactNode;
  sub?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-ink">{children}</h2>
        {sub && <p className="mt-1 max-w-2xl text-sm text-slate-500">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  detail,
  accent,
}: {
  label: string;
  value: ReactNode;
  detail?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm ${
        accent ? "border-gold/40 bg-gold/10" : "border-line bg-white"
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1.5 text-2xl font-bold tracking-tight text-ink">{value}</p>
      {detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>}
    </div>
  );
}

const tintStyles: Record<string, string> = {
  ink: "bg-ink/5 text-ink",
  gold: "bg-gold/15 text-[#7a6a3f]",
  green: "bg-emerald-100 text-emerald-800",
  amber: "bg-amber-100 text-amber-800",
  rose: "bg-rose-100 text-rose-800",
  slate: "bg-slate-100 text-slate-600",
};

export function Badge({
  children,
  tint = "slate",
}: {
  children: ReactNode;
  tint?: keyof typeof tintStyles | string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        tintStyles[tint] ?? tintStyles.slate
      }`}
    >
      {children}
    </span>
  );
}

/** Kleine gekleurde stip per voertuigtype, voor snelle visuele herkenning. */
export function TypeDot({ type }: { type: string }) {
  const kleur: Record<string, string> = {
    BEV: "#10b981",
    PHEV: "#3b82f6",
    HEV: "#8b5cf6",
    fossiel: "#ef4444",
  };
  return (
    <span
      className="inline-block h-2.5 w-2.5 rounded-full"
      style={{ background: kleur[type] ?? "#94a3b8" }}
      aria-hidden="true"
    />
  );
}
