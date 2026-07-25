import type { TaxParameters } from "./fiscaal/types";

/**
 * De fiscale parameters in weergavevolgorde, met per veld de vertaalsleutel
 * voor het label en voor de eenheid. Gedeeld door de publieke referentiepagina
 * en de beheerpagina, zodat beide dezelfde volgorde en benaming aanhouden.
 */
export const PARAM_VELDEN: Array<{
  veld: keyof TaxParameters;
  sleutel: string;
  eenheid?: string;
}> = [
  { veld: "vaa_minimum", sleutel: "veldVaaMinimum", eenheid: "eenheidEuroJaar" },
  { veld: "ref_co2_benzine", sleutel: "veldRefBenzine", eenheid: "eenheidGram" },
  { veld: "ref_co2_diesel", sleutel: "veldRefDiesel", eenheid: "eenheidGram" },
  { veld: "co2_pct_min", sleutel: "veldCo2Min", eenheid: "eenheidProcent" },
  { veld: "co2_pct_max", sleutel: "veldCo2Max", eenheid: "eenheidProcent" },
  { veld: "co2_pct_basis", sleutel: "veldCo2Basis", eenheid: "eenheidProcent" },
  { veld: "co2_pct_per_gram", sleutel: "veldCo2PerGram", eenheid: "eenheidProcent" },
  { veld: "rsz_index", sleutel: "veldRszIndex" },
  { veld: "rsz_min_maand", sleutel: "veldRszMinMaand", eenheid: "eenheidEuroMaand" },
  { veld: "rsz_min_basis", sleutel: "veldRszMinBasis", eenheid: "eenheidEuroMaand" },
  { veld: "rsz_multiplicator", sleutel: "veldRszMultiplicator" },
  { veld: "venb_tarief", sleutel: "veldVenb", eenheid: "eenheidProcent" },
  { veld: "kmo_tarief", sleutel: "veldKmo", eenheid: "eenheidProcent" },
  { veld: "kmo_min_bezoldiging", sleutel: "veldKmoMin", eenheid: "eenheidEuro" },
  { veld: "vu_pct_met_kaart", sleutel: "veldVuMetKaart", eenheid: "eenheidProcent" },
  { veld: "vu_pct_zonder_kaart", sleutel: "veldVuZonderKaart", eenheid: "eenheidProcent" },
];
