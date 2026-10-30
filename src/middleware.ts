import { NextRequest, NextResponse } from "next/server";
import { COOKIE, verifySession } from "@/lib/session";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const s = await verifySession(req.cookies.get(COOKIE)?.value);
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login") && !pathname.startsWith("/admin/accept")) {
    if (!s || s.role !== "ADMIN") return NextResponse.redirect(new URL("/admin/login", req.url));
  }
  if (pathname.startsWith("/app") && !s) return NextResponse.redirect(new URL("/login", req.url));
  return NextResponse.next();
}
export const config = { matcher: ["/admin/:path*", "/app/:path*"] };
