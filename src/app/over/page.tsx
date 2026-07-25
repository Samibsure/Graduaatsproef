import Link from "next/link";
import { Logomerk } from "@/components/Brand";
import { Badge, Card } from "@/components/ui";

export const metadata = {
  title: "Over",
  description:
    "Autofiscaliteit is gemaakt door Sami Elhamdaoui en groeide uit zijn eindwerk over de impact van autokosten op verworpen uitgaven. Gratis beschikbaar voor elk Belgisch bedrijf.",
};

export default function OverPagina() {
  return (
    <div className="mx-auto max-w-[1100px] space-y-8 px-6 py-12">
      <section className="bg-ink-gradient relative overflow-hidden rounded-3xl px-6 py-10 text-white sm:px-10">
        <div className="absolute -right-8 -top-8 opacity-20">
          <Logomerk size={150} />
        </div>
        <div className="relative max-w-3xl">
          <Badge tint="gold">Over deze tool</Badge>
          <h1 className="mt-4 text-3xl font-bold tracking-tight">Gemaakt door Sami Elhamdaoui</h1>
          <p className="mt-4 leading-relaxed text-white/80">
            Autofiscaliteit begon als het praktische luik van mijn eindwerk over de impact van
            autokosten op verworpen uitgaven. Wat startte als een rekenoefening voor één kantoor,
            staat nu gratis online voor elk bedrijf in België.
          </p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Wie</p>
          <p className="mt-1 font-semibold text-ink">Sami Elhamdaoui</p>
          <p className="text-sm text-ink-500">Accounting Administration</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
            Waar het vandaan komt
          </p>
          <p className="mt-1 font-semibold text-ink">Een eindwerk</p>
          <p className="text-sm text-ink-500">Academiejaar 2025-2026</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Wat het kost</p>
          <p className="mt-1 font-semibold text-ink">Niets</p>
          <p className="text-sm text-ink-500">Geen abonnement, geen limieten</p>
        </Card>
      </section>

      <Card className="p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-ink">Het verhaal erachter</h2>
        <div className="mt-3 space-y-4 text-sm leading-relaxed text-ink-700">
          <p>
            Op het accountantskantoor waar ik mijn opleiding in de praktijk bracht, kwam telkens
            dezelfde vraag terug: welke wagen kopen of leasen we nu eigenlijk? Een groot deel van de
            wagenparken loopt af tussen 2026 en 2028, net op het moment dat de fiscale spelregels
            grondig veranderen.
          </p>
          <p>
            Vanaf 2026 gaat de aftrekbaarheid van nieuwe verbrandingswagens in de
            vennootschapsbelasting naar nul, terwijl elektrische wagens besteld vóór 2027 hun
            volledige aftrek behouden. Tegelijk stijgen de CO₂-solidariteitsbijdrage en de
            minimumbezoldiging voor het verlaagd KMO-tarief. De échte kost van een bedrijfswagen is
            daardoor een rekenoefening met heel wat variabelen geworden — één waar je makkelijk
            duizenden euro&apos;s naast zit als je ze op gevoel maakt.
          </p>
          <p>
            Voor mijn eindwerk bouwde ik die oefening uit tot een instrument: de formules uit de
            wetgeving, de aftrekkalender, het voordeel van alle aard, de verworpen uitgaven en de
            RSZ-bijdrage, samengebracht in één berekening met een onderbouwd advies.
          </p>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-ink">Waarom het gratis is</h2>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-ink-700">
            <p>
              De cijfers waarmee deze tool rekent zijn openbaar: ze staan in de wet, in circulaires
              en in de instructies van de RSZ. Wat ontbrak was niet de informatie, maar het geduld
              om ze correct samen te leggen.
            </p>
            <p>
              Een kleine onderneming heeft daar zelden een adviseur voor, en betaalt daardoor vaak
              het meest. Daarom is Autofiscaliteit gratis, zonder limiet op het aantal wagens en
              zonder betaalde versie. Vind je het nuttig, vertel het dan gerust door.
            </p>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-ink">Wat de tool doet</h2>
          <ul className="mt-3 space-y-2 text-sm text-ink-700">
            <li>
              <span className="font-medium text-ink">Wagencatalogus</span>: de bekendste
              bedrijfswagens met directe fiscale preview.
            </li>
            <li>
              <span className="font-medium text-ink">Mijn wagens</span>: je eigen vloot en
              kandidaten, met de volledige berekening van aftrek, VAA, verworpen uitgaven en RSZ.
            </li>
            <li>
              <span className="font-medium text-ink">Vergelijking</span>: een scoringsmatrix met zes
              gewogen criteria en een advies per kandidaat.
            </li>
            <li>
              <span className="font-medium text-ink">Fiscaal kader</span>: de regels achter de
              berekening, in gewone taal.
            </li>
          </ul>
          <Link
            href="/registreren"
            className="mt-5 inline-block rounded-xl bg-gold px-4 py-2 text-sm font-semibold text-white hover:bg-gold-hover"
          >
            Gratis starten →
          </Link>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-ink">Contact en verantwoordelijke uitgever</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-700">
          Autofiscaliteit wordt uitgegeven door Sami Elhamdaoui, België. Vragen, een fout in de
          berekening of een suggestie? Stuur gerust een bericht naar{" "}
          <a
            href="mailto:contact@autofiscaliteit.com"
            className="font-medium text-ink underline underline-offset-2"
          >
            contact@autofiscaliteit.com
          </a>
          .
        </p>
        <p className="mt-3 text-sm leading-relaxed text-ink-700">
          Hoe er met je gegevens wordt omgegaan lees je in het{" "}
          <Link href="/privacy" className="font-medium text-ink underline underline-offset-2">
            privacybeleid
          </Link>
          ; de afspraken rond het gebruik staan in de{" "}
          <Link href="/voorwaarden" className="font-medium text-ink underline underline-offset-2">
            gebruiksvoorwaarden
          </Link>
          .
        </p>
      </Card>
    </div>
  );
}
