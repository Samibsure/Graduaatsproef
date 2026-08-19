import { supabase } from "./supabase";
import type { Bedrijfsrol } from "./rollen";

export interface Teamlid {
  id: string;
  volledige_naam: string | null;
  rol: Bedrijfsrol;
}

export interface Uitnodiging {
  id: string;
  email: string;
  rol: Bedrijfsrol;
  /**
   * De sleutel waarmee de uitgenodigde zich aan dit bedrijf koppelt. Alleen wie
   * de uitnodiging beheert leest hem; de RLS-policies beperken de tabel al tot
   * het eigen bedrijf.
   */
  token: string;
  vervalt_op: string;
  aanvaard_op: string | null;
  created_at: string;
}

export async function laadTeam(): Promise<Teamlid[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, volledige_naam, rol")
    .order("created_at");
  if (error) throw new Error(`Team laden mislukt: ${error.message}`);
  return data as Teamlid[];
}

export async function laadUitnodigingen(): Promise<Uitnodiging[]> {
  const { data, error } = await supabase
    .from("uitnodigingen")
    .select("id, email, rol, token, vervalt_op, aanvaard_op, created_at")
    .is("aanvaard_op", null)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Uitnodigingen laden mislukt: ${error.message}`);
  return data as Uitnodiging[];
}

/**
 * De link die de uitgenodigde nodig heeft.
 *
 * Er vertrekt geen mail: de uitnodiging is een rij in de databank en de
 * beheerder stuurt de link zelf door. Het token in die link is wat de koppeling
 * mogelijk maakt. Koppelen op alleen het e-mailadres liet iedereen uitnodigingen
 * planten voor adressen die hij niet bezat, en zo een vreemd bedrijf binnenhalen
 * zodra iemand van dat bedrijf zich registreerde (migratie 0014).
 */
export function uitnodigingslink(token: string, basis: string): string {
  return `${basis.replace(/\/$/, "")}/registreren?uitnodiging=${encodeURIComponent(token)}`;
}

/**
 * Nodigt een collega uit. Het bedrijf komt uit de sessie (kolomdefault in de
 * database) en het token uit een kolomdefault; registreert die persoon zich
 * later met dit e-mailadres én dit token, dan koppelt de trigger
 * handle_new_user hem aan dit bedrijf.
 */
export async function nodigUit(email: string, rol: Bedrijfsrol = "lid"): Promise<void> {
  const { error } = await supabase
    .from("uitnodigingen")
    .insert({ email: email.trim().toLowerCase(), rol });
  if (error) {
    throw new Error(
      error.code === "23505"
        ? "Er staat al een uitnodiging open voor dit e-mailadres."
        : `Uitnodigen mislukt: ${error.message}`,
    );
  }
}

export async function trekUitnodigingIn(id: string): Promise<void> {
  // .select() zoals overal elders: RLS weigert een verwijdering zonder rechten
  // niet met een fout, ze raakt gewoon nul rijen. Zonder deze controle meldt de
  // interface dat de uitnodiging is ingetrokken terwijl ze blijft openstaan.
  const { data, error } = await supabase
    .from("uitnodigingen")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) throw new Error(`Uitnodiging intrekken mislukt: ${error.message}`);
  if (!data?.length) {
    throw new Error("Uitnodiging intrekken mislukt: geen rechten of niet gevonden.");
  }
}

export async function verwijderTeamlid(id: string): Promise<void> {
  const { data, error } = await supabase.from("profiles").delete().eq("id", id).select("id");
  if (error) throw new Error(`Teamlid verwijderen mislukt: ${error.message}`);
  if (!data?.length) throw new Error("Teamlid verwijderen mislukt: geen rechten of niet gevonden.");
}

/** Recht op wissing (AVG art. 17): verwijdert het bedrijf en alle gegevens. */
export async function verwijderMijnBedrijf(): Promise<void> {
  const { error } = await supabase.rpc("verwijder_mijn_bedrijf");
  if (error) throw new Error(`Verwijderen mislukt: ${error.message}`);
}

/**
 * Het bewaren van de bedrijfsgegevens is verhuisd naar src/lib/bedrijf.ts, waar
 * het hele profiel (adres, BTW, KMO-status, boekjaar) samen behandeld en
 * gevalideerd wordt. Zie bewaarBedrijfsprofiel().
 */
