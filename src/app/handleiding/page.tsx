import Link from "next/link";
import Icon from "@/components/Icon";

export const metadata = {
  title: "Handleiding · B-sure × PXL Autofiscaliteit",
};

const stappen = [
  {
    n: "1",
    icon: "layout-grid",
    titel: "Verken de catalogus",
    tekst:
      "Open ‘Catalogus’. Je ziet de 25 bekendste bedrijfswagens in België, met per model meteen de fiscale impact voor 2026: fiscale aftrek, voordeel alle aard (VAA), verworpen uitgaven en CO₂. Gebruik de zoekbalk of de filterchips (elektrisch, plug-in hybride, hybride, diesel/benzine) om te verfijnen.",
    link: { href: "/catalogus", label: "Open de catalogus" },
  },
  {
    n: "2",
    icon: "car",
    titel: "Voeg wagens toe",
    tekst:
      "Klik op een kaart op ‘Voeg toe aan vergelijking’. Onderaan verschijnt een balk met je selectie en een knop ‘Naar de vergelijking’. Heb je een concrete offerte? Registreer ze bij ‘Wagens’: vul merk, prijs, CO₂ en het beleid (tank-/laadkaart, thuislaadpunt) in en zie meteen de live fiscale inschatting.",
    link: { href: "/wagens", label: "Beheer je wagens" },
  },
  {
    n: "3",
    icon: "bar-chart-3",
    titel: "Vergelijk tot drie wagens",
    tekst:
      "Ga naar ‘Vergelijking’ en kies tot drie kandidaten via de chips bovenaan. Je kan het eerste gebruiksjaar instellen en het verlaagd KMO-tarief aanzetten. De tool toont de winnaar-banner, een kerncijfertabel met de gunstigste waarde per criterium, de scoringsmatrix met zes gewogen criteria en een grafiek (TCO, VAA of aftrek).",
    link: { href: "/vergelijking", label: "Start een vergelijking" },
  },
  {
    n: "4",
    icon: "award",
    titel: "Lees het advies en bewaar",
    tekst:
      "Elke kandidaat krijgt een eindscore op 10 en een advies: aanvaarden (≥ 7), overwegen (4 tot 7) of afwijzen (< 4). Geef de vergelijking een titel en een korte motivering en klik ‘Bewaar beslissing’; ze komt in de beslissingshistoriek terecht. Met ‘Print / PDF’ neem je het advies mee naar de directievergadering.",
    link: { href: "/vergelijking", label: "Naar het scoredashboard" },
  },
  {
    n: "5",
    icon: "sliders-horizontal",
    titel: "Houd de parameters actueel",
    tekst:
      "Eén keer per jaar, na het federale begrotingsakkoord, werk je bij ‘Parameters’ de fiscale waarden bij (minimum VAA, referentie-CO₂, RSZ-index en -multiplicator, aftrekkalender). Met ‘Herstel standaardwaarden’ zet je alles terug naar de geverifieerde cijfers.",
    link: { href: "/parameters", label: "Bekijk de parameters" },
  },
];

const woordenlijst: Array<[string, string]> = [
  ["VAA (voordeel alle aard)", "De belastbare waarde van het privégebruik van een bedrijfswagen voor de werknemer."],
  ["Verworpen uitgaven", "Kosten die de vennootschap boekt maar fiscaal niet (volledig) mag aftrekken; ze verhogen de belastbare winst."],
  ["Fiscale aftrek (VenB)", "Het percentage van de autokosten dat aftrekbaar is in de vennootschapsbelasting."],
  ["RSZ CO₂-bijdrage", "Maandelijkse solidariteitsbijdrage die de werkgever betaalt per wagen met privégebruik."],
  ["TCO", "Total Cost of Ownership: de totale gebruikskost over de looptijd (hier vier jaar)."],
  ["Uitdoofkalender", "Het afbouwpad waarbij de aftrek van fossiele wagens en plug-in hybrides daalt naar 0%."],
];

export default function HandleidingPagina() {
  return (
    <div className="mx-auto max-w-[1100px] px-6 py-[52px]">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[18px] bg-ink px-9 py-12 text-white">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(120% 140% at 100% 0%, rgba(174,154,100,0.18), transparent 55%)" }}
        />
        <div className="relative">
          <div className="mb-3 flex items-center gap-2.5">
            <span className="h-[1.5px] w-[26px] bg-gold" />
            <span className="text-[12px] font-bold uppercase tracking-[0.16em] text-gold">Handleiding</span>
          </div>
          <h1 className="m-0 text-[clamp(30px,4vw,46px)] font-bold tracking-[-0.02em]">
            Zo gebruik je de tool
          </h1>
          <p className="mt-3 max-w-[44em] text-[17px] leading-relaxed text-white/[0.75]">
            Een praktische gids in vijf stappen, van offerte tot onderbouwde beslissing. Geen
            voorkennis van fiscaliteit nodig: de tool rekent alles voor je door.
          </p>
        </div>
      </section>

      {/* Stappen */}
      <ol className="mt-8 space-y-4">
        {stappen.map((s) => (
          <li key={s.n}>
            <div className="flex flex-col gap-5 rounded-[14px] border border-line bg-white p-6 sm:flex-row sm:items-start">
              <div className="flex shrink-0 items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ink text-lg font-bold text-white">
                  {s.n}
                </span>
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-[12px] bg-gold-soft text-ink sm:hidden">
                  <Icon name={s.icon} size={22} />
                </span>
              </div>
              <div className="flex-1">
                <div className="mb-1.5 flex items-center gap-2.5">
                  <span className="hidden h-9 w-9 items-center justify-center rounded-[10px] bg-gold-soft text-ink sm:inline-flex">
                    <Icon name={s.icon} size={19} />
                  </span>
                  <h2 className="m-0 text-[19px] font-bold text-ink">{s.titel}</h2>
                </div>
                <p className="m-0 text-[15px] leading-relaxed text-ink-700">{s.tekst}</p>
                <Link
                  href={s.link.href}
                  className="mt-3 inline-flex items-center gap-1.5 text-[14.5px] font-bold text-ink hover:text-gold"
                >
                  {s.link.label} <Icon name="arrow-right" size={16} />
                </Link>
              </div>
            </div>
          </li>
        ))}
      </ol>

      {/* Woordenlijst */}
      <div className="mt-8 rounded-[14px] border border-line bg-white p-6">
        <h2 className="m-0 text-[22px] font-bold text-ink">Woordenlijst</h2>
        <p className="mb-5 mt-1.5 text-[15px] text-ink-700">
          De termen die je in de tool tegenkomt, kort uitgelegd.
        </p>
        <dl className="grid gap-x-10 gap-y-4 sm:grid-cols-2">
          {woordenlijst.map(([term, uitleg]) => (
            <div key={term}>
              <dt className="font-bold text-ink">{term}</dt>
              <dd className="m-0 text-[14.5px] leading-relaxed text-ink-700">{uitleg}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 text-[14px] text-ink-500">
          Meer achtergrond en de volledige formules vind je op de pagina{" "}
          <Link href="/fiscaal-kader" className="font-bold text-ink hover:text-gold">
            Fiscaal kader
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
