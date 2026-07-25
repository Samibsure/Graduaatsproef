"use client";

import { createContext, useContext } from "react";
import type { Sessie } from "@/lib/rollen";

const SessieContext = createContext<Sessie | null>(null);

/**
 * Maakt de server-side opgehaalde sessie beschikbaar in client components.
 * De layout is een server component en haalt de sessie op bij elke navigatie,
 * dus er is geen aparte client-side fetch nodig.
 */
export function SessieProvider({
  sessie,
  children,
}: {
  sessie: Sessie | null;
  children: React.ReactNode;
}) {
  return <SessieContext.Provider value={sessie}>{children}</SessieContext.Provider>;
}

export function useSessie(): Sessie | null {
  return useContext(SessieContext);
}
