export type Candle = { t: number; o: number; h: number; l: number; c: number; v: number };

export function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out: number[] = [];
  values.forEach((v, i) => out.push(i === 0 ? v : v * k + out[i - 1] * (1 - k)));
  return out;
}

export function rsi(values: number[], period = 14): number {
  if (values.length <= period) return 50;
  let gain = 0, loss = 0;
  for (let i = values.length - period; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    if (d >= 0) gain += d; else loss -= d;
  }
  if (loss === 0) return 100;
  const rs = gain / period / (loss / period);
  return 100 - 100 / (1 + rs);
}

export function atrPct(c: Candle[], period = 14): number {
  const s = c.slice(-period - 1);
  let sum = 0;
  for (let i = 1; i < s.length; i++) {
    const tr = Math.max(s[i].h - s[i].l, Math.abs(s[i].h - s[i - 1].c), Math.abs(s[i].l - s[i - 1].c));
    sum += tr;
  }
  const last = s[s.length - 1]?.c || 1;
  return sum / Math.max(1, s.length - 1) / last;
}

export const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
export const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
