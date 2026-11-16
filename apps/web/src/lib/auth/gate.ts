import { cookies, headers } from "next/headers";

export type GateRole = "admin" | "member";

export type GateUser = {
  /** Stable subject: email or forwarded user id from oauth2-proxy */
  userId: string;
  displayName: string;
  email: string | null;
  role: GateRole;
};

const DEV_COOKIE = "alabor_dev_session";

function adminSubjects(): Set<string> {
  const raw = process.env.ADMIN_SUBJECTS?.trim() ?? "";
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

function roleFor(userId: string, email: string | null): GateRole {
  const admins = adminSubjects();
  const keys = [userId, email ?? ""].map((s) => s.toLowerCase());
  return keys.some((k) => k && admins.has(k)) ? "admin" : "member";
}

function fromProxyHeaders(h: Headers): GateUser | null {
  const user =
    h.get("x-forwarded-user")?.trim() ||
    h.get("x-auth-request-user")?.trim() ||
    "";
  const email =
    h.get("x-forwarded-email")?.trim() ||
    h.get("x-auth-request-email")?.trim() ||
    null;
  const preferred =
    h.get("x-forwarded-preferred-username")?.trim() ||
    h.get("x-auth-request-preferred-username")?.trim() ||
    "";

  const userId = (email || user).trim();
  if (!userId) return null;

  const displayName =
    preferred ||
    (email ? email.split("@")[0] : "") ||
    user ||
    userId;

  return {
    userId,
    displayName,
    email,
    role: roleFor(userId, email),
  };
}

function authMode(): "proxy" | "dev" {
  const mode = process.env.AUTH_MODE?.trim().toLowerCase();
  if (mode === "proxy") return "proxy";
  if (mode === "dev") return "dev";
  // Default: proxy in production, dev otherwise
  return process.env.NODE_ENV === "production" ? "proxy" : "dev";
}

/** Read the gate identity (oauth2-proxy headers or local dev cookie). */
export async function readGateUser(): Promise<GateUser | null> {
  const h = await headers();
  const fromProxy = fromProxyHeaders(h);
  if (fromProxy) return fromProxy;

  if (authMode() !== "dev") return null;
  if (process.env.ALLOW_DEV_SESSION !== "1") return null;

  const jar = await cookies();
  const raw = jar.get(DEV_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<GateUser>;
    if (
      typeof parsed.userId !== "string" ||
      typeof parsed.displayName !== "string"
    ) {
      return null;
    }
    const email =
      typeof parsed.email === "string" ? parsed.email : `${parsed.userId}@dev.local`;
    return {
      userId: parsed.userId,
      displayName: parsed.displayName,
      email,
      role: roleFor(parsed.userId, email),
    };
  } catch {
    return null;
  }
}

export function devSessionCookieName() {
  return DEV_COOKIE;
}

export function createDevSessionValue(opts?: {
  userId?: string;
  displayName?: string;
}): string {
  const userId = opts?.userId?.trim() || "dev-user";
  const displayName = opts?.displayName?.trim() || "Dev User";
  const email = `${userId}@dev.local`;
  const payload: GateUser = {
    userId,
    displayName,
    email,
    role: roleFor(userId, email),
  };
  return JSON.stringify(payload);
}

export function pocketIdUrl(): string {
  return process.env.POCKET_ID_URL?.trim() || "https://auth.myalabor.ch";
}

export function dashboardPublicUrl(): string {
  const raw =
    process.env.DASHBOARD_PUBLIC_URL?.trim() ||
    "https://dashboard.myalabor.ch";
  return raw.replace(/\/$/, "");
}

/**
 * Pocket ID RP-initiated logout. oauth2-proxy substitutes `{id_token}` in `rd`
 * before redirecting. Register `post_logout_redirect_uri` as a Logout Callback
 * URL on the OIDC client (e.g. https://dashboard.myalabor.ch/).
 */
export function idpEndSessionRedirectUrl(postLogoutUri?: string): string {
  const landing = postLogoutUri?.trim() || `${dashboardPublicUrl()}/`;
  const endSession = new URL(`${pocketIdUrl()}/api/oidc/end-session`);
  endSession.searchParams.set("id_token_hint", "{id_token}");
  endSession.searchParams.set("post_logout_redirect_uri", landing);
  return endSession.toString();
}

/** Absolute oauth2-proxy sign_out URL (API redirects). */
export function signOutUrl(postLogoutUri?: string): string {
  const base =
    process.env.OAUTH2_SIGN_OUT_URL?.trim() ||
    `${dashboardPublicUrl()}/oauth2/sign_out`;
  const url = new URL(base);
  url.searchParams.set("rd", idpEndSessionRedirectUrl(postLogoutUri));
  return url.toString();
}

/** Same-origin path so the browser hits this host’s proxy cookie. */
export function signOutPath(postLogoutUri?: string): string {
  return `/oauth2/sign_out?rd=${encodeURIComponent(idpEndSessionRedirectUrl(postLogoutUri))}`;
}

/** @deprecated Use readGateUser — kept as alias during migration. */
export async function readSession(): Promise<GateUser | null> {
  return readGateUser();
}
