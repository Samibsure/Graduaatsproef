import Link from "next/link";
import { Artikel, JuridischePagina, Lijst } from "@/components/Juridisch";

export const metadata = {
  title: "Gebruiksvoorwaarden",
  description:
    "De afspraken rond het gebruik van Autofiscaliteit: gratis, zonder garantie, en geen vervanging van fiscaal advies.",
};

export default function VoorwaardenPagina() {
  return (
    <JuridischePagina
      eyebrow="Juridisch"
      titel="Gebruiksvoorwaarden"
      intro="Kort en zonder omwegen: wat je van Autofiscaliteit mag verwachten, en wat niet."
      bijgewerkt="25 juli 2026"
    >
      <Artikel titel="Dit is geen fiscaal advies">
        <p>
          Autofiscaliteit is een rekeninstrument. Het past de fiscale regels toe op de cijfers die
          jij invoert, en toont het resultaat. Het kent jouw dossier niet: niet je
          vennootschapsstructuur, niet je bestaande afspraken met de leasemaatschappij, niet de
          uitzonderingen die op jou van toepassing kunnen zijn.
        </p>
        <p>
          <strong>
            Neem geen aankoop- of leasebeslissing op basis van deze tool alleen. Leg het resultaat
            voor aan je boekhouder of belastingadviseur.
          </strong>
        </p>
      </Artikel>

      <Artikel titel="Gratis, zoals ze is">
        <p>
          Het gebruik is kosteloos en er is geen betaalde versie. Daar staat tegenover dat de dienst
          wordt aangeboden &ldquo;zoals ze is&rdquo;: we beloven geen ononderbroken beschikbaarheid,
          geen bewaartermijn en geen ondersteuning binnen een bepaalde termijn.
        </p>
        <p>
          De dienst kan gewijzigd of stopgezet worden. Gebeurt dat, dan verwittigen we
          geregistreerde gebruikers vooraf per e-mail, zodat je je gegevens kan overnemen.
        </p>
      </Artikel>

      <Artikel titel="De cijfers achter de berekening">
        <p>
          De fiscale parameters volgen de federale regelgeving zoals ze gekend was bij de laatste
          bijwerking, te raadplegen op de pagina{" "}
          <Link href="/parameters" className="font-medium text-ink underline underline-offset-2">
            parameters
          </Link>
          . Wetgeving verandert, en soms met terugwerkende kracht. Controleer bij een belangrijke
          beslissing altijd of de gehanteerde cijfers nog actueel zijn.
        </p>
        <p>
          De cataloguswaarden en CO₂-cijfers in de wagencatalogus zijn indicatieve richtwaarden die
          per uitvoering en optie verschillen. Gebruik voor een echte beslissing de cijfers van je
          eigen offerte.
        </p>
      </Artikel>

      <Artikel titel="Je account">
        <Lijst
          items={[
            "Je bent zelf verantwoordelijk voor je wachtwoord en voor wie je in je bedrijf uitnodigt. Wie je uitnodigt, ziet alle wagens en beslissingen van je bedrijf.",
            "Vul alleen gegevens in waarover je mag beschikken. Voer je persoonsgegevens van werknemers in, dan is dat jouw keuze en jouw verantwoordelijkheid — ze zijn niet nodig voor de berekening.",
            "Geen geautomatiseerd uitlezen van de site, en geen pogingen om de afscherming tussen bedrijven te omzeilen.",
          ]}
        />
      </Artikel>

      <Artikel titel="Verwerking van gegevens in jouw opdracht">
        <p>
          Voer je gegevens in die betrekking hebben op identificeerbare personen, dan treden wij
          daarvoor op als verwerker in jouw opdracht. Wij verwerken die gegevens uitsluitend om de
          dienst aan jou te leveren, geven ze niet door aan derden buiten onze hostingleveranciers
          binnen de EU, en verwijderen ze zodra je je bedrijf verwijdert. Deze bepaling geldt als
          verwerkersovereenkomst in de zin van artikel 28 AVG. De details staan in het{" "}
          <Link href="/privacy" className="font-medium text-ink underline underline-offset-2">
            privacybeleid
          </Link>
          .
        </p>
      </Artikel>

      <Artikel titel="Aansprakelijkheid">
        <p>
          Voor een kosteloze dienst is onze aansprakelijkheid beperkt tot wat de Belgische wet
          toelaat. We zijn niet aansprakelijk voor beslissingen die je op basis van de berekening
          neemt, noch voor gevolgschade zoals gemiste besparingen of extra belasting.
        </p>
        <p>
          Wat wij <em>niet</em> uitsluiten, omdat dat wettelijk niet kan: aansprakelijkheid voor
          bedrog, opzettelijke fout en zware fout, en voor schade aan leven of gezondheid.
        </p>
      </Artikel>

      <Artikel titel="Toepasselijk recht">
        <p>
          Op deze voorwaarden is het Belgisch recht van toepassing. Geschillen worden behandeld door
          de bevoegde rechtbanken in België.
        </p>
      </Artikel>
    </JuridischePagina>
  );
}
