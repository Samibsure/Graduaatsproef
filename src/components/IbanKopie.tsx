"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { formatteerIban } from "@/lib/steun";

/**
 * Een rekeningnummer overtypen is de plek waar het misloopt. Deze knop zet het
 * op het klembord; lukt dat niet (oudere browser, geen beveiligde context),
 * dan blijft het nummer gewoon leesbaar staan en gebeurt er niets ergs.
 */
export default function IbanKopie({ iban, label }: { iban: string; label: string }) {
  const t = useTranslations("steun");
  const [gekopieerd, setGekopieerd] = useState(false);

  useEffect(() => {
    if (!gekopieerd) return;
    const timer = setTimeout(() => setGekopieerd(false), 2500);
    return () => clearTimeout(timer);
  }, [gekopieerd]);

  async function kopieer() {
    try {
      await navigator.clipboard.writeText(iban.replace(/\s+/g, ""));
      setGekopieerd(true);
    } catch {
      setGekopieerd(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="select-all font-mono text-[16px] font-bold tracking-[0.02em] text-ink">
        {formatteerIban(iban)}
      </span>
      <button
        type="button"
        onClick={kopieer}
        aria-label={label}
        className="inline-flex h-[36px] items-center gap-1.5 rounded-[9px] border border-line bg-white px-3 text-[13.5px] font-bold text-ink transition-colors hover:border-ink hover:bg-paper"
      >
        <Icon name={gekopieerd ? "check" : "copy"} size={15} />
        {gekopieerd ? t("gekopieerd") : t("kopieer")}
      </button>
    </div>
  );
}
