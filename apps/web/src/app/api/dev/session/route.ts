import { NextResponse } from "next/server";
import {
  createDevSessionValue,
  devSessionCookieName,
} from "@/lib/auth/gate";

export const dynamic = "force-dynamic";

/** Local-only stub identity when AUTH_MODE=dev and ALLOW_DEV_SESSION=1. */
export async function POST() {
  if (process.env.ALLOW_DEV_SESSION !== "1") {
    return NextResponse.json({ error: "disabled" }, { status: 403 });
  }
  const mode = process.env.AUTH_MODE?.trim().toLowerCase();
  if (mode === "proxy") {
    return NextResponse.json(
      { error: "dev session disabled in AUTH_MODE=proxy" },
      { status: 403 },
    );
  }

  const value = createDevSessionValue({
    userId: process.env.DEV_USER_ID?.trim() || "dev-user",
    displayName: process.env.DEV_DISPLAY_NAME?.trim() || "Dev User",
  });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(devSessionCookieName(), value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
  return res;
}
