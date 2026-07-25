"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import {
  AuthKaart,
  Melding,
  Veld,
  invoerKlasse,
  knopKlasse,
} from "@/components/AuthKaart";
import { createClient } from "@/lib/supabase/client";

type Methode = "wachtwoord" | "link";

function AanmeldFormulier() {
  const router = useRouter();
  const params = useSearchParams();
  const verder = params.get("verder") ?? "/wagens";

  const [methode, setMethode] = useState<Methode>("wachtwoord");
  const [email, setEmail] = useState("");
  const [wachtwoord, setWachtwoord] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [linkVerstuurd, setLinkVerstuurd] = useState(false);

  async function aanmelden(e: React.FormEvent) {
    e.preventDefault();
    setFout(null);
    setBezig(true);
    const supabase = createClient();

    try {
      if (methode === "wachtwoord") {
        const { error } = await supabase.auth.signInWithPassword({ email, password: wachtwoord });
        if (error) throw error;
        router.push(verder);
        router.refresh();
      } else {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?verder=${encodeURIComponent(verder)}`,
          },
        });
        if (error) throw error;
        setLinkVerstuurd(true);
      }
    } catch (e) {
      const bericht = e instanceof Error ? e.message : String(e);
      setFout(
        bericht.includes("Invalid login credentials")
          ? "E-mailadres of wachtwoord klopt niet."
          : bericht,
      );
    } finally {
      setBezig(false);
    }
  }

  if (linkVerstuurd) {
    return (
      <AuthKaart
        titel="Kijk in je mailbox"
        intro={
          <>
            We stuurden een inloglink naar <strong>{email}</strong>. De link blijft één uur geldig.
          </>
        }
      >
        <Melding soort="ok">
          Zie je niets binnenkomen, controleer dan je ongewenste e-mail. Lukt het niet, meld je dan
          aan met je wachtwoord.
        </Melding>
        <button
          type="button"
          onClick={() => {
            setLinkVerstuurd(false);
            setMethode("wachtwoord");
          }}
          className="mt-5 text-[14px] font-bold text-ink underline underline-offset-2"
        >
          Toch met een wachtwoord aanmelden
        </button>
      </AuthKaart>
    );
  }

  return (
    <AuthKaart
      titel="Aanmelden"
      intro="Meld je aan om het wagenpark van je bedrijf te beheren en te vergelijken."
      voettekst={
        <>
          Nog geen account?{" "}
          <Link href="/registreren" className="font-bold text-ink underline underline-offset-2">
            Registreer je bedrijf gratis
          </Link>
        </>
      }
    >
      <div className="mb-6 flex rounded-[10px] border border-line p-1">
        {(
          [
            ["wachtwoord", "Met wachtwoord"],
            ["link", "Met inloglink"],
          ] as const
        ).map(([waarde, label]) => (
          <button
            key={waarde}
            type="button"
            onClick={() => setMethode(waarde)}
            data-active={methode === waarde}
            className="flex-1 rounded-[7px] py-2 text-[13.5px] font-bold text-ink-500 data-[active=true]:bg-ink data-[active=true]:text-white"
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={aanmelden} className="space-y-4">
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

        {methode === "wachtwoord" && (
          <Veld label="Wachtwoord">
            <input
              type="password"
              required
              autoComplete="current-password"
              value={wachtwoord}
              onChange={(e) => setWachtwoord(e.target.value)}
              className={invoerKlasse}
            />
          </Veld>
        )}

        {fout && <Melding soort="fout">{fout}</Melding>}

        <button type="submit" disabled={bezig} className={knopKlasse}>
          {bezig ? "Bezig…" : methode === "wachtwoord" ? "Aanmelden" : "Stuur me een inloglink"}
        </button>
      </form>

      {methode === "wachtwoord" && (
        <p className="mt-5 text-center text-[13.5px]">
          <Link href="/wachtwoord-vergeten" className="text-ink-500 hover:text-ink">
            Wachtwoord vergeten?
          </Link>
        </p>
      )}
    </AuthKaart>
  );
}

export default function AanmeldPagina() {
  return (
    <Suspense>
      <AanmeldFormulier />
    </Suspense>
  );
}
