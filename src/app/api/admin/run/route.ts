import { requireAdmin } from "@/lib/auth";
import { runTick } from "@/lib/engine/runner";
import { audit } from "@/lib/audit";
import { fail, ok } from "@/lib/http";

export const maxDuration = 60;
export async function POST() {
  try {
    const admin = await requireAdmin("OPERATOR");
    const r = await runTick();
    await audit(admin.id, "engine.manual_run", r as Record<string, unknown>);
    return ok({ message: "skipped" in r ? String(r.skipped) : `Engine ran. ${r.orders} order(s) placed.` });
  } catch (e) { return fail(e); }
}
