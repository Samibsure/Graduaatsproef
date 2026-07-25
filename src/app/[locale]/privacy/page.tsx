import Link from "next/link";
import { Artikel, JuridischePagina, Lijst } from "@/components/Juridisch";

export const metadata = {
  title: "Privacybeleid",
  description:
    "Welke gegevens Autofiscaliteit verwerkt, waarom, waar ze staan en hoe je ze laat verwijderen.",
};

export default function PrivacyPagina() {
  return (
    <JuridischePagina
      eyebrow="Juridisch"
      titel="Privacybeleid"
      intro="Autofiscaliteit verwerkt zo weinig persoonsgegevens als mogelijk. Hier staat precies welke, waarom, en wat je rechten zijn."
      bijgewerkt="25 juli 2026"
    >
      <Artikel titel="Wie is verantwoordelijk">
        <p>
          Autofiscaliteit wordt uitgegeven door Sami Elhamdaoui, België. Voor alles wat met je
          gegevens te maken heeft, kan je terecht op{" "}
          <a
            href="mailto:contact@autofiscaliteit.com"
            className="font-medium text-ink underline underline-offset-2"
          >
            contact@autofiscaliteit.com
          </a>
          .
        </p>
      </Artikel>

      <Artikel titel="Twee soorten gegevens, twee rollen">
        <p>
          Het onderscheid is belangrijk voor je rechten, daarom staat het vooraan.
        </p>
        <p>
          <strong>Je accountgegevens</strong> — je e-mailadres, je naam, je bedrijfsnaam en
          eventueel je ondernemingsnummer — verwerken wij als verwerkingsverantwoordelijke. Zonder
          die gegevens kan je niet aanmelden en kunnen we je bedrijf niet van andere bedrijven
          onderscheiden.
        </p>
        <p>
          <strong>De gegevens die je zelf invoert over je wagenpark</strong> verwerken wij als
          verwerker, in opdracht van jouw bedrijf. Jouw bedrijf bepaalt wat er ingevuld wordt en
          blijft daarvoor verantwoordelijk. Wij gebruiken die gegevens uitsluitend om de berekening
          te tonen aan de gebruikers van jouw bedrijf — nooit voor iets anders, en nooit om ze aan
          derden te verstrekken.
        </p>
      </Artikel>

      <Artikel titel="Let op bij werknemersnamen en nummerplaten">
        <p>
          Het wagenformulier bevat een veld <em>werknemer</em> en een veld <em>kenteken</em>. Beide
          zijn persoonsgegevens, en beide zijn <strong>volledig optioneel</strong>: de berekening
          werkt exact hetzelfde als je ze leeg laat of er een interne code invult zoals
          &ldquo;wagen 3&rdquo;.
        </p>
        <p>
          Onze aanbeveling is dan ook om ze niet in te vullen. Geen persoonsgegevens verzamelen is
          eenvoudiger dan ze beschermen.
        </p>
      </Artikel>

      <Artikel titel="Welke gegevens we verwerken">
        <Lijst
          items={[
            <>
              <strong>Account</strong>: e-mailadres, naam, wachtwoord (versleuteld opgeslagen, wij
              kunnen het niet lezen).
            </>,
            <>
              <strong>Bedrijf</strong>: bedrijfsnaam, eventueel ondernemingsnummer, en welke
              gebruikers erbij horen.
            </>,
            <>
              <strong>Wagenpark</strong>: de technische en financiële gegevens die je zelf invult,
              plus de optionele velden hierboven.
            </>,
            <>
              <strong>Bewaarde vergelijkingen</strong>: de titel, de notitie en het resultaat van
              beslissingen die je bewaart.
            </>,
            <>
              <strong>Technisch</strong>: de sessiecookie die je aangemeld houdt, en de
              standaard serverlogs van onze hostingproviders.
            </>,
          ]}
        />
      </Artikel>

      <Artikel titel="Waar je gegevens staan">
        <p>
          De applicatie draait op Vercel en de database bij Supabase. Wij kiezen bewust voor
          opslag binnen de Europese Unie. Beide leveranciers treden op als subverwerker en zijn
          contractueel gebonden aan de AVG.
        </p>
        <p>
          Er zijn geen andere ontvangers. We verkopen geen gegevens, we delen ze niet met
          adverteerders, en er is geen advertentie- of trackingnetwerk in de applicatie ingebouwd.
        </p>
      </Artikel>

      <Artikel titel="Cookies">
        <p>
          Autofiscaliteit plaatst alleen de cookies die nodig zijn om je aangemeld te houden. Er
          zijn geen analyse-, advertentie- of trackingcookies. Daarom zie je hier ook geen
          cookiebanner: voor strikt noodzakelijke cookies is geen toestemming vereist.
        </p>
      </Artikel>

      <Artikel titel="Hoe lang we bewaren">
        <p>
          Zolang je account bestaat. Verwijder je je bedrijf, dan worden het bedrijf, alle
          gebruikersaccounts, alle wagens en alle bewaarde beslissingen onmiddellijk en definitief
          verwijderd. Back-ups van onze leveranciers verdwijnen binnen dertig dagen.
        </p>
      </Artikel>

      <Artikel titel="Je rechten">
        <p>
          Je hebt recht op inzage, correctie, verwijdering, beperking en overdraagbaarheid van je
          gegevens, en je kan bezwaar maken tegen de verwerking.
        </p>
        <p>
          Twee daarvan kan je meteen zelf uitoefenen, zonder ons iets te vragen:{" "}
          <Link href="/instellingen" className="font-medium text-ink underline underline-offset-2">
            in je instellingen
          </Link>{" "}
          pas je je bedrijfsgegevens aan en verwijder je je bedrijf met alle gegevens erin. Voor de
          rest volstaat een bericht.
        </p>
        <p>
          Ben je het oneens met hoe wij met je gegevens omgaan, dan kan je klacht indienen bij de
          Gegevensbeschermingsautoriteit, Drukpersstraat 35, 1000 Brussel.
        </p>
      </Artikel>

      <Artikel titel="Beveiliging">
        <p>
          Elk bedrijf ziet uitsluitend zijn eigen gegevens. Die scheiding zit niet in de website
          maar in de database zelf: elke opvraging wordt daar afgedwongen op het bedrijf uit je
          sessie. Verkeer verloopt uitsluitend over HTTPS en wachtwoorden worden gehasht opgeslagen.
        </p>
        <p>
          Merk je toch een beveiligingsprobleem op, laat het ons dan weten voordat je het publiek
          maakt. We zijn je dankbaar.
        </p>
      </Artikel>
    </JuridischePagina>
  );
}
