import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin, clientIp } from "@/lib/auth";
import { MODELS } from "@/lib/engine/models";
import { audit } from "@/lib/audit";
import { fail, ok } from "@/lib/http";

const PAIRS = ["BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT", "XRP/USDT"];
const Body = z.object({
  state: z.enum(["RUNNING", "PAUSED"]).optional(),
  strategy: z.string().refine((s) => s in MODELS, "Unknown strategy").optional(),
  timeframe: z.enum(["1h", "4h", "1d"]).optional(),
  maxPositionPct: z.coerce.number().min(0.5).max(20).optional(),
  drawdownPausePct: z.coerce.number().min(5).max(40).optional(),
  minConfidence: z.coerce.number().min(0.5).max(0.95).optional(),
  dailyTradeCap: z.coerce.number().int().min(1).max(200).optional(),
  pairs: z.array(z.string()).optional(),
});

export async function POST(req: Request) {
  try {
    const raw = await req.json();
    const b = Body.parse({ ...raw, pairs: raw.pairs ?? PAIRS.filter((p) => raw[`pair_${p}`] === "on").concat() });
    // Only the owner may change strategy and limits; operators may pause and resume.
    const settingsChange = Object.keys(raw).some((k) => k !== "state");
    const admin = await requireAdmin(settingsChange ? "OWNER" : "OPERATOR");
    const data: Record<string, unknown> = {};
    for (const k of ["state", "strategy", "timeframe", "maxPositionPct", "drawdownPausePct", "minConfidence", "dailyTradeCap"] as const) if (b[k] !== undefined) data[k] = b[k];
    if (settingsChange) data.pairs = b.pairs!.filter((p) => PAIRS.includes(p));
    await db.botConfig.upsert({ where: { id: 1 }, update: { ...data, updatedById: admin.id }, create: { id: 1, ...data } });
    await audit(admin.id, "bot.updated", data, clientIp());
    return ok({ message: b.state === "RUNNING" ? "Bot running." : b.state === "PAUSED" ? "Bot paused." : "Settings saved." });
  } catch (e) { return fail(e); }
}
