import { useTranslations } from "next-intl";
import Icon from "@/components/Icon";
import { knopKlassen, type KnopVariant } from "@/components/ui";
import { Link } from "@/i18n/navigation";

/**
 * De vrijwillige bijdrage komt op enkele plaatsen terug, telkens met dezelfde
 * toon: zichtbaar, maar nooit in de weg. Alles wijst naar één pagina
 * (/steunen), zodat de knop nergens een betaalstroom start die de bezoeker
 * niet verwacht.
 */

/**
 * De voettekst staat op ink en heeft dus een eigen variant: de knopvarianten
 * uit ui.tsx gaan alle vier uit van een lichte achtergrond.
 */
const DONKER =
  "inline-flex items-center justify-center gap-2 rounded-[11px] h-11 px-5 text-[14.5px] font-bold" +
  " border border-white/[0.22] text-white/[0.86] transition-colors hover:border-white/[0.4] hover:text-white";

export function SteunKnop({
  variant = "stil",
  className = "",
}: {
  variant?: KnopVariant | "donker";
  className?: string;
}) {
  const t = useTranslations("steun");
  const klassen =
    variant === "donker" ? `${DONKER} ${className}` : knopKlassen(variant, "md", className);
  return (
    <Link href="/steunen" className={klassen}>
      <Icon name="coffee" size={17} />
      {t("knop")}
    </Link>
  );
}

/**
 * De terloopse variant: één regel, na een moment waarop de tool net iets
 * opgeleverd heeft. Geen kader, geen kleur, geen kruisje om weg te klikken,
 * want er valt niets weg te klikken.
 */
export function SteunNoot({ className = "" }: { className?: string }) {
  const t = useTranslations("steun");
  return (
    <p className={`m-0 text-[13.5px] leading-relaxed text-ink-500 ${className}`}>
      {t.rich("noot", {
        link: (chunks) => (
          <Link
            href="/steunen"
            className="font-bold text-ink underline underline-offset-2 hover:text-accent"
          >
            {chunks}
          </Link>
        ),
      })}
    </p>
  );
}

/** Volledige uitnodiging in kaartvorm, voor onderaan een inhoudelijke pagina. */
export function SteunKaart({ className = "" }: { className?: string }) {
  const t = useTranslations("steun");
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-5 rounded-[14px] border border-accent-line bg-accent-soft p-6 ${className}`}
    >
      <div className="max-w-[42em]">
        <h2 className="m-0 flex items-center gap-2 text-[18px] font-bold text-ink">
          <Icon name="coffee" size={19} />
          {t("kaartTitel")}
        </h2>
        <p className="m-0 mt-1.5 text-[14.5px] leading-relaxed text-ink-700">{t("kaartTekst")}</p>
      </div>
      <SteunKnop variant="primair" />
    </div>
  );
}
