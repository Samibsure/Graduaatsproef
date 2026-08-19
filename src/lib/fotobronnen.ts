import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * De naamsvermelding bij de modelfoto's.
 *
 * Van de 159 foto's in public/cars staan er 155 onder CC BY of CC BY-SA. Die
 * licenties vragen alle drie hetzelfde: de auteur noemen, de licentie noemen en
 * naar de bron linken, dáár waar het werk gebruikt wordt. Dat stond alleen in
 * public/cars/BRONNEN.md, een bestand in de repository dat nergens vandaan
 * gelinkt werd; voor een publieke site is dat geen vermelding.
 *
 * Deze module leest dezelfde tabel die `scripts/wagenfotos.py` schrijft, zodat de
 * pagina niet uit de pas kan lopen met wat er werkelijk in public/cars staat.
 */

export interface Fotobron {
  bestand: string;
  auteur: string;
  licentie: string;
  titel: string;
  url: string;
}

/**
 * | `bestand.jpg` | Auteur | CC BY-SA 4.0 | [Titel](https://...) |
 *
 * De URL wordt gulzig gelezen tot het láátste haakje voor de streep. Bestanden
 * op Commons heten geregeld iets als `..._(cropped).jpg`, en een niet-gulzige
 * lezing stopte bij dat eerste haakje: tweeënvijftig foto's vielen daardoor
 * buiten de vermelding.
 */
const RIJ = /^\|\s*`([^`]+)`\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*\[([^\]]+)\]\((.+)\)\s*\|\s*$/;

export function leesFotobronnen(inhoud: string): Fotobron[] {
  return inhoud.split("\n").flatMap((regel) => {
    const m = regel.match(RIJ);
    if (!m) return [];
    return [{ bestand: m[1], auteur: m[2], licentie: m[3], titel: m[4], url: m[5] }];
  });
}

/** Leest het bestand van schijf. Gebeurt tijdens de build, niet per verzoek. */
export function laadFotobronnen(): Fotobron[] {
  return leesFotobronnen(
    readFileSync(join(process.cwd(), "public", "cars", "BRONNEN.md"), "utf8"),
  );
}
