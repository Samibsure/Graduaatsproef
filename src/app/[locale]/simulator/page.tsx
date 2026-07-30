import { Suspense } from "react";
import SimulatorFlow from "@/components/SimulatorFlow";
import { Container, Laadskelet } from "@/components/ui";

/**
 * De simulator zonder account.
 *
 * De publieke pagina's waren tot voor kort uitsluitend informatief: je kon lezen
 * hoe de regels werken, maar niets uitrekenen zonder je eerst te registreren. Voor
 * een gratis product is dat de verkeerde volgorde. Hier reken je één wagen
 * volledig door, en pas wanneer je het resultaat wil bewaren of naast een andere
 * wagen leggen, is een account nodig.
 *
 * De pagina zelf is een schil. Die Suspense is geen sierlijkheid: de layout heeft
 * generateStaticParams, dus deze route wordt per taal geprerenderd, en
 * useSearchParams() zonder boundary laat `next build` falen. Alles wat state,
 * URL of rekenwerk aanraakt, staat in SimulatorFlow.
 */
export default function SimulatorPagina() {
  return (
    <Suspense
      fallback={
        <Container className="py-12">
          <Laadskelet aantal={4} hoogte={120} className="grid gap-4 sm:grid-cols-2" />
        </Container>
      }
    >
      <SimulatorFlow />
    </Suspense>
  );
}
