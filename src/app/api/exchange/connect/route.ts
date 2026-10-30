import { z } from "zod";
import { db } from "@/lib/db";
import { requireInvestor, clientIp } from "@/lib/auth";
import { checkKey, isSupported } from "@/lib/exchange";
import { encrypt } from "@/lib/vault";
import { tradingMode } from "@/lib/env";
import { audit } from "@/lib/audit";
import { fail, ok } from "@/lib/http";

const Body = z.object({
  exchange: z.string(),
  apiKey: z.string().optional().default(""),
  apiSecret: z.string().optional().default(""),
  budget: z.coerce.number().min(20, "Budget must be at least 20 USDT").max(1_000_000),
  riskLevel: z.enum(["Conservative", "Balanced", "Aggressive"]),
  stopDrawdownPct: z.coerce.number().int().min(5).max(30),
  confirmNoWithdraw: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const u = await requireInvestor();
    if (u.kycStatus !== "VERIFIED") throw new Error("Verify your identity before connecting an exchange.");
    const b = Body.parse(await req.json());
    const acct = await db.investmentAccount.findFirst({ where: { userId: u.id, mode: "BYO" } })
      ?? await db.investmentAccount.create({ data: { userId: u.id, mode: "BYO" } });
    const paper = tradingMode() === "paper";

    // Paper test without keys: the bot trades a simulated balance equal to the budget.
    if (b.exchange === "paper") {
      if (!paper) throw new Error("Paper accounts are only available while the platform is in test mode.");
      await db.exchangeConnection.upsert({
        where: { accountId: acct.id },
        update: { exchange: "paper", apiKeyEnc: "", apiSecretEnc: "", keyHint: "test", canTrade: true, canWithdraw: false, status: "ACTIVE", statusDetail: "Simulated balance", lastCheckedAt: new Date() },
        create: { accountId: acct.id, exchange: "paper", apiKeyEnc: "", apiSecretEnc: "", keyHint: "test", canTrade: true, canWithdraw: false, status: "ACTIVE", statusDetail: "Simulated balance", lastCheckedAt: new Date() },
      });
      await db.investmentAccount.update({
        where: { id: acct.id },
        data: { active: true, budgetUsdt: b.budget, cashUsdt: b.budget, depositedUsdt: b.budget, peakValueUsdt: b.budget, holdings: {}, riskLevel: b.riskLevel, stopDrawdownPct: b.stopDrawdownPct, pausedReason: null },
      });
      await audit(u.id, "exchange.paper_connected", { budget: b.budget }, clientIp());
      return ok({ message: "Test account connected. The bot will trade a simulated balance." });
    }

    if (!isSupported(b.exchange)) throw new Error("That exchange is not supported yet.");
    if (!b.apiKey || !b.apiSecret) throw new Error("Paste both the API key and the API secret.");
    const check = await checkKey(b.exchange, b.apiKey, b.apiSecret).catch(() => {
      throw new Error("The exchange rejected this key. Check it was copied fully and is still active.");
    });
    if (check.canWithdraw === true) throw new Error("This key can withdraw funds. Create a new key with withdrawals turned off.");
    if (!check.canTrade) throw new Error("This key cannot place spot trades. Turn on spot trading for the key.");
    if (check.canWithdraw === null && b.confirmNoWithdraw !== "on") throw new Error("Confirm that withdrawals are turned off for this key.");

    const data = {
      exchange: b.exchange, apiKeyEnc: encrypt(b.apiKey), apiSecretEnc: encrypt(b.apiSecret), keyHint: b.apiKey.slice(-4),
      canTrade: check.canTrade, canWithdraw: check.canWithdraw, status: "ACTIVE", statusDetail: check.detail, lastCheckedAt: new Date(),
    };
    await db.exchangeConnection.upsert({ where: { accountId: acct.id }, update: data, create: { accountId: acct.id, ...data } });
    await db.investmentAccount.update({
      where: { id: acct.id },
      data: { active: true, budgetUsdt: b.budget, riskLevel: b.riskLevel, stopDrawdownPct: b.stopDrawdownPct, pausedReason: null, ...(paper ? { cashUsdt: b.budget, peakValueUsdt: b.budget, depositedUsdt: b.budget } : {}) },
    });
    await audit(u.id, "exchange.connected", { exchange: b.exchange, keyHint: data.keyHint }, clientIp());
    return ok({ message: `${b.exchange} connected. ${check.detail}` });
  } catch (e) { return fail(e); }
}
