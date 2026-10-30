import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin, clientIp } from "@/lib/auth";
import { randomToken, sha256 } from "@/lib/vault";
import { audit } from "@/lib/audit";
import { fail, ok } from "@/lib/http";

const Body = z.object({ email: z.string().email("Enter a valid email"), role: z.enum(["OPERATOR", "KYC_REVIEWER", "VIEWER"]) });
export async function POST(req: Request) {
  try {
    const owner = await requireAdmin("OWNER");
    const b = Body.parse(await req.json());
    const token = randomToken();
    await db.adminInvite.create({ data: { email: b.email.toLowerCase(), role: b.role, tokenHash: sha256(token), invitedById: owner.id, expiresAt: new Date(Date.now() + 72 * 3600_000) } });
    await audit(owner.id, "admin.invited", { email: b.email, role: b.role }, clientIp());
    const origin = new URL(req.url).origin;
    return ok({ message: "Invite created. Send this link privately; it expires in 72 hours.", link: `${origin}/admin/accept?token=${token}` });
  } catch (e) { return fail(e); }
}
