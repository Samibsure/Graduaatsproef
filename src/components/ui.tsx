import type { ButtonHTMLAttributes, ReactNode } from "react";
import Icon from "@/components/Icon";

/**
 * Herbruikbare UI-primitieven in de huisstijl van Autofiscaliteit.
 *
 * Dit bestand bevat bewust geen hooks: het wordt zowel door server- als door
 * clientcomponenten geïmporteerd. Alles wat state nodig heeft (zoals Dialoog)
 * staat in een eigen bestand met "use client".
 */

/* ------------------------------------------------------------------ knoppen */

export type KnopVariant = "primair" | "secundair" | "stil" | "gevaar";
export type KnopMaat = "sm" | "md" | "lg";

const VARIANT: Record<KnopVariant, string> = {
  primair: "bg-accent text-white hover:bg-accent-hover",
  secundair: "border-[1.5px] border-ink bg-transparent text-ink hover:bg-ink hover:text-white",
  stil: "border border-line bg-white text-ink hover:border-ink-500 hover:bg-paper",
  gevaar: "bg-danger text-white hover:opacity-90",
};

const MAAT: Record<KnopMaat, string> = {
  sm: "h-9 gap-1.5 px-3.5 text-[13.5px]",
  md: "h-11 gap-2 px-5 text-[14.5px]",
  lg: "h-[52px] gap-2.5 px-7 text-[16px]",
};

/**
 * De klassenreeks van een knop, los van het element.
 *
 * Een knop is soms een <button> en soms een <Link>. Die tweede kan geen
 * button-component zijn zonder de routering van next-intl te verliezen, dus
 * levert deze functie de klassen en kiest de aanroeper het element. Zo staat de
 * knopstijl toch op één plaats: voor deze functie bestond ze als vijf
 * verschillende tekenreeksen op vijf plaatsen.
 */
export function knopKlassen(
  variant: KnopVariant = "primair",
  maat: KnopMaat = "md",
  extra = "",
): string {
  return [
    "inline-flex items-center justify-center rounded-[11px] font-bold",
    "transition-colors disabled:cursor-not-allowed disabled:opacity-55",
    VARIANT[variant],
    MAAT[maat],
    extra,
  ].join(" ");
}

export function Button({
  variant = "primair",
  maat = "md",
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: KnopVariant;
  maat?: KnopMaat;
}) {
  return <button className={knopKlassen(variant, maat, className)} {...rest} />;
}

/* ------------------------------------------------------- invoer en meldingen */

/** De enige invoerstijl. `.bs-inp` levert rand, hover en focusring uit globals.css. */
export const invoerKlassen = "bs-inp h-11 w-full rounded-[10px] px-3.5 text-[15px]";

export function Veld({
  label,
  hint,
  fout,
  children,
}: {
  label: string;
  hint?: string;
  fout?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13.5px] font-bold text-ink">{label}</span>
      {children}
      {fout ? (
        <span className="mt-1 block text-[12.5px] font-bold text-danger">{fout}</span>
      ) : (
        hint && <span className="mt-1 block text-[12.5px] text-ink-500">{hint}</span>
      )}
    </label>
  );
}

export type MeldingSoort = "fout" | "ok" | "let-op" | "info";

const MELDING: Record<MeldingSoort, string> = {
  fout: "border-danger/30 bg-danger-soft text-danger",
  ok: "border-success/30 bg-success-soft text-success",
  "let-op": "border-warning/30 bg-warning-soft text-warning",
  info: "border-line bg-paper text-ink-700",
};

export function Melding({
  soort = "info",
  children,
  className = "",
}: {
  soort?: MeldingSoort;
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      // Een fout hoort als "alert" te komen, de rest als "status": een
      // schermlezer onderbreekt dan alleen wanneer er echt iets misging.
      role={soort === "fout" ? "alert" : "status"}
      className={`m-0 rounded-[10px] border px-3.5 py-3 text-[14px] ${MELDING[soort]} ${className}`}
    >
      {children}
    </p>
  );
}

/* -------------------------------------------------- lege en ladende toestand */

/**
 * Wat er staat wanneer er niets is. Zonder deze component vult elke pagina dat
 * anders in, of helemaal niet: de catalogus toonde bij nul zoekresultaten een
 * volledig leeg raster.
 */
export function LegeStaat({
  icoon = "search",
  titel,
  tekst,
  actie,
}: {
  icoon?: string;
  titel: string;
  tekst?: ReactNode;
  actie?: ReactNode;
}) {
  return (
    <div className="rounded-[14px] border border-line bg-white px-6 py-12 text-center">
      <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full border border-line bg-paper text-ink-500">
        <Icon name={icoon} size={24} />
      </span>
      <h3 className="m-0 mb-2 text-[19px] font-bold text-ink">{titel}</h3>
      {tekst && <p className="mx-auto mb-6 max-w-[34em] text-[15px] text-ink-700">{tekst}</p>}
      {actie && <div className="flex flex-wrap justify-center gap-3">{actie}</div>}
    </div>
  );
}

/**
 * Grijze blokken tijdens het laden, zodat de pagina niet verspringt.
 *
 * De blokken zijn `bg-line` en niet `bg-paper`. Dat laatste is exact de
 * achtergrondkleur van elke `bg-paper`-sectie, waardoor het skelet daar
 * onzichtbaar was: de bezoeker zag een kop met een leeg gat eronder in plaats
 * van iets dat aan het laden is.
 */
export function Laadskelet({
  aantal = 3,
  hoogte = 132,
  className = "grid gap-4 sm:grid-cols-3",
}: {
  aantal?: number;
  hoogte?: number;
  className?: string;
}) {
  return (
    <div className={className} aria-hidden="true">
      {Array.from({ length: aantal }, (_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-[13px] bg-line"
          style={{ height: hoogte }}
        />
      ))}
    </div>
  );
}

/**
 * Een tabel die op een smal scherm schuift in plaats van samen te persen.
 * `min-w` is hier het hele punt: zonder die ondergrens knijpt een tabel met tien
 * kolommen zich op een telefoon tot onleesbaarheid samen.
 */
export function Tabel({
  children,
  minBreedte = 640,
  bijschrift,
  className = "",
}: {
  children: ReactNode;
  minBreedte?: number;
  bijschrift?: string;
  className?: string;
}) {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full text-sm" style={{ minWidth: minBreedte }}>
        {bijschrift && <caption className="sr-only">{bijschrift}</caption>}
        {children}
      </table>
    </div>
  );
}

export function Container({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`mx-auto max-w-[1200px] px-6 ${className}`}>{children}</div>;
}

/**
 * Paginakop: titel met optionele subtekst en actie.
 *
 * Er stond hier tot voor kort een "eyebrow" boven de titel: een klein
 * kapitalenlabel in de accentkleur. Dat label herhaalde in de praktijk de titel
 * of de menunaam, kostte een regel hoogte en duwde de eigenlijke kop naar
 * beneden. De titel doet dat werk zelf.
 */
export function PageHead({
  title,
  sub,
  action,
}: {
  title: ReactNode;
  sub?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
      <div>
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
