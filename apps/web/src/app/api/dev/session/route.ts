import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
} from "@/lib/auth/session";

/**
 * M0 session stub — only when ALLOW_DEV_SESSION=1.
 * Removed / disabled once WebAuthn (M1) ships.
 */
export async function POST() {
  if (process.env.ALLOW_DEV_SESSION !== "1") {
    return NextResponse.json({ error: "disabled" }, { status: 404 });
  }

  const maxAge = 60 * 60 * 24;
  const token = await createSessionToken({
    userId: "dev-admin",
    displayName: "Dev Admin",
    role: "admin",
  }, maxAge);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(maxAge));
  return res;
}
