import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Card, invoerKlassen, knopKlassen } from "@/components/ui";
import { Link } from "@/i18n/navigation";

/**
 * Veld en Melding wonen sinds de opschoning in ui.tsx, samen met de andere
 * primitieven. Ze blijven hier doorgegeven zodat de authenticatiepagina's alles
 * uit één import kunnen halen.
 */
export { Melding, Veld } from "@/components/ui";

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

/** Historische namen, nu doorverwezen naar de gedeelde primitieven in ui.tsx. */
export const invoerKlasse = invoerKlassen;

/** De verzendknop van een authenticatieformulier: primair en over de volle breedte. */
export const knopKlasse = knopKlassen("primair", "md", "w-full");
