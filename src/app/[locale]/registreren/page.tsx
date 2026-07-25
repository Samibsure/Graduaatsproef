"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  AuthKaart,
  Melding,
  Veld,
  invoerKlasse,
  knopKlasse,
} from "@/components/AuthKaart";
import { Link, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";

export default function RegistreerPagina() {
  const t = useTranslations("auth");
  const router = useRouter();
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
          data: {
            volledige_naam: naam.trim(),
            bedrijfsnaam: bedrijfsnaam.trim(),
            ondernemingsnummer: ondernemingsnummer.trim(),
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?verder=/wagens`,
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
