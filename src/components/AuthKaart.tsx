import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Card } from "@/components/ui";
import { Link } from "@/i18n/navigation";

/** Gedeelde omkadering voor de aanmeld-, registratie- en herstelpagina's. */
export function AuthKaart({
  titel,
  intro,
  children,
  voettekst,
}: {
  titel: string;
  intro: ReactNode;
  children: ReactNode;
  voettekst?: ReactNode;
}) {
  const t = useTranslations("auth");
  return (
    <div className="mx-auto flex w-full max-w-[460px] flex-col px-6 py-16">
      <Link href="/" className="mb-8 text-[13px] font-bold text-ink-500 hover:text-ink">
        {t("terugNaarSite")}
      </Link>
      <Card className="p-7 sm:p-9">
        <h1 className="m-0 text-[26px] font-bold tracking-[-0.02em] text-ink">{titel}</h1>
        <p className="mt-2.5 text-[15px] leading-relaxed text-ink-700">{intro}</p>
        <div className="mt-7">{children}</div>
      </Card>
      {voettekst && (
        <p className="mt-6 text-center text-[14px] text-ink-700">{voettekst}</p>
      )}
    </div>
  );
}

export function Veld({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13.5px] font-bold text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[12.5px] text-ink-500">{hint}</span>}
    </label>
  );
}

export function Melding({ soort, children }: { soort: "fout" | "ok"; children: ReactNode }) {
  const stijl =
    soort === "fout"
      ? "border-danger/30 bg-danger/[0.06] text-danger"
      : "border-emerald-600/30 bg-emerald-50 text-emerald-800";
  return (
    <p role="status" className={`rounded-[10px] border px-3.5 py-3 text-[14px] ${stijl}`}>
      {children}
    </p>
  );
}

export const invoerKlasse = "bs-inp h-[44px] w-full rounded-[10px] px-3.5 text-[15px]";

export const knopKlasse =
  "inline-flex h-[46px] w-full items-center justify-center gap-2 rounded-[10px] bg-ink px-5 " +
  "text-[15px] font-bold text-white transition-colors hover:bg-ink-600 " +
  "disabled:cursor-not-allowed disabled:opacity-60";
