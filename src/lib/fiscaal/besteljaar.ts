import { aftrekOpbouw, berekenProjectie, parametersVoorJaar, type Aftrekopbouw } from "./engine";
import type { FiscaleContext, Vehicle } from "./types";

/**
 * Wat het besteljaar met een wagen doet.
 *
 * Dit is het zwaarste gegeven in de hele applicatie, en het stond nergens op het
 * scherm. De catalogus vulde stil `besteldatum = 15 januari van het gekozen jaar`
 * in en toonde het resultaat alsof dat een eigenschap van de wagen was. Het is
 * een eigenschap van het *moment*: dezelfde verbrandingswagen die besteld in 2025
 * nog via de gramformule aftrekbaar is in zijn eerste gebruiksjaar, is besteld in
 * 2026 meteen 0% aftrekbaar. Dat verschil loopt over vier jaar in de duizenden
 * euro's, en de gebruiker zag alleen het eindcijfer.
 *
 * Deze module varieert het besteljaar bij een vaste wagen. Dat is het spiegelbeeld
 * van uitfasering.ts, dat het besteljaar vasthoudt en het gebruiksjaar laat lopen.
 * Beide vragen zijn nodig: "wanneer valt mijn aftrek weg?" en "maakt het uit of ik
 * nu of volgend jaar teken?".
 */

/**
 * De drie bestanddelen waar de fiscale meerkost over de looptijd uit bestaat.
 *
 * Bestaat omdat de tabel wél liet zien dát uitstellen duurder is, maar niet
 * waardoor. "€ 937 duurder" is geen uitleg; "€ 780 doordat er minder aftrekbaar
 * is, € 40 door een hoger voordeel van alle aard, € 117 door een zwaardere
 * RSZ-bijdrage" is dat wel. De drie sommeren per constructie exact tot het
 * verschil in de tabel: zie de opmerking bij vergelijkBesteljaren().
 */
export interface Besteljaardrijvers {
  /** Extra vennootschapsbelasting doordat een deel van de autokosten niet aftrekbaar is. */
  aftrekbaarheid: number;
  /** Extra vennootschapsbelasting op de verworpen uitgave uit het voordeel van alle aard. */
  voordeelAlleAard: number;
  /** De CO₂-solidariteitsbijdrage aan de RSZ. */
  rsz: number;
}

const GEEN_DRIJVERS: Besteljaardrijvers = {
  aftrekbaarheid: 0,
  voordeelAlleAard: 0,
  rsz: 0,
};

export interface Besteljaarrij {
  jaar: number;
  /** Aftrekpercentage in het eerste gebruiksjaar na die bestelling. */
  aftrekEerste: number;
  /** Gemiddelde aftrek over de looptijd. */
  aftrekGemiddeld: number;
  verworpenUitgaven: number;
  fiscaleMeerkost: number;
  /** Totale kost over de looptijd. */
  totaleKost: number;
  /** Verschil in totale kost tegenover het goedkoopste besteljaar in het bereik. */
  meerkostTegenoverBeste: number;
  /** Aftrekpercentage per gebruiksjaar over de looptijd. */
  aftrekPad: number[];
  /** Hoe het percentage in het eerste gebruiksjaar tot stand komt. */
  opbouw: Aftrekopbouw;
  /** De drie bestanddelen van de fiscale meerkost, opgeteld over de looptijd. */
  drijvers: Besteljaardrijvers;
  /** Dezelfde drie, als verschil tegenover het goedkoopste besteljaar. */
  drijversVerschil: Besteljaardrijvers;
}

export interface Besteljaarvergelijking {
  rijen: Besteljaarrij[];
  /**
   * De looptijd waarover gerekend is, in jaren.
   *
   * Stond er niet in zolang vier jaar overal vastlag. De simulator laat de bezoeker
   * nu drie, vier of vijf jaar kiezen, en dan liegt een kolomkop "Totale kost 4
   * jaar". Ze reist mee met het resultaat in plaats van als losse prop naast de
   * tabel, zodat geen enkele aanroeper ze kan vergeten.
   */
  looptijd: number;
  /** Het besteljaar met de laagste totale kost. */
  besteJaar: number;
  /** Het laatste jaar waarin bestellen nog aftrek oplevert, of null. */
  laatsteJaarMetAftrek: number | null;
  /** Verschil tussen het duurste en het goedkoopste besteljaar. */
  spreiding: number;
}

