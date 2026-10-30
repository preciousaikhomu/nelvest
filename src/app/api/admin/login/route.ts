import { z } from "zod";
import { db } from "@/lib/db";
import { checkPassword, startSession, verifyTotp, clientIp } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { fail, ok } from "@/lib/http";

const Body = z.object({ email: z.string().email(), password: z.string().min(1), code: z.string().min(6, "Enter the 6-digit code") });

export async function POST(req: Request) {
  try {
    const b = Body.parse(await req.json());
    const u = await db.user.findUnique({ where: { email: b.email.toLowerCase() } });
    const good = u && u.role === "ADMIN" && !u.disabled && (await checkPassword(b.password, u.passwordHash)) && verifyTotp(b.code, u.totpSecretEnc);
    if (!good) {
      await audit(u?.id ?? null, "admin.login_failed", { email: b.email }, clientIp());
      throw new Error("Sign-in failed. Check your email, password and authenticator code.");
    }
    await startSession({ uid: u!.id, role: "ADMIN", adminRole: u!.adminRole });
    await audit(u!.id, "admin.login", undefined, clientIp());
    return ok({ redirect: "/admin" });
  } catch (e) { return fail(e); }
}
