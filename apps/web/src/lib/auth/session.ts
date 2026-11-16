import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "alabor_dashboard_session";

export type SessionPayload = {
  userId: string;
  displayName: string;
  role: "admin" | "member";
};

function secretKey() {
  const secret = process.env.SESSION_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be set (min 32 chars)");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(
  payload: SessionPayload,
  ttlSeconds = 60 * 60 * 24 * 14,
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(secretKey());
}

export async function readSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const userId = typeof payload.userId === "string" ? payload.userId : null;
    const displayName =
      typeof payload.displayName === "string" ? payload.displayName : null;
    const role = payload.role === "admin" || payload.role === "member"
      ? payload.role
      : null;
    if (!userId || !displayName || !role) return null;
    return { userId, displayName, role };
  } catch {
    return null;
  }
}

export function sessionCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}
