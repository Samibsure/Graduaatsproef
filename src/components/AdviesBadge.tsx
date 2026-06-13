import type { Advies } from "@/lib/fiscaal/scoring";

const stijlen: Record<Advies, string> = {
  aanvaarden: "bg-emerald-100 text-emerald-800",
  overwegen: "bg-amber-100 text-amber-800",
  afwijzen: "bg-rose-100 text-rose-800",
};

export default function AdviesBadge({ advies }: { advies: Advies }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${stijlen[advies]}`}>
      {advies}
    </span>
  );
}
