import { NextResponse } from "next/server";
import { getAppsCatalog } from "@/lib/apps-catalog";
import { readSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ apps: getAppsCatalog() });
}
