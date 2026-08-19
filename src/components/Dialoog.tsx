"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Button } from "@/components/ui";

/**
 * Een bevestigingsvenster in de huisstijl, ter vervanging van het ingebouwde
 * confirm().
 *
 * confirm() is niet te vertalen, niet te stijlen, en een browser mag het na een
 * eerdere melding onderdrukken: dan verdwijnt de vraag "weet je het zeker?"
 * zonder dat iemand het merkt, en gebeurt er niets meer. Voor het verwijderen
 * van een wagen of het herstellen van de fiscale parameters is dat te wankel.
 *
 * Gebouwd op <dialog>, zodat de browser de focusval, de Escape-toets en het
 * uitgrijzen van de achtergrond voor ons doet.
 */
export default function Dialoog({
  open,
  titel,
  tekst,
  bevestigLabel,
  annuleerLabel,
  gevaarlijk = false,
  onBevestig,
  onAnnuleer,
}: {
  open: boolean;
  titel: string;
  tekst?: ReactNode;
  bevestigLabel: string;
  annuleerLabel: string;
  gevaarlijk?: boolean;
  onBevestig: () => void;
  onAnnuleer: () => void;
}) {
  const venster = useRef<HTMLDialogElement>(null);
  /*
   * Zonder koppeling kondigt een schermlezer alleen "dialoog" aan. Dat weegt
   * hier omdat dit venster uitsluitend voor onomkeerbare acties gebruikt wordt:
   * een wagen verwijderen, een collega verwijderen, de fiscale parameters
   * herstellen. De gebruiker hoort te horen wát hij bevestigt.
   */
  const titelId = useId();

  useEffect(() => {
    const el = venster.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={venster}
      aria-labelledby={titelId}
      // Escape sluit het venster zonder de actie uit te voeren; zonder deze
      // koppeling zou de open-state achterblijven op true.
      onCancel={(e) => {
        e.preventDefault();
        onAnnuleer();
      }}
      className="w-[min(92vw,460px)] rounded-[14px] border border-line bg-white p-0 shadow-zwevend backdrop:bg-ink/45"
    >
      <div className="p-6 sm:p-7">
        <h2 id={titelId} className="m-0 text-[19px] font-bold tracking-[-0.01em] text-ink">
          {titel}
        </h2>
        {tekst && <div className="mt-2.5 text-[14.5px] leading-relaxed text-ink-700">{tekst}</div>}
        <div className="mt-7 flex flex-wrap justify-end gap-3">
          <Button variant="stil" onClick={onAnnuleer}>
            {annuleerLabel}
          </Button>
          <Button variant={gevaarlijk ? "gevaar" : "primair"} onClick={onBevestig}>
            {bevestigLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
