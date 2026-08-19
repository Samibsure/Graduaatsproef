"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import {
  AuthKaart,
  Melding,
  Veld,
  invoerKlasse,
  knopKlasse,
} from "@/components/AuthKaart";
import { Link, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * De pagina is een schil om het formulier.
 *
 * `useSearchParams()` maakt een component dynamisch, en de layout heeft
 * generateStaticParams: zonder Suspense-grens weigert `next build` deze route
 * te prerenderen. Dezelfde constructie staat op /simulator.
 */
export default function RegistreerPagina() {
  return (
    <Suspense fallback={null}>
      <RegistreerFormulier />
    </Suspense>
  );
}

function RegistreerFormulier() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  /*
   * Het token uit de uitnodigingslink. Zonder token maakt de registratietrigger
   * altijd een eigen bedrijf aan; met een geldig token landt het profiel in het
   * bedrijf dat uitnodigde, met de rol uit de uitnodiging. Zie migratie 0014.
   */
  const token = useSearchParams().get("uitnodiging")?.trim() ?? "";
  const [naam, setNaam] = useState("");
  const [bedrijfsnaam, setBedrijfsnaam] = useState("");
  const [ondernemingsnummer, setOndernemingsnummer] = useState("");
  const [email, setEmail] = useState("");
  const [wachtwoord, setWachtwoord] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [bevestigNodig, setBevestigNodig] = useState(false);

  async function registreren(e: React.FormEvent) {
    e.preventDefault();
    setFout(null);
    setBezig(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password: wachtwoord,
        options: {
          // Het bedrijf wordt server-side aangemaakt door de trigger
          // handle_new_user, op basis van deze gegevens.
          //
          // Het uitnodigingstoken hoort daarbij: zonder token maakt de trigger
          // altijd een eigen bedrijf aan. Koppelen op alleen het e-mailadres
          // liet iedereen uitnodigingen planten voor adressen die hij niet
          // bezat, en daarmee vreemde bedrijven binnenhalen (migratie 0014).
          data: {
            volledige_naam: naam.trim(),
            bedrijfsnaam: bedrijfsnaam.trim(),
            ondernemingsnummer: ondernemingsnummer.trim(),
            uitnodiging_token: token,
          },
          emailRedirectTo:
            `${window.location.origin}/auth/callback?verder=/wagens&taal=${locale}`,
        },
      });
      if (error) throw error;

      if (data.session) {
        router.push("/wagens");
        router.refresh();
      } else {
        setBevestigNodig(true);
      }
    } catch (e) {
      const bericht = e instanceof Error ? e.message : String(e);
      setFout(bericht.includes("already registered") ? t("bestaatAl") : bericht);
    } finally {
      setBezig(false);
    }
  }

  if (bevestigNodig) {
    return (
      <AuthKaart titel={t("bevestigTitel")} intro={t("bevestigIntro", { email })}>
        <Melding soort="ok">{t("bevestigSpam")}</Melding>
      </AuthKaart>
    );
  }

  return (
    <AuthKaart
      titel={t("registreerTitel")}
      intro={t("registreerIntro")}
      voettekst={
        <>
          {t("alAccount")}{" "}
          <Link href="/aanmelden" className="font-bold text-ink underline underline-offset-2">
            {t("aanmeldenTitel")}
          </Link>
        </>
      }
    >
      <form onSubmit={registreren} className="space-y-4">
        {token && <Melding soort="ok">{t("uitnodigingHerkend")}</Melding>}

        <Veld label={t("jeNaam")}>
          <input
            type="text"
            required
            autoComplete="name"
            value={naam}
            onChange={(e) => setNaam(e.target.value)}
            className={invoerKlasse}
          />
        </Veld>

        {/*
          Wie met een uitnodiging komt, sluit aan bij een bestaand bedrijf. Die
          twee velden zouden dan om gegevens vragen waar de trigger niets mee
          doet, en suggereren dat hij een eigen bedrijf aanmaakt.
        */}
        {!token && (
          <>
            <Veld label={t("bedrijfsnaam")}>
              <input
                type="text"
                required
                minLength={2}
                autoComplete="organization"
                value={bedrijfsnaam}
                onChange={(e) => setBedrijfsnaam(e.target.value)}
                className={invoerKlasse}
              />
            </Veld>

            <Veld label={t("ondernemingsnummer")} hint={t("ondernemingsnummerHint")}>
              <input
                type="text"
                value={ondernemingsnummer}
                onChange={(e) => setOndernemingsnummer(e.target.value)}
                className={invoerKlasse}
              />
            </Veld>
          </>
        )}

        <Veld label={t("email")}>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={invoerKlasse}
            placeholder={t("emailPlaceholder")}
          />
        </Veld>

        <Veld label={t("wachtwoord")} hint={t("wachtwoordHint")}>
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={wachtwoord}
            onChange={(e) => setWachtwoord(e.target.value)}
            className={invoerKlasse}
          />
        </Veld>

        {fout && <Melding soort="fout">{fout}</Melding>}

        <button type="submit" disabled={bezig} className={knopKlasse}>
          {bezig ? t("bezig") : t("gratisStartenKnop")}
        </button>
      </form>

      <p className="mt-5 text-[12.5px] leading-relaxed text-ink-500">
        {t.rich("akkoord", {
          voorwaarden: (chunks) => (
            <Link href="/voorwaarden" className="underline underline-offset-2">
              {chunks}
            </Link>
          ),
          privacy: (chunks) => (
            <Link href="/privacy" className="underline underline-offset-2">
              {chunks}
            </Link>
          ),
        })}
      </p>
    </AuthKaart>
  );
}
