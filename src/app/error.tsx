"use client";

import { useEffect } from "react";
import { Container } from "@/components/ui";

export default function Foutpagina({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Container className="py-24">
      <div className="mx-auto max-w-[34em] text-center">
        <p className="m-0 text-[13px] font-bold uppercase tracking-[0.16em] text-danger">Fout</p>
        <h1 className="mt-3 text-[clamp(28px,4vw,40px)] font-bold tracking-[-0.02em] text-ink">
          Er liep iets mis
        </h1>
        <p className="mt-3 text-[16.5px] leading-relaxed text-ink-700">
          De pagina kon niet geladen worden. Probeer het opnieuw; blijft het misgaan, laat het ons
          dan weten via contact@autofiscaliteit.com.
        </p>
        {error.digest && (
          <p className="mt-2 text-[13px] text-ink-500">Referentie: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="mt-8 inline-flex h-[46px] items-center rounded-[11px] bg-ink px-6 text-[15px] font-bold text-white hover:bg-ink-600"
        >
          Opnieuw proberen
        </button>
      </div>
    </Container>
  );
}
