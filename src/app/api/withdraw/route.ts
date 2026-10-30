import { z } from "zod";
import { db } from "@/lib/db";
import { requireInvestor, clientIp } from "@/lib/auth";
import { depositsEnabled } from "@/lib/env";
import { randomToken } from "@/lib/vault";
import { audit } from "@/lib/audit";
import { fail, ok } from "@/lib/http";

const Body = z.object({ amount: z.coerce.number().positive("Enter an amount"), destination: z.string().min(6, "Enter where to send it") });

export async function POST(req: Request) {
  try {
    const u = await requireInvestor();
    if (!depositsEnabled()) throw new Error("Withdrawals open when deposits do, after SEC approval.");
    const b = Body.parse(await req.json());
    const acct = await db.investmentAccount.findFirst({ where: { userId: u.id, mode: "MANAGED" } });
    if (!acct || Number(acct.cashUsdt) < b.amount) throw new Error("Not enough available cash. Holdings are sold at the next rebalance.");
    await db.ledgerEntry.create({ data: { accountId: acct.id, type: "WITHDRAWAL", asset: "USDT", amount: -b.amount, reference: `WD-${randomToken(6)}`, note: b.destination } });
    await audit(u.id, "withdrawal.requested", { amount: b.amount }, clientIp());
    return ok({ message: "Withdrawal requested. It is reviewed and paid within 48 hours." });
  } catch (e) { return fail(e); }
}
