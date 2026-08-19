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
import { veiligPad } from "@/lib/taalpad";

type Methode = "wachtwoord" | "link";

function AanmeldFormulier() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const params = useSearchParams();
  // Uit de queryparameter, dus van buitenaf te zetten. Zonder deze controle kan
  // een link met ?verder=//kwaadaardig.be de gebruiker na het aanmelden naar een
  // andere site sturen. De controle staat in veiligPad(), zodat ze hier en in
  // de servercallback dezelfde is; twee eigen versies liepen uit de pas, en de
  // versie hier liet een backslash door.
  const verder = veiligPad(params.get("verder"));
  /*
   * De auth-callback stuurt hierheen met ?fout=link-verlopen wanneer
   * exchangeCodeForSession of verifyOtp faalt. Niemand las die parameter, dus
   * de gebruiker belandde op een leeg formulier zonder één woord uitleg.
   *
   * Dat gebeurt vaker dan het klinkt: een mailscanner zoals Outlook Safe Links
   * opent de link vooraf en verbrandt daarmee het eenmalige token. Wie daarna
   * zelf klikt, probeert in te loggen, krijgt "ongeldige inloggegevens" omdat
   * zijn account nog niet bevestigd is, en weet van niets.
   */
  const linkVerlopen = params.get("fout") === "link-verlopen";

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
        router.push(verder as "/wagens");
        router.refresh();
      } else {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo:
              `${window.location.origin}/auth/callback` +
              `?verder=${encodeURIComponent(verder)}&taal=${locale}`,
          },
        });
        if (error) throw error;
        setLinkVerstuurd(true);
      }
    } catch (e) {
      const bericht = e instanceof Error ? e.message : String(e);
      setFout(bericht.includes("Invalid login credentials") ? t("foutInloggegevens") : bericht);
    } finally {
      setBezig(false);
    }
  }

  if (linkVerstuurd) {
    return (
      <AuthKaart titel={t("mailboxTitel")} intro={t("linkVerstuurd", { email })}>
        <Melding soort="ok">{t("linkSpam")}</Melding>
        <button
          type="button"
          onClick={() => {
            setLinkVerstuurd(false);
            setMethode("wachtwoord");
          }}
          className="mt-5 text-[14px] font-bold text-ink underline underline-offset-2"
        >
          {t("tochWachtwoord")}
        </button>
      </AuthKaart>
    );
  }

  return (
    <AuthKaart
      titel={t("aanmeldenTitel")}
      intro={t("aanmeldenIntro")}
      voettekst={
        <>
          {t("nogGeenAccount")}{" "}
          <Link href="/registreren" className="font-bold text-ink underline underline-offset-2">
            {t("registreerGratis")}
          </Link>
        </>
      }
    >
      <div className="mb-6 flex rounded-[10px] border border-line p-1">
        {(
          [
            ["wachtwoord", t("metWachtwoord")],
            ["link", t("metLink")],
          ] as Array<[Methode, string]>
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
        {linkVerlopen && (
          <Melding soort="let-op">
            {t.rich("linkVerlopen", {
              nieuwe: (chunks) => (
                <Link
                  href="/wachtwoord-vergeten"
                  className="font-bold text-ink underline underline-offset-2"
                >
                  {chunks}
                </Link>
              ),
            })}
          </Melding>
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

        {methode === "wachtwoord" && (
          <Veld label={t("wachtwoord")}>
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
          {bezig ? t("bezig") : methode === "wachtwoord" ? t("aanmeldenTitel") : t("stuurLink")}
        </button>
      </form>

      {methode === "wachtwoord" && (
        <p className="mt-5 text-center text-[13.5px]">
          <Link href="/wachtwoord-vergeten" className="text-ink-500 hover:text-ink">
            {t("wachtwoordVergeten")}
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
