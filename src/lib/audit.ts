import { db } from "./db";
import { Prisma } from "@prisma/client";

export async function audit(actorId: string | null, action: string, detail?: Record<string, unknown>, ip?: string | null) {
  await db.auditLog.create({
    data: { actorId, action, detail: (detail ?? undefined) as Prisma.InputJsonValue | undefined, ip: ip ?? null },
  });
}
