import type { TaxParameters } from "./fiscaal/types";

/**
 * De fiscale parameters in weergavevolgorde, met per veld de vertaalsleutel
 * voor het label en voor de eenheid. Gedeeld door de publieke referentiepagina
 * en de beheerpagina, zodat beide dezelfde volgorde en benaming aanhouden.
 *
 * De uitlegsleutel is er later bij gekomen. De pagina somde zestien velden op
 * met labels als "VAA → VU met tank-/laadkaart: 40%", en dat is een cijfer
 * zonder betekenis: er stond nergens wat het is of welke formule het voedt. Het
 * label wordt afgeleid van `sleutel`: `${sleutel}Uitleg`.
 */
export const PARAM_VELDEN: Array<{
  veld: keyof TaxParameters;
  sleutel: string;
  eenheid?: string;
  /** Anker op /fiscaal-kader waar de formule staat die dit veld gebruikt. */
  anker?: string;
}> = [
  { veld: "vaa_minimum", sleutel: "veldVaaMinimum", eenheid: "eenheidEuroJaar" , anker: "fk-vaa" },
  { veld: "ref_co2_benzine", sleutel: "veldRefBenzine", eenheid: "eenheidGram" , anker: "fk-vaa" },
  { veld: "ref_co2_diesel", sleutel: "veldRefDiesel", eenheid: "eenheidGram" , anker: "fk-vaa" },
  { veld: "co2_pct_min", sleutel: "veldCo2Min", eenheid: "eenheidProcent" , anker: "fk-vaa" },
  { veld: "co2_pct_max", sleutel: "veldCo2Max", eenheid: "eenheidProcent" , anker: "fk-vaa" },
  { veld: "co2_pct_basis", sleutel: "veldCo2Basis", eenheid: "eenheidProcent" , anker: "fk-vaa" },
  { veld: "co2_pct_per_gram", sleutel: "veldCo2PerGram", eenheid: "eenheidProcent" , anker: "fk-vaa" },
  { veld: "rsz_index", sleutel: "veldRszIndex" , anker: "fk-co2" },
  { veld: "rsz_min_maand", sleutel: "veldRszMinMaand", eenheid: "eenheidEuroMaand" , anker: "fk-co2" },
  { veld: "rsz_min_basis", sleutel: "veldRszMinBasis", eenheid: "eenheidEuroMaand" , anker: "fk-co2" },
  { veld: "rsz_multiplicator", sleutel: "veldRszMultiplicator" , anker: "fk-co2" },
  { veld: "venb_tarief", sleutel: "veldVenb", eenheid: "eenheidProcent" , anker: "fk-vu" },
  { veld: "kmo_tarief", sleutel: "veldKmo", eenheid: "eenheidProcent" , anker: "fk-vu" },
  { veld: "kmo_min_bezoldiging", sleutel: "veldKmoMin", eenheid: "eenheidEuro" , anker: "fk-vu" },
  { veld: "vu_pct_met_kaart", sleutel: "veldVuMetKaart", eenheid: "eenheidProcent" , anker: "fk-vu" },
  { veld: "vu_pct_zonder_kaart", sleutel: "veldVuZonderKaart", eenheid: "eenheidProcent" , anker: "fk-vu" },
];
