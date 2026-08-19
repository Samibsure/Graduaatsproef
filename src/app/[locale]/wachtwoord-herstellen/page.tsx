"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import {
  AuthKaart,
  Melding,
  Veld,
  invoerKlasse,
  knopKlasse,
} from "@/components/AuthKaart";
import { Link, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";

export default function WachtwoordHerstellenPagina() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [wachtwoord, setWachtwoord] = useState("");
  const [herhaal, setHerhaal] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  /*
   * Zonder herstelsessie faalt updateUser met "Auth session missing!", en die
   * Engelse technische tekst kwam letterlijk op het scherm, zonder uitweg. Dat
   * gebeurt vaker dan het lijkt: een herstellink is eenmalig, en wie deze pagina
   * bewaard heeft of hem een dag later opnieuw opent, heeft er geen meer.
   */
  const [heeftSessie, setHeeftSessie] = useState<boolean | null>(null);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setHeeftSessie(!!data.user))
      .catch(() => setHeeftSessie(false));
  }, []);

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

  if (heeftSessie === false) {
    return (
      <AuthKaart
        titel={t("nieuwWachtwoordTitel")}
        intro={t("nieuwWachtwoordIntro")}
        voettekst={
          <Link
            href="/wachtwoord-vergeten"
            className="font-bold text-ink underline underline-offset-2"
          >
            {t("nieuweLinkVragen")}
          </Link>
        }
      >
        <Melding soort="let-op">{t("geenHerstelsessie")}</Melding>
      </AuthKaart>
    );
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
