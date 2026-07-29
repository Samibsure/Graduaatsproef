import { useTranslations } from "next-intl";
import Icon from "@/components/Icon";
import { Link } from "@/i18n/navigation";

/**
 * De vrijwillige bijdrage komt op enkele plaatsen terug, telkens met dezelfde
 * toon: zichtbaar, maar nooit in de weg. Alles wijst naar één pagina
 * (/steunen), zodat de knop nergens een betaalstroom start die de bezoeker
 * niet verwacht.
 */

type Variant = "gold" | "outline" | "donker";

const stijl: Record<Variant, string> = {
  gold: "bg-gold text-white hover:bg-gold-hover border-[1.5px] border-transparent",
  outline: "border-[1.5px] border-line bg-white text-ink hover:border-ink hover:bg-paper",
  donker:
    "border border-white/[0.16] text-white/[0.78] hover:border-white/[0.32] hover:text-white",
};

export function SteunKnop({
  variant = "outline",
  className = "",
}: {
  variant?: Variant;
  className?: string;
}) {
  const t = useTranslations("steun");
  return (
    <Link
      href="/steunen"
      className={`inline-flex items-center gap-2 rounded-[11px] px-5 py-2.5 text-[14.5px] font-bold transition-colors ${stijl[variant]} ${className}`}
    >
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
          <Link href="/steunen" className="font-bold text-ink underline underline-offset-2 hover:text-gold">
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
      className={`flex flex-wrap items-center justify-between gap-5 rounded-[14px] border border-gold-line bg-gold-soft p-6 ${className}`}
    >
      <div className="max-w-[42em]">
        <h2 className="m-0 flex items-center gap-2 text-[18px] font-bold text-ink">
          <Icon name="coffee" size={19} />
          {t("kaartTitel")}
        </h2>
        <p className="m-0 mt-1.5 text-[14.5px] leading-relaxed text-ink-700">{t("kaartTekst")}</p>
      </div>
      <SteunKnop variant="gold" />
    </div>
  );
}
