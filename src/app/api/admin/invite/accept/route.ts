import { z } from "zod";
import { authenticator } from "otplib";
import { db } from "@/lib/db";
import { hashPassword, clientIp } from "@/lib/auth";
import { encrypt, sha256 } from "@/lib/vault";
import { audit } from "@/lib/audit";
import { fail, ok } from "@/lib/http";

const Body = z.object({ token: z.string().min(10), firstName: z.string().min(1), lastName: z.string().min(1), password: z.string().min(12, "Use at least 12 characters") });
export async function POST(req: Request) {
  try {
    const b = Body.parse(await req.json());
    const inv = await db.adminInvite.findUnique({ where: { tokenHash: sha256(b.token) } });
    if (!inv || inv.acceptedAt || inv.expiresAt < new Date()) throw new Error("This invite link is invalid or has expired. Ask the owner for a new one.");
    const secret = authenticator.generateSecret();
    const data = { firstName: b.firstName, lastName: b.lastName, passwordHash: await hashPassword(b.password), role: "ADMIN" as const, adminRole: inv.role, totpSecretEnc: encrypt(secret), totpEnabled: true };
    const u = await db.user.upsert({ where: { email: inv.email }, update: data, create: { email: inv.email, ...data } });
    await db.adminInvite.update({ where: { id: inv.id }, data: { acceptedAt: new Date() } });
    await audit(u.id, "admin.invite_accepted", { role: inv.role }, clientIp());
    return ok({ message: "Account created. Add this key to your authenticator app, then sign in.", otpauth: authenticator.keyuri(inv.email, "Nelvest", secret), secret });
  } catch (e) { return fail(e); }
}
