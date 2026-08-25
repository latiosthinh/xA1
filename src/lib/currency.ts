// Base currency: VND (e.g. 70000 VND)
// Exchange rate: 1 USD = 26,000 VND -> 70,000 VND = 2.69$ (or 2.68$)
export const VND_TO_USD_RATE = 26000;

export function formatDualPrice(vndAmount: number): string {
  const vndFormatted = Math.round(vndAmount).toLocaleString("vi-VN");
  const usdFormatted = (vndAmount / VND_TO_USD_RATE).toFixed(2);
  return `${vndFormatted}VND/${usdFormatted}$`;
}

export function formatVND(vndAmount: number): string {
  return `${Math.round(vndAmount).toLocaleString("vi-VN")} VND`;
}

export function formatUSD(vndAmount: number): string {
  return `${(vndAmount / VND_TO_USD_RATE).toFixed(2)}$`;
}

export function toUSD(vndAmount: number): number {
  return Number((vndAmount / VND_TO_USD_RATE).toFixed(2));
}
