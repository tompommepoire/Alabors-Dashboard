import { NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { getRpId } from "@/lib/auth/webauthn-config";
import {
  listAllCredentials,
  newId,
  purgeExpiredChallenges,
  saveChallenge,
} from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  purgeExpiredChallenges();

  const credentials = listAllCredentials();
  if (credentials.length === 0) {
    return NextResponse.json({ error: "no_credentials" }, { status: 400 });
  }

  const options = await generateAuthenticationOptions({
    rpID: getRpId(),
    userVerification: "preferred",
    allowCredentials: credentials.map((c) => ({
      id: c.credential_id,
      transports: c.transports
        ? (JSON.parse(c.transports) as string[])
        : undefined,
    })),
  });

  const challengeId = newId();
  saveChallenge({
    id: challengeId,
    kind: "login",
    challenge: options.challenge,
  });

  return NextResponse.json({ challengeId, options });
}
