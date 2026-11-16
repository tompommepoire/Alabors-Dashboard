# Pocket ID — `auth.myalabor.ch`

Fremd-IdP laut Harness §2c. Passkeys, Invites, Session-Self-Service liegen hier — nicht im Dashboard.

## Layout auf dem Pi (piCore — Binary, kein Docker)

```
/mnt/mmcblk0p2/auth/
  bin/pocket-id
  bin/pocket-id-pi-run.sh
  .env                 # APP_URL + ENCRYPTION_KEY
/mnt/mmcblk0p2/auth-data/
  data/                # SQLite Persistenz
  pocket-id.log
  pocket-id.pid
```

Docker-Compose unter [deploy/auth](../../deploy/auth) bleibt für Hosts **mit** Docker; auf dem PiCore-Pi: Binary-Skript.

## Bootstrap

1. Tunnel-Hostname `auth.myalabor.ch` → `http://127.0.0.1:1411` (siehe [cloudflare-tunnel.md](./cloudflare-tunnel.md)).
2. Vom Dev-Host: `HARNESS_CONFIRM=1 ./scripts/deploy-pocket-id-binary.sh`
3. Einmalig `https://auth.myalabor.ch/setup` — Admin + erster Passkey.
4. OIDC-Client für oauth2-proxy anlegen (Redirects `https://dashboard.myalabor.ch/oauth2/callback`, ggf. weitere App-Hosts).
5. Weitere Haushaltsmitglieder nur per **Invite** (1×, TTL) — entspricht Harness-Erstkey.
6. oauth2-proxy als Binary (nächster Schritt im Walkthrough).

## Smoke

```bash
curl -fsS -o /dev/null -w '%{http_code}\n' https://auth.myalabor.ch/
# Passkey-Login in Browser; Admin-Invite einmal testen
```

## Dashboard-Anbindung

- `POCKET_ID_URL=https://auth.myalabor.ch`
- Security-Links im Dashboard zeigen auf IdP-UI (Passkeys / Sessions / Admin).
- Keine Passkey-DB mehr im Dashboard.

## Backup

`pocket-id-data/` mitkopieren (SQLite). Secrets nur in `.env`, nicht im Git.
