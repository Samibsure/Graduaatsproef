"use client";

import { useEffect, useState } from "react";
import { Melding, Veld, invoerKlasse } from "@/components/AuthKaart";
import Icon from "@/components/Icon";
import { useSessie } from "@/components/SessieProvider";
import { Badge, Card, Container, PageHead, SectionTitle } from "@/components/ui";
import {
  bewaarBedrijf,
  laadTeam,
  laadUitnodigingen,
  nodigUit,
  trekUitnodigingIn,
  verwijderMijnBedrijf,
  verwijderTeamlid,
  type Teamlid,
  type Uitnodiging,
} from "@/lib/team";

export default function InstellingenPagina() {
  const sessie = useSessie();
  const isBeheerder = sessie?.rol === "beheerder";

  const [naam, setNaam] = useState("");
  const [nummer, setNummer] = useState("");
  const [team, setTeam] = useState<Teamlid[]>([]);
  const [uitnodigingen, setUitnodigingen] = useState<Uitnodiging[]>([]);
  const [nieuwEmail, setNieuwEmail] = useState("");
  const [melding, setMelding] = useState<string | null>(null);
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);
  const [bevestigVerwijderen, setBevestigVerwijderen] = useState("");

  useEffect(() => {
    if (!sessie) return;
    setNaam(sessie.bedrijf.naam);
    setNummer(sessie.bedrijf.ondernemingsnummer ?? "");
  }, [sessie]);

  const herlaad = () =>
    Promise.all([laadTeam(), laadUitnodigingen()]).then(([t, u]) => {
      setTeam(t);
      setUitnodigingen(u);
    });

  useEffect(() => {
    herlaad().catch((e) => setFout(String(e)));
  }, []);

  async function voerUit(actie: () => Promise<void>, bericht: string) {
    setFout(null);
    setMelding(null);
    setBezig(true);
    try {
      await actie();
      await herlaad();
      setMelding(bericht);
    } catch (e) {
      setFout(e instanceof Error ? e.message : String(e));
    } finally {
      setBezig(false);
    }
  }

  if (!sessie) return null;

  return (
    <Container className="py-12">
      <PageHead
        eyebrow="Instellingen"
        title={sessie.bedrijf.naam}
        sub="Beheer je bedrijfsgegevens, je collega's en je gegevens."
      />

      {melding && (
        <div className="mb-6">
          <Melding soort="ok">{melding}</Melding>
        </div>
      )}
      {fout && (
        <div className="mb-6">
          <Melding soort="fout">{fout}</Melding>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6 sm:p-7">
          <SectionTitle sub="Deze naam staat op je afdrukken en vergelijkingen.">
            Bedrijfsgegevens
          </SectionTitle>

          <div className="space-y-4">
            <Veld label="Bedrijfsnaam">
              <input
                className={invoerKlasse}
                value={naam}
                disabled={!isBeheerder}
                onChange={(e) => setNaam(e.target.value)}
              />
            </Veld>
            <Veld label="Ondernemingsnummer" hint="Optioneel.">
              <input
                className={invoerKlasse}
                value={nummer}
                disabled={!isBeheerder}
                onChange={(e) => setNummer(e.target.value)}
              />
            </Veld>

            {isBeheerder ? (
              <button
                disabled={bezig}
                onClick={() =>
                  voerUit(() => bewaarBedrijf(naam, nummer), "Bedrijfsgegevens bewaard.")
                }
                className="inline-flex h-[44px] items-center rounded-[10px] bg-ink px-5 text-[14.5px] font-bold text-white hover:bg-ink-600 disabled:opacity-60"
              >
                Bewaren
              </button>
            ) : (
              <p className="text-[13.5px] text-ink-500">
                Alleen een beheerder van je bedrijf kan deze gegevens wijzigen.
              </p>
            )}
          </div>
        </Card>

        <Card className="p-6 sm:p-7">
          <SectionTitle sub="Collega's zien dezelfde wagens en bewaarde beslissingen.">
            Collega&apos;s
          </SectionTitle>

          <ul className="m-0 list-none space-y-2 p-0">
            {team.map((lid) => (
              <li
                key={lid.id}
                className="flex items-center justify-between gap-3 rounded-[10px] border border-line px-4 py-3"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[14.5px] font-bold text-ink">
                    {lid.volledige_naam ?? "Naamloos"}
                    {lid.id === sessie.gebruikerId && (
                      <span className="font-normal text-ink-500"> · jij</span>
                    )}
                  </span>
                  <Badge tint={lid.rol === "beheerder" ? "gold" : "slate"}>{lid.rol}</Badge>
                </span>
                {isBeheerder && lid.id !== sessie.gebruikerId && (
                  <button
                    disabled={bezig}
                    onClick={() =>
                      voerUit(() => verwijderTeamlid(lid.id), "Collega verwijderd uit het bedrijf.")
                    }
                    className="shrink-0 text-[13.5px] font-bold text-danger hover:underline"
                  >
                    Verwijderen
                  </button>
                )}
              </li>
            ))}
          </ul>

          {isBeheerder && (
            <div className="mt-6 border-t border-line pt-5">
              <Veld
                label="Collega uitnodigen"
                hint="Zij registreren zich met dit e-mailadres en komen automatisch in je bedrijf terecht."
              >
                <div className="flex gap-2">
                  <input
                    type="email"
                    className={invoerKlasse}
                    value={nieuwEmail}
                    placeholder="collega@bedrijf.be"
                    onChange={(e) => setNieuwEmail(e.target.value)}
                  />
                  <button
                    disabled={bezig || !nieuwEmail}
                    onClick={() =>
                      voerUit(async () => {
                        await nodigUit(nieuwEmail);
                        setNieuwEmail("");
                      }, "Uitnodiging genoteerd.")
                    }
                    className="inline-flex h-[44px] shrink-0 items-center gap-1.5 rounded-[10px] bg-ink px-4 text-[14.5px] font-bold text-white hover:bg-ink-600 disabled:opacity-60"
                  >
                    <Icon name="plus" size={16} />
                    Uitnodigen
                  </button>
                </div>
              </Veld>

              {uitnodigingen.length > 0 && (
                <ul className="m-0 mt-4 list-none space-y-2 p-0">
                  {uitnodigingen.map((u) => (
                    <li
                      key={u.id}
                      className="flex items-center justify-between gap-3 rounded-[10px] bg-paper px-4 py-2.5"
                    >
                      <span className="min-w-0 truncate text-[14px] text-ink-700">{u.email}</span>
                      <button
                        disabled={bezig}
                        onClick={() =>
                          voerUit(() => trekUitnodigingIn(u.id), "Uitnodiging ingetrokken.")
                        }
                        className="shrink-0 text-[13px] font-bold text-ink-500 hover:text-ink"
                      >
                        Intrekken
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Card>
      </div>

      {isBeheerder && (
        <Card className="mt-6 border-danger/30 p-6 sm:p-7">
          <SectionTitle sub="Dit verwijdert je bedrijf, alle collega-accounts, alle wagens en alle bewaarde beslissingen. Dit kan niet ongedaan gemaakt worden.">
            Alle gegevens verwijderen
          </SectionTitle>

          <Veld label={`Typ "${sessie.bedrijf.naam}" om te bevestigen`}>
            <input
              className={invoerKlasse}
              value={bevestigVerwijderen}
              onChange={(e) => setBevestigVerwijderen(e.target.value)}
            />
          </Veld>

          <button
            disabled={bezig || bevestigVerwijderen !== sessie.bedrijf.naam}
            onClick={() =>
              voerUit(async () => {
                await verwijderMijnBedrijf();
                window.location.href = "/";
              }, "")
            }
            className="mt-4 inline-flex h-[44px] items-center rounded-[10px] bg-danger px-5 text-[14.5px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Definitief verwijderen
          </button>
        </Card>
      )}
    </Container>
  );
}
