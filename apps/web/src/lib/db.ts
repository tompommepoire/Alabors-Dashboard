import { DatabaseSync } from "node:sqlite";
import { createHash, randomBytes } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export type UserRole = "admin" | "member";

export type UserRow = {
  id: string;
  display_name: string;
  role: UserRole;
  created_at: string;
};

export type CredentialRow = {
  id: string;
  user_id: string;
  credential_id: string;
  public_key: string;
  counter: number;
  transports: string | null;
  device_label: string | null;
  created_at: string;
  last_used_at: string | null;
};

export type SetupTokenRow = {
  id: string;
  token_hash: string;
  label: string;
  created_by_user_id: string | null;
  bound_user_id: string | null;
  expires_at: string;
  uses_left: number;
  created_at: string;
};

let db: DatabaseSync | null = null;

function dbPath(): string {
  return (
    process.env.DATABASE_PATH?.trim() ||
    `${process.cwd()}/data/dashboard.db`
  );
}

export function getDb(): DatabaseSync {
  if (db) return db;
  const path = dbPath();
  mkdirSync(dirname(path), { recursive: true });
  db = new DatabaseSync(path);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS webauthn_credentials (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      credential_id TEXT NOT NULL UNIQUE,
      public_key TEXT NOT NULL,
      counter INTEGER NOT NULL DEFAULT 0,
      transports TEXT,
      device_label TEXT,
      created_at TEXT NOT NULL,
      last_used_at TEXT
    );

    CREATE TABLE IF NOT EXISTS setup_tokens (
      id TEXT PRIMARY KEY,
      token_hash TEXT NOT NULL UNIQUE,
      label TEXT NOT NULL,
      created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      bound_user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      uses_left INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS webauthn_challenges (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      challenge TEXT NOT NULL,
      user_id TEXT,
      setup_token_id TEXT,
      display_name TEXT,
      expires_at TEXT NOT NULL
    );
  `);
  return db;
}

export function newId(): string {
  return randomBytes(16).toString("hex");
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function generateSetupTokenPlaintext(): string {
  return randomBytes(24).toString("base64url");
}

export function countUsers(): number {
  const row = getDb()
    .prepare("SELECT COUNT(*) AS c FROM users")
    .get() as { c: number };
  return Number(row.c);
}

export function getUserById(id: string): UserRow | undefined {
  return getDb()
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(id) as UserRow | undefined;
}

export function createUser(
  displayName: string,
  role: UserRole,
  id?: string,
): UserRow {
  const user: UserRow = {
    id: id && id.length > 0 ? id : newId(),
    display_name: displayName.trim(),
    role,
    created_at: nowIso(),
  };
  getDb()
    .prepare(
      "INSERT INTO users (id, display_name, role, created_at) VALUES (?, ?, ?, ?)",
    )
    .run(user.id, user.display_name, user.role, user.created_at);
  return user;
}

export function listCredentialsForUser(userId: string): CredentialRow[] {
  return getDb()
    .prepare("SELECT * FROM webauthn_credentials WHERE user_id = ?")
    .all(userId) as CredentialRow[];
}

export function listAllCredentials(): CredentialRow[] {
  return getDb()
    .prepare("SELECT * FROM webauthn_credentials")
    .all() as CredentialRow[];
}

export function getCredentialByCredentialId(
  credentialId: string,
): CredentialRow | undefined {
  return getDb()
    .prepare("SELECT * FROM webauthn_credentials WHERE credential_id = ?")
    .get(credentialId) as CredentialRow | undefined;
}

export function insertCredential(row: Omit<CredentialRow, "last_used_at">) {
  getDb()
    .prepare(
      `INSERT INTO webauthn_credentials
       (id, user_id, credential_id, public_key, counter, transports, device_label, created_at, last_used_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
    )
    .run(
      row.id,
      row.user_id,
      row.credential_id,
      row.public_key,
      row.counter,
      row.transports,
      row.device_label,
      row.created_at,
    );
}

export function updateCredentialCounter(id: string, counter: number) {
  getDb()
    .prepare(
      "UPDATE webauthn_credentials SET counter = ?, last_used_at = ? WHERE id = ?",
    )
    .run(counter, nowIso(), id);
}

export function findValidSetupToken(
  plaintext: string,
): SetupTokenRow | undefined {
  const hash = hashToken(plaintext);
  const row = getDb()
    .prepare(
      `SELECT * FROM setup_tokens
       WHERE token_hash = ? AND uses_left > 0 AND expires_at > ?`,
    )
    .get(hash, nowIso()) as SetupTokenRow | undefined;
  return row;
}

export function consumeSetupToken(id: string) {
  getDb()
    .prepare(
      "UPDATE setup_tokens SET uses_left = uses_left - 1 WHERE id = ? AND uses_left > 0",
    )
    .run(id);
}

export function createSetupToken(opts: {
  label: string;
  createdByUserId: string | null;
  boundUserId?: string | null;
  ttlHours?: number;
  usesLeft?: number;
}): { row: SetupTokenRow; plaintext: string } {
  const plaintext = generateSetupTokenPlaintext();
  const ttlHours = opts.ttlHours ?? 72;
  const expires = new Date(Date.now() + ttlHours * 3600 * 1000).toISOString();
  const row: SetupTokenRow = {
    id: newId(),
    token_hash: hashToken(plaintext),
    label: opts.label.trim() || "invite",
    created_by_user_id: opts.createdByUserId,
    bound_user_id: opts.boundUserId ?? null,
    expires_at: expires,
    uses_left: opts.usesLeft ?? 1,
    created_at: nowIso(),
  };
  getDb()
    .prepare(
      `INSERT INTO setup_tokens
       (id, token_hash, label, created_by_user_id, bound_user_id, expires_at, uses_left, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      row.id,
      row.token_hash,
      row.label,
      row.created_by_user_id,
      row.bound_user_id,
      row.expires_at,
      row.uses_left,
      row.created_at,
    );
  return { row, plaintext };
}

export function listSetupTokens(): SetupTokenRow[] {
  return getDb()
    .prepare(
      "SELECT * FROM setup_tokens ORDER BY created_at DESC LIMIT 50",
    )
    .all() as SetupTokenRow[];
}

export function revokeSetupToken(id: string) {
  getDb()
    .prepare("UPDATE setup_tokens SET uses_left = 0 WHERE id = ?")
    .run(id);
}

export function saveChallenge(row: {
  id: string;
  kind: "register" | "login";
  challenge: string;
  userId?: string | null;
  setupTokenId?: string | null;
  displayName?: string | null;
  ttlSeconds?: number;
}) {
  const expires = new Date(
    Date.now() + (row.ttlSeconds ?? 300) * 1000,
  ).toISOString();
  getDb()
    .prepare(
      `INSERT INTO webauthn_challenges
       (id, kind, challenge, user_id, setup_token_id, display_name, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      row.id,
      row.kind,
      row.challenge,
      row.userId ?? null,
      row.setupTokenId ?? null,
      row.displayName ?? null,
      expires,
    );
}

export function takeChallenge(id: string, kind: "register" | "login") {
  const database = getDb();
  const row = database
    .prepare(
      `SELECT * FROM webauthn_challenges
       WHERE id = ? AND kind = ? AND expires_at > ?`,
    )
    .get(id, kind, nowIso()) as
    | {
        id: string;
        kind: string;
        challenge: string;
        user_id: string | null;
        setup_token_id: string | null;
        display_name: string | null;
        expires_at: string;
      }
    | undefined;
  if (!row) return null;
  database.prepare("DELETE FROM webauthn_challenges WHERE id = ?").run(id);
  return row;
}

export function purgeExpiredChallenges() {
  getDb()
    .prepare("DELETE FROM webauthn_challenges WHERE expires_at <= ?")
    .run(nowIso());
}
