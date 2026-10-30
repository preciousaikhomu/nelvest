import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function fail(e: unknown) {
  if (e instanceof ZodError) return NextResponse.json({ error: e.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  const m = e instanceof Error ? e.message : "Error";
  if (m === "UNAUTHORIZED") return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  if (m === "FORBIDDEN") return NextResponse.json({ error: "Your admin role cannot do this." }, { status: 403 });
  console.error(e);
  return NextResponse.json({ error: m }, { status: 400 });
}
export const ok = (data: unknown = { ok: true }) => NextResponse.json(data);
