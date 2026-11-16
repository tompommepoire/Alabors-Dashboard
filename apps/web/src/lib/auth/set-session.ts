import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
  type SessionPayload,
} from "@/lib/auth/session";

const SESSION_TTL = 60 * 60 * 24 * 14;

export async function jsonWithSession(
  body: unknown,
  payload: SessionPayload,
  init?: ResponseInit,
) {
  const token = await createSessionToken(payload, SESSION_TTL);
  const res = NextResponse.json(body, init);
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(SESSION_TTL));
  return res;
}
