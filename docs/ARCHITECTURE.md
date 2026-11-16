# Mini-Architektur: Alabor Dashboard

**Bezug:** [PRD](./PRD.md) v0.3  
**Scope:** Multi-User App-Launcher auf Raspberry Pi unter `dashboard.myalabor.ch`

---

## 1. Überblick

```
 Internet
    │
    ▼
 Cloudflare Tunnel (bestehend)
    │  Host-Regel: dashboard.myalabor.ch
    ▼
 Raspberry Pi (always-on, z. B. 192.168.1.58)
    │
    ├─ dashboard  (Node, loopback :8790)  ← NEU (8780 = Voicemessage)
    ├─ AlaborsCar ( :8778 )               ← auto.myalabor.ch
    └─ Einkaufsliste ( :8791 )            ← geplant am Tunnel
         │
         ▼
    SQLite (Datei auf persistenter Partition)
         users | credentials | setup_tokens | sessions
```

**Prinzip:** Auth-Gate + Katalog. Apps bleiben eigene Prozesse; Tunnel routet nur Hostname → Port.

Bestehende Ops-Lage (Ist):

- Pi: `tc@192.168.1.58`, Persistenz unter `/mnt/mmcblk0p2/…`
- Öffentlich: Cloudflare-Tunnel; heute u. a. `auto.myalabor.ch` → `localhost:8778`
- EliteBook: Lumito + Server-Manager (LAN)

---

## 2. Stack (Pi-tauglich)

| Schicht | Wahl | Warum |
|---------|------|--------|
| UI/API | **Next.js** (standalone output) **oder** SvelteKit | SSR + API; Build auf Dev-Maschine, Artefakt auf Pi |
| Auth | **@simplewebauthn/server** + browser client | Passkeys / Fingerprint |
| Session | signiertes HttpOnly-Cookie (iron-session / José) | kein Token in JS |
| DB | **SQLite** (better-sqlite3 oder libsql) | ein File, Pi-freundlich, Backup = copy |
| Katalog | `apps.config.ts` (+ optional Secrets aus Env) | kein Admin-UI nötig |
| Edge | **Cloudflare Tunnel** Ingress | wie AlaborsCar; kein neuer öffentlicher Port |
| Process | systemd / bootlocal-Hook analog AlaborsCar | Restart, Logs |

### Pi-Constraint

- **Nicht** auf dem Pi bauen (Node/ARM-Build langsam, RAM).  
  Flow: `npm run build` auf Mini-PC → `rsync` standalone + `node server.js` auf Pi.
- Next.js standalone ist ok, wenn Memory-Limit beachtet wird; Alternative bei Druck: SvelteKit adapter-node (oft leichter).
- Default-Empfehlung bleibt Next.js, solange Standalone &lt; ~150 MB RSS im Idle akzeptabel ist.

---

## 3. Multi-User Auth

### 3.1 Rollen

| Rolle | Kann |
|-------|------|
| `admin` | Setup-Tokens in Settings-UI erzeugen/invalidieren, User/Devices sehen |
| `member` | Login, Katalog, eigene Passkeys verwalten |

Erster User, der mit Bootstrap-`SETUP_BOOTSTRAP_SECRET` registriert, wird `admin`. Weitere User nur via Admin-Token aus der Settings-UI.

### 3.2 Setup-Token (Settings-UI)

```
Admin (eingeloggt): /settings/tokens
   → POST /api/admin/setup-tokens  { label, ttl?, bound_user_id? }
   → UI zeigt plaintext Token / Copy-Link einmalig
   → DB speichert nur SHA-256(token), TTL, created_by, uses_left

User:  GET /register?token=…
        → POST /api/webauthn/register/options  { token, displayName }
        → credentials.create()
        → POST /api/webauthn/register/verify
        → User + Credential angelegt, Token uses_left--
        → Session-Cookie
```

Weitere Geräte: `/settings/devices` (eigene Session) **oder** Admin stellt gebundenes Token aus.

### 3.3 Login

```
POST /api/webauthn/login/options   → challenge
navigator.credentials.get()
POST /api/webauthn/login/verify    → Session (user_id, role, expires)
```

Discoverable credentials (Passkeys) bevorzugt, damit kein Username-Feld nötig ist; optional Username-Fallback.

### 3.4 Session

- Cookie: `Secure`, `HttpOnly`, `SameSite=Lax`
- TTL: z. B. 14 Tage
- Server-side Session-Row oder signed sealed cookie + optional revoke-list

---

## 4. Routen

| Route | Schutz | Zweck |
|-------|--------|--------|
| `/` | public | Login oder Redirect `/apps` |
| `/register` | setup-token | Onboarding |
| `/apps` | session | Launcher |
| `/settings/devices` | session | eigene Passkeys |
| `/settings/tokens` | admin | Setup-Tokens erzeugen, kopieren, invalidieren |
| `/api/webauthn/*` | challenge | Register/Login |
| `/api/admin/setup-tokens` | admin session | Token CRUD |
| `/api/apps` | session | Katalog (inkl. LAN-only) |
| `/api/logout` | session | invalidate |

