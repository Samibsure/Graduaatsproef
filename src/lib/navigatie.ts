/**
 * De navigatie op één plaats.
 *
 * Tot nu toe hadden de header en de voettekst elk hun eigen lijst, en die liepen
 * uiteen: de header toonde acht gelijkwaardige links waaronder /vloot, /wagens
 * en /vergelijking, die een bezoeker zonder account regelrecht naar de
 * aanmeldpagina sturen. De voettekst toonde weer een andere selectie. Er was
 * geen enkele plaats waar stond wat de navigatie eigenlijk moest zijn.
 *
 * De structuur hieronder legt twee dingen vast:
 *
 * 1. **Wat je ziet hangt af van of je aangemeld bent.** Een bezoeker krijgt de
 *    twee dingen die hij meteen kan gebruiken (simulator en catalogus) plus een
 *    menu met achtergrond. Een klant krijgt zijn eigen dossier vooraan.
 * 2. **Minder items vooraan.** Acht gelijkwaardige links geven geen hiërarchie,
 *    verdringen elkaar tussen 1024 en 1200px, en dwongen het menu pas onder
 *    1024px in te klappen. Vier of vijf items passen ruim, ook op een tablet.
 *
 * `sleutel` verwijst naar de `nav`-ruimte in messages/{nl,fr,en}.json.
 */

export interface NavLink {
  href: string;
  sleutel: string;
}

export interface NavGroep {
  /** Sleutel van het label op de knop die het menu opent. */
  sleutel: string;
  links: readonly NavLink[];
}

/** Wat een bezoeker zonder account vooraan ziet: alles meteen bruikbaar. */
export const PUBLIEKE_LINKS: readonly NavLink[] = [
  { href: "/simulator", sleutel: "simulator" },
  { href: "/catalogus", sleutel: "catalogus" },
];

/** Wat een aangemelde gebruiker vooraan ziet: zijn eigen dossier eerst. */
export const EIGEN_LINKS: readonly NavLink[] = [
  { href: "/vloot", sleutel: "vloot" },
  { href: "/wagens", sleutel: "wagens" },
  { href: "/vergelijking", sleutel: "vergelijking" },
  { href: "/catalogus", sleutel: "catalogus" },
];

/** De achtergrondpagina's, gebundeld achter één menuknop in plaats van los. */
export const UITLEG_GROEP: NavGroep = {
  sleutel: "zoWerktHet",
  links: [
    { href: "/handleiding", sleutel: "handleiding" },
    { href: "/fiscaal-kader", sleutel: "fiscaalKader" },
    { href: "/parameters", sleutel: "parameters" },
    { href: "/over", sleutel: "over" },
  ],
};

/** Voor wie aangemeld is staat de simulator hier: bruikbaar, maar niet dagelijks. */
export const MEER_GROEP: NavGroep = {
  sleutel: "meer",
  links: [
    { href: "/modellen", sleutel: "modellen" },
    { href: "/simulator", sleutel: "simulator" },
    { href: "/handleiding", sleutel: "handleiding" },
    { href: "/fiscaal-kader", sleutel: "fiscaalKader" },
    { href: "/parameters", sleutel: "parameters" },
    { href: "/over", sleutel: "over" },
  ],
};

export function hoofdLinks(aangemeld: boolean): readonly NavLink[] {
  return aangemeld ? EIGEN_LINKS : PUBLIEKE_LINKS;
}

export function hoofdGroep(aangemeld: boolean): NavGroep {
  return aangemeld ? MEER_GROEP : UITLEG_GROEP;
}

/**
 * De voettekst mag wél alles tonen, ook de afgeschermde pagina's: daar is ruimte
 * en het is de plaats waar je naar iets zoekt dat je in het menu niet vond.
 */
export const VOETTEKST_KOLOMMEN: readonly { sleutel: string; links: readonly NavLink[] }[] = [
  {
    sleutel: "navigatie",
    links: [
      { href: "/simulator", sleutel: "simulator" },
      { href: "/catalogus", sleutel: "catalogus" },
      { href: "/vergelijking", sleutel: "vergelijking" },
      { href: "/vloot", sleutel: "vloot" },
      { href: "/wagens", sleutel: "wagensBeheren" },
      { href: "/modellen", sleutel: "modellen" },
    ],
  },
  {
    sleutel: "kennis",
    links: [
      { href: "/fiscaal-kader", sleutel: "fiscaalKader" },
      { href: "/parameters", sleutel: "parameters" },
      { href: "/handleiding", sleutel: "handleiding" },
      { href: "/over", sleutel: "over" },
      { href: "/steunen", sleutel: "steunen" },
    ],
  },
  {
    sleutel: "juridisch",
    links: [
      { href: "/privacy", sleutel: "privacy" },
      { href: "/voorwaarden", sleutel: "voorwaarden" },
      // De naamsvermelding die CC BY en CC BY-SA verplichten. Ze stond alleen in
      // public/cars/BRONNEN.md, en een bestand in de repository is geen
      // vermelding voor wie de site bezoekt.
      { href: "/fotobronnen", sleutel: "fotobronnen" },
    ],
  },
];

/**
 * Waar "Start hier" naartoe gaat.
 *
 * Bewust de simulator en niet de registratiepagina. "Gratis starten" vroeg de
 * bezoeker iets af te geven vóór hij iets kreeg, terwijl deze applicatie een
 * volledige berekening kan tonen zonder account. Registreren is pas nodig om te
 * bewaren en te vergelijken, en dan is de waarde al bewezen.
 */
export const START_HIER_HREF = "/simulator";
