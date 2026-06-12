const euroFmt = new Intl.NumberFormat("nl-BE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const euroCentFmt = new Intl.NumberFormat("nl-BE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const getalFmt = new Intl.NumberFormat("nl-BE", { maximumFractionDigits: 2 });

export const euro = (n: number) => euroFmt.format(n);
export const euroCent = (n: number) => euroCentFmt.format(n);
export const getal = (n: number) => getalFmt.format(n);
export const pct = (n: number) => `${getalFmt.format(n)}%`;
