import { NextResponse } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import { bytesToBase64Url } from "@/lib/auth/bytes";
import { jsonWithSession } from "@/lib/auth/set-session";
import { consumeResolvedSetup, resolveSetupToken } from "@/lib/auth/setup-token";
import {
  getExpectedOrigins,
  getRpId,
} from "@/lib/auth/webauthn-config";
import {
  createUser,
  getUserById,
  insertCredential,
  newId,
  nowIso,
  takeChallenge,
} from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  challengeId?: string;
  token?: string;
  response?: RegistrationResponseJSON;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const challengeId = body.challengeId?.trim() ?? "";
  const token = body.token?.trim() ?? "";
  if (!challengeId || !token || !body.response) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const resolved = resolveSetupToken(token);
  if (!resolved) {
    return NextResponse.json({ error: "invalid_token" }, { status: 403 });
  }

  const challenge = takeChallenge(challengeId, "register");
  if (!challenge) {
    return NextResponse.json({ error: "challenge_expired" }, { status: 400 });
  }

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: body.response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: getExpectedOrigins(),
      expectedRPID: getRpId(),
      requireUserVerification: false,
    });
  } catch {
    return NextResponse.json({ error: "verification_failed" }, { status: 400 });
  }

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ error: "not_verified" }, { status: 400 });
  }

  const { credential } = verification.registrationInfo;
  const publicKeyB64 = bytesToBase64Url(credential.publicKey);

  let user = resolved.boundUserId
    ? getUserById(resolved.boundUserId)
    : undefined;

  if (!user) {
    const displayName = challenge.display_name?.trim();
    if (!displayName || displayName.length < 2) {
      return NextResponse.json({ error: "display_name_required" }, { status: 400 });
    }
    user = createUser(
      displayName,
      resolved.role,
      challenge.user_id ?? undefined,
    );
  }

  insertCredential({
    id: newId(),
    user_id: user.id,
    credential_id: credential.id,
    public_key: publicKeyB64,
    counter: credential.counter,
    transports: credential.transports
      ? JSON.stringify(credential.transports)
      : null,
    device_label: null,
    created_at: nowIso(),
  });

  consumeResolvedSetup(resolved);

  return jsonWithSession(
    { ok: true, userId: user.id, displayName: user.display_name },
    {
      userId: user.id,
      displayName: user.display_name,
      role: user.role,
    },
  );
}
