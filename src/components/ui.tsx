import type { ReactNode } from "react";
import Icon from "@/components/Icon";

/** Herbruikbare UI-primitieven in de B-sure × PXL huisstijl. */

export function Container({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`mx-auto max-w-[1200px] px-6 ${className}`}>{children}</div>;
}

/** Gouden bovenliggend label met streepje, zoals in de huisstijl. */
export function Eyebrow({ children, dash = false }: { children: ReactNode; dash?: boolean }) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      {dash && <span className="h-[1.5px] w-[26px] bg-gold" />}
      <span className="text-[12px] font-bold uppercase tracking-[0.16em] text-gold">{children}</span>
    </div>
  );
}

/** Paginakop: eyebrow + titel + optionele subtekst en actie. */
export function PageHead({
  eyebrow,
  title,
  sub,
  action,
}: {
  eyebrow: string;
  title: ReactNode;
  sub?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="m-0 text-[clamp(28px,4vw,44px)] font-bold tracking-[-0.02em] text-ink">
          {title}
        </h1>
        {sub && <p className="mt-2.5 max-w-[44em] text-[16.5px] text-ink-700">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({
  children,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section";
}) {
  return <Tag className={`rounded-[14px] border border-line bg-white ${className}`}>{children}</Tag>;
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
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-[22px] font-bold tracking-[-0.01em] text-ink">{children}</h2>
        {sub && <p className="mt-1.5 max-w-2xl text-[15px] text-ink-700">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

/** KPI-kaart met gouden accentbalk links. */
export function StatCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: ReactNode;
  detail?: string;
  icon?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-[13px] border border-line bg-white p-6">
      <span className="absolute left-0 bottom-[22px] top-[22px] w-[3px] rounded-r-[3px] bg-gold" />
      <div className="mb-3.5 flex items-center gap-2 text-ink-500">
        {icon && <Icon name={icon} size={17} />}
        <span className="text-[13px]">{label}</span>
      </div>
      <div className="text-[32px] font-bold leading-none tracking-[-0.02em] text-ink">{value}</div>
      {detail && <div className="mt-2 text-[13px] text-ink-500">{detail}</div>}
    </div>
  );
}

const tintStyles: Record<string, string> = {
  ink: "bg-ink/5 text-ink",
  gold: "bg-gold-soft text-ink",
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
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
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
