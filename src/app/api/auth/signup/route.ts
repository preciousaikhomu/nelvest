import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, startSession, clientIp } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { fail, ok } from "@/lib/http";

const Body = z.object({
  firstName: z.string().min(1, "Enter your first name").max(60),
  lastName: z.string().min(1, "Enter your last name").max(60),
  email: z.string().email("Enter a valid email"),
  phone: z.string().min(7, "Enter your phone number").max(20),
  password: z.string().min(10, "Use at least 10 characters for your password"),
  experience: z.string(), drawdownAction: z.string(), sourceOfFunds: z.string(),
  ack: z.literal("on", { errorMap: () => ({ message: "Tick the risk acknowledgement to continue" }) }),
  mode: z.enum(["MANAGED", "BYO"]),
});

export async function POST(req: Request) {
  try {
    const b = Body.parse(await req.json());
    const email = b.email.toLowerCase();
    if (await db.user.findUnique({ where: { email } })) throw new Error("An account with this email already exists. Sign in instead.");
    const user = await db.user.create({
      data: {
        email, firstName: b.firstName, lastName: b.lastName, phone: b.phone, passwordHash: await hashPassword(b.password),
        riskProfile: { create: { experience: b.experience, drawdownAction: b.drawdownAction, sourceOfFunds: b.sourceOfFunds, acknowledgedAt: new Date() } },
        accounts: { create: { mode: b.mode } },
      },
    });
    await audit(user.id, "investor.signup", { mode: b.mode }, clientIp());
    await startSession({ uid: user.id, role: "INVESTOR" });
    return ok({ redirect: "/app/kyc" });
  } catch (e) { return fail(e); }
}
