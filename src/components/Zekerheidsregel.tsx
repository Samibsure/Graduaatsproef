"use client";

import { useTranslations } from "next-intl";
import Icon from "@/components/Icon";
import type { CatalogCar } from "@/lib/fiscaal/types";

/**
 * De herkomst van de cijfers van één model: nagekeken of geraamd, met de bron en
 * het eventuele voorbehoud erbij.
 *
 * Een raming zonder label is een bewering. Dit maakt er een raming van, met de
 * bron erbij en met het voorbehoud dat het onderzoek erover maakte: dat de
 * cijfers van deze BMW de oude generatie beschrijven, dat die CO₂ vlak bij de
 * drempel van de valse-hybridetoets ligt. Dat hoort op de kaart en niet in een
 * document dat niemand opent.
 *
 * Deze component stond als lokale functie in de catalogus. Ze staat hier omdat de
 * voorbeeldkaart op de startpagina hetzelfde nodig heeft: daar stond tot nu toe
 * een vinkje "elk cijfer met zijn bron" naast een kaart die die bron niet toonde.
 * Een belofte over onderbouwing hoort niet naast het cijfer te staan maar eronder,
 * ingevuld.
 *
 * De labels komen uit de `catalogus`-ruimte en worden hier zelf opgehaald: de twee
 * aanroepers zitten in verschillende vertaalruimtes, en die er telkens laten
 * doorgeven maakte de component afhankelijk van waar hij toevallig gebruikt wordt.
 */
export default function Zekerheidsregel({
  car,
  compact = false,
}: {
  car: CatalogCar;
  /**
   * Voor smalle kaarten: de bronregel wordt op één regel afgekapt in plaats van
   * door te lopen. De hero-kaart is een derde smaller dan een catalogiskaart, en
   * sommige bronnen zijn een volle zin.
   */
  compact?: boolean;
}) {
  const t = useTranslations("catalogus");

  const nagekeken = car.zekerheid === "geverifieerd";
  const voorbehoud = car.voorbehoud ? t(`voorbehoud_${car.voorbehoud}`) : null;
  if (!car.bron && !voorbehoud) return null;

  return (
    <div className="mt-2.5 border-t border-line pt-2.5 text-[12px] leading-relaxed">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span
          className={`inline-flex flex-none items-center gap-1 rounded-full px-2 py-[3px] text-[11px] font-bold ${
            nagekeken ? "bg-accent-soft text-ink" : "bg-line text-ink-700"
          }`}
        >
          <Icon name={nagekeken ? "check" : "info"} size={12} />
          {t(nagekeken ? "badgeGeverifieerd" : "badgeRaming")}
        </span>
        {car.bron && (
          <span
            className={`min-w-0 text-ink-500 ${compact ? "truncate" : ""}`}
            title={compact ? car.bron : undefined}
          >
            {car.bron}
          </span>
        )}
      </div>
      {voorbehoud && !compact && (
        <p className="m-0 mt-1.5 text-ink-700">
          <span className="font-bold">{t("voorbehoudLabel")}:</span> {voorbehoud}
        </p>
      )}
    </div>
  );
}
