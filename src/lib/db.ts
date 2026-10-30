import { PrismaClient } from "@prisma/client";

const g = globalThis as unknown as { prisma?: PrismaClient };
// DATABASE_URL is the standard name; "nelvest" is accepted while the Vercel variable is being renamed.
const url = process.env.DATABASE_URL || process.env.nelvest;
export const db = g.prisma ?? new PrismaClient(url ? { datasourceUrl: url } : undefined);
if (process.env.NODE_ENV !== "production") g.prisma = db;
