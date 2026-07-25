import type { ReactNode } from "react";
import { Card, Container, PageHead } from "@/components/ui";

/** Omkadering voor de juridische pagina's: één kolom, rustig leesbaar. */
export function JuridischePagina({
  eyebrow,
  titel,
  intro,
  bijgewerkt,
  children,
}: {
  eyebrow: string;
  titel: string;
  intro: string;
  bijgewerkt: string;
  children: ReactNode;
}) {
  return (
    <Container className="py-12">
      <div className="mx-auto max-w-[52em]">
        <PageHead eyebrow={eyebrow} title={titel} sub={intro} />
        <Card className="p-6 sm:p-9">
          <div className="space-y-7">{children}</div>
          <p className="mt-9 border-t border-line pt-5 text-[13px] text-ink-500">
            Laatst bijgewerkt op {bijgewerkt}.
          </p>
        </Card>
      </div>
    </Container>
  );
}

export function Artikel({ titel, children }: { titel: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="m-0 mb-2.5 text-[19px] font-bold tracking-[-0.01em] text-ink">{titel}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-ink-700">{children}</div>
    </section>
  );
}

export function Lijst({ items }: { items: ReactNode[] }) {
  return (
    <ul className="m-0 list-none space-y-2 p-0">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5">
          <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
