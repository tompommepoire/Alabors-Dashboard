import { NextResponse } from "next/server";
import { devSessionCookieName, signOutUrl } from "@/lib/auth/gate";

export const dynamic = "force-dynamic";

function isProxyMode(): boolean {
  const mode = process.env.AUTH_MODE?.trim().toLowerCase();
  if (mode === "proxy") return true;
  if (mode === "dev") return false;
  return process.env.NODE_ENV === "production";
}

export async function POST(req: Request) {
  const res = isProxyMode()
    ? NextResponse.redirect(signOutUrl(), 303)
    : NextResponse.redirect(new URL("/", req.url), 303);

  res.cookies.set(devSessionCookieName(), "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return res;
}
