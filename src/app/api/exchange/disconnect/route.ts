import { db } from "@/lib/db";
import { requireInvestor, clientIp } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { fail, ok } from "@/lib/http";

export async function POST() {
  try {
    const u = await requireInvestor();
    const acct = await db.investmentAccount.findFirst({ where: { userId: u.id, mode: "BYO" } });
    if (acct) {
      await db.exchangeConnection.updateMany({ where: { accountId: acct.id }, data: { status: "REVOKED", apiKeyEnc: "", apiSecretEnc: "" } });
      await db.investmentAccount.update({ where: { id: acct.id }, data: { active: false, pausedReason: "Disconnected by investor" } });
    }
    await audit(u.id, "exchange.disconnected", undefined, clientIp());
    return ok({ message: "Disconnected. Your key has been deleted from Nelvest. Also delete it on your exchange." });
  } catch (e) { return fail(e); }
}
