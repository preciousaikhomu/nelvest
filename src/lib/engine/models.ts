// Signal models. Each returns an action and a 0–1 confidence score.
// v1 models are transparent, rules-based scorers. A trained ML model can be added by implementing SignalModel.
import { Candle, ema, rsi, atrPct, sigmoid, clamp } from "./indicators";

export type SignalOut = { action: "BUY" | "SELL" | "HOLD"; confidence: number; features: Record<string, number> };
export interface SignalModel { id: string; label: string; predict(c: Candle[]): SignalOut }

function features(c: Candle[]) {
  const close = c.map((x) => x.c);
  const e20 = ema(close, 20), e50 = ema(close, 50), e200 = ema(close, 200);
  const n = close.length - 1;
  return {
    price: close[n],
    trend: (e20[n] - e50[n]) / close[n],          // short vs medium trend
    longTrend: (e50[n] - e200[n]) / close[n],     // medium vs long trend
    slope: (e20[n] - e20[Math.max(0, n - 5)]) / close[n],
    rsi: rsi(close, 14),
    vol: atrPct(c, 14),
  };
}

const decide = (score: number, f: Record<string, number>, buyAt = 0.55, sellAt = 0.4): SignalOut => {
  const confidence = clamp(score, 0, 1);
  const action = confidence >= buyAt ? "BUY" : confidence <= sellAt ? "SELL" : "HOLD";
  // For SELL, report confidence in the sell decision
  return { action, confidence: action === "SELL" ? 1 - confidence : confidence, features: f };
};

export const balancedMomentum: SignalModel = {
  id: "balanced_momentum", label: "Balanced momentum",
  predict(c) {
    const f = features(c);
    const volPenalty = f.vol > 0.06 ? 0.6 : 0; // stand aside in extreme volatility
    const rsiTerm = f.rsi > 75 ? -0.8 : f.rsi < 30 ? -0.3 : (f.rsi - 50) / 40;
    const x = 120 * f.trend + 250 * f.slope + 40 * f.longTrend + rsiTerm - volPenalty;
    return decide(sigmoid(x), f);
  },
};

export const conservativeTrend: SignalModel = {
  id: "conservative_trend", label: "Conservative trend",
  predict(c) {
    const f = features(c);
    const x = 80 * f.longTrend + 60 * f.trend - (f.vol > 0.04 ? 1 : 0);
    return decide(sigmoid(x), f, 0.62, 0.42);
  },
};

export const meanReversion: SignalModel = {
  id: "mean_reversion", label: "Mean reversion",
  predict(c) {
    const f = features(c);
    const x = (45 - f.rsi) / 10 + (f.longTrend > 0 ? 0.3 : -0.3);
    return decide(sigmoid(x), f, 0.6, 0.35);
  },
};

export const MODELS: Record<string, SignalModel> = {
  [balancedMomentum.id]: balancedMomentum,
  [conservativeTrend.id]: conservativeTrend,
  [meanReversion.id]: meanReversion,
};
