import Link from "next/link";
import { BSureMark } from "@/components/Brand";
import { Badge, Card } from "@/components/ui";

export const metadata = {
  title: "Over deze graduaatsproef · B-sure × PXL",
};

export default function OverPagina() {
  return (
    <div className="space-y-8">
      <section className="bg-ink-gradient relative overflow-hidden rounded-3xl px-6 py-10 text-white sm:px-10">
        <div className="absolute -right-8 -top-8 opacity-20">
          <BSureMark size={150} />
        </div>
        <div className="relative max-w-3xl">
          <Badge tint="gold">Over deze tool</Badge>
          <h1 className="mt-4 text-3xl font-bold tracking-tight">Een graduaatsproef van Sami Elhamdaoui</h1>
          <p className="mt-4 leading-relaxed text-white/80">
            Deze webapplicatie is het praktische sluitstuk van mijn graduaatsproef{" "}
            <em>“Autofiscaliteit: impact van autokosten op verworpen uitgaven bij B-sure NV”</em>,
            in het kader van het Graduaat Accounting Administration aan Hogeschool PXL,
            academiejaar 2025-2026.
          </p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Auteur</p>
          <p className="mt-1 font-semibold text-ink">Sami Elhamdaoui</p>
          <p className="text-sm text-slate-500">Graduaat Accounting Administration</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Opleiding</p>
          <p className="mt-1 font-semibold text-ink">Hogeschool PXL</p>
          <p className="text-sm text-slate-500">PXL-coach: Gerry Franken</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Werkplek</p>
          <p className="mt-1 font-semibold text-ink">B-sure NV, Hasselt</p>
          <p className="text-sm text-slate-500">Werkplekcoach: Anne Vanoppen</p>
        </Card>
      </section>

      <Card className="p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-ink">Het verhaal erachter</h2>
        <div className="mt-3 space-y-4 text-sm leading-relaxed text-slate-600">
          <p>
            Toen ik in september 2025 startte bij B-sure NV, vertelde mijn werkplekcoach Anne
            Vanoppen dat de directie binnenkort opnieuw voor een aankoopbeslissing zou staan: een
            groot deel van het wagenpark loopt af tussen 2026 en 2028, net op het moment dat de
            fiscale spelregels grondig veranderen.
          </p>
          <p>
            Vanaf 2026 wordt de aftrekbaarheid van nieuwe verbrandingswagens in de
            vennootschapsbelasting op nul gezet, terwijl elektrische wagens besteld vóór 2027 hun
            volledige aftrek behouden. Tegelijk stijgen de CO₂-solidariteitsbijdrage en de
            minimumbezoldiging voor het verlaagd KMO-tarief. De échte kost van een bedrijfswagen is
            daardoor een rekenoefening met heel wat variabelen geworden.
          </p>
          <p>
            Het doel van deze tool is bescheiden maar concreet: B-sure een werkbaar kader aanreiken
            om elke nieuwe vlootbeslissing fiscaal en financieel onderbouwd te nemen. Geen academisch
            traktaat, wel een instrument dat op de directietafel kan liggen wanneer de volgende
            offerte van de leasingmaatschappij binnenkomt.
          </p>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-ink">Hoofdvraag</h2>
          <p className="mt-3 rounded-xl bg-paper px-4 py-3 text-sm font-medium text-ink">
            Hoe kan B-sure NV een fiscaal én financieel optimale voertuigkeuze maken op basis van de
            impact van autokosten op verworpen uitgaven?
          </p>
          <h3 className="mt-5 text-sm font-semibold text-ink">Uitgewerkt in dit instrument</h3>
          <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
            <li>• Deelvraag 1 — het fiscale kader voor autokosten (2025-2031)</li>
            <li>• Deelvraag 4 — een transparante, herhaalbare beslissingsmatrix</li>
          </ul>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-ink">Wat de tool doet</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>
              <span className="font-medium text-ink">Wagencatalogus</span> — 25 populaire
              bedrijfswagens met directe fiscale preview.
            </li>
            <li>
              <span className="font-medium text-ink">Mijn wagens</span> — eigen vloot en kandidaten,
              met volledige berekening van aftrek, VAA, verworpen uitgaven en RSZ.
            </li>
            <li>
              <span className="font-medium text-ink">Vergelijking</span> — scoringsmatrix met zes
              gewogen criteria en een advies per kandidaat.
            </li>
            <li>
              <span className="font-medium text-ink">Parameters</span> — jaarlijks bij te werken na
              het begrotingsakkoord.
            </li>
          </ul>
          <Link
            href="/catalogus"
            className="mt-5 inline-block rounded-xl bg-gold px-4 py-2 text-sm font-semibold text-ink hover:bg-gold-soft"
          >
            Aan de slag →
          </Link>
        </Card>
      </div>

      <p className="text-center text-xs text-slate-400">
        Huisstijl geïnspireerd op B-sure (“financieel geluk”) en Hogeschool PXL (zwart · goud).
        Logo’s en merknamen blijven eigendom van hun respectieve eigenaars; deze tool gebruikt een
        eigen wordmark en vermeldt beide organisaties enkel ter situering van de graduaatsproef.
      </p>
    </div>
  );
}
