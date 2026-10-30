// Central place for configuration and safety switches.
export type TradingMode = "paper" | "testnet" | "live";

export function tradingMode(): TradingMode {
  const m = (process.env.TRADING_MODE || "paper").toLowerCase();
  if (m === "live") {
    // Live trading only starts when the operator has explicitly acknowledged approval.
    if (process.env.LIVE_TRADING_ACK !== "I-HAVE-SEC-APPROVAL") return "paper";
    return "live";
  }
  return m === "testnet" ? "testnet" : "paper";
}

export const depositsEnabled = () => process.env.DEPOSITS_ENABLED === "true";

export function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable ${name}`);
  return v;
}
