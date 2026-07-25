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
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";

export default function WachtwoordHerstellenPagina() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [wachtwoord, setWachtwoord] = useState("");
  const [herhaal, setHerhaal] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  async function opslaan(e: React.FormEvent) {
    e.preventDefault();
    setFout(null);

    if (wachtwoord !== herhaal) {
      setFout(t("wachtwoordenVerschillen"));
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
    <AuthKaart titel={t("nieuwWachtwoordTitel")} intro={t("nieuwWachtwoordIntro")}>
      <form onSubmit={opslaan} className="space-y-4">
        <Veld label={t("nieuwWachtwoord")} hint={t("wachtwoordHint")}>
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

        <Veld label={t("herhaalWachtwoord")}>
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
          {bezig ? t("bezig") : t("wachtwoordOpslaan")}
        </button>
      </form>
    </AuthKaart>
  );
}