/**
 * Zet dezelfde wagen naast elkaar voor verschillende besteljaren.
 *
 * De besteldatum wordt op 15 januari gezet, net zoals de catalogus dat doet, en
 * de eerste ingebruikname twee maanden later. Die twee maanden zijn geen detail:
 * de leeftijdscorrectie op het voordeel van alle aard vertrekt vanaf de
 * inschrijving, niet vanaf de bestelling.
 *
 * ## Waarom de drie drijvers exact tot het verschil sommeren
 *
 * Tussen de rijen verandert alleen de besteldatum en de eerste ingebruikname.
 * `kostenBasis()` leest geen van die twee velden, dus `kostenTotaal` is voor elke
 * rij hetzelfde getal, net als `eigenBijdrageJaar` en de looptijd. Per
 * gebruiksjaar geldt:
 *
 *     totaleKost = kostenTotaal + extraVenB + rszJaar − eigenBijdrageJaar
 *     extraVenB  = (nietAftrekbaar + vuUitVaa) × tarief
 *
 * Sommeer over de looptijd en trek twee rijen van elkaar af: `kostenTotaal` en
 * `eigenBijdrageJaar` vallen volledig weg. Wat overblijft is precies het verschil
 * in extra vennootschapsbelasting plus het verschil in RSZ-bijdrage. En omdat
 * `nietAftrekbaar + vuUitVaa` de volledige verworpen uitgave ís, dekken de eerste
 * twee drijvers samen `extraVenB` zonder restterm.
 *
 * Dat elke rij andere gebruiksjaren doorloopt is geen ruis maar signaal: het
 * VenB-tarief, het minimum VAA, de referentie-CO₂, de RSZ-index en de
 * RSZ-multiplicator hangen aan het kalenderjaar en horen dus in het verschil
 * terecht te komen. Daarom wordt het tarief hier per gebruiksjaar opnieuw
 * opgezocht en niet één keer voor de hele looptijd.
 */
export function vergelijkBesteljaren(
  ctx: FiscaleContext,
  wagen: Vehicle,
  jaren: number[],
  looptijd = 4,
  opties?: { kmoTarief?: boolean },
): Besteljaarvergelijking {
  const rijen: Besteljaarrij[] = jaren
    .slice()
    .sort((a, b) => a - b)
    .map((jaar) => {
      const kandidaat: Vehicle = {
        ...wagen,
        besteldatum: `${jaar}-01-15`,
        eerste_ingebruikname: `${jaar}-03-01`,
      };
      const projectie = berekenProjectie(ctx, kandidaat, jaar, looptijd, opties);
      const eerste = projectie.jaren[0];
      const opbouw = aftrekOpbouw(ctx, kandidaat, jaar);

      const drijvers = projectie.jaren.reduce<Besteljaardrijvers>((som, j) => {
        const params = parametersVoorJaar(ctx, j.gebruiksjaar);
        const tarief = (opties?.kmoTarief ? params.kmo_tarief : params.venb_tarief) / 100;
        return {
          aftrekbaarheid: som.aftrekbaarheid + j.nietAftrekbaar * tarief,
          voordeelAlleAard: som.voordeelAlleAard + j.vuUitVaa * tarief,
          rsz: som.rsz + j.rszJaar,
        };
      }, GEEN_DRIJVERS);

      return {
        jaar,
        // Hetzelfde getal als voordien, maar nu uit de opbouw in plaats van uit
        // een tweede aanroep: zo kan het percentage niet uit de pas lopen met de
        // uitleg eronder.
        aftrekEerste: opbouw.pct,
        aftrekGemiddeld: projectie.gemiddeldeAftrekPct,
        verworpenUitgaven: eerste.verworpenUitgaven,
        fiscaleMeerkost: eerste.fiscaleMeerkost,
        totaleKost: projectie.totaleKost,
        meerkostTegenoverBeste: 0,
        aftrekPad: projectie.jaren.map((j) => j.aftrekPct),
        opbouw,
        drijvers,
        drijversVerschil: GEEN_DRIJVERS,
      };
    });

  if (rijen.length === 0) {
    return { rijen, looptijd, besteJaar: 0, laatsteJaarMetAftrek: null, spreiding: 0 };
  }

  const kosten = rijen.map((r) => r.totaleKost);
  const laagste = Math.min(...kosten);
  const hoogste = Math.max(...kosten);
  const beste = rijen[kosten.indexOf(laagste)];
  for (const r of rijen) {
    r.meerkostTegenoverBeste = r.totaleKost - laagste;
    r.drijversVerschil = {
      aftrekbaarheid: r.drijvers.aftrekbaarheid - beste.drijvers.aftrekbaarheid,
      voordeelAlleAard: r.drijvers.voordeelAlleAard - beste.drijvers.voordeelAlleAard,
      rsz: r.drijvers.rsz - beste.drijvers.rsz,
    };
  }

  const metAftrek = rijen.filter((r) => r.aftrekEerste > 0);

  return {
    rijen,
    looptijd,
    besteJaar: beste.jaar,
    laatsteJaarMetAftrek: metAftrek.length ? metAftrek[metAftrek.length - 1].jaar : null,
    spreiding: hoogste - laagste,
  };
}

/**
 * Het bereik dat standaard getoond wordt: twee jaar terug en drie vooruit.
 *
 * Terugkijken is geen curiositeit. Wie in 2024 of 2025 besteld heeft, zit onder
 * een regime dat vandaag niet meer te krijgen is, en die vergelijking maakt
 * zichtbaar wat een bestaand contract waard is.
 */
export function standaardBesteljaren(rond = 2026): number[] {
  return [rond - 2, rond - 1, rond, rond + 1, rond + 2];
}
