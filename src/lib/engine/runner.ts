// One engine "tick": read config, score every pair, then rebalance each eligible account inside its risk limits.
// Runs from the worker (scripts/engine-worker.ts) or the protected route /api/engine/tick.
import { Prisma, TradeMode } from "@prisma/client";
import { db } from "../db";
import { tradingMode } from "../env";
import { decrypt } from "../vault";
import { fetchCandles, makeExchange } from "../exchange";
import { MODELS, SignalOut } from "./models";
import { audit } from "../audit";

type Holding = { qty: number; avg: number };
type Holdings = Record<string, Holding>;
const FEE = 0.001; // 0.1% assumed taker fee (paper mode)
const MIN_ORDER_USDT = 10;

const n = (d: Prisma.Decimal | number | null | undefined) => Number(d ?? 0);
const base = (pair: string) => pair.split("/")[0];

export async function runTick() {
  const cfg = await db.botConfig.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  const mode = tradingMode();
  const tradeMode: TradeMode = mode === "live" ? "LIVE" : mode === "testnet" ? "TESTNET" : "PAPER";
  if (cfg.state !== "RUNNING") return { skipped: `Bot is ${cfg.state.toLowerCase()}` };

  const run = await db.engineRun.create({ data: { mode: tradeMode } });
  const summary: Record<string, unknown> = { signals: {}, orders: 0, accounts: 0, paused: [] as string[] };
  try {
    const model = MODELS[cfg.strategy] ?? MODELS.balanced_momentum;
    const signalSource = process.env.SIGNAL_EXCHANGE || "binance";

    // 1) Score every enabled pair
    const signals: Record<string, SignalOut> = {};
    for (const pair of cfg.pairs) {
      try {
        const candles = await fetchCandles(signalSource, pair, cfg.timeframe);
        if (candles.length < 200) continue;
        const s = model.predict(candles);
        signals[pair] = s;
        await db.signal.create({
          data: { pair, timeframe: cfg.timeframe, action: s.action, confidence: s.confidence.toFixed(3), price: s.features.price, features: s.features },
        });
      } catch (e) {
        console.error(`signal ${pair}`, e);
      }
    }
    summary.signals = Object.fromEntries(Object.entries(signals).map(([p, s]) => [p, `${s.action} ${s.confidence.toFixed(2)}`]));

    // 2) Rebalance each eligible account
    const accounts = await db.investmentAccount.findMany({
      where: { active: true, user: { kycStatus: "VERIFIED", disabled: false } },
      include: { connection: true },
    });
    const since = new Date(Date.now() - 24 * 3600 * 1000);

    for (const acct of accounts) {
      if (acct.mode === "BYO" && acct.connection?.status !== "ACTIVE") continue;
      summary.accounts = (summary.accounts as number) + 1;
      const holdings = (acct.holdings ?? {}) as unknown as Holdings;
      let cash = n(acct.cashUsdt);

      const price = (pair: string) => signals[pair]?.features.price ?? 0;
      const equity = () => cash + Object.entries(holdings).reduce((s, [a, h]) => s + h.qty * price(`${a}/USDT`), 0);
      const eq = equity();
      if (eq <= 0) continue;

      // Drawdown guard: the stricter of the global pause and the investor's own stop
      const peak = Math.max(n(acct.peakValueUsdt), eq);
      const dd = (peak - eq) / peak * 100;
      const limit = Math.min(n(cfg.drawdownPausePct), acct.stopDrawdownPct);
      if (dd >= limit) {
        await db.investmentAccount.update({ where: { id: acct.id }, data: { active: false, pausedReason: `Drawdown ${dd.toFixed(1)}% hit the ${limit}% limit`, peakValueUsdt: peak } });
        await audit(null, "engine.account_paused", { accountId: acct.id, drawdownPct: +dd.toFixed(2) });
        (summary.paused as string[]).push(acct.id);
        continue;
      }

      let tradesToday = await db.trade.count({ where: { accountId: acct.id, createdAt: { gte: since } } });
      const maxPos = n(cfg.maxPositionPct) / 100;
      const budget = acct.mode === "BYO" ? n(acct.budgetUsdt) : Infinity;
      const riskMul = acct.riskLevel === "Conservative" ? 0.5 : acct.riskLevel === "Aggressive" ? 1.5 : 1;

      for (const [pair, s] of Object.entries(signals)) {
        if (tradesToday >= cfg.dailyTradeCap) break;
        const a = base(pair), p = s.features.price;
        const held = holdings[a]?.qty ?? 0;
        const heldValue = held * p;
        const invested = Object.entries(holdings).reduce((sum, [x, h]) => sum + h.qty * h.avg, 0);

        let side: "BUY" | "SELL" | null = null;
        let qty = 0;
        if (s.action === "BUY" && s.confidence >= n(cfg.minConfidence)) {
          const target = Math.min(eq * maxPos * riskMul, eq * 0.2); // never more than 20% in one asset
          const room = Math.min(target - heldValue, cash, budget - invested);
          if (room >= MIN_ORDER_USDT) { side = "BUY"; qty = (room / p) * (1 - FEE); }
        } else if (s.action === "SELL" && held * p >= MIN_ORDER_USDT) {
          side = "SELL"; qty = held;
        }
        if (!side) continue;

        // Execute
        let fillPrice = p, orderId: string | undefined;
        if (tradeMode !== "PAPER") {
          const ex = acct.mode === "BYO"
            ? makeExchange(acct.connection!.exchange, { apiKey: decrypt(acct.connection!.apiKeyEnc), secret: decrypt(acct.connection!.apiSecretEnc) })
            : makeExchange(process.env.MANAGED_EXCHANGE || "binance", { apiKey: process.env.MANAGED_API_KEY || "", secret: process.env.MANAGED_API_SECRET || "" });
          const order = await ex.createMarketOrder(pair, side.toLowerCase() as "buy" | "sell", Number(ex.amountToPrecision(pair, qty)));
          fillPrice = Number(order.average ?? order.price ?? p);
          orderId = order.id;
        }

        const notional = qty * fillPrice;
        const fee = notional * FEE;
        let realized: number | undefined;
        if (side === "BUY") {
          const h = holdings[a] ?? { qty: 0, avg: 0 };
          holdings[a] = { qty: h.qty + qty, avg: (h.qty * h.avg + notional) / (h.qty + qty) };
          cash -= notional + fee;
        } else {
          const h = holdings[a]!;
          realized = (fillPrice - h.avg) * qty - fee;
          delete holdings[a];
          cash += notional - fee;
        }
        await db.trade.create({
          data: {
            accountId: acct.id, pair, side, qty: qty.toFixed(12), price: fillPrice.toFixed(8), feeUsdt: fee.toFixed(8),
            mode: tradeMode, confidence: s.confidence.toFixed(3), exchangeOrderId: orderId,
            reason: `${model.label}: ${s.action} at confidence ${s.confidence.toFixed(2)}`,
            realizedPnlUsdt: realized === undefined ? undefined : realized.toFixed(8),
          },
        });
        tradesToday++;
        summary.orders = (summary.orders as number) + 1;
      }

      await db.investmentAccount.update({
        where: { id: acct.id },
        data: { cashUsdt: cash.toFixed(8), holdings: holdings as unknown as Prisma.InputJsonValue, peakValueUsdt: Math.max(peak, equity()).toFixed(8) },
      });
    }

    await db.engineRun.update({ where: { id: run.id }, data: { finishedAt: new Date(), summary: summary as Prisma.InputJsonValue } });
    return summary;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await db.engineRun.update({ where: { id: run.id }, data: { finishedAt: new Date(), error: msg } });
    await audit(null, "engine.error", { message: msg });
    throw e;
  }
}

/** Emergency stop: halts the bot and, outside paper mode, cancels open orders on every connected account. */
export async function emergencyStop(actorId: string) {
  await db.botConfig.upsert({ where: { id: 1 }, update: { state: "STOPPED", updatedById: actorId }, create: { id: 1, state: "STOPPED" } });
  let cancelled = 0;
  if (tradingMode() !== "paper") {
    const conns = await db.exchangeConnection.findMany({ where: { status: "ACTIVE" } });
    for (const c of conns) {
      try {
        const ex = makeExchange(c.exchange, { apiKey: decrypt(c.apiKeyEnc), secret: decrypt(c.apiSecretEnc) });
        const cfg = await db.botConfig.findUnique({ where: { id: 1 } });
        for (const pair of cfg?.pairs ?? []) {
          const open = await ex.fetchOpenOrders(pair);
          for (const o of open) { await ex.cancelOrder(o.id, pair); cancelled++; }
        }
      } catch (e) { console.error("cancel", c.id, e); }
    }
  }
  await audit(actorId, "bot.emergency_stop", { cancelledOrders: cancelled });
  return cancelled;
}
