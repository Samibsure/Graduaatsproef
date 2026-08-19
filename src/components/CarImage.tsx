import { useId } from "react";
import type { Carrosserie, Voertuigtype } from "@/lib/fiscaal/types";

/**
 * Visuele weergave van een wagen. Toont een echte foto wanneer `imageUrl` is
 * ingevuld in de catalogus, en valt anders terug op een verzorgde eigen
 * SVG-illustratie per carrosserietype en aandrijving. De SVG is volledig
 * zelfstandig (geen externe assets, geen licentie- of handelsmerkproblemen).
 */

type BodyStyle = "suv" | "sedan" | "hatchback";

const accent: Record<Voertuigtype, string> = {
  BEV: "#10b981",
  PHEV: "#3b82f6",
  HEV: "#8b5cf6",
  fossiel: "#ef4444",
};

/**
 * De carrosserievorm van de illustratie.
 *
 * Hier stond een substring-zoektocht in de Nederlandstalige segmenttekst naar
 * "suv" en "berline". Elk nieuw segmentwoord werd daardoor zwijgend een
 * hatchback, en in het Frans of het Engels sowieso. Nu telt het expliciete veld
 * `carrosserie` van het model; de tekstherkenning blijft alleen als terugval
 * voor rijen die dat veld niet hebben.
 */
function bodyStyle(segment: string | null, carrosserie?: Carrosserie | null): BodyStyle {
  if (carrosserie) {
    if (carrosserie === "suv" || carrosserie === "mpv" || carrosserie === "bestelwagen") return "suv";
    if (carrosserie === "berline" || carrosserie === "break" || carrosserie === "coupe") return "sedan";
    return "hatchback";
  }
  const s = (segment ?? "").toLowerCase();
  if (s.includes("suv")) return "suv";
  if (s.includes("berline") || s.includes("saloon")) return "sedan";
  return "hatchback";
}

interface CabinGeo {
  bodyTop: number;
  bodyX: number;
  bodyW: number;
  cabin: string;
  windows: string;
}

function geometrie(style: BodyStyle): CabinGeo {
  if (style === "suv") {
    return {
      bodyTop: 66,
      bodyX: 26,
      bodyW: 208,
      cabin: "M84 70 L98 40 Q100 36 106 36 L172 36 Q178 36 180 40 L196 70 Z",
      windows: "M100 66 L110 46 L132 46 L132 66 Z M140 66 L140 46 L168 46 L178 66 Z",
    };
  }
  if (style === "sedan") {
    return {
      bodyTop: 76,
      bodyX: 24,
      bodyW: 212,
      cabin: "M88 78 L106 50 Q109 46 116 46 L162 46 Q169 46 172 50 L186 78 Z",
      windows: "M104 74 L116 54 L132 54 L132 74 Z M140 74 L140 54 L160 54 L170 74 Z",
    };
  }
  return {
    bodyTop: 74,
    bodyX: 30,
    bodyW: 196,
    cabin: "M80 76 L94 50 Q97 46 104 46 L148 46 Q156 46 160 54 L176 76 Z",
    windows: "M98 72 L106 54 L126 54 L126 72 Z M134 72 L134 54 L150 54 L162 72 Z",
  };
}

