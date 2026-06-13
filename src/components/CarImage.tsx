import type { Voertuigtype } from "@/lib/fiscaal/types";

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

const label: Record<Voertuigtype, string> = {
  BEV: "100% elektrisch",
  PHEV: "Plug-in hybride",
  HEV: "Hybride",
  fossiel: "Brandstof",
};

function bodyStyle(segment: string | null): BodyStyle {
  const s = (segment ?? "").toLowerCase();
  if (s.includes("suv")) return "suv";
  if (s.includes("berline")) return "sedan";
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
  imageUrl,
  alt,
  className = "",
}: {
  type: Voertuigtype;
  segment: string | null;
  imageUrl?: string | null;
  alt?: string;
  className?: string;
}) {
  if (imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={imageUrl} alt={alt ?? "Wagen"} className={`h-full w-full object-cover ${className}`} />;
  }

  const style = bodyStyle(segment);
  const g = geometrie(style);
  const kleur = accent[type];

  return (
    <svg
      viewBox="0 0 260 150"
      className={className}
      role="img"
      aria-label={alt ?? `${type} illustratie`}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id={`bg-${type}-${style}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#eef1f5" />
        </linearGradient>
        <linearGradient id={`body-${type}-${style}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1d3e5c" />
          <stop offset="100%" stopColor="#0b1f33" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width="260" height="150" rx="16" fill={`url(#bg-${type}-${style})`} />

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
        fill={`url(#body-${type}-${style})`}
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

      <text x="20" y="142" fontSize="11" fontWeight="600" fill="#0b1f33" opacity="0.7">
        {label[type]}
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
