// Signed, httpOnly session cookies (JWT via jose). Works in middleware (edge) and server code.
import { SignJWT, jwtVerify } from "jose";

export const COOKIE = "nv_session";
export type Session = { uid: string; role: "INVESTOR" | "ADMIN"; adminRole?: string | null };

const secret = () => new TextEncoder().encode(process.env.SESSION_SECRET || "");

export async function signSession(s: Session, hours: number) {
  return new SignJWT({ ...s })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${hours}h`)
    .sign(secret());
}

export async function verifySession(token?: string): Promise<Session | null> {
  if (!token || !process.env.SESSION_SECRET) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as Session;
  } catch {
    return null;
  }
}
