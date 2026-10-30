import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tradingMode, depositsEnabled } from "@/lib/env";

export const dynamic = "force-dynamic";
// Public health check: reports whether the database answers. Never returns secrets.
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    const owner = await db.user.count({ where: { adminRole: "OWNER" } });
    return NextResponse.json({ ok: true, database: "connected", ownerSetUp: owner > 0, mode: tradingMode(), deposits: depositsEnabled() });
  } catch (e) {
    console.error("health", e);
    return NextResponse.json({ ok: false, database: "unreachable", hint: e instanceof Error ? e.message.split("\n").slice(-2).join(" ").slice(0, 200) : "unknown" }, { status: 503 });
  }
}
