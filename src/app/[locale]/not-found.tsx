import { useTranslations } from "next-intl";
import { Container } from "@/components/ui";
import { Link } from "@/i18n/navigation";

export default function NietGevonden() {
  const t = useTranslations("fouten");

  return (
    <Container className="py-24">
      <div className="mx-auto max-w-[34em] text-center">
        <p className="m-0 text-[13px] font-bold uppercase tracking-[0.16em] text-gold">404</p>
        <h1 className="mt-3 text-[clamp(28px,4vw,40px)] font-bold tracking-[-0.02em] text-ink">
          {t("nietGevondenTitel")}
        </h1>
        <p className="mt-3 text-[16.5px] leading-relaxed text-ink-700">{t("nietGevondenTekst")}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="inline-flex h-[46px] items-center rounded-[11px] bg-ink px-6 text-[15px] font-bold text-white hover:bg-ink-600"
          >
            {t("naarDashboard")}
          </Link>
          <Link
            href="/catalogus"
            className="inline-flex h-[46px] items-center rounded-[11px] border-[1.5px] border-line px-6 text-[15px] font-bold text-ink hover:bg-paper"
          >
            {t("bekijkCatalogus")}
          </Link>
        </div>
      </div>
    </Container>
  );
}
