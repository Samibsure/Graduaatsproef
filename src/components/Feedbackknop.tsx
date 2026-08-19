"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import Icon from "@/components/Icon";
import { Button, Melding, Veld, invoerKlassen } from "@/components/ui";
import { Link, usePathname } from "@/i18n/navigation";
import {
  FEEDBACK_EMAIL,
  feedbackMailto,
  huidigeContext,
  verstuurFeedback,
  type Feedbacksoort,
} from "@/lib/feedback";

const SOORTEN: Array<{ code: Feedbacksoort; icoon: string }> = [
  { code: "bug", icoon: "triangle-alert" },
  { code: "idee", icoon: "lightbulb" },
  { code: "vraag", icoon: "info" },
];

/**
 * De meldknop, rechtsonder op elke pagina.
 *
 * Klein en rustig: hij mag niet in de weg zitten van het werk, maar hij moet er
 * wél zijn op het moment dat iemand een cijfer ziet dat niet klopt. Dat is
 * precies waar hij tot nu toe ontbrak.
 */
export default function Feedbackknop() {
  const t = useTranslations("feedback");
  const locale = useLocale();
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [soort, setSoort] = useState<Feedbacksoort>("bug");
  const [omschrijving, setOmschrijving] = useState("");
  const [email, setEmail] = useState("");
  const [bezig, setBezig] = useState(false);
  const [klaar, setKlaar] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [mailtoLink, setMailtoLink] = useState<string | null>(null);

  const paneelId = useId();
  const tekstveld = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    tekstveld.current?.focus();
    function bijToets(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", bijToets);
    return () => document.removeEventListener("keydown", bijToets);
  }, [open]);

  function sluit() {
    setOpen(false);
    // Even wachten met opruimen, anders ziet de gebruiker het formulier
    // leegspringen terwijl het paneel nog wegvalt.
    window.setTimeout(() => {
      setKlaar(false);
      setFout(null);
      setMailtoLink(null);
      setOmschrijving("");
    }, 200);
  }

  async function verstuur() {
    setBezig(true);
    setFout(null);
    setMailtoLink(null);

    const melding = {
      soort,
      omschrijving,
      email,
      ...huidigeContext(pathname, locale),
    };

    try {
      const resultaat = await verstuurFeedback(melding);
      if (resultaat === "geen-tabel") {
        // De tabel bestaat nog niet (migratie 0010 niet uitgevoerd). De melding
        // gaat dan per e-mail, met alles al ingevuld.
        setMailtoLink(
          feedbackMailto(melding, {
            bug: t("onderwerpBug"),
            idee: t("onderwerpIdee"),
            vraag: t("onderwerpVraag"),
          }),
        );
      } else {
        setKlaar(true);
      }
    } catch (e) {
      setFout(e instanceof Error ? e.message : String(e));
    } finally {
      setBezig(false);
    }
  }

  return (
    <div className="bs-no-print fixed bottom-5 right-5 z-[60] print:hidden">
      {open && (
        <div
          id={paneelId}
          role="dialog"
          aria-modal="false"
          aria-label={t("titel")}
          className="mb-3 w-[min(92vw,380px)] rounded-[14px] border border-line bg-white p-5 shadow-zwevend"
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="m-0 text-[16.5px] font-bold text-ink">{t("titel")}</h2>
              <p className="m-0 mt-1 text-[13px] leading-relaxed text-ink-500">{t("intro")}</p>
            </div>
            <button
              onClick={sluit}
              aria-label={t("sluit")}
              className="-mr-1 -mt-1 inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 hover:bg-paper hover:text-ink"
            >
              <Icon name="x" size={18} />
            </button>
          </div>

          {klaar ? (
            <div className="space-y-4">
              <Melding soort="ok">{t("dank")}</Melding>
              <Button variant="stil" className="w-full" onClick={sluit}>
                {t("sluit")}
              </Button>
            </div>
          ) : mailtoLink ? (
            <div className="space-y-4">
              <Melding soort="info">{t("perMail")}</Melding>
              <a href={mailtoLink} className="block">
                <Button className="w-full" onClick={() => window.setTimeout(sluit, 400)}>
                  <Icon name="message-square" size={16} />
                  {t("openMail")}
                </Button>
              </a>
              <p className="m-0 text-center text-[12.5px] text-ink-500">{FEEDBACK_EMAIL}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <fieldset className="m-0 border-0 p-0">
                <legend className="mb-2 text-[13px] font-bold text-ink">{t("soort")}</legend>
                <div className="grid grid-cols-3 gap-2">
                  {SOORTEN.map((s) => (
                    <button
                      key={s.code}
                      type="button"
                      onClick={() => setSoort(s.code)}
                      aria-pressed={soort === s.code}
                      className={`inline-flex flex-col items-center gap-1.5 rounded-[10px] border px-2 py-2.5 text-[12.5px] font-bold transition-colors ${
                        soort === s.code
                          ? "border-accent bg-accent-soft text-ink"
                          : "border-line text-ink-500 hover:border-ink-500 hover:text-ink"
                      }`}
                    >
                      <Icon name={s.icoon} size={17} />
                      {t(`soort_${s.code}` as "soort_bug")}
                    </button>
                  ))}
                </div>
              </fieldset>

              <Veld label={t("omschrijving")} hint={t("omschrijvingHint")}>
                <textarea
                  ref={tekstveld}
                  value={omschrijving}
                  onChange={(e) => setOmschrijving(e.target.value)}
                  rows={4}
                  maxLength={4000}
                  placeholder={t("omschrijvingPlaceholder")}
                  className="bs-inp w-full rounded-[10px] px-3.5 py-2.5 text-[14.5px]"
                />
              </Veld>

              <Veld label={t("email")} hint={t("emailHint")}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("emailPlaceholder")}
                  className={invoerKlassen}
                />
              </Veld>

              {fout && <Melding soort="fout">{fout}</Melding>}

              <p className="m-0 text-[12px] leading-relaxed text-ink-500">
                {t.rich("privacy", {
                  beleid: (chunks) => (
                    <Link href="/privacy" className="underline underline-offset-2">
                      {chunks}
                    </Link>
                  ),
                })}
              </p>

              <Button
                className="w-full"
                disabled={bezig || omschrijving.trim().length < 5}
                onClick={verstuur}
              >
                {bezig ? t("bezig") : t("verstuur")}
              </Button>
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={paneelId}
        aria-label={t("knop")}
        className="ml-auto inline-flex h-12 items-center gap-2 rounded-full border border-line bg-white px-4 text-[14px] font-bold text-ink shadow-diep transition-colors hover:border-ink-500 hover:bg-paper"
      >
        <Icon name={open ? "x" : "message-square"} size={18} />
        {/*
          Onder 640px verbergt `hidden` het label ook voor een schermlezer, en
          dan staat er op elke pagina van de site een knop zonder naam. De
          aria-label vult dat gat zonder de vormgeving te raken.
        */}
        <span className="hidden sm:inline">{t("knop")}</span>
      </button>
    </div>
  );
}
