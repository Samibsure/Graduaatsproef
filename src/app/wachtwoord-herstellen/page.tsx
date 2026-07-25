"use client";

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

export default function WachtwoordHerstellenPagina() {
  const router = useRouter();
  const [wachtwoord, setWachtwoord] = useState("");
  const [herhaal, setHerhaal] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  async function opslaan(e: React.FormEvent) {
    e.preventDefault();
    setFout(null);

    if (wachtwoord !== herhaal) {
      setFout("De twee wachtwoorden komen niet overeen.");
      return;
    }

    setBezig(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: wachtwoord });
      if (error) throw error;
      router.push("/wagens");
      router.refresh();
    } catch (e) {
      setFout(e instanceof Error ? e.message : String(e));
    } finally {
      setBezig(false);
    }
  }

  return (
    <AuthKaart
      titel="Nieuw wachtwoord"
      intro="Kies een nieuw wachtwoord voor je account. Daarna ben je meteen aangemeld."
    >
      <form onSubmit={opslaan} className="space-y-4">
        <Veld label="Nieuw wachtwoord" hint="Minstens 8 tekens.">
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

        <Veld label="Herhaal wachtwoord">
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={herhaal}
            onChange={(e) => setHerhaal(e.target.value)}
            className={invoerKlasse}
          />
        </Veld>

        {fout && <Melding soort="fout">{fout}</Melding>}

        <button type="submit" disabled={bezig} className={knopKlasse}>
          {bezig ? "Bezig…" : "Wachtwoord opslaan"}
        </button>
      </form>
    </AuthKaart>
  );
}
