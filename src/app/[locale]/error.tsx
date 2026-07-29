"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Button, Container, knopKlassen } from "@/components/ui";
import { FEEDBACK_EMAIL } from "@/lib/feedback";

export default function Foutpagina({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("fouten");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Container className="py-24">
      <div className="mx-auto max-w-[34em] text-center">
        <p className="m-0 text-[13px] font-bold uppercase tracking-[0.16em] text-danger">
          {t("foutLabel")}
        </p>
        <h1 className="mt-3 text-[clamp(28px,4vw,40px)] font-bold tracking-[-0.02em] text-ink">
          {t("foutTitel")}
        </h1>
        <p className="mt-3 text-[16.5px] leading-relaxed text-ink-700">
          {t("foutTekst", { email: FEEDBACK_EMAIL })}
        </p>
        {error.digest && (
          <p className="mt-2 text-[13px] text-ink-500">
            {t("referentie", { digest: error.digest })}
          </p>
        )}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button onClick={reset}>{t("opnieuw")}</Button>
          {/*
            Het adres stond hier als platte tekst in een alinea, niet eens als
            link. Op precies de pagina waar iemand een fout ziet, hoort melden
            één klik te zijn. De feedbackknop zelf leeft in de layout en is hier
            niet beschikbaar: deze pagina vervangt de inhoud, niet de schil,
            maar een crash kan ook de knop meeslepen.
          */}
          <a
            href={`mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(t("foutTitel"))}${
              error.digest ? `&body=${encodeURIComponent(t("referentie", { digest: error.digest }))}` : ""
            }`}
            className={knopKlassen("stil", "md")}
          >
            {t("meldFout")}
          </a>
        </div>
      </div>
    </Container>
  );
}
