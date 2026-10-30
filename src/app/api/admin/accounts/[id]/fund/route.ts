import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin, clientIp } from "@/lib/auth";
import { tradingMode } from "@/lib/env";
import { randomToken } from "@/lib/vault";
import { audit } from "@/lib/audit";
import { fail, ok } from "@/lib/http";

// Test-mode only: credit simulated USDT so testers can watch the bot trade.
const Body = z.object({ amount: z.coerce.number().min(20).max(100000) });
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin("OWNER");
    if (tradingMode() !== "paper") throw new Error("Test funds can only be added in paper mode.");
    const b = Body.parse(await req.json());
    const a = await db.investmentAccount.findUniqueOrThrow({ where: { id: params.id } });
    await db.investmentAccount.update({
      where: { id: a.id },
      data: { cashUsdt: { increment: b.amount }, depositedUsdt: { increment: b.amount }, peakValueUsdt: { increment: b.amount } },
    });
    await db.ledgerEntry.create({ data: { accountId: a.id, type: "ADJUSTMENT", asset: "USDT", amount: b.amount, status: "COMPLETED", reference: `TEST-${randomToken(6)}`, note: "Paper test funds" } });
    await audit(admin.id, "account.test_funds", { accountId: a.id, amount: b.amount }, clientIp());
    return ok({ message: `Added ${b.amount} test USDT.` });
  } catch (e) { return fail(e); }
}
