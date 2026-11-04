const money = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const dateTime = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" });

export const formatMoney = (pesos: number) => money.format(pesos);

export const formatRate = (basisPoints: number) => `${basisPoints / 100} %`;

export const formatDateTime = (iso: string | null) => (iso ? dateTime.format(new Date(iso)) : "—");

// El precio incluye el impuesto: base = precio / (1 + tarifa).
export function splitTax(price: number, basisPoints: number) {
  const base = Math.round(price / (1 + basisPoints / 10_000));
  return { base, tax: price - base };
}
