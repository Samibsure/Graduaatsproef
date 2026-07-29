/**
 * De vrijwillige bijdrage.
 *
 * Bewust geen betaalintegratie in de applicatie zelf: dat zou een verwerker,
 * een kassakoppeling en een pak juridische ballast meebrengen voor iets dat
 * niemand hoeft te doen. Er zijn twee kanalen, allebei configuratie:
 *
 * - een externe pagina (Buy Me a Coffee of gelijkaardig), die de bezoeker in
 *   een nieuw tabblad opent;
 * - een gewone overschrijving, waarbij het rekeningnummer alleen getoond
 *   wordt en er dus niets te verwerken valt.
 *
 * Elke waarde is te overschrijven via de omgeving, zodat een rekeningnummer
 * kan wijzigen zonder deployment van nieuwe code. De standaardwaarden staan er
 * wel, om dezelfde reden als bij de Supabase-configuratie: een pagina die om
 * een bijdrage vraagt en vervolgens niet zegt waarheen, is erger dan geen
 * pagina. Het rekeningnummer is sowieso publiek, het staat op de site zelf.
 *
 * Blijft een waarde leeg, dan verdwijnt het bijbehorende kanaal van de pagina
 * en blijven alleen de manieren over om gratis te helpen.
 */
export const STEUN_URL = process.env.NEXT_PUBLIC_DONATIE_URL ?? "";
export const STEUN_IBAN = process.env.NEXT_PUBLIC_DONATIE_IBAN ?? "BE28734065253020";
export const STEUN_BIC = process.env.NEXT_PUBLIC_DONATIE_BIC ?? "KREDBEBB";
export const STEUN_BEGUNSTIGDE = process.env.NEXT_PUBLIC_DONATIE_BEGUNSTIGDE ?? "Sami Elhamdaoui";
export const STEUN_MEDEDELING = process.env.NEXT_PUBLIC_DONATIE_MEDEDELING ?? "Autofiscaliteit";

/** Is er überhaupt een manier om bij te dragen? Zo niet, geen knoppen tonen. */
export const HEEFT_STEUNKANAAL = Boolean(STEUN_URL || STEUN_IBAN);

/** IBAN leest een stuk vlotter in groepjes van vier. */
export function formatteerIban(iban: string): string {
  return iban.replace(/\s+/g, "").replace(/(.{4})/g, "$1 ").trim();
}
