export type AppNetwork = "public" | "lan";

/** Harness §3 primary mode (catalog metadata — not enforced here). */
export type AuthMode = "shared" | "inherit" | "choose" | "reauth" | "tor";

/** Harness §3b handoff — inherit not shippable while `none`. */
export type HandoffStatus =
  | "none"
  | "session-cookie"
  | "exchange"
  | "handoff-once"
  | "gate";

export type CatalogApp = {
  id: string;
  name: string;
  description: string;
  /** Start URL — Origin/path only; never pair/device tokens. */
  url: string;
  icon: "cart" | "tv" | "car" | "cards" | "notes" | "server" | "voicemail";
  network: AppNetwork;
  authMode: AuthMode;
  handoff: HandoffStatus;
  /** Short UI note when inherit is not ready */
  launchNote?: string;
};

/**
 * APP_GRANTS syntax (comma-separated entries):
 *   appId:*                 — all authenticated users
 *   appId:sub1|sub2|email   — allowlist (| separated)
 * Missing app id → hidden for everyone (except empty APP_GRANTS = all apps visible).
 */
export function parseAppGrants(raw: string | undefined): Map<string, string[]> {
  const map = new Map<string, string[]>();
  const text = raw?.trim() ?? "";
  if (!text) return map;
  for (const part of text.split(";")) {
    const entry = part.trim();
    if (!entry) continue;
    const colon = entry.indexOf(":");
    if (colon <= 0) continue;
    const appId = entry.slice(0, colon).trim();
    const subjects = entry
      .slice(colon + 1)
      .split("|")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (appId && subjects.length) map.set(appId, subjects);
  }
  return map;
}

export function appVisibleToUser(
  appId: string,
  userId: string,
  email: string | null,
  grants: Map<string, string[]>,
): boolean {
  if (grants.size === 0) return true;
  const allowed = grants.get(appId);
  if (!allowed) return false;
  if (allowed.includes("*")) return true;
  const keys = [userId, email ?? ""].map((s) => s.toLowerCase()).filter(Boolean);
  return keys.some((k) => allowed.includes(k));
}

/** Server-only catalog. Sensitive URLs come from env. */
export function getAppsCatalog(): CatalogApp[] {
  const apps: CatalogApp[] = [
    {
      id: "einkaufsliste",
      name: "Einkaufsliste",
      description: "Familienliste",
      url: process.env.EINKAUF_URL?.trim() || "",
      icon: "cart",
      network: "public",
      authMode: "shared",
      handoff: "gate",
    },
    {
      id: "lumito",
      name: "Lumito",
      description: "Haus-IPTV",
      url: (process.env.LUMITO_URL ?? "https://lumito.myalabor.ch/").trim(),
      icon: "tv",
      network: "public",
      authMode: "choose",
      handoff: "gate",
      launchNote: "Profilwahl in der App (Fire TV = LAN)",
    },
    {
      id: "alabors-drive",
      name: "Car-App",
      description: "eDrive / SoC",
      url: (
        process.env.ALABORS_DRIVE_URL ??
        "https://auto.myalabor.ch/web/drive.html"
      ).trim(),
      icon: "car",
      network: "public",
      authMode: "shared",
      handoff: "gate",
    },
    {
      id: "apple-anki",
      name: "Anki Lernen",
      description: "Karteikarten-PWA",
      url: (
        process.env.ANKI_LERN_URL ?? "https://anki-lern.myalabor.ch/"
      ).trim(),
      icon: "cards",
      network: "public",
      authMode: "inherit",
      handoff: "none",
      launchNote: "Gate öffnet die App — inherit/Pair erst nach Exchange",
    },
    {
      id: "mininotes",
      name: "Notes",
      description: "MiniNotes",
      url: (process.env.NOTES_URL ?? "https://notes.myalabor.ch/").trim(),
      icon: "notes",
      network: "public",
      authMode: "inherit",
      handoff: "none",
      launchNote: "Gate öffnet die App — inherit erst nach Exchange",
    },
    {
      id: "voicemail-manager",
      name: "Voicemail",
      description: "Monteur-Inbox",
      url: (process.env.VOICEMAIL_URL ?? "https://voicemail.myalabor.ch/inbox").trim(),
      icon: "voicemail",
      network: "public",
      authMode: "shared",
      handoff: "gate",
    },
    {
      id: "server-manager",
      name: "Server Manager",
      description: "EliteBook Sleep / Wake / Apps",
      url: (
        process.env.SERVER_MANAGER_URL ?? "https://server.myalabor.ch/"
      ).trim(),
      icon: "server",
      network: "public",
      authMode: "shared",
      handoff: "gate",
    },
  ];
  return apps.filter((app) => app.url.length > 0);
}

export function getAppsForUser(userId: string, email: string | null): CatalogApp[] {
  const grants = parseAppGrants(process.env.APP_GRANTS);
  return getAppsCatalog().filter((app) =>
    appVisibleToUser(app.id, userId, email, grants),
  );
}
