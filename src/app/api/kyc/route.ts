import { z } from "zod";
import { db } from "@/lib/db";
import { requireInvestor, clientIp } from "@/lib/auth";
import { kycProvider } from "@/lib/kyc";
import { sha256 } from "@/lib/vault";
import { audit } from "@/lib/audit";
import { fail, ok } from "@/lib/http";

const Body = z.object({
  idType: z.enum(["NIN", "BVN"]),
  idNumber: z.string().regex(/^\d{11}$/, "NIN and BVN are 11 digits"),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter your date of birth"),
  address: z.string().min(8, "Enter your residential address"),
});

export async function POST(req: Request) {
  try {
    const u = await requireInvestor();
    if (u.kycStatus === "VERIFIED") throw new Error("Your identity is already verified.");
    const b = Body.parse(await req.json());
    const provider = kycProvider();
    const r = await provider.verify({ userId: u.id, idType: b.idType, idNumber: b.idNumber, firstName: u.firstName, lastName: u.lastName, dateOfBirth: b.dateOfBirth });
    // Automatic rejections still go to a human before they are final
    const status = r.status === "VERIFIED" ? "VERIFIED" : "MANUAL_REVIEW";
    await db.kycSubmission.create({
      data: {
        userId: u.id, provider: provider.name, idType: b.idType, idNumberHash: sha256(b.idNumber), idNumberLast4: b.idNumber.slice(-4),
        dateOfBirth: b.dateOfBirth, address: b.address, status, providerRef: r.providerRef, providerResult: { status: r.status, reason: r.reason ?? null },
      },
    });
    await db.user.update({ where: { id: u.id }, data: { kycStatus: status } });
    if (status === "VERIFIED") await db.investmentAccount.updateMany({ where: { userId: u.id, mode: "MANAGED" }, data: { active: true } });
    await audit(u.id, "kyc.submitted", { provider: provider.name, result: r.status }, clientIp());
    return ok({ redirect: "/app", message: status === "VERIFIED" ? "Identity verified." : "Submitted. A reviewer will check your details within 24 hours." });
  } catch (e) { return fail(e); }
}
