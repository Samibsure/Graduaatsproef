import Link from "next/link";
import { Badge, Card, SectionTitle } from "@/components/ui";

export const metadata = {
  title: "Handleiding · B-sure × PXL Autofiscaliteit-tool",
};

const stappen = [
  {
    n: "1",
    titel: "Verken de wagencatalogus",
    tekst:
      "Open ‘Wagencatalogus’. Je ziet de 25 bekendste bedrijfswagens in België, met per model meteen de fiscale impact voor 2026: aftrekbaarheid, voordeel van alle aard (VAA), verworpen uitgaven en de RSZ-bijdrage. Filter bovenaan op aandrijving (elektrisch, plug-in hybride, hybride, diesel/benzine).",
    link: { href: "/catalogus", label: "Open de catalogus" },
  },
  {
    n: "2",
    titel: "Voeg kandidaten toe",
    tekst:
      "Klik bij een model op ‘Voeg toe als kandidaat’. De wagen verschijnt dan bij ‘Mijn wagens’, met realistische standaardwaarden. Heb je een concrete offerte? Pas bij ‘Mijn wagens’ de besteldatum, de jaarlijkse autokosten en het beleid (tank-/laadkaart, thuislaadpunt) aan zodat alles klopt met de werkelijkheid.",
    link: { href: "/wagens", label: "Beheer mijn wagens" },
  },
  {
    n: "3",
    titel: "Vergelijk maximaal drie wagens",
    tekst:
      "Ga naar ‘Vergelijking’ en selecteer tot drie kandidaten. De tool toont een volledige fiscale vergelijking over vier gebruiksjaren (inclusief de uitdoofkalender) en berekent de scoringsmatrix met zes gewogen criteria. Je kan het eerste gebruiksjaar kiezen en het verlaagd KMO-tarief aanzetten.",
    link: { href: "/vergelijking", label: "Start een vergelijking" },
  },
  {
    n: "4",
    titel: "Lees het advies en bewaar de beslissing",
    tekst:
      "Onderaan krijgt elke kandidaat een eindscore op 10 en een advies: aanvaarden (≥ 7), overwegen (4–7) of afwijzen (< 4). Geef de vergelijking een titel en een korte motivering en klik ‘Bewaar beslissing’. Ze komt in de beslissingshistoriek terecht, handig als onderbouwing voor de directievergadering.",
    link: { href: "/vergelijking", label: "Naar het scoredashboard" },
  },
  {
    n: "5",
    titel: "Houd de parameters actueel",
    tekst:
      "Eén keer per jaar, na het federale begrotingsakkoord, werk je bij ‘Parameters’ de fiscale waarden bij (minimum VAA, referentie-CO₂, RSZ-index en -multiplicatoren, aftrekkalender). Met ‘Herstel standaardwaarden’ zet je alles terug naar de cijfers uit het rapport (toestand mei 2026).",
    link: { href: "/parameters", label: "Bekijk de parameters" },
  },
];

export default function HandleidingPagina() {
  return (
    <div className="space-y-8">
      <section className="bg-ink-gradient rounded-3xl px-6 py-10 text-white sm:px-10">
        <Badge tint="gold">Handleiding</Badge>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Zo gebruik je de tool</h1>
        <p className="mt-3 max-w-2xl text-white/80">
          Een praktische gids in vijf stappen. Bedoeld voor de directie van B-sure en voor wie de
          tool voor het eerst opent: geen voorkennis van fiscaliteit nodig.
        </p>
      </section>

      <ol className="space-y-4">
        {stappen.map((s) => (
          <li key={s.n}>
            <Card className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-lg font-bold text-white">
                {s.n}
              </span>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-ink">{s.titel}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{s.tekst}</p>
                <Link href={s.link.href} className="mt-3 inline-block text-sm font-medium text-ink hover:text-gold">
                  {s.link.label} →
                </Link>
              </div>
            </Card>
          </li>
        ))}
      </ol>

      <Card className="p-6">
        <SectionTitle sub="Termen die je in de tool tegenkomt, kort uitgelegd.">Woordenlijst</SectionTitle>
        <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
          {[
            ["VAA (voordeel van alle aard)", "De belastbare waarde van het privégebruik van een bedrijfswagen voor de werknemer."],
            ["Verworpen uitgaven", "Kosten die de vennootschap boekt maar fiscaal niet (volledig) mag aftrekken; ze verhogen de belastbare winst."],
            ["Aftrekbaarheid VenB", "Het percentage van de autokosten dat aftrekbaar is in de vennootschapsbelasting."],
            ["RSZ CO₂-bijdrage", "Maandelijkse solidariteitsbijdrage die de werkgever betaalt per wagen met privégebruik."],
            ["TCO", "Total Cost of Ownership: de totale gebruikskost over de looptijd (hier vier jaar)."],
            ["Uitdoofkalender", "Het afbouwpad waarbij de aftrek van fossiele wagens en PHEV’s daalt naar 0%."],
          ].map(([term, uitleg]) => (
            <div key={term}>
              <dt className="font-semibold text-ink">{term}</dt>
              <dd className="text-slate-600">{uitleg}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-5 text-sm text-slate-500">
          Meer achtergrond en de volledige formules vind je op de pagina{" "}
          <Link href="/fiscaal-kader" className="font-medium text-ink hover:text-gold">
            Fiscaal kader
          </Link>
          .
        </p>
      </Card>
    </div>
  );
}
