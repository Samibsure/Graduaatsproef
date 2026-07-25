"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AuthKaart,
  Melding,
  Veld,
  invoerKlasse,
  knopKlasse,
} from "@/components/AuthKaart";
import { createClient } from "@/lib/supabase/client";

export default function RegistreerPagina() {
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
      setFout(
        bericht.includes("already registered")
          ? "Er bestaat al een account met dit e-mailadres. Meld je aan of herstel je wachtwoord."
          : bericht,
      );
    } finally {
      setBezig(false);
    }
  }

  if (bevestigNodig) {
    return (
      <AuthKaart
        titel="Bevestig je e-mailadres"
        intro={
          <>
            We stuurden een bevestigingslink naar <strong>{email}</strong>. Klik erop om je account
            te activeren.
          </>
        }
      >
        <Melding soort="ok">
          Niets ontvangen? Controleer je ongewenste e-mail. Bij een zakelijk adres houdt de
          spamfilter de mail soms even vast.
        </Melding>
      </AuthKaart>
    );
  }

  return (
    <AuthKaart
      titel="Registreer je bedrijf"
      intro="Gratis, zonder beperkingen. Je wagenpark en je bewaarde beslissingen zijn alleen zichtbaar voor je eigen bedrijf."
      voettekst={
        <>
          Heb je al een account?{" "}
          <Link href="/aanmelden" className="font-bold text-ink underline underline-offset-2">
            Aanmelden
          </Link>
        </>
      }
    >
      <form onSubmit={registreren} className="space-y-4">
        <Veld label="Je naam">
          <input
            type="text"
            required
            autoComplete="name"
            value={naam}
            onChange={(e) => setNaam(e.target.value)}
            className={invoerKlasse}
          />
        </Veld>

        <Veld label="Bedrijfsnaam">
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

        <Veld label="Ondernemingsnummer" hint="Optioneel, bijvoorbeeld 0123.456.789">
          <input
            type="text"
            value={ondernemingsnummer}
            onChange={(e) => setOndernemingsnummer(e.target.value)}
            className={invoerKlasse}
          />
        </Veld>

        <Veld label="E-mailadres">
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={invoerKlasse}
            placeholder="jij@bedrijf.be"
          />
        </Veld>

        <Veld label="Wachtwoord" hint="Minstens 8 tekens.">
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
          {bezig ? "Bezig…" : "Gratis starten"}
        </button>
      </form>

      <p className="mt-5 text-[12.5px] leading-relaxed text-ink-500">
        Door te registreren ga je akkoord met de{" "}
        <Link href="/voorwaarden" className="underline underline-offset-2">
          gebruiksvoorwaarden
        </Link>{" "}
        en het{" "}
        <Link href="/privacy" className="underline underline-offset-2">
          privacybeleid
        </Link>
        .
      </p>
    </AuthKaart>
  );
}
