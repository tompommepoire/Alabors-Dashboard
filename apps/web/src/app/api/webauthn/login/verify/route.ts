import { NextResponse } from "next/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { base64UrlToBytes } from "@/lib/auth/bytes";
import { jsonWithSession } from "@/lib/auth/set-session";
import {
  getExpectedOrigins,
  getRpId,
} from "@/lib/auth/webauthn-config";
import {
  getCredentialByCredentialId,
  getUserById,
  takeChallenge,
  updateCredentialCounter,
} from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  challengeId?: string;
  response?: AuthenticationResponseJSON;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const challengeId = body.challengeId?.trim() ?? "";
  if (!challengeId || !body.response) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const challenge = takeChallenge(challengeId, "login");
  if (!challenge) {
    return NextResponse.json({ error: "challenge_expired" }, { status: 400 });
  }

  const credRow = getCredentialByCredentialId(body.response.id);
  if (!credRow) {
    return NextResponse.json({ error: "unknown_credential" }, { status: 400 });
  }

  const user = getUserById(credRow.user_id);
  if (!user) {
    return NextResponse.json({ error: "user_missing" }, { status: 400 });
  }

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: body.response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: getExpectedOrigins(),
      expectedRPID: getRpId(),
      credential: {
        id: credRow.credential_id,
        publicKey: new Uint8Array(base64UrlToBytes(credRow.public_key)),
        counter: credRow.counter,
        transports: credRow.transports
          ? (JSON.parse(credRow.transports) as string[])
          : undefined,
      },
      requireUserVerification: false,
    });
  } catch {
    return NextResponse.json({ error: "verification_failed" }, { status: 400 });
  }

  if (!verification.verified) {
    return NextResponse.json({ error: "not_verified" }, { status: 400 });
  }

  updateCredentialCounter(
    credRow.id,
    verification.authenticationInfo.newCounter,
  );

  return jsonWithSession(
    { ok: true, userId: user.id, displayName: user.display_name },
    {
      userId: user.id,
      displayName: user.display_name,
      role: user.role,
    },
  );
}
