import { db } from "./db";

type Holdings = Record<string, { qty: number; avg: number }>;

/** Latest known price per pair, from the engine's most recent signals. */
export async function latestPrices() {
  const rows = await db.signal.findMany({ orderBy: { createdAt: "desc" }, take: 60 });
  const out: Record<string, number> = {};
  for (const r of rows) if (!(r.pair in out)) out[r.pair] = Number(r.price);
  return out;
}

export function valueAccount(a: { cashUsdt: unknown; holdings: unknown; depositedUsdt: unknown; peakValueUsdt: unknown }, prices: Record<string, number>) {
  const h = (a.holdings ?? {}) as Holdings;
  const cash = Number(a.cashUsdt);
  const rows = Object.entries(h).map(([asset, x]) => {
    const p = prices[`${asset}/USDT`] ?? x.avg;
    return { asset, qty: x.qty, avg: x.avg, price: p, value: x.qty * p };
  });
  const equity = cash + rows.reduce((s, r) => s + r.value, 0);
  const deposited = Number(a.depositedUsdt);
  const peak = Math.max(Number(a.peakValueUsdt), equity);
  return { cash, rows, equity, deposited, pnl: equity - deposited, drawdownPct: peak > 0 ? ((peak - equity) / peak) * 100 : 0 };
}

/** Rebuilds an equity curve from the trade log (cash + cost basis), good enough for a dashboard sparkline. */
export async function equityCurve(accountIds: string[], startValue: number) {
  const trades = await db.trade.findMany({ where: { accountId: { in: accountIds } }, orderBy: { createdAt: "asc" }, take: 2000 });
  let v = startValue;
  const pts = [{ t: trades[0]?.createdAt ?? new Date(), v }];
  for (const t of trades) { v += Number(t.realizedPnlUsdt ?? 0) - (t.realizedPnlUsdt === null ? Number(t.feeUsdt) : 0); pts.push({ t: t.createdAt, v }); }
  return pts;
}
