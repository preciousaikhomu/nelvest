// Creates (or resets) the owner admin. Prints a TOTP secret to add to Google Authenticator / Authy.
// Usage: OWNER_EMAIL=you@x.com OWNER_PASSWORD='...' npm run admin:create
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { authenticator } from "otplib";
import { encrypt } from "../src/lib/vault";

const db = new PrismaClient();
async function main() {
  const email = process.env.OWNER_EMAIL?.toLowerCase();
  const password = process.env.OWNER_PASSWORD;
  if (!email || !password || password.length < 12) throw new Error("Set OWNER_EMAIL and OWNER_PASSWORD (12+ characters).");
  const secret = authenticator.generateSecret();
  const data = {
    passwordHash: await bcrypt.hash(password, 12), role: "ADMIN" as const, adminRole: "OWNER" as const,
    totpSecretEnc: encrypt(secret), totpEnabled: true, kycStatus: "VERIFIED" as const,
  };
  await db.user.upsert({ where: { email }, update: data, create: { email, firstName: "Owner", lastName: "", ...data } });
  await db.botConfig.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  console.log("\nOwner admin ready:", email);
  console.log("Add this to your authenticator app:");
  console.log(authenticator.keyuri(email, "Nelvest", secret));
  console.log("Manual secret:", secret, "\n");
}
main().finally(() => db.$disconnect());
