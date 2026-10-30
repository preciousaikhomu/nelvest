import { cookies, headers } from "next/headers";
import bcrypt from "bcryptjs";
import { authenticator } from "otplib";
import { db } from "./db";
import { COOKIE, Session, signSession, verifySession } from "./session";
import { decrypt } from "./vault";

export const hashPassword = (p: string) => bcrypt.hash(p, 12);
export const checkPassword = (p: string, h: string) => bcrypt.compare(p, h);

export async function startSession(s: Session) {
  const hours = s.role === "ADMIN" ? 8 : 72;
  cookies().set(COOKIE, await signSession(s, hours), {
    httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: hours * 3600,
  });
}

export function endSession() {
  cookies().delete(COOKIE);
}

export async function currentSession() {
  return verifySession(cookies().get(COOKIE)?.value);
}

export async function currentUser() {
  const s = await currentSession();
  if (!s) return null;
  const u = await db.user.findUnique({ where: { id: s.uid } });
  return u && !u.disabled ? u : null;
}

const RANK = { VIEWER: 1, KYC_REVIEWER: 2, OPERATOR: 3, OWNER: 4 } as const;
export type AdminRoleName = keyof typeof RANK;

/** Throws unless the signed-in user is an admin with at least `min` role. */
export async function requireAdmin(min: AdminRoleName = "VIEWER") {
  const u = await currentUser();
  if (!u || u.role !== "ADMIN" || !u.adminRole) throw new Error("UNAUTHORIZED");
  if (RANK[u.adminRole as AdminRoleName] < RANK[min]) throw new Error("FORBIDDEN");
  return u;
}

export async function requireInvestor() {
  const u = await currentUser();
  if (!u) throw new Error("UNAUTHORIZED");
  return u;
}

export function verifyTotp(code: string, secretEnc: string | null) {
  if (!secretEnc) return false;
  authenticator.options = { window: 1 };
  return authenticator.check(code.replace(/\s/g, ""), decrypt(secretEnc));
}

export function clientIp() {
  return headers().get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}
