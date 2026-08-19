"use client";

/**
 * Het vangnet onder de root-layout.
 *
 * `[locale]/error.tsx` vangt een fout binnen een pagina, maar niet een fout in
 * de layout zelf: die vervangt de hele boom, inclusief de vertalingen. Zonder
 * dit bestand valt de bezoeker dan terug op de kale foutpagina van Next.js,
 * zonder huisstijl en zonder een manier om het te melden.
 *
 * Daarom staat de tekst hier hardgecodeerd en drietalig: als de layout stuk is,
 * is next-intl er niet meer om iets te vertalen, en een lege pagina is erger dan
 * drie korte regels.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="nl">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          background: "#f7f8fa",
          color: "#0b1f33",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ maxWidth: "34em", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.75rem", margin: "0 0 0.75rem", letterSpacing: "-0.02em" }}>
            Er ging iets mis
          </h1>
          <p style={{ margin: "0 0 0.25rem", lineHeight: 1.6 }}>
            Probeer het opnieuw. Blijft het misgaan, laat het ons weten via{" "}
            <a href="mailto:info@ekoonict.com" style={{ color: "#0f766e" }}>
              info@ekoonict.com
            </a>
            .
          </p>
          <p style={{ margin: "0 0 0.25rem", lineHeight: 1.6, color: "#5c6b7a" }}>
            Une erreur est survenue. Réessayez, ou signalez-le nous.
          </p>
          <p style={{ margin: "0 0 1.75rem", lineHeight: 1.6, color: "#5c6b7a" }}>
            Something went wrong. Try again, or let us know.
          </p>
          {error.digest && (
            <p style={{ margin: "0 0 1.75rem", fontSize: "0.8rem", color: "#5c6b7a" }}>
              Referentie: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              height: "46px",
              padding: "0 1.5rem",
              borderRadius: "11px",
              border: "none",
              background: "#0b1f33",
              color: "#fff",
              fontSize: "0.95rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Opnieuw proberen
          </button>
        </div>
      </body>
    </html>
  );
}
