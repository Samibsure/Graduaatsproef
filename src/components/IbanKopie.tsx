"use client";

import { useTranslations } from "next-intl";
import Kopieerknop from "@/components/Kopieerknop";
import { formatteerIban } from "@/lib/steun";

/**
 * Een rekeningnummer overtypen is de plek waar het misloopt. Deze knop zet het
 * op het klembord; lukt dat niet (oudere browser, geen beveiligde context),
 * dan blijft het nummer gewoon leesbaar staan en gebeurt er niets ergs.
 *
 * Het kopiëren zelf staat in Kopieerknop, want de uitnodigingslink op
 * /instellingen heeft precies hetzelfde nodig.
 */
export default function IbanKopie({ iban, label }: { iban: string; label: string }) {
  const t = useTranslations("steun");

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="select-all font-mono text-[16px] font-bold tracking-[0.02em] text-ink">
        {formatteerIban(iban)}
      </span>
      <Kopieerknop
        waarde={iban.replace(/\s+/g, "")}
        label={label}
        kopieerLabel={t("kopieer")}
        gekopieerdLabel={t("gekopieerd")}
      />
    </div>
  );
}
