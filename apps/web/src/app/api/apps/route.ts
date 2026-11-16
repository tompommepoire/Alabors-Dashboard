import { NextResponse } from "next/server";
import { getAppsForUser } from "@/lib/apps-catalog";
import { readGateUser } from "@/lib/auth/gate";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await readGateUser();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    apps: getAppsForUser(session.userId, session.email),
  });
}
