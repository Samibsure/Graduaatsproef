"use client";

import { useTranslations } from "next-intl";
import Icon from "@/components/Icon";
import { useSessie } from "@/components/SessieProvider";
import { Card, knopKlassen } from "@/components/ui";
import { Link } from "@/i18n/navigation";

/**
 * Waarom je een account zou nemen, en wat je er precies bij krijgt.
 *
 * Hier stond één kaart met twee zinnen: "bewaar deze berekening, leg meerdere
 * wagens naast elkaar, volg je wagenpark op". Dat is niet onwaar, maar het noemt
 * geen enkele functie bij naam, dus kan de bezoeker er niets mee afwegen. En het
 * begon met wat hij nog niet heeft, terwijl hij net vier stappen gratis gekregen
 * had.
 *
 * Deze sectie draait die volgorde om: eerst wat er gratis is en gratis blijft, dan
 * per afgeschermde pagina de échte mogelijkheid, dan de voorwaarden naast de knop
 * in plaats van drie pagina's verderop. De vrijwillige bijdrage komt daarná, niet
 * hier: eerst leveren, dan vragen.
 */

/** De afgeschermde pagina's, in de volgorde waarin ze na deze flow nuttig worden. */
const FUNCTIES = [
  { sleutel: "vergelijking", href: "/vergelijking", icoon: "scale" },
  { sleutel: "vloot", href: "/vloot", icoon: "bar-chart-3" },
  { sleutel: "wagens", href: "/wagens", icoon: "car-front" },
  { sleutel: "modellen", href: "/modellen", icoon: "layout-grid" },
  { sleutel: "instellingen", href: "/instellingen", icoon: "sliders-horizontal" },
] as const;

const GRATIS = ["gratis1", "gratis2", "gratis3", "gratis4"] as const;

export default function Inlogwaarde() {
  const t = useTranslations("inlogwaarde");
  const sessie = useSessie();

  return (
    <div className="space-y-4">
      {/*
        Eerst de gratis basis benoemen. Zonder dat leest de lijst eronder als een
        betaalmuur, en die is er niet: er komt geen betaalde versie.
      */}
      <Card className="p-6">
        <h2 className="m-0 mb-1.5 flex items-center gap-2 text-[18px] font-bold text-ink">
          <Icon name="check" size={19} />
          {t("gratisTitel")}
        </h2>
        <p className="m-0 mb-4 max-w-[46em] text-[14.5px] leading-relaxed text-ink-700">
          {t("gratisIntro")}
        </p>
        <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2">
          {GRATIS.map((sleutel) => (
            <li key={sleutel} className="flex items-start gap-2 text-[14px] text-ink-700">
              <span className="mt-0.5 shrink-0 text-accent">
                <Icon name="check" size={15} />
              </span>
              <span>{t(sleutel)}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="border-accent-line bg-accent-soft p-6">
        <h2 className="m-0 mb-1.5 text-[18px] font-bold text-ink">
          {sessie ? t("titelAangemeld") : t("titel")}
        </h2>
        <p className="m-0 mb-5 max-w-[46em] text-[14.5px] leading-relaxed text-ink-700">
          {sessie ? t("introAangemeld") : t("intro")}
        </p>

        {/*
          Eén regel per afgeschermde route, met de mogelijkheid erbij in plaats van
          de paginanaam alleen. Voor wie aangemeld is, is dezelfde regel meteen een
          snelkoppeling: dan is het geen belofte meer maar navigatie.
        */}
        <dl className="m-0 mb-6 grid gap-px overflow-hidden rounded-[12px] bg-line">
          {FUNCTIES.map(({ sleutel, href, icoon }) => (
            <div key={sleutel} className="flex items-start gap-3 bg-white px-4 py-3.5">
              <span className="mt-0.5 shrink-0 text-ink-500">
                <Icon name={icoon} size={17} />
              </span>
              <div className="min-w-0">
                <dt className="text-[14.5px] font-bold text-ink">
                  {sessie ? (
                    <Link href={href} className="underline underline-offset-2 hover:text-accent">
                      {t(`${sleutel}Naam`)}
                    </Link>
                  ) : (
                    t(`${sleutel}Naam`)
                  )}
                </dt>
                <dd className="m-0 mt-0.5 text-[13.5px] leading-relaxed text-ink-700">
                  {t(sleutel)}
                </dd>
              </div>
            </div>
          ))}
        </dl>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <Link
            href={sessie ? "/vergelijking" : "/registreren"}
            className={knopKlassen("primair", "md")}
          >
            {sessie ? t("knopAangemeld") : t("knop")}
            <Icon name="arrow-right" size={16} />
          </Link>
          {!sessie && (
            <span className="text-[13.5px] text-ink-700">
              {t("alAccount")}{" "}
              <Link
                href="/aanmelden"
                className="font-bold text-ink underline underline-offset-2 hover:text-accent"
              >
                {t("meldAan")}
              </Link>
            </span>
          )}
        </div>

        {/*
          De voorwaarden staan naast de knop en niet op een andere pagina. Wie
          twijfelt over registreren, twijfelt precies hierover.
        */}
        {!sessie && (
          <p className="m-0 mt-4 max-w-[46em] text-[12.5px] leading-relaxed text-ink-500">
            {t("voorwaarden")}
          </p>
        )}
      </Card>
    </div>
  );
}
