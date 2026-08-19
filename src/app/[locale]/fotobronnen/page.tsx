import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container, PageHead, Tabel } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { laadFotobronnen } from "@/lib/fotobronnen";
import { paginaAlternates } from "@/lib/metadata";

/**
 * De naamsvermelding bij de modelfoto's.
 *
 * Van de 159 foto's staan er 155 onder CC BY of CC BY-SA. Die licenties
 * verplichten alle drie hetzelfde: de auteur noemen, de licentie noemen en naar
 * de bron linken, en wel dáár waar het werk gebruikt wordt. Tot nu toe stond dat
 * alleen in public/cars/BRONNEN.md: een bestand in de repository, nergens
 * vandaan gelinkt. Voor een publieke site is dat geen naamsvermelding.
 *
 * De foto's zijn bovendien bijgesneden naar 960x600. Dat is een bewerking, dus
 * de ShareAlike-verplichting van CC BY-SA loopt mee; die staat onderaan de
 * pagina benoemd.
 */

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "fotobronnen" });
  return {
    title: t("titel"),
    description: t("metaBeschrijving"),
    alternates: paginaAlternates(locale, "/fotobronnen"),
  };
}

export default async function FotobronnenPagina({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "fotobronnen" });
  const bronnen = laadFotobronnen();

  return (
    <Container className="py-[52px]">
      <PageHead title={t("titel")} sub={t("intro", { aantal: bronnen.length })} />

      <div className="mb-8 max-w-[46em] space-y-3 text-[15px] leading-relaxed text-ink-700">
        <p className="m-0">{t("uitleg")}</p>
        <p className="m-0">{t("bewerking")}</p>
      </div>

      <div className="rounded-[14px] border border-line bg-white">
        <Tabel minBreedte={720} bijschrift={t("titel")}>
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className="px-5 py-3 text-left text-[12px] font-bold uppercase tracking-[0.1em] text-ink-500">
                {t("kolomModel")}
              </th>
              <th scope="col" className="px-5 py-3 text-left text-[12px] font-bold uppercase tracking-[0.1em] text-ink-500">
                {t("kolomAuteur")}
              </th>
              <th scope="col" className="px-5 py-3 text-left text-[12px] font-bold uppercase tracking-[0.1em] text-ink-500">
                {t("kolomLicentie")}
              </th>
              <th scope="col" className="px-5 py-3 text-left text-[12px] font-bold uppercase tracking-[0.1em] text-ink-500">
                {t("kolomBron")}
              </th>
            </tr>
          </thead>
          <tbody>
            {bronnen.map((b) => (
              <tr key={b.bestand} className="border-b border-line last:border-0">
                <th scope="row" className="px-5 py-2.5 text-left font-mono text-[13px] font-normal text-ink-700">
                  {b.bestand.replace(/\.jpg$/, "")}
                </th>
                <td className="px-5 py-2.5 text-[14px] text-ink">{b.auteur}</td>
                <td className="px-5 py-2.5 text-[14px] text-ink-700">{b.licentie}</td>
                <td className="px-5 py-2.5 text-[14px]">
                  <a
                    href={b.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ink underline underline-offset-2"
                  >
                    {b.titel}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </Tabel>
      </div>

      <p className="mt-8 text-[14px] text-ink-500">
        {t.rich("terug", {
          catalogus: (chunks) => (
            <Link href="/catalogus" className="text-ink underline underline-offset-2">
              {chunks}
            </Link>
          ),
        })}
      </p>
    </Container>
  );
}
