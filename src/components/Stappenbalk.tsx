"use client";

/**
 * De voortgangsbalk boven een flow met stappen.
 *
 * Stond eerst als losse markup in de onboardingwizard. De simulator heeft er nu
 * ook een nodig, en twee keer dezelfde balk uitschrijven betekent dat ze na de
 * eerste wijziging uiteenlopen.
 *
 * Eén verschil met het origineel: afgelegde stappen zijn aanklikbaar. Zonder dat
 * is een flow een trechter waarin je alleen vooruit kan, en dan durft niemand een
 * keuze te maken om te kijken wat ze doet. Precies dat proberen is waar een
 * simulator voor bestaat.
 */
export default function Stappenbalk({
  stappen,
  huidige,
  label,
  onGa,
}: {
  stappen: string[];
  /** Nummer van de actieve stap, vanaf 1. */
  huidige: number;
  label: string;
  /** Zonder deze functie zijn de stappen niet aanklikbaar. */
  onGa?: (nummer: number) => void;
}) {
  return (
    <ol className="m-0 flex list-none gap-2 p-0" aria-label={label}>
      {stappen.map((naam, i) => {
        const nummer = i + 1;
        const actief = nummer === huidige;
        const afgelegd = nummer <= huidige;
        // Vooruitspringen naar een stap die nog niet aan bod kwam, kan niet: de
        // volgende stap heeft de keuze van de vorige nodig.
        const bereikbaar = onGa !== undefined && nummer < huidige;

        const inhoud = (
          <>
            <span
              aria-hidden="true"
              className={`block h-[5px] rounded-full transition-colors ${
                afgelegd ? "bg-accent" : "bg-line"
              }`}
            />
            <span
              className={`mt-2 block text-[12.5px] font-bold ${
                actief ? "text-ink" : "text-ink-500"
              }`}
            >
              {naam}
            </span>
          </>
        );

        return (
          <li key={naam} className="min-w-0 flex-1">
            {bereikbaar ? (
              <button
                type="button"
                onClick={() => onGa(nummer)}
                className="block w-full cursor-pointer text-left hover:opacity-75"
              >
                {inhoud}
              </button>
            ) : (
              <span className="block" aria-current={actief ? "step" : undefined}>
                {inhoud}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
