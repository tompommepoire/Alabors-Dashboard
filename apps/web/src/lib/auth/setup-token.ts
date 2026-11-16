import {
  consumeSetupToken,
  countUsers,
  findValidSetupToken,
  hashToken,
  type SetupTokenRow,
} from "@/lib/db";

export type ResolvedSetup =
  | {
      kind: "bootstrap";
      role: "admin";
      boundUserId: null;
      setupTokenId: null;
    }
  | {
      kind: "token";
      role: "admin" | "member";
      boundUserId: string | null;
      setupTokenId: string;
      row: SetupTokenRow;
    };

export function resolveSetupToken(plaintext: string): ResolvedSetup | null {
  const trimmed = plaintext.trim();
  if (!trimmed) return null;

  const bootstrap = process.env.SETUP_BOOTSTRAP_SECRET?.trim();
  if (bootstrap && trimmed === bootstrap) {
    // Bootstrap only for the first user (or when no users yet).
    if (countUsers() === 0) {
      return {
        kind: "bootstrap",
        role: "admin",
        boundUserId: null,
        setupTokenId: null,
      };
    }
    return null;
  }

  const row = findValidSetupToken(trimmed);
  if (!row) return null;

  return {
    kind: "token",
    role: countUsers() === 0 ? "admin" : "member",
    boundUserId: row.bound_user_id,
    setupTokenId: row.id,
    row,
  };
}

export function consumeResolvedSetup(resolved: ResolvedSetup) {
  if (resolved.kind === "token") {
    consumeSetupToken(resolved.setupTokenId);
  }
}

/** Constant-time-ish compare helper for bootstrap (avoid leaking via find). */
export function isBootstrapSecret(plaintext: string): boolean {
  const bootstrap = process.env.SETUP_BOOTSTRAP_SECRET?.trim();
  if (!bootstrap) return false;
  return hashToken(plaintext) === hashToken(bootstrap);
}
