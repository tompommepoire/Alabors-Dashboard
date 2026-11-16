import { NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import {
  getRpId,
  getRpName,
} from "@/lib/auth/webauthn-config";
import { resolveSetupToken } from "@/lib/auth/setup-token";
import {
  getUserById,
  listCredentialsForUser,
  newId,
  purgeExpiredChallenges,
  saveChallenge,
} from "@/lib/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  token?: string;
  displayName?: string;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const token = body.token?.trim() ?? "";
  const displayName = body.displayName?.trim() ?? "";
  const resolved = resolveSetupToken(token);
  if (!resolved) {
    return NextResponse.json({ error: "invalid_token" }, { status: 403 });
  }

  let userId: string;
  let userName: string;
  let userDisplayName: string;

  if (resolved.boundUserId) {
    const user = getUserById(resolved.boundUserId);
    if (!user) {
      return NextResponse.json({ error: "bound_user_missing" }, { status: 400 });
    }
    userId = user.id;
    userName = user.id;
    userDisplayName = user.display_name;
  } else {
    if (displayName.length < 2) {
      return NextResponse.json(
        { error: "display_name_required" },
        { status: 400 },
      );
    }
    // Provisional id — real user created on verify
    userId = newId();
    userName = userId;
    userDisplayName = displayName;
  }

  purgeExpiredChallenges();

  const existing = resolved.boundUserId
    ? listCredentialsForUser(resolved.boundUserId)
    : [];

  const options = await generateRegistrationOptions({
    rpName: getRpName(),
    rpID: getRpId(),
    userID: new TextEncoder().encode(userId),
    userName,
    userDisplayName,
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
      authenticatorAttachment: "platform",
    },
    excludeCredentials: existing.map((c) => ({
      id: c.credential_id,
      transports: c.transports
        ? (JSON.parse(c.transports) as string[])
        : undefined,
    })),
  });

  const challengeId = newId();
  saveChallenge({
    id: challengeId,
    kind: "register",
    challenge: options.challenge,
    userId: resolved.boundUserId ? resolved.boundUserId : userId,
    setupTokenId: resolved.setupTokenId,
    displayName: resolved.boundUserId ? null : userDisplayName,
  });

  return NextResponse.json({
    challengeId,
    options,
    role: resolved.role,
    bound: Boolean(resolved.boundUserId),
  });
}
