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
 * De waarden staan in de omgeving en niet in de broncode: zo blijft een
 * rekeningnummer buiten de repository en kan het wijzigen zonder deployment
 * van nieuwe code. Staat er niets ingevuld, dan blijft de pagina bestaan maar
 * toont ze enkel de manieren om gratis te helpen.
 */
export const STEUN_URL = process.env.NEXT_PUBLIC_DONATIE_URL ?? "";
export const STEUN_IBAN = process.env.NEXT_PUBLIC_DONATIE_IBAN ?? "";
export const STEUN_BEGUNSTIGDE = process.env.NEXT_PUBLIC_DONATIE_BEGUNSTIGDE ?? "";
export const STEUN_MEDEDELING = process.env.NEXT_PUBLIC_DONATIE_MEDEDELING ?? "Autofiscaliteit";

/** Is er überhaupt een manier om bij te dragen? Zo niet, geen knoppen tonen. */
export const HEEFT_STEUNKANAAL = Boolean(STEUN_URL || STEUN_IBAN);

/** IBAN leest een stuk vlotter in groepjes van vier. */
export function formatteerIban(iban: string): string {
  return iban.replace(/\s+/g, "").replace(/(.{4})/g, "$1 ").trim();
}
