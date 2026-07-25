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
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";

export default function WachtwoordVergetenPagina() {
  const t = useTranslations("auth");
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
      <AuthKaart titel={t("mailboxTitel")} intro={t("herstellinkVerstuurd", { email })}>
        <Melding soort="ok">{t("eenUurGeldig")}</Melding>
      </AuthKaart>
    );
  }

  return (
    <AuthKaart
      titel={t("vergetenTitel")}
      intro={t("vergetenIntro")}
      voettekst={
        <Link href="/aanmelden" className="font-bold text-ink underline underline-offset-2">
          {t("terugAanmelden")}
        </Link>
      }
    >
      <form onSubmit={versturen} className="space-y-4">
        <Veld label={t("email")}>
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
          {bezig ? t("bezig") : t("stuurHerstellink")}
        </button>
      </form>
    </AuthKaart>
  );
}
