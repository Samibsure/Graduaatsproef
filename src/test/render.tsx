import { NextIntlClientProvider } from "next-intl";
import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import berichten from "../../messages/nl.json";

/**
 * Renderen met de echte Nederlandse teksten eromheen.
 *
 * Bewust de echte messages/nl.json en geen verzonnen woordenboek: zo betrapt een
 * componenttest ook een sleutel die niet bestaat. Zonder provider gooit
 * next-intl bij elke `t()`, waardoor elke test over de opmaak zou struikelen op
 * de vertaling.
 */
export function rendermetIntl(
  ui: ReactElement,
  opties?: Omit<RenderOptions, "wrapper">,
) {
  function Schil({ children }: { children: ReactNode }) {
    return (
      <NextIntlClientProvider locale="nl" messages={berichten} timeZone="Europe/Brussels">
        {children}
      </NextIntlClientProvider>
    );
  }
  return render(ui, { wrapper: Schil, ...opties });
}
