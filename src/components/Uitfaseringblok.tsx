"use client";

import { useLocale } from "next-intl";
import Uitfaseringstijdlijn from "@/components/Uitfaseringstijdlijn";
import type { Uitfasering } from "@/lib/fiscaal/uitfasering";
import { formatters } from "@/lib/format";

/**
 * Schil om `Uitfaseringstijdlijn` zodat een servercomponent hem kan gebruiken.
 *
 * De tijdlijn neemt `euro` en `pct` als functies aan, en functies kunnen niet
 * over de grens tussen server en client. `Uitfasering` is wel gewone data, dus
 * die geeft de pagina door en de formatters worden hier aan deze kant gemaakt.
 * Zonder deze schil zou /fiscaal-kader in zijn geheel een clientcomponent moeten
 * worden om één balkje te kunnen tonen.
 */
export default function Uitfaseringblok({
  uitfasering,
  compact,
}: {
  uitfasering: Uitfasering;
  compact?: boolean;
}) {
  const { euro, pct } = formatters(useLocale());
  return <Uitfaseringstijdlijn uitfasering={uitfasering} euro={euro} pct={pct} compact={compact} />;
}
