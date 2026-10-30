// Exchange access through CCXT. Investor keys are decrypted only in memory, only for the call that needs them.
import ccxt from "ccxt";
import type { Exchange } from "ccxt";
import { tradingMode } from "./env";

export const SUPPORTED = {
  binance: { label: "Binance", region: "Global", checks: "full" },
  bybit: { label: "Bybit", region: "Global", checks: "full" },
  luno: { label: "Luno", region: "Nigeria", checks: "partial" },
} as const;
export type ExchangeId = keyof typeof SUPPORTED;
export const isSupported = (id: string): id is ExchangeId => id in SUPPORTED;

export function makeExchange(id: ExchangeId | string, creds?: { apiKey: string; secret: string }): Exchange {
  const Ctor = (ccxt as unknown as Record<string, new (o: object) => Exchange>)[id];
  if (!Ctor) throw new Error(`Exchange ${id} is not available`);
  const ex = new Ctor({ ...(creds ?? {}), enableRateLimit: true, options: { defaultType: "spot" } });
  if (tradingMode() === "testnet" && ex.urls?.test) ex.setSandboxMode(true);
  return ex;
}

export type KeyCheck = { canTrade: boolean; canWithdraw: boolean | null; detail: string };

/** Confirms the key works and inspects its permissions. A key that can withdraw is always refused. */
export async function checkKey(id: ExchangeId, apiKey: string, secret: string): Promise<KeyCheck> {
  const ex = makeExchange(id, { apiKey, secret });
  await ex.fetchBalance(); // proves the key is valid
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const anyEx = ex as any;
  if (id === "binance") {
    const r = await anyEx.sapiGetAccountApiRestrictions();
    return {
      canTrade: !!r.enableSpotAndMarginTrading,
      canWithdraw: !!r.enableWithdrawals,
      detail: r.ipRestrict ? "IP allowlist on" : "IP allowlist off. Add our server IP on Binance.",
    };
  }
  if (id === "bybit") {
    const r = await anyEx.privateGetV5UserQueryApi();
    const p = r?.result?.permissions ?? {};
    const readOnly = r?.result?.readOnly === 1 || r?.result?.readOnly === "1";
    return {
      canTrade: !readOnly && Array.isArray(p.Spot) && p.Spot.length > 0,
      canWithdraw: Array.isArray(p.Wallet) && p.Wallet.some((x: string) => /withdraw/i.test(x)),
      detail: r?.result?.ips?.length ? "IP allowlist on" : "IP allowlist off. Add our server IP on Bybit.",
    };
  }
  return { canTrade: true, canWithdraw: null, detail: "This exchange does not report key permissions. Investor must confirm withdrawals are off." };
}

export async function fetchCandles(exchangeId: string, pair: string, timeframe: string, limit = 220) {
  const ex = makeExchange(exchangeId);
  const rows = await ex.fetchOHLCV(pair, timeframe, undefined, limit);
  return rows.map((r) => ({ t: Number(r[0]), o: Number(r[1]), h: Number(r[2]), l: Number(r[3]), c: Number(r[4]), v: Number(r[5]) }));
}
