import { supabase } from "./supabase";
import type { Bedrijfsrol } from "./sessie";

export interface Teamlid {
  id: string;
  volledige_naam: string | null;
  rol: Bedrijfsrol;
}

export interface Uitnodiging {
  id: string;
  email: string;
  rol: Bedrijfsrol;
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
    .select("id, email, rol, vervalt_op, aanvaard_op, created_at")
    .is("aanvaard_op", null)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Uitnodigingen laden mislukt: ${error.message}`);
  return data as Uitnodiging[];
}

/**
 * Nodigt een collega uit. Het bedrijf komt uit de sessie (kolomdefault in de
 * database); registreert die persoon zich later met dit e-mailadres, dan
 * koppelt de trigger handle_new_user hem automatisch aan dit bedrijf.
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
  const { error } = await supabase.from("uitnodigingen").delete().eq("id", id);
  if (error) throw new Error(`Uitnodiging intrekken mislukt: ${error.message}`);
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

export async function bewaarBedrijf(naam: string, ondernemingsnummer: string): Promise<void> {
  const { data, error } = await supabase
    .from("companies")
    .update({ naam: naam.trim(), ondernemingsnummer: ondernemingsnummer.trim() || null })
    .neq("id", "00000000-0000-0000-0000-000000000000")
    .select("id");
  if (error) throw new Error(`Bedrijf bewaren mislukt: ${error.message}`);
  if (!data?.length) throw new Error("Bedrijf bewaren mislukt: alleen een beheerder kan dit.");
}
