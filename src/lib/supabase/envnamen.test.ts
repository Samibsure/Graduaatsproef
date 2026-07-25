import { describe, expect, it } from "vitest";
import {
  SLEUTEL_NAMEN,
  URL_NAMEN,
  eersteWaarde,
  isGeheimeSleutel,
} from "./envnamen";

describe("eersteWaarde", () => {
  it("neemt de canonieke naam wanneer die gevuld is", () => {
    expect(
      eersteWaarde(URL_NAMEN, {
        NEXT_PUBLIC_SUPABASE_URL: "https://canoniek.supabase.co",
        SUPABASE_URL: "https://integratie.supabase.co",
      }),
    ).toBe("https://canoniek.supabase.co");
  });

  it("valt terug op de naam van de Vercel-integratie", () => {
    expect(eersteWaarde(URL_NAMEN, { SUPABASE_URL: "https://integratie.supabase.co" })).toBe(
      "https://integratie.supabase.co",
    );
  });

  it("herkent de publishable key onder haar nieuwe naam", () => {
    expect(eersteWaarde(SLEUTEL_NAMEN, { SUPABASE_PUBLISHABLE_KEY: "sb_publishable_x" })).toBe(
      "sb_publishable_x",
    );
  });

  it("negeert lege en enkel uit spaties bestaande waarden", () => {
    expect(
      eersteWaarde(URL_NAMEN, {
        NEXT_PUBLIC_SUPABASE_URL: "   ",
        SUPABASE_URL: "https://echt.supabase.co",
      }),
    ).toBe("https://echt.supabase.co");
  });

  it("geeft undefined wanneer geen enkele naam gevuld is", () => {
    expect(eersteWaarde(URL_NAMEN, {})).toBeUndefined();
  });
});

describe("isGeheimeSleutel", () => {
  it("laat een publishable key door", () => {
    expect(isGeheimeSleutel("sb_publishable_0dhAntmc3Y9Eo9NJkno")).toBe(false);
  });

  it("herkent een secret key aan haar voorvoegsel", () => {
    expect(isGeheimeSleutel("sb_secret_ietsGeheims")).toBe(true);
  });

  it("herkent een service-role token aan de rol in de payload", () => {
    const payload = Buffer.from(JSON.stringify({ role: "service_role" })).toString("base64");
    expect(isGeheimeSleutel(`kop.${payload}.handtekening`)).toBe(true);
  });

  it("laat een anon-token door", () => {
    const payload = Buffer.from(JSON.stringify({ role: "anon" })).toString("base64");
    expect(isGeheimeSleutel(`kop.${payload}.handtekening`)).toBe(false);
  });

  it("beschouwt onleesbare waarden niet als geheim", () => {
    expect(isGeheimeSleutel("zomaar-wat-tekst")).toBe(false);
  });
});
