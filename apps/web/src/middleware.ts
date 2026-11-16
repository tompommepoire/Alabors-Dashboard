import { NextRequest, NextResponse } from "next/server";

const PROTECTED = ["/apps", "/settings"];

function hasProxyIdentity(req: NextRequest): boolean {
  const user =
    req.headers.get("x-forwarded-user")?.trim() ||
    req.headers.get("x-auth-request-user")?.trim() ||
    "";
  const email =
    req.headers.get("x-forwarded-email")?.trim() ||
    req.headers.get("x-auth-request-email")?.trim() ||
    "";
  return Boolean(user || email);
}

function hasDevSession(req: NextRequest): boolean {
  if (process.env.ALLOW_DEV_SESSION !== "1") return false;
  const mode = process.env.AUTH_MODE?.trim().toLowerCase();
  const isDev =
    mode === "dev" || (mode !== "proxy" && process.env.NODE_ENV !== "production");
  if (!isDev) return false;
  return Boolean(req.cookies.get("alabor_dev_session")?.value);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const needsAuth = PROTECTED.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (!needsAuth) return NextResponse.next();

  if (hasProxyIdentity(req) || hasDevSession(req)) {
    return NextResponse.next();
  }

  const login = new URL("/", req.url);
  login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/apps/:path*", "/settings/:path*"],
};
