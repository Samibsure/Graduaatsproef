"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { Melding, Veld, invoerKlasse } from "@/components/AuthKaart";
import Dialoog from "@/components/Dialoog";
import Icon from "@/components/Icon";
import Kopieerknop from "@/components/Kopieerknop";
import { useSessie } from "@/components/SessieProvider";
import { Badge, Card, Container, PageHead, SectionTitle } from "@/components/ui";
import { bewaarBedrijfsprofiel, wijzigRol, type BedrijfsInvoer } from "@/lib/bedrijf";
import { ROLLEN, magBeheren, type Bedrijfsrol } from "@/lib/rollen";
import { voorvoegsel } from "@/lib/taalpad";
import {
  laadTeam,
  laadUitnodigingen,
  nodigUit,
  trekUitnodigingIn,
  uitnodigingslink,
  verwijderMijnBedrijf,
  verwijderTeamlid,
  type Teamlid,
  type Uitnodiging,
} from "@/lib/team";

/** De tint per rol, zodat de ledenlijst in één oogopslag leesbaar is. */
const ROL_TINT: Record<Bedrijfsrol, string> = {
  lezer: "slate",
  lid: "ink",
  fiscalist: "green",
  beheerder: "gold",
};

export default function InstellingenPagina() {
  const t = useTranslations("instellingen");
  const locale = useLocale();
  const sessie = useSessie();
  const isBeheerder = magBeheren(sessie);

  /*
   * De uitnodigingslink moet het domein dragen waar de collega hem opent, en
   * niet dat van de omgeving waarin de pagina toevallig gebouwd is. Op de
   * server is `window` er niet; deze component is een client component en de
   * lijst rendert pas na het laden, dus die waarde is er op het moment dat ze
   * nodig is.
   */
  const basisUrl = typeof window === "undefined" ? "" : window.location.origin;

  const [profiel, setProfiel] = useState<BedrijfsInvoer>({
    naam: "",
    ondernemingsnummer: null,
    btw_nummer: null,
    adres: null,
    postcode: null,
    gemeente: null,
    is_kmo: true,
    boekjaar_start_maand: 1,
  });
  const [team, setTeam] = useState<Teamlid[]>([]);
  const [uitnodigingen, setUitnodigingen] = useState<Uitnodiging[]>([]);
  const [nieuwEmail, setNieuwEmail] = useState("");
  const [nieuwRol, setNieuwRol] = useState<Bedrijfsrol>("lid");
  const [melding, setMelding] = useState<string | null>(null);
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);
  const [bevestigVerwijderen, setBevestigVerwijderen] = useState("");
  // Een collega verwijderen ging zonder enige bevestiging, terwijl het bedrijf
  // verwijderen erom vraagt met de naam intypen. Eén misklik verwijderde iemand.
  const [teVerwijderenLid, setTeVerwijderenLid] = useState<Teamlid | null>(null);

  useEffect(() => {
    if (!sessie) return;
    const b = sessie.bedrijf;
    setProfiel({
      naam: b.naam,
      ondernemingsnummer: b.ondernemingsnummer,
      btw_nummer: b.btw_nummer,
      adres: b.adres,
      postcode: b.postcode,
      gemeente: b.gemeente,
      is_kmo: b.is_kmo,
      boekjaar_start_maand: b.boekjaar_start_maand,
    });
  }, [sessie]);

  const herlaad = useCallback(
    () =>
      Promise.all([laadTeam(), laadUitnodigingen()]).then(([teamlijst, uitnodiginglijst]) => {
        setTeam(teamlijst);
        setUitnodigingen(uitnodiginglijst);
      }),
    [],
  );

  useEffect(() => {
    herlaad().catch((e) => setFout(e instanceof Error ? e.message : String(e)));
  }, [herlaad]);

  /**
   * Het bedrijf verwijderen kan niet door voerUit(): die herlaadt achteraf het
   * team, en window.location.href blokkeert niet. De herlading zou dus tegen een
   * net verwijderd bedrijf draaien en een verwarrende fout tonen bovenop een
   * geslaagde verwijdering.
   */
  async function verwijderBedrijf() {
    setFout(null);
    setMelding(null);
    setBezig(true);
    try {
      await verwijderMijnBedrijf();
      // Met het taalvoorvoegsel: "/" is altijd Nederlands bij localePrefix
        // "as-needed", en een Waalse beheerder landde na het verwijderen van zijn
        // bedrijf dus op een Nederlandstalige startpagina.
        window.location.href = `${voorvoegsel(locale)}/`;
    } catch (e) {
      setFout(e instanceof Error ? e.message : String(e));
      setBezig(false);
    }
  }

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

  function zet<K extends keyof BedrijfsInvoer>(veld: K, waarde: BedrijfsInvoer[K]) {
    setProfiel((p) => ({ ...p, [veld]: waarde }));
  }

  const rolLabel = (rol: Bedrijfsrol) =>
    t(`rol${rol.charAt(0).toUpperCase()}${rol.slice(1)}` as "rolLid");

  if (!sessie) return null;

  return (
    <Container className="py-12">
      <PageHead title={sessie.bedrijf.naam} sub={t("intro")} />

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

      <Dialoog
        open={teVerwijderenLid !== null}
        titel={t("collegaVerwijderTitel")}
        tekst={t("collegaVerwijderTekst", {
          naam: teVerwijderenLid?.volledige_naam ?? t("naamloos"),
        })}
        bevestigLabel={t("verwijderen")}
        annuleerLabel={t("annuleer")}
        gevaarlijk
        onBevestig={() => {
          const lid = teVerwijderenLid;
          setTeVerwijderenLid(null);
          if (lid) voerUit(() => verwijderTeamlid(lid.id), t("collegaVerwijderd"));
        }}
        onAnnuleer={() => setTeVerwijderenLid(null)}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6 sm:p-7">
          <SectionTitle sub={t("bedrijfsgegevensSub")}>{t("bedrijfsgegevens")}</SectionTitle>

          <div className="space-y-4">
            <Veld label={t("bedrijfsnaam")}>
              <input
                className={invoerKlasse}
                value={profiel.naam}
                disabled={!isBeheerder}
                onChange={(e) => zet("naam", e.target.value)}
              />
            </Veld>
            <div className="grid gap-4 sm:grid-cols-2">
              <Veld label={t("ondernemingsnummer")} hint={t("optioneel")}>
                <input
                  className={invoerKlasse}
                  value={profiel.ondernemingsnummer ?? ""}
                  disabled={!isBeheerder}
                  onChange={(e) => zet("ondernemingsnummer", e.target.value)}
                />
              </Veld>
              <Veld label={t("btwNummer")} hint={t("optioneel")}>
                <input
                  className={invoerKlasse}
                  value={profiel.btw_nummer ?? ""}
                  disabled={!isBeheerder}
                  onChange={(e) => zet("btw_nummer", e.target.value)}
                />
              </Veld>
            </div>
            <Veld label={t("adres")} hint={t("optioneel")}>
              <input
                className={invoerKlasse}
                value={profiel.adres ?? ""}
                disabled={!isBeheerder}
                onChange={(e) => zet("adres", e.target.value)}
              />
            </Veld>
            <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
              <Veld label={t("postcode")} hint={t("optioneel")}>
                <input
                  className={invoerKlasse}
                  value={profiel.postcode ?? ""}
                  disabled={!isBeheerder}
                  onChange={(e) => zet("postcode", e.target.value)}
                />
              </Veld>
              <Veld label={t("gemeente")} hint={t("optioneel")}>
                <input
                  className={invoerKlasse}
                  value={profiel.gemeente ?? ""}
                  disabled={!isBeheerder}
                  onChange={(e) => zet("gemeente", e.target.value)}
                />
              </Veld>
            </div>

            <div className="border-t border-line pt-5">
              <SectionTitle sub={t("fiscaalProfielSub")}>{t("fiscaalProfiel")}</SectionTitle>

              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={profiel.is_kmo}
                  disabled={!isBeheerder}
                  onChange={(e) => zet("is_kmo", e.target.checked)}
                />
                <span>
                  <span className="block text-[14.5px] font-bold text-ink">{t("kmoTarief")}</span>
                  <span className="block text-[13px] text-ink-500">{t("kmoTariefHint")}</span>
                </span>
              </label>

              <div className="mt-4">
                <Veld label={t("boekjaar")}>
                  <select
                    className={invoerKlasse}
                    value={profiel.boekjaar_start_maand}
                    disabled={!isBeheerder}
                    onChange={(e) => zet("boekjaar_start_maand", Number(e.target.value))}
                  >
                    {/* Maandnamen, zoals de onboarding die al toont. Hier stonden
                        kale cijfers 1 tot 12, wat niemand als "maart" leest. */}
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>
                        {t(`maand${m}` as "maand1")}
                      </option>
                    ))}
                  </select>
                </Veld>
              </div>
            </div>

            {isBeheerder ? (
              <button
                disabled={bezig}
                onClick={() => voerUit(() => bewaarBedrijfsprofiel(profiel), t("bewaard"))}
                className="inline-flex h-[44px] items-center rounded-[10px] bg-ink px-5 text-[14.5px] font-bold text-white hover:bg-ink-600 disabled:opacity-60"
              >
                {t("bewaren")}
              </button>
            ) : (
              <p className="text-[13.5px] text-ink-500">{t("alleenBeheerder")}</p>
            )}
          </div>
        </Card>

        <Card className="p-6 sm:p-7">
          <SectionTitle sub={t("collegasSub")}>{t("collegas")}</SectionTitle>

          <ul className="m-0 list-none space-y-2 p-0">
            {team.map((lid) => (
              <li
                key={lid.id}
                className="flex items-center justify-between gap-3 rounded-[10px] border border-line px-4 py-3"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[14.5px] font-bold text-ink">
                    {lid.volledige_naam ?? t("naamloos")}
                    {lid.id === sessie.gebruikerId && (
                      <span className="font-normal text-ink-500">{t("jij")}</span>
                    )}
                  </span>
                  <Badge tint={ROL_TINT[lid.rol]}>{rolLabel(lid.rol)}</Badge>
                </span>

                {isBeheerder && lid.id !== sessie.gebruikerId && (
                  <span className="flex shrink-0 items-center gap-3">
                    <label className="sr-only" htmlFor={`rol-${lid.id}`}>
                      {t("rolWijzigen")}
                    </label>
                    <select
                      id={`rol-${lid.id}`}
                      className="bs-inp h-[36px] rounded-[9px] px-2 text-[13.5px]"
                      value={lid.rol}
                      disabled={bezig}
                      onChange={(e) =>
                        voerUit(
                          () => wijzigRol(lid.id, e.target.value as Bedrijfsrol),
                          t("rolGewijzigd"),
                        )
                      }
                    >
                      {ROLLEN.map((r) => (
                        <option key={r} value={r}>
                          {rolLabel(r)}
                        </option>
                      ))}
                    </select>
                    <button
                      disabled={bezig}
                      onClick={() => setTeVerwijderenLid(lid)}
                      className="text-[13.5px] font-bold text-danger hover:underline"
                    >
                      {t("verwijderen")}
                    </button>
                  </span>
                )}
              </li>
            ))}
          </ul>

          <ul className="m-0 mt-4 list-none space-y-1 p-0 text-[12.5px] text-ink-500">
            {ROLLEN.map((r) => (
              <li key={r}>
                <b className="font-bold text-ink-700">{rolLabel(r)}</b>{" "}
                {t(`rolUitleg${r.charAt(0).toUpperCase()}${r.slice(1)}` as "rolUitlegLid")}
              </li>
            ))}
          </ul>

          {isBeheerder && (
            <div className="mt-6 border-t border-line pt-5">
              <Veld label={t("uitnodigen")} hint={t("uitnodigenHint")}>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="email"
                    className={`${invoerKlasse} min-w-[180px] flex-1`}
                    value={nieuwEmail}
                    placeholder={t("uitnodigenPlaceholder")}
                    onChange={(e) => setNieuwEmail(e.target.value)}
                  />
                  <select
                    className="bs-inp h-[44px] rounded-[10px] px-3 text-[14.5px]"
                    value={nieuwRol}
                    aria-label={t("rolWijzigen")}
                    onChange={(e) => setNieuwRol(e.target.value as Bedrijfsrol)}
                  >
                    {ROLLEN.map((r) => (
                      <option key={r} value={r}>
                        {rolLabel(r)}
                      </option>
                    ))}
                  </select>
                  <button
                    disabled={bezig || !nieuwEmail}
                    onClick={() =>
                      voerUit(async () => {
                        await nodigUit(nieuwEmail, nieuwRol);
                        setNieuwEmail("");
                      }, t("uitnodigingGenoteerd"))
                    }
                    className="inline-flex h-[44px] shrink-0 items-center gap-1.5 rounded-[10px] bg-ink px-4 text-[14.5px] font-bold text-white hover:bg-ink-600 disabled:opacity-60"
                  >
                    <Icon name="plus" size={16} />
                    {t("uitnodigenKnop")}
                  </button>
                </div>
              </Veld>

              {uitnodigingen.length > 0 && (
                <ul className="m-0 mt-4 list-none space-y-2 p-0">
                  {uitnodigingen.map((u) => (
                    <li key={u.id} className="rounded-[10px] bg-paper px-4 py-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-[14px] text-ink-700">{u.email}</span>
                          <Badge tint={ROL_TINT[u.rol]}>{rolLabel(u.rol)}</Badge>
                        </span>
                        <button
                          disabled={bezig}
                          onClick={() =>
                            voerUit(() => trekUitnodigingIn(u.id), t("uitnodigingIngetrokken"))
                          }
                          className="shrink-0 text-[13px] font-bold text-ink-500 hover:text-ink"
                        >
                          {t("intrekken")}
                        </button>
                      </div>

                      {/*
                        Er vertrekt geen mail: de uitnodiging is een rij in de
                        databank en de beheerder stuurt deze link zelf door. Het
                        token erin is wat de koppeling mogelijk maakt; zonder
                        token maakt de registratie een eigen bedrijf aan.
                      */}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <code className="min-w-0 flex-1 truncate rounded-[8px] border border-line bg-white px-2.5 py-1.5 text-[12.5px] text-ink-700">
                          {uitnodigingslink(u.token, basisUrl)}
                        </code>
                        <Kopieerknop
                          waarde={uitnodigingslink(u.token, basisUrl)}
                          label={t("linkKopieerLabel")}
                          kopieerLabel={t("linkKopieer")}
                          gekopieerdLabel={t("linkGekopieerd")}
                        />
                      </div>
                      <p className="m-0 mt-1.5 text-[12.5px] leading-relaxed text-ink-500">
                        {t("linkUitleg")}
                      </p>
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
          <SectionTitle sub={t("verwijderSub")}>{t("verwijderTitel")}</SectionTitle>

          <Veld label={t("verwijderBevestig", { naam: sessie.bedrijf.naam })}>
            <input
              className={invoerKlasse}
              value={bevestigVerwijderen}
              onChange={(e) => setBevestigVerwijderen(e.target.value)}
            />
          </Veld>

          <button
            disabled={bezig || bevestigVerwijderen !== sessie.bedrijf.naam}
            onClick={verwijderBedrijf}
            className="mt-4 inline-flex h-[44px] items-center rounded-[10px] bg-danger px-5 text-[14.5px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("verwijderKnop")}
          </button>
        </Card>
      )}
    </Container>
  );
}
