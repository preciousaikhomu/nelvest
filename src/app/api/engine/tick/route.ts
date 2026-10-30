import { NextResponse } from "next/server";
import { runTick } from "@/lib/engine/runner";

export const maxDuration = 60;
// Called by Vercel Cron (Authorization: Bearer CRON_SECRET) or by an external scheduler.
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try { return NextResponse.json(await runTick()); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Tick failed" }, { status: 500 }); }
}
