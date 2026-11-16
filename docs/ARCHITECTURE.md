# Mini-Architektur: Alabor Dashboard

**Bezug:** [PRD](./PRD.md) v0.4  
**Auth-Vertrag:** [alabor-harness AUTH-HARNESS.md](https://github.com/tompommepoire/alabor-harness/blob/main/docs/AUTH-HARNESS.md) (§2 / §2c / §3c)  
**§4 Checkliste:** [AUTH-CHECKLIST.md](./AUTH-CHECKLIST.md)  
**Scope:** Tor / App-Katalog auf Raspberry Pi unter `dashboard.myalabor.ch`

---

## 1. Überblick

```
 Internet
    │
    ▼
 Cloudflare Tunnel
    │
    ├─ auth.myalabor.ch      → Pocket ID (:1411)
    ├─ dashboard.myalabor.ch → oauth2-proxy → dashboard (:8790)
    ├─ einkaufen.myalabor.ch → oauth2-proxy → Einkaufsliste
    └─ … weitere Apps hinter demselben Gate
         │
         ▼
 Raspberry Pi
    Pocket ID (SQLite) | oauth2-proxy | dashboard (Next standalone)
```

**Prinzip:** Fremd-IdP + Forward-Auth = Schicht A (Tor). Dashboard = Katalog/UX. Apps wählen ihren §3-Modus selbst; Start-Links ohne Langzeit-Pair-URLs.

Ops-Lage:

- Pi: `tc@192.168.1.58`, Persistenz unter `/mnt/mmcblk0p2/…`
- Edge: Cloudflare Tunnel (kein neuer öffentlicher Port)

---

## 2. Stack

| Schicht | Wahl | Warum |
|---------|------|--------|
| UI/API | **Next.js** standalone | SSR + API; Build auf Dev-Host |
| Auth | **Pocket ID** (OIDC, Passkeys) | Harness §2c — kein Eigenbau-WebAuthn |
| Gate | **oauth2-proxy** Forward-Auth | Session vor `*.myalabor.ch` |
| Katalog | `apps-catalog.ts` + `APP_GRANTS` | Pro-Konto-Sichtbarkeit |
| Edge | Cloudflare Tunnel | wie AlaborsCar |
| Process | Skripte / bootlocal | Restart, Logs |

### Pi-Constraint

Nicht auf dem Pi bauen. Flow: `npm run build` → `rsync` standalone → `node server.js` auf Loopback.

---

## 3. Auth (Tor)

### 3.1 Identität

oauth2-proxy setzt nach Login Headers an Upstream (u. a. `X-Forwarded-User`, `X-Forwarded-Email`). Dashboard liest daraus den Gate-User — **kein** eigenes Session-JWT, **keine** WebAuthn-Ceremony.

| Rolle | Quelle |
|-------|--------|
| `admin` | Subject/E-Mail in `ADMIN_SUBJECTS` (Env) |
| `member` | jeder andere authentifizierte User |

Erstkeys / Passkey-Enrollment / Session-Widerruf: **Pocket ID** (Self-Service + Admin-Invites). Dashboard verlinkt nur.

### 3.2 Local Dev

`AUTH_MODE=dev` + `ALLOW_DEV_SESSION=1`: Stub-Login ohne Proxy. Nie in Prod.

### 3.3 Logout

Redirect auf oauth2-proxy `/oauth2/sign_out` (bzw. IdP end-session). Kein GET-State-Change im Dashboard selbst außer Redirect.

---

## 4. Routen

| Route | Schutz | Zweck |
|-------|--------|--------|
| `/` | Gate | Redirect → `/apps` wenn User da; sonst Dev-Login / Hinweis |
| `/apps` | Gate | Launcher (konto-gefiltert) |
| `/settings/security` | Gate | Links zu Pocket-ID Passkeys/Sessions/Admin |
| `/api/apps` | Gate | JSON-Katalog |
| `/api/health` | public (Proxy skip) | Smoke |
| `/api/logout` | Gate | Redirect Sign-Out |

Unauth erreicht Upstream in Prod nicht (Proxy).

---

## 5. App-Katalog

Metadaten pro App (Harness §5 spiegeln, Vertrag nicht kopieren):

- `authMode`: `shared` \| `inherit` \| `choose` \| `reauth` \| …
- `handoff`: `none` \| `session-cookie` \| `exchange` \| `handoff-once`
- `visibleTo`: Allowlist von Subjects/`*` via `APP_GRANTS`

Start-URL = Origin/Pfad **ohne** Pair-/Device-Token. Wenn `authMode=inherit` und `handoff=none`: UI-Hinweis, nicht als „eingeloggt starten“ verkaufen.

---

## 6. Sicherheit

| Maßnahme | Detail |
|----------|--------|
| Passkeys | nur Pocket ID (`auth.myalabor.ch`) |
| Gate | ohne IdP-Session kein App-/Dashboard-Zugriff |
| Headers | Identity nur aus Proxy; Dashboard setzt keine Parent-Domain-Session |
| Katalog | nie an unauth Clients |
| Pair-URLs | verboten im Dashboard |
| CSP | Next headers; Follow-up härten |

---

## 7. Deploy

```
/mnt/mmcblk0p2/auth/           # Pocket ID + oauth2-proxy (compose)
/mnt/mmcblk0p2/dashboard/      # Next standalone
/mnt/mmcblk0p2/dashboard-data/ # optional lokale Daten
```

Siehe [ops/pocket-id.md](./ops/pocket-id.md), [ops/oauth2-proxy.md](./ops/oauth2-proxy.md), [ops/cloudflare-tunnel.md](./ops/cloudflare-tunnel.md).

Env (Dashboard, Auszug):

```
AUTH_MODE=proxy
ADMIN_SUBJECTS=tom@example.com
OAUTH2_SIGN_OUT_URL=https://dashboard.myalabor.ch/oauth2/sign_out
POCKET_ID_URL=https://auth.myalabor.ch
APP_GRANTS=einkaufsliste:*;lumito:*;alabors-drive:*;apple-anki:sub1;mininotes:sub1
```

---

## 8. Phasen

| Phase | Lieferumfang |
|-------|----------------|
| **M0–M2** | Skeleton, Deploy, Katalog — historisch |
| **Tor-0** | Docs + §4 Checkliste Tor |
| **Tor-1** | Pocket ID + Tunnel `auth` |
| **Tor-2** | oauth2-proxy; WebAuthn-Eigenbau entfernt |
| **Tor-3** | Katalog pro Konto + Security-Links |
| **Tor-4** | Exchange/`inherit` — [AUTH-EXCHANGE.md](./AUTH-EXCHANGE.md) (später) |

---

## 9. Default-Entscheidung

> **Next.js Katalog hinter oauth2-proxy**, Passkeys bei **Pocket ID**, Cloudflare Tunnel als Edge. Dashboard baut **keine** App-Auth und **keine** Pair-Tokens in URLs.