Unauth: Login-HTML ohne App-Namen/URLs.

---

## 5. Datenmodell

```
User
  id, display_name, role ('admin'|'member'), created_at

WebAuthnCredential
  id, user_id, credential_id, public_key, counter,
  transports, device_label, created_at, last_used_at

SetupToken
  id, token_hash, label, created_by_user_id,
  bound_user_id NULL,   -- NULL = neuer User; gesetzt = extra Gerät
  expires_at, uses_left, created_at

Session
  id, user_id, expires_at, created_at

AuditEvent (optional)
  id, type, user_id?, at, meta_json
```

---

## 6. App-Katalog (MVP)

```ts
// apps.config.ts — nur Server
export const apps = [
  {
    id: "einkaufsliste",
    name: "Einkaufsliste",
    description: "Familienliste",
    url: process.env.EINKAUF_URL!, // Token-URL nicht committen
    icon: "cart",
    network: "public", // sobald Tunnel-Regel steht
  },
  {
    id: "lumito",
    name: "Lumito",
    description: "Haus-IPTV",
    url: process.env.LUMITO_URL ?? "http://192.168.1.172:8080/",
    icon: "tv",
    network: "lan", // Badge „Nur Heimnetz“
  },
  {
    id: "alabors-drive",
    name: "Car-App",
    description: "eDrive / SoC",
    url: "https://auto.myalabor.ch/web/drive.html",
    icon: "car",
    network: "public",
  },
] as const;
```

- Response nur mit Session; LAN-Apps **nicht** ausblenden.
- UI: Badge wenn `network === "lan"`.
- Kein Client-Side Reachability-Check in v1 (optional P2).

---

## 7. Sicherheit

| Maßnahme | Detail |
|----------|--------|
| Passkey-only | kein Passwort-Store |
| Setup-Token | nur Hash in DB, kurz TTL, uses_left |
| Origin / rpId | `dashboard.myalabor.ch` |
| Challenges | einmalig, kurzlebig |
| Cookie | Secure + HttpOnly + SameSite |
| Bind | Dashboard nur `127.0.0.1` — Tunnel terminiert TLS |
| Rate limit | Register/Login (IP + token) |
| Katalog | nie an unauth Clients |
| Trennung | Dashboard-Auth ≠ App-Auth (Drive/Lumito/Einkauf behalten eigene Modelle) |

---

## 8. Deploy auf dem Pi

```
DNS / CF Zero Trust:
  dashboard.myalabor.ch  →  http://localhost:8790

Pi Layout (Vorschlag):
  /mnt/mmcblk0p2/dashboard/          # App (standalone)
  /mnt/mmcblk0p2/dashboard-data/     # SQLite + backups
  Env-Datei gitignored auf dem Pi

Deploy-Skript (analog AlaborsCar deploy-pi.sh):
  1. build auf Dev-Host
  2. rsync standalone + static
  3. restart service
  4. smoke: curl -H Host:dashboard… /api/health
```

Env:

```
SESSION_SECRET=…
WEBAUTHN_RP_ID=dashboard.myalabor.ch
WEBAUTHN_ORIGIN=https://dashboard.myalabor.ch
SETUP_BOOTSTRAP_SECRET=…   # nur für allerersten Admin
DATABASE_PATH=/mnt/mmcblk0p2/dashboard-data/dashboard.db
PORT=8790
HOST=127.0.0.1
```

---

## 9. Repo-Struktur

```
alabors-dashboard/
  docs/PRD.md
  docs/ARCHITECTURE.md
  apps/web/                 # Next (oder SvelteKit)
    app/…
    lib/auth/…
    lib/db/…
    apps.config.ts
  deploy/
    pi.env.example
    deploy-pi.sh
    dashboard.service       # oder bootlocal-Snippet
  scripts/
    admin-token.ts          # CLI Setup-Token
```

---

## 10. Phasen

| Phase | Lieferumfang |
|-------|----------------|
| **M0** | Skeleton + health + Deploy-Skript Pi + CF-Ingress-Doku — **done** |
| **M1** | SQLite Users + Setup-Token Register + Passkey Login + Session + Tokens-UI — **done** |
| **M2** | `/apps` Launcher mit MVP-Trio + LAN-Badge — **done** (mit M0) |
| **M3** | Device-Management, Rate-Limit, Audit, Boot-Autostart |

---

## 11. Risiken

| Risiko | Mitigation |
|--------|------------|
| Next.js zu schwer für Pi | Standalone messen; Fallback SvelteKit/Astro |
| Passkey verloren | ≥2 Geräte / neues Setup-Token |
| Token-URL Einkaufsliste im Katalog | nur Env + auth’ed API |
| Tunnel-Fehlkonfig | Dashboard nur loopback; Smoke nach Deploy |
| Multi-User Verwechslung | Discoverable Passkeys; Anzeigename im Header |

---

## 12. Default-Entscheidung

> **Next.js standalone + SimpleWebAuthn + Cookie-Session + SQLite**, multi-user mit **Setup-Token-Onboarding**, Deploy auf **Raspberry Pi** hinter **Cloudflare Tunnel** als `dashboard.myalabor.ch`.