export default function CarImage({
  type,
  segment,
  carrosserie,
  imageUrl,
  alt,
  className = "",
  eager = false,
}: {
  type: Voertuigtype;
  segment: string | null;
  carrosserie?: Carrosserie | null;
  imageUrl?: string | null;
  alt?: string;
  className?: string;
  /**
   * Voor de enkele foto die meteen in beeld staat, zoals de kaart bovenaan de
   * startpagina. Die is de grootste afbeelding boven de vouw en dus wat Google
   * als LCP meet; luie lading zou hem juist vertragen.
   */
  eager?: boolean;
}) {
  // Eén id-voorvoegsel per instantie. De verlopen hadden een id dat alleen van
  // het type en de vorm afhing, dus stonden er op een catalogusraster tientallen
  // elementen met hetzelfde id: ongeldige HTML, en de browser mag dan zelf kiezen
  // welk verloop hij toepast.
  const uniek = useId().replace(/:/g, "");

  if (imageUrl) {
    return (
      // Bewust geen next/image: de foto's staan lokaal in public/cars en de CSP
      // laat toch geen externe bron toe, dus de optimalisatielaag levert hier
      // niets op.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        // Zonder alt is dit een gat voor een schermlezer; de aanroeper geeft de
        // wagennaam mee. De vorige terugval was hardgecodeerd Nederlands.
        alt={alt ?? ""}
        /*
         * De catalogus toont er vierentwintig in één keer, en elke "Toon meer"
         * legt er vierentwintig bij. Zonder `loading` haalde de browser die
         * allemaal meteen op: ongeveer 3 MB waarvan een bezoeker er twee ziet.
         *
         * `width` en `height` zijn de verhouding van het bronbestand (960x600).
         * Ze staan er niet voor de afmeting op het scherm -- dat doet de CSS --
         * maar zodat de browser de ruimte kent voordat de foto binnen is. Zonder
         * die twee sprong het raster bij elke foto die aankwam.
         */
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        width={960}
        height={600}
        className={`h-full w-full object-cover ${className}`}
      />
    );
  }

  const style = bodyStyle(segment, carrosserie);
  const g = geometrie(style);
  const kleur = accent[type];

  return (
    <svg
      viewBox="0 0 260 150"
      className={className}
      role="img"
      aria-label={alt ?? type}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id={`bg-${uniek}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#eef1f5" />
        </linearGradient>
        <linearGradient id={`body-${uniek}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1d3e5c" />
          <stop offset="100%" stopColor="#0b1f33" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width="260" height="150" rx="16" fill={`url(#bg-${uniek})`} />

      {/* grondschaduw */}
      <ellipse cx="130" cy="122" rx="104" ry="9" fill="#0b1f33" opacity="0.08" />

      {/* cabine + ramen */}
      <path d={g.cabin} fill="#16344f" />
      <path d={g.windows} fill="#cfe0ee" />

      {/* carrosserie */}
      <rect
        x={g.bodyX}
        y={g.bodyTop}
        width={g.bodyW}
        height={118 - g.bodyTop}
        rx="18"
        fill={`url(#body-${uniek})`}
      />
      {/* accentlijn per aandrijving */}
      <rect x={g.bodyX + 10} y="104" width={g.bodyW - 20} height="5" rx="2.5" fill={kleur} opacity="0.9" />
      {/* koplamp */}
      <rect x={g.bodyX + g.bodyW - 14} y={g.bodyTop + 8} width="10" height="6" rx="3" fill={kleur} />

      {/* wielen */}
      {[70, 190].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="118" r="20" fill="#0b1426" />
          <circle cx={cx} cy="118" r="9" fill="#9fb0c2" />
          <circle cx={cx} cy="118" r="3.4" fill="#0b1426" />
        </g>
      ))}

      {/* badge aandrijving */}
      <g transform="translate(214, 24)">
        <circle r="16" fill={kleur} />
        <Glyph type={type} />
      </g>

      {/* Het voertuigtype als code (BEV, PHEV, HEV) in plaats van als zin.
          Hier stond hardgecodeerde Nederlandse tekst ("100% elektrisch",
          "Plug-in hybride"), die zo op elke kaart verscheen, ook voor
          Franstalige en Engelstalige bezoekers. */}
      <text x="20" y="142" fontSize="11" fontWeight="700" fill="#0b1f33" opacity="0.7">
        {type}
      </text>
    </svg>
  );
}

function Glyph({ type }: { type: Voertuigtype }) {
  if (type === "fossiel") {
    return <path d="M0 -8 C5 -2 6 3 0 8 C-6 3 -5 -2 0 -8 Z" fill="#ffffff" />;
  }
  if (type === "HEV") {
    return <path d="M-6 6 C-7 -4 2 -8 7 -7 C7 0 2 7 -6 6 Z M-6 6 L2 -2" fill="#ffffff" stroke="#ffffff" strokeWidth="0.5" />;
  }
  // BEV en PHEV: bliksemschicht
  return <path d="M2 -9 L-5 1 L0 1 L-2 9 L6 -2 L1 -2 Z" fill="#ffffff" />;
}
