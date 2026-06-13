import Icon from "@/components/Icon";
import { Eyebrow } from "@/components/ui";

export const metadata = {
  title: "Fiscaal kader · B-sure × PXL Autofiscaliteit",
};

const toc = [
  { id: "fk-aftrek", label: "Fiscale aftrekbaarheid" },
  { id: "fk-vaa", label: "Voordeel alle aard" },
  { id: "fk-co2", label: "CO₂-bijdrage werkgever" },
  { id: "fk-tco", label: "Totale eigendomskost" },
];

const vaaItems = [
  ["Cataloguswaarde", "De nieuwwaarde inclusief opties en btw, vóór kortingen."],
  ["CO₂-coëfficiënt", "Stijgt met de uitstoot, vertrekkend van een referentie-uitstoot die jaarlijks wordt aangepast (2026: 70 g benzine, 58 g diesel)."],
  ["Leeftijdscorrectie", "De cataloguswaarde vermindert met 6% per begonnen jaar, tot een ondergrens van 70%."],
];

export default function FiscaalKaderPagina() {
  return (
    <div className="mx-auto grid max-w-[1100px] items-start gap-14 px-6 pb-[90px] pt-[52px] lg:grid-cols-[220px_1fr]">
      <aside className="sticky top-[92px] hidden lg:block">
        <div className="mb-4 text-[11.5px] font-bold uppercase tracking-[0.14em] text-ink-500">
          Op deze pagina
        </div>
        <nav className="flex flex-col gap-0.5 border-l border-line">
          {toc.map((t) => (
            <a
              key={t.id}
              href={`#${t.id}`}
              className="bs-toc-link -ml-px py-2 pl-4 text-[14px] transition-colors"
            >
              {t.label}
            </a>
          ))}
        </nav>
      </aside>

      <article className="max-w-[720px]">
        <Eyebrow>Fiscaal kader</Eyebrow>
        <h1 className="m-0 mb-[18px] text-[clamp(30px,4vw,46px)] font-bold tracking-[-0.02em]">
          De fiscaliteit van de bedrijfswagen
        </h1>
        <p className="m-0 mb-4 text-[18px] leading-relaxed text-ink-700">
          Vier elementen bepalen samen de fiscale impact van een bedrijfswagen: de aftrekbaarheid
          voor de werkgever, het voordeel alle aard voor de werknemer, de CO₂-solidariteitsbijdrage
          en de totale eigendomskost. Hieronder vindt u het kader dat onze berekening hanteert.
        </p>
        <div className="inline-flex items-center gap-2 text-[13px] text-ink-500">
          <Icon name="calendar" size={15} /> Laatst bijgewerkt voor aanslagjaar 2026
        </div>

        <section id="fk-aftrek" className="mt-12 scroll-mt-[92px]">
          <h2 className="m-0 mb-3.5 text-[26px] font-bold tracking-[-0.01em]">Fiscale aftrekbaarheid</h2>
          <p className="m-0 mb-[18px] text-[16px] leading-[1.7] text-ink-700">
            De mate waarin de kosten van de wagen aftrekbaar zijn, hangt af van de aandrijving en de
            CO₂-uitstoot. Volledig elektrische wagens blijven het gunstigst, terwijl de aftrek voor
            wagens met een verbrandingsmotor stelselmatig wordt afgebouwd (vanaf bestelling 2026:
            0%).
          </p>
          <div className="mb-3.5 overflow-hidden rounded-[12px] border border-line">
            <table className="w-full border-collapse text-[15px]">
              <thead>
                <tr className="bg-paper">
                  {["Aandrijving", "Aftrekbaarheid", "Tendens"].map((h) => (
                    <th
                      key={h}
                      className="border-b border-line px-[18px] py-[13px] text-left text-[12px] font-bold uppercase tracking-[0.08em] text-ink-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ["Elektrisch", "100%", "Stabiel, afbouw vanaf besteljaar 2027"],
                  ["Plug-in hybride", "75% → 50% → 25% → 0%", "Dalend (uitdoofkalender)"],
                  ["Diesel / benzine", "CO₂-formule, in uitdoof", "Sterk dalend"],
                ].map((r) => (
                  <tr key={r[0]} className="border-b border-line last:border-0">
                    <td className="px-[18px] py-3.5 font-bold text-ink">{r[0]}</td>
                    <td className="px-[18px] py-3.5 text-ink-700">{r[1]}</td>
                    <td className="px-[18px] py-3.5 text-ink-700">{r[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="m-0 text-[13.5px] leading-[1.6] text-ink-500">
            De percentages zijn indicatief. De exacte aftrek volgt uit de gramformule en het
            besteljaar; onze rekenkern is hierin leidend.
          </p>
        </section>

        <section id="fk-vaa" className="mt-11 scroll-mt-[92px]">
          <h2 className="m-0 mb-3.5 text-[26px] font-bold tracking-[-0.01em]">Voordeel alle aard</h2>
          <p className="m-0 mb-[18px] text-[16px] leading-[1.7] text-ink-700">
            De werknemer die de wagen ook privé gebruikt, wordt belast op een voordeel alle aard
            (VAA). Dit wordt berekend op de cataloguswaarde, een CO₂-coëfficiënt en een
            leeftijdscorrectie, met een wettelijk minimum van € 1.690 (2026).
          </p>
          <div className="grid gap-px overflow-hidden rounded-[12px] border border-line bg-line">
            {vaaItems.map(([t, d]) => (
              <div key={t} className="flex items-start gap-3.5 bg-white px-[18px] py-4">
                <span className="mt-px flex-none text-gold">
                  <Icon name="circle-dot" size={17} />
                </span>
                <div>
                  <div className="mb-0.5 font-bold text-ink">{t}</div>
                  <div className="text-[14.5px] leading-[1.55] text-ink-700">{d}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="fk-co2" className="mt-11 scroll-mt-[92px]">
          <h2 className="m-0 mb-3.5 text-[26px] font-bold tracking-[-0.01em]">CO₂-bijdrage werkgever</h2>
          <p className="m-0 text-[16px] leading-[1.7] text-ink-700">
            Naast de aftrekbeperking betaalt de werkgever een maandelijkse solidariteitsbijdrage aan
            de RSZ. Die stijgt met de CO₂-uitstoot (brandstofconstante diesel 600, benzine 768, LPG
            990) en wordt voor niet-elektrische wagens besteld vanaf 1/7/2023 met een
            multiplicator verhoogd die per bijdragejaar oploopt (×4 in 2026, ×5,5 vanaf 2027). Voor
            volledig elektrische wagens geldt het lagere basisminimum (€ 33,93/maand in 2026).
          </p>
        </section>

        <section id="fk-tco" className="mt-11 scroll-mt-[92px]">
          <h2 className="m-0 mb-3.5 text-[26px] font-bold tracking-[-0.01em]">Totale eigendomskost</h2>
          <p className="m-0 mb-[18px] text-[16px] leading-[1.7] text-ink-700">
            De totale eigendomskost (TCO) brengt alle elementen samen: de jaarlijkse autokosten, de
            niet-aftrekbare component (extra vennootschapsbelasting) en de CO₂-bijdrage. Het is dit
            bedrag dat een eerlijke vergelijking tussen wagens mogelijk maakt.
          </p>
          <div className="flex items-start gap-4 rounded-[14px] bg-ink px-[26px] py-6">
            <span className="mt-0.5 flex-none text-gold">
              <Icon name="lightbulb" size={22} />
            </span>
            <div>
              <div className="mb-1.5 text-[16px] font-bold text-white">
                Waarom de TCO doorslaggevend is
              </div>
              <p className="m-0 text-[14.5px] leading-[1.6] text-white/[0.74]">
                Een lagere catalogusprijs betekent niet automatisch een lagere kost. Een elektrische
                wagen met een hogere aanschafprijs kan dankzij de volledige aftrek, het lage voordeel
                alle aard en de lage RSZ-bijdrage alsnog voordeliger uitkomen.
              </p>
            </div>
          </div>
        </section>
      </article>
    </div>
  );
}
