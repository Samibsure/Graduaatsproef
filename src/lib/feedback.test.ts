import { describe, expect, it } from "vitest";
import { FEEDBACK_EMAIL, feedbackMailto, huidigeContext, type Feedback } from "./feedback";

const onderwerpen = {
  bug: "Autofiscaliteit: fout gemeld",
  idee: "Autofiscaliteit: verbetering voorgesteld",
  vraag: "Autofiscaliteit: vraag",
} as const;

const melding: Feedback = {
  soort: "bug",
  omschrijving: "De aftrek van een BMW 330e klopt niet",
  pagina: "/simulator",
  taal: "nl",
  schermbreedte: 1440,
  user_agent: "Mozilla/5.0",
};

describe("feedbackMailto", () => {
  it("richt de mail aan het contactadres met het juiste onderwerp", () => {
    const link = feedbackMailto(melding, onderwerpen);
    expect(link.startsWith(`mailto:${FEEDBACK_EMAIL}?`)).toBe(true);
    expect(decodeURIComponent(link)).toContain(onderwerpen.bug);
  });

  it("vult de omschrijving en de context al in", () => {
    const inhoud = decodeURIComponent(feedbackMailto(melding, onderwerpen));
    expect(inhoud).toContain("De aftrek van een BMW 330e klopt niet");
    expect(inhoud).toContain("Pagina: /simulator");
    expect(inhoud).toContain("Taal: nl");
    expect(inhoud).toContain("Schermbreedte: 1440px");
  });

  it("laat ontbrekende context gewoon weg in plaats van lege regels te schrijven", () => {
    const kaal = feedbackMailto(
      { soort: "idee", omschrijving: "Een idee", pagina: null, taal: null },
      onderwerpen,
    );
    const inhoud = decodeURIComponent(kaal);
    expect(inhoud).not.toContain("Pagina:");
    expect(inhoud).not.toContain("Taal:");
    expect(inhoud).toContain("Een idee");
  });

  it("ontsnapt tekens die een mailto-adres zouden breken", () => {
    const link = feedbackMailto(
      { ...melding, omschrijving: "Fout bij 100% & 50% aftrek?" },
      onderwerpen,
    );
    // De ampersand en het vraagteken mogen niet rauw in de URL staan: die
    // zouden het lichaam afkappen bij het openen van de mailclient.
    const naVraagteken = link.slice(link.indexOf("?") + 1);
    expect(naVraagteken).not.toContain("?");
    expect(naVraagteken.split("&")).toHaveLength(2);
    expect(decodeURIComponent(link)).toContain("Fout bij 100% & 50% aftrek?");
  });
});

describe("huidigeContext", () => {
  it("stuurt op de server geen browsergegevens mee", () => {
    // In deze testomgeving bestaat window niet; dat is precies de servercase.
    const context = huidigeContext("/catalogus", "fr");
    expect(context).toEqual({
      pagina: "/catalogus",
      taal: "fr",
      schermbreedte: null,
      user_agent: null,
    });
  });
});
