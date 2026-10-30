import { z } from "zod";
import crypto from "crypto";
import { authenticator } from "otplib";
import { db } from "@/lib/db";
import { hashPassword, clientIp } from "@/lib/auth";
import { encrypt } from "@/lib/vault";
import { audit } from "@/lib/audit";
import { fail, ok } from "@/lib/http";

// One-time owner setup. Works only while no owner exists, and only with the SETUP_TOKEN from the Vercel project settings.
const Body = z.object({
  token: z.string().min(1, "Enter the setup token"),
  email: z.string().email("Enter a valid email"),
  firstName: z.string().min(1, "Enter your first name"),
  lastName: z.string().min(1, "Enter your last name"),
  password: z.string().min(12, "Use at least 12 characters"),
});

const same = (a: string, b: string) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

export async function POST(req: Request) {
  try {
    const b = Body.parse(await req.json());
    const expected = process.env.SETUP_TOKEN || "";
    if (!expected || !same(b.token.trim(), expected)) throw new Error("That setup token is not correct.");
    if (await db.user.findFirst({ where: { adminRole: "OWNER" } })) throw new Error("The owner account already exists. Sign in instead.");
    const secret = authenticator.generateSecret();
    const email = b.email.toLowerCase();
    const data = {
      firstName: b.firstName, lastName: b.lastName, passwordHash: await hashPassword(b.password),
      role: "ADMIN" as const, adminRole: "OWNER" as const, totpSecretEnc: encrypt(secret), totpEnabled: true, kycStatus: "VERIFIED" as const,
    };
    const u = await db.user.upsert({ where: { email }, update: data, create: { email, ...data } });
    await db.botConfig.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
    await audit(u.id, "admin.owner_setup", undefined, clientIp());
    return ok({ message: "Owner account created.", otpauth: authenticator.keyuri(email, "Nelvest", secret), secret });
  } catch (e) { return fail(e); }
}
