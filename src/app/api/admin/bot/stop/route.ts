import { requireAdmin } from "@/lib/auth";
import { emergencyStop } from "@/lib/engine/runner";
import { fail, ok } from "@/lib/http";

export async function POST() {
  try {
    const admin = await requireAdmin("OPERATOR");
    const n = await emergencyStop(admin.id);
    return ok({ message: `Bot stopped. ${n} open order(s) cancelled.` });
  } catch (e) { return fail(e); }
}
