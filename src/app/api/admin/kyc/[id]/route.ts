import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin, clientIp } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { fail, ok } from "@/lib/http";

const Body = z.object({ decision: z.enum(["VERIFIED", "REJECTED"]), note: z.string().max(500).optional() });

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin("KYC_REVIEWER");
    const b = Body.parse(await req.json());
    const sub = await db.kycSubmission.update({
      where: { id: params.id },
      data: { status: b.decision, reviewerId: admin.id, reviewNote: b.note, reviewedAt: new Date() },
    });
    await db.user.update({ where: { id: sub.userId }, data: { kycStatus: b.decision } });
    if (b.decision === "VERIFIED") await db.investmentAccount.updateMany({ where: { userId: sub.userId, mode: "MANAGED" }, data: { active: true } });
    await audit(admin.id, `kyc.${b.decision.toLowerCase()}`, { submissionId: sub.id, userId: sub.userId }, clientIp());
    return ok({ message: b.decision === "VERIFIED" ? "Approved." : "Rejected." });
  } catch (e) { return fail(e); }
}
