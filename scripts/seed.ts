// Creates the bot config row and three test investors (paper funds only). Never run against production.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
async function main() {
  await db.botConfig.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  const people = [
    ["test.amaka@nelvest.test", "Amaka", "Osagie", "MANAGED", "VERIFIED", 2500],
    ["test.tunde@nelvest.test", "Tunde", "Adebayo", "BYO", "VERIFIED", 1000],
    ["test.ngozi@nelvest.test", "Ngozi", "Eze", "MANAGED", "PENDING", 0],
  ] as const;
  for (const [email, firstName, lastName, mode, kycStatus, cash] of people) {
    const u = await db.user.upsert({
      where: { email }, update: {},
      create: { email, firstName, lastName, passwordHash: await bcrypt.hash("test-password-123", 12), kycStatus },
    });
    if (!(await db.investmentAccount.findFirst({ where: { userId: u.id } }))) {
      await db.investmentAccount.create({
        data: { userId: u.id, mode, active: kycStatus === "VERIFIED", cashUsdt: cash, depositedUsdt: cash, peakValueUsdt: cash, budgetUsdt: mode === "BYO" ? cash : 0 },
      });
    }
  }
  console.log("Seeded test investors. Password for all: test-password-123");
}
main().finally(() => db.$disconnect());
