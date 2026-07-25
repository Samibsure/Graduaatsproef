"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AuthKaart,
  Melding,
  Veld,
  invoerKlasse,
  knopKlasse,
} from "@/components/AuthKaart";
import { createClient } from "@/lib/supabase/client";

export default function WachtwoordVergetenPagina() {
  const [email, setEmail] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [verstuurd, setVerstuurd] = useState(false);

  async function versturen(e: React.FormEvent) {
    e.preventDefault();
    setFout(null);
    setBezig(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?verder=/wachtwoord-herstellen`,
      });
      if (error) throw error;
      setVerstuurd(true);
    } catch (e) {
      setFout(e instanceof Error ? e.message : String(e));
    } finally {
      setBezig(false);
    }
  }

  if (verstuurd) {
    return (
      <AuthKaart
        titel="Kijk in je mailbox"
        intro={
          <>
            Bestaat er een account voor <strong>{email}</strong>, dan is er een herstellink
            onderweg.
          </>
        }
      >
        <Melding soort="ok">De link blijft één uur geldig.</Melding>
      </AuthKaart>
    );
  }

  return (
    <AuthKaart
      titel="Wachtwoord vergeten"
      intro="Vul je e-mailadres in, dan sturen we je een link om een nieuw wachtwoord in te stellen."
      voettekst={
        <Link href="/aanmelden" className="font-bold text-ink underline underline-offset-2">
          Terug naar aanmelden
        </Link>
      }
    >
      <form onSubmit={versturen} className="space-y-4">
        <Veld label="E-mailadres">
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={invoerKlasse}
          />
        </Veld>

        {fout && <Melding soort="fout">{fout}</Melding>}

        <button type="submit" disabled={bezig} className={knopKlasse}>
          {bezig ? "Bezig…" : "Stuur herstellink"}
        </button>
      </form>
    </AuthKaart>
  );
}
