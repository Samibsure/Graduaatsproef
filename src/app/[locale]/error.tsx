"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Container } from "@/components/ui";

const CONTACT = "contact@autofiscaliteit.com";

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
          {t("foutTekst", { email: CONTACT })}
        </p>
        {error.digest && (
          <p className="mt-2 text-[13px] text-ink-500">
            {t("referentie", { digest: error.digest })}
          </p>
        )}
        <button
          onClick={reset}
          className="mt-8 inline-flex h-[46px] items-center rounded-[11px] bg-ink px-6 text-[15px] font-bold text-white hover:bg-ink-600"
        >
          {t("opnieuw")}
        </button>
      </div>
    </Container>
  );
}
