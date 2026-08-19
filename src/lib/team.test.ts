import { describe, expect, it } from "vitest";
import { uitnodigingslink } from "./team";

/**
 * De link is wat een uitnodiging bruikbaar maakt. Er vertrekt geen mail, dus de
 * beheerder kopieert hem uit /instellingen; het token erin is het enige wat de
 * koppeling aan zijn bedrijf mogelijk maakt (migratie 0014).
 */
describe("uitnodigingslink", () => {
  const token = "3f1b0c7e-9c1a-4d2b-8a5f-0e6d7c8b9a01";

  it("hangt het token aan de registratiepagina", () => {
    expect(uitnodigingslink(token, "https://autofiscaliteit.com")).toBe(
      `https://autofiscaliteit.com/registreren?uitnodiging=${token}`,
    );
  });

  it("verdubbelt de schuine streep niet wanneer de basis er al een heeft", () => {
    expect(uitnodigingslink(token, "https://autofiscaliteit.com/")).toBe(
      `https://autofiscaliteit.com/registreren?uitnodiging=${token}`,
    );
  });

  it("ontsnapt het token, zodat een rare waarde de queryreeks niet openbreekt", () => {
    expect(uitnodigingslink("a&b=c", "https://x.be")).toBe(
      "https://x.be/registreren?uitnodiging=a%26b%3Dc",
    );
  });
});
