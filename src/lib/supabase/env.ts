import { STANDAARD_SLEUTEL, STANDAARD_URL } from "./envnamen";

/**
 * De Supabase-configuratie voor zowel de browser- als de serverclient.
 *
 * De volgorde is: wat de omgeving aanlevert wint, anders het publieke project
 * van Autofiscaliteit (zie ./envnamen.ts). next.config.ts vult deze twee namen
 * al aan de hand van de alternatieven die hostingintegraties gebruiken, dus in
 * de praktijk staat hier altijd een waarde.
 *
 * De publishable key is niet geheim; die wordt naar elke browser gestuurd. De
 * eigenlijke afscherming gebeurt door de RLS-policies in de database.
 */
export function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || STANDAARD_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || STANDAARD_SLEUTEL;

  return { url, key };
}

/**
 * Draait deze omgeving op de terugval in plaats van op eigen configuratie?
 *
 * De terugval bestaat zodat een build nooit struikelt over een ontbrekende
 * variabele; de site plat leggen weegt zwaarder dan een publieke sleutel in de
 * broncode. Maar ze wijst naar het productieproject, en dat betekent dat een
 * `npm run dev` zonder .env.local en elke preview-deployment zonder variabelen
 * rechtstreeks in de échte databank schrijven -- tussen de gegevens van echte
 * bedrijven, zonder dat iets op het scherm dat verraadt.
 *
 * Deze functie maakt dat zichtbaar in plaats van het te verbieden. Weigeren zou
 * betekenen dat een vergeten variabele op Vercel de site plat legt, en dat was
 * precies de reden waarom de terugval er kwam.
 */
export function draaitOpTerugval(): boolean {
  return !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}
