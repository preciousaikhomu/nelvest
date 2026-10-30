import { z } from "zod";
import { db } from "@/lib/db";
import { checkPassword, startSession, clientIp } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { fail, ok } from "@/lib/http";

const Body = z.object({ email: z.string().email("Enter a valid email"), password: z.string().min(1, "Enter your password") });

export async function POST(req: Request) {
  try {
    const b = Body.parse(await req.json());
    const u = await db.user.findUnique({ where: { email: b.email.toLowerCase() } });
    if (!u || u.disabled || !(await checkPassword(b.password, u.passwordHash))) throw new Error("Email or password is incorrect.");
    if (u.role === "ADMIN") throw new Error("Admins sign in at /admin/login.");
    await startSession({ uid: u.id, role: "INVESTOR" });
    await audit(u.id, "investor.login", undefined, clientIp());
    return ok({ redirect: "/app" });
  } catch (e) { return fail(e); }
}
