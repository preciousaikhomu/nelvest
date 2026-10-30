import { endSession } from "@/lib/auth";
import { ok } from "@/lib/http";
export async function POST() { endSession(); return ok({ redirect: "/" }); }
