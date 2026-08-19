"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";

/**
 * Een knop die een tekst op het klembord zet, met een korte bevestiging.
 *
 * Dit stond eerst alleen in IbanKopie: een rekeningnummer overtypen is de plek
 * waar het misloopt. Een uitnodigingslink met een token erin is dat nog meer, en
 * dan hoort dezelfde knop er te staan in plaats van een tweede versie ervan.
 *
 * Lukt het kopiëren niet (oudere browser, geen beveiligde context), dan blijft
 * de tekst gewoon leesbaar staan en gebeurt er niets ergs.
 */
export default function Kopieerknop({
  waarde,
  label,
  kopieerLabel,
  gekopieerdLabel,
  className = "",
}: {
  waarde: string;
  /** Toegankelijke naam; de knoptekst zelf wisselt tussen de twee labels. */
  label: string;
  kopieerLabel: string;
  gekopieerdLabel: string;
  className?: string;
}) {
  const [gekopieerd, setGekopieerd] = useState(false);

  useEffect(() => {
    if (!gekopieerd) return;
    const timer = setTimeout(() => setGekopieerd(false), 2500);
    return () => clearTimeout(timer);
  }, [gekopieerd]);

  async function kopieer() {
    try {
      await navigator.clipboard.writeText(waarde);
      setGekopieerd(true);
    } catch {
      setGekopieerd(false);
    }
  }

  return (
    <button
      type="button"
      onClick={kopieer}
      aria-label={label}
      className={`inline-flex h-[36px] shrink-0 items-center gap-1.5 rounded-[9px] border border-line bg-white px-3 text-[13.5px] font-bold text-ink transition-colors hover:border-ink hover:bg-paper ${className}`}
    >
      <Icon name={gekopieerd ? "check" : "copy"} size={15} />
      {gekopieerd ? gekopieerdLabel : kopieerLabel}
    </button>
  );
}
