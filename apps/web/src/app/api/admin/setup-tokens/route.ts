import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth/session";
import {
  createSetupToken,
  listSetupTokens,
  revokeSetupToken,
} from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await readSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const tokens = listSetupTokens().map((t) => ({
    id: t.id,
    label: t.label,
    expiresAt: t.expires_at,
    usesLeft: t.uses_left,
    boundUserId: t.bound_user_id,
    createdAt: t.created_at,
  }));

  return NextResponse.json({ tokens });
}

export async function POST(req: Request) {
  const session = await readSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: { label?: string; ttlHours?: number; usesLeft?: number };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }

  const { row, plaintext } = createSetupToken({
    label: body.label?.trim() || "invite",
    createdByUserId: session.userId,
    ttlHours: body.ttlHours ?? 72,
    usesLeft: body.usesLeft ?? 1,
  });

  const origin =
    process.env.WEBAUTHN_ORIGIN?.trim() ||
    (process.env.NODE_ENV === "production"
      ? "https://dashboard.myalabor.ch"
      : "http://localhost:3000");

  return NextResponse.json({
    id: row.id,
    label: row.label,
    expiresAt: row.expires_at,
    usesLeft: row.uses_left,
    token: plaintext,
    registerUrl: `${origin}/register?token=${encodeURIComponent(plaintext)}`,
  });
}

export async function DELETE(req: Request) {
  const session = await readSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const id = new URL(req.url).searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }
  revokeSetupToken(id);
  return NextResponse.json({ ok: true });
}
